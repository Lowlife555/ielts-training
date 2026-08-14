const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

const BASE_TARGET_MINUTES = 60; // 默认，用户可在设置中修改（见 getUserBaseTarget）
const MAX_TARGET_MINUTES = 120; // 单日上限 2 小时
const PENALTY_MINUTES = 30;
const CLEAR_DEBT_SECONDS = 2 * 3600; // 练满 2 小时视为欠债全部结清
const GRACE_MINUTES = 15; // 目标时长 - 15 分钟内不算欠训

/** 用户设置的基础目标时长（测试账号恒 60；v7.2.2 起优先读 user_kv，回退 user_settings 表） */
function getUserBaseTarget(db, req) {
  if (req.user.isTest) return BASE_TARGET_MINUTES;
  // 1) KV 存储（新）
  const kv = db.prepare('SELECT value FROM user_kv WHERE user_id = ? AND key = ?').get(req.user.id, 'settings.baseTargetMinutes');
  if (kv) {
    try {
      const v = JSON.parse(kv.value);
      if (typeof v === 'number' && v > 0) return v;
    } catch { /* fall through */ }
  }
  // 2) 旧表回退
  const s = db.prepare('SELECT base_target_minutes FROM user_settings WHERE user_id = ?').get(req.user.id);
  return s && s.base_target_minutes ? s.base_target_minutes : BASE_TARGET_MINUTES;
}

function dateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function getDaySessions(db, userId, date) {
  return db.prepare(`
    SELECT * FROM daily_sessions
    WHERE user_id = ? AND session_date = ?
  `).all(userId, date);
}

function aggregateDay(sessions) {
  const agg = {
    trainedSeconds: 0,
    completed: false,
    sessionCount: sessions.length,
  };
  for (const s of sessions) {
    agg.trainedSeconds += s.duration_seconds || 0;
    if (s.completed) agg.completed = true;
  }
  return agg;
}

/**
 * 从历史记录递推欠债。
 * 规则：
 *  - 每日目标 = 60 + 累积欠债，上限 120 分钟
 *  - 次日 +30 惩罚：当天完全没训练 / 训练时长 < 目标 - 15 分钟（且未验收通过）
 *  - 验收通过当日：不加罚（旧欠债保留）
 *  - 练满 2 小时：欠债全部结清，次日回到 60 分钟
 *  - 首次训练记录之前的日期不累计欠债
 */
function computeDebtChain(db, userId, baseTargetMinutes = BASE_TARGET_MINUTES) {
  const first = db.prepare(`
    SELECT MIN(session_date) as d FROM daily_sessions WHERE user_id = ?
  `).get(userId);

  if (!first || !first.d) {
    return { debt: 0, yesterday: null };
  }

  let debt = 0;
  let yesterday = null;
  const today = dateString();

  const start = new Date(first.d);
  const end = new Date(dateString(-1)); // 昨天
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const date = t.toISOString().slice(0, 10);
    const sessions = getDaySessions(db, userId, date);
    const agg = aggregateDay(sessions);
    const target = Math.min(baseTargetMinutes + debt, MAX_TARGET_MINUTES);

    let nextDebt;
    if (agg.trainedSeconds >= CLEAR_DEBT_SECONDS) {
      nextDebt = 0; // 练满 2 小时 → 全部结清
    } else if (agg.completed) {
      nextDebt = debt; // 验收通过 → 不加罚（旧债保留）
    } else if (agg.sessionCount === 0) {
      nextDebt = Math.min(debt + PENALTY_MINUTES, MAX_TARGET_MINUTES - BASE_TARGET_MINUTES);
    } else if (agg.trainedSeconds < (target - GRACE_MINUTES) * 60) {
      nextDebt = Math.min(debt + PENALTY_MINUTES, MAX_TARGET_MINUTES - BASE_TARGET_MINUTES);
    } else {
      nextDebt = debt;
    }

    debt = nextDebt;
    yesterday = { date, agg, targetMinutes: target, nextDebt };
  }

  return { debt, yesterday };
}

function buildReason(yesterday) {
  if (!yesterday) return '全新开始，今日目标 1 小时';
  if (yesterday.agg.trainedSeconds >= CLEAR_DEBT_SECONDS) return '昨日练满 2 小时，欠债已结清';
  if (yesterday.agg.completed) return '昨日已完成当日任务，无惩罚';
  if (yesterday.agg.sessionCount === 0) return '昨日未训练 +30 分钟';
  if (yesterday.agg.trainedSeconds < (yesterday.targetMinutes - GRACE_MINUTES) * 60)
    return `昨日训练不足目标时长 +30 分钟（训练 ${Math.floor(yesterday.agg.trainedSeconds / 60)} 分钟）`;
  return '昨日训练达标，正常';
}

// GET /api/daily-plan — 今日简报
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const today = dateString();

  // 测试账号：目标恒 60 分钟，永不欠债，无惩罚机制
  let debt = 0;
  let targetMinutes = BASE_TARGET_MINUTES;
  let reason = req.user.isTest ? '测试账号：目标恒 60 分钟，永不欠债' : null;
  if (!req.user.isTest) {
    const baseTarget = getUserBaseTarget(db, req);
    const chain = computeDebtChain(db, userId, baseTarget);
    debt = chain.debt;
    targetMinutes = Math.min(baseTarget + debt, MAX_TARGET_MINUTES);
    reason = buildReason(chain.yesterday);
  }

// 今日 List：优先待重背 List；否则自定义模式取用户选定 List（插队，不影响顺序进度）；否则下一个未完成 List
  const pendingReview = db.prepare(
    'SELECT list_no FROM list_completion WHERE user_id = ? AND pending_review = 1 ORDER BY list_no LIMIT 1'
  ).get(userId);

  const settings = db.prepare('SELECT study_mode, custom_list_no FROM users WHERE id = ?').get(userId);
  const customMode = settings && settings.study_mode === 'custom' && settings.custom_list_no;

  let todayList = null;
  if (pendingReview) {
    const cnt = db.prepare(
      'SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?'
    ).get(pendingReview.list_no);
    todayList = { listNo: pendingReview.list_no, wordCount: cnt.cnt, isReback: true, isCustom: false };
  } else if (customMode) {
    // 自定义模式：固定学用户选定的 List（已完成也可选，用于复习）
    const cnt = db.prepare(
      'SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?'
    ).get(settings.custom_list_no);
    if (cnt.cnt > 0) {
      todayList = { listNo: settings.custom_list_no, wordCount: cnt.cnt, isReback: false, isCustom: true };
    }
  } else {
    const nextList = db.prepare(`
      SELECT w.list_no, COUNT(*) as cnt
      FROM words w
      WHERE w.is_extra = 0 AND w.list_no IS NOT NULL
        AND w.list_no NOT IN (SELECT list_no FROM list_completion WHERE user_id = ?)
      GROUP BY w.list_no
      ORDER BY w.list_no
      LIMIT 1
    `).get(userId);
    if (nextList) todayList = { listNo: nextList.list_no, wordCount: nextList.cnt, isReback: false, isCustom: false };
  }

  // 顺序进度（自定义插队后仍从原进度继续；全部完成后为 null）
  const nextSeq = db.prepare(`
    SELECT w.list_no
    FROM words w
    WHERE w.is_extra = 0 AND w.list_no IS NOT NULL
      AND w.list_no NOT IN (SELECT list_no FROM list_completion WHERE user_id = ?)
    GROUP BY w.list_no
    ORDER BY w.list_no
    LIMIT 1
  `).get(userId);

  // 抽查任务：完成背诵 ≥3 天且未抽查过、且非待重背的 List 中随机选一个，抽 30 词（不足取全部）
  let spotCheck = null;
  const dueList = db.prepare(`
    SELECT list_no, first_completed_date
    FROM list_completion
    WHERE user_id = ?
      AND spot_check_date IS NULL AND pending_review = 0
      AND julianday(date('now')) - julianday(first_completed_date) >= 3
    ORDER BY RANDOM()
    LIMIT 1
  `).get(userId);
  if (dueList) {
    const cnt = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?').get(dueList.list_no);
    const spotCount = Math.min(30, cnt.cnt);
    const words = db.prepare(`
      SELECT w.id, w.word, w.phonetic, w.part_of_speech, w.chinese_definition,
             wm.keywords, wm.synonyms
      FROM words w
      LEFT JOIN word_meanings wm ON wm.word_id = w.id
      WHERE w.is_extra = 0 AND w.list_no = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).all(dueList.list_no, spotCount);
    spotCheck = {
      listNo: dueList.list_no,
      wordCount: spotCount,
      passRate: 80,
      words: words.map(w => ({
        wordId: w.id, word: w.word, phonetic: w.phonetic,
        partOfSpeech: w.part_of_speech, chineseDefinition: w.chinese_definition,
        keywords: parseJson(w.keywords) || [],
        synonyms: parseJson(w.synonyms) || [],
      })),
    };
  }

  // PET 热身词（不计时不计分）
  const petWords = db.prepare(`
    SELECT w.id, w.word, w.phonetic, w.part_of_speech, w.chinese_definition,
           wm.keywords, wm.synonyms
    FROM words w
    LEFT JOIN word_meanings wm ON wm.word_id = w.id
    WHERE w.level = 'pet' AND w.is_extra = 0
    ORDER BY RANDOM()
    LIMIT 10
  `).all().map(w => ({
    wordId: w.id, word: w.word, phonetic: w.phonetic,
    partOfSpeech: w.part_of_speech, chineseDefinition: w.chinese_definition,
    keywords: parseJson(w.keywords) || [],
    synonyms: parseJson(w.synonyms) || [],
  }));

  // 今日已训练状态
  const todaySessions = getDaySessions(db, userId, today);
  const todayAgg = aggregateDay(todaySessions);

  res.json({
    targetMinutes,
    debtMinutes: debt,
    reason,
    todayList,
    pendingReviewList: pendingReview ? pendingReview.list_no : null,
    pendingReviewLists: db.prepare(`
      SELECT list_no, first_completed_date FROM list_completion
      WHERE user_id = ? AND pending_review = 1 ORDER BY list_no
    `).all(userId),
    spotCheckList: spotCheck,
    petWarmupCount: petWords.length,
    petWarmupWords: petWords,
    today: {
      trainedSeconds: todayAgg.trainedSeconds,
      completed: todayAgg.completed,
      sessionCount: todayAgg.sessionCount,
    },
    allListsDone: !todayList,
    studyMode: settings ? settings.study_mode : 'sequential',
    customListNo: settings ? settings.custom_list_no : null,
    sequentialProgressList: nextSeq ? nextSeq.list_no : null,
  });
});

// POST /api/daily-plan/settings — 切换学习模式
// body: { mode: 'sequential' | 'custom', listNo?: 1-24 }
router.post('/settings', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { mode, listNo } = req.body || {};

  if (mode !== 'sequential' && mode !== 'custom') {
    return res.status(400).json({ error: 'mode 必须是 sequential 或 custom' });
  }

  let customListNo = null;
  if (mode === 'custom') {
    const n = Number(listNo);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ error: '请选择要学习的 List' });
    }
    const cnt = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE is_extra = 0 AND list_no = ?').get(n);
    if (!cnt.cnt) return res.status(404).json({ error: `List ${n} 没有单词` });
    customListNo = n;
  }

  db.prepare('UPDATE users SET study_mode = ?, custom_list_no = ? WHERE id = ?')
    .run(mode, customListNo, userId);

  res.json({ ok: true, studyMode: mode, customListNo });
});

// GET /api/daily-plan/status — 今日训练状态
router.get('/status', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const today = dateString();

  const isTest = req.user.isTest;
  const baseTarget = isTest ? BASE_TARGET_MINUTES : getUserBaseTarget(db, req);
  const debt = isTest ? 0 : computeDebtChain(db, userId, baseTarget).debt;
  const targetMinutes = isTest ? BASE_TARGET_MINUTES : Math.min(baseTarget + debt, MAX_TARGET_MINUTES);

  const sessions = getDaySessions(db, userId, today);
  const agg = aggregateDay(sessions);

  const trainedSeconds = agg.trainedSeconds;
  const remaining = Math.max(targetMinutes * 60 - trainedSeconds, 0);

  res.json({
    targetMinutes,
    debtMinutes: debt,
    trainedSeconds,
    remainingSeconds: remaining,
    completed: agg.completed,
    reachedCap: trainedSeconds >= CLEAR_DEBT_SECONDS,
  });
});

// POST /api/daily-plan/complete — 标记当日训练完成（验收通过时调用）
router.post('/complete', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { sessionId } = req.body || {};

  let session;
  if (sessionId) {
    session = db.prepare('SELECT * FROM daily_sessions WHERE id = ? AND user_id = ?')
      .get(sessionId, userId);
  }
  if (!session) {
    session = db.prepare(`
      SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ? AND completed = 0
      ORDER BY id DESC LIMIT 1
    `).get(userId, dateString());
  }
  if (!session) {
    return res.status(404).json({ error: '未找到今日训练记录' });
  }

  db.prepare('UPDATE daily_sessions SET completed = 1, end_time = ? WHERE id = ?')
    .run(new Date().toISOString(), session.id);

  if (session.list_no) {
    db.prepare(`
      INSERT INTO list_completion (user_id, list_no, first_completed_date)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, list_no) DO NOTHING
    `).run(userId, session.list_no, dateString());
  }

  res.json({ ok: true, sessionId: session.id });
});

// GET /api/daily-plan/test-spot-check?listNo=N — 测试账号：任意 List 生成抽查
// 同时创建真实训练会话，保证计时/收工可用
router.get('/test-spot-check', (req, res) => {
  const db = getDb();
  if (!req.user.isTest) return res.status(403).json({ error: '仅测试账号可用' });

  const listNo = Number(req.query.listNo);
  if (!listNo || listNo < 1) return res.status(400).json({ error: 'listNo required' });

  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?').get(listNo);
  if (!cnt.cnt) return res.status(404).json({ error: `List ${listNo} 没有单词` });

  const spotCount = Math.min(30, cnt.cnt);
  const words = db.prepare(`
    SELECT w.id, w.word, w.phonetic, w.part_of_speech, w.chinese_definition,
           wm.keywords, wm.synonyms
    FROM words w
    LEFT JOIN word_meanings wm ON wm.word_id = w.id
    WHERE w.is_extra = 0 AND w.list_no = ?
    ORDER BY RANDOM()
    LIMIT ?
  `).all(listNo, spotCount);

  const now = new Date();
  const result = db.prepare(`
    INSERT INTO daily_sessions (user_id, session_date, level, word_count, status, list_no, start_time, target_minutes, debt_minutes)
    VALUES (?, ?, 'ielts', ?, 'studying', ?, ?, 60, 0)
  `).run(req.user.id, dateString(), spotCount, listNo, now.toISOString());

  res.json({
    sessionId: result.lastInsertRowid,
    startTime: now.toISOString(),
    spotCheck: {
      listNo,
      wordCount: spotCount,
      passRate: 80,
      words: words.map(w => ({
        wordId: w.id, word: w.word, phonetic: w.phonetic,
        partOfSpeech: w.part_of_speech, chineseDefinition: w.chinese_definition,
        keywords: parseJson(w.keywords) || [],
        synonyms: parseJson(w.synonyms) || [],
      })),
    },
  });
});

// GET /api/daily-plan/resume — 断点续训信息（最近一次未完成且有进度的会话）
router.get('/resume', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const row = db.prepare(`
    SELECT id, list_no, batch_size, completed_batches, start_time, status
    FROM daily_sessions
    WHERE user_id = ? AND status = 'abandoned' AND completed = 0 AND completed_batches > 0
    ORDER BY id DESC LIMIT 1
  `).get(userId);

  if (!row) return res.json({ resume: null });

  res.json({
    resume: {
      sessionId: row.id,
      listNo: row.list_no,
      batchSize: row.batch_size || 30,
      completedBatches: row.completed_batches || 0,
    },
  });
});

// POST /api/daily-plan/spot-check — 提交抽查结果
// body: { listNo, results: [{wordId, correct}] }
// 正确率 ≥80% 通过并记录抽查日期；否则标记待重背（次日简报优先重背）
router.post('/spot-check', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { listNo, results } = req.body || {};

  if (!listNo || !results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'listNo and results array required' });
  }

  let row = db.prepare('SELECT * FROM list_completion WHERE user_id = ? AND list_no = ?').get(userId, listNo);
  if (!row) {
    // 测试账号：允许对任意 List 抽查（补一条完成记录）
    if (!req.user.isTest) {
      return res.status(404).json({ error: `List ${listNo} 未完成背诵，无需抽查` });
    }
    db.prepare(`
      INSERT INTO list_completion (user_id, list_no, first_completed_date)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, list_no) DO NOTHING
    `).run(userId, listNo, dateString());
    row = db.prepare('SELECT * FROM list_completion WHERE user_id = ? AND list_no = ?').get(userId, listNo);
  }

  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const accuracy = Math.round((correct / total) * 100);
  const passed = accuracy >= 80;

  db.prepare(`
    UPDATE list_completion SET
      spot_check_date = ?,
      pending_review = ?
    WHERE user_id = ? AND list_no = ?
  `).run(dateString(), passed ? 0 : 1, userId, listNo);

  res.json({ ok: true, listNo, total, correct, accuracy, passed });
});

function parseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

module.exports = router;
module.exports.computeDebtChain = computeDebtChain;
module.exports.dateString = dateString;
