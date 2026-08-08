const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

const BASE_TARGET_MINUTES = 60;
const MAX_TARGET_MINUTES = 120; // 单日上限 2 小时
const PENALTY_MINUTES = 30;
const CLEAR_DEBT_SECONDS = 2 * 3600; // 练满 2 小时视为欠债全部结清
const GRACE_MINUTES = 15; // 目标时长 - 15 分钟内不算欠训

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
function computeDebtChain(db, userId) {
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
    const target = Math.min(BASE_TARGET_MINUTES + debt, MAX_TARGET_MINUTES);

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
  const userId = getUserId();
  const today = dateString();

  // 欠债计算
  const { debt, yesterday } = computeDebtChain(db, userId);
  const targetMinutes = Math.min(BASE_TARGET_MINUTES + debt, MAX_TARGET_MINUTES);
  const reason = buildReason(yesterday);

  // 今日 List：优先待重背 List，否则下一个未完成 List
  const pendingReview = db.prepare(
    'SELECT list_no FROM list_completion WHERE pending_review = 1 ORDER BY list_no LIMIT 1'
  ).get();

  let todayList = null;
  if (pendingReview) {
    const cnt = db.prepare(
      'SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?'
    ).get(pendingReview.list_no);
    todayList = { listNo: pendingReview.list_no, wordCount: cnt.cnt, isReback: true };
  } else {
    const nextList = db.prepare(`
      SELECT w.list_no, COUNT(*) as cnt
      FROM words w
      WHERE w.is_extra = 0 AND w.list_no IS NOT NULL
        AND w.list_no NOT IN (SELECT list_no FROM list_completion)
      GROUP BY w.list_no
      ORDER BY w.list_no
      LIMIT 1
    `).get();
    if (nextList) todayList = { listNo: nextList.list_no, wordCount: nextList.cnt, isReback: false };
  }

  // 抽查任务：完成背诵 ≥3 天且未抽查过、且非待重背的 List 中随机选一个，抽 30 词（不足取全部）
  let spotCheck = null;
  const dueList = db.prepare(`
    SELECT list_no, first_completed_date
    FROM list_completion
    WHERE spot_check_date IS NULL AND pending_review = 0
      AND julianday(date('now')) - julianday(first_completed_date) >= 3
    ORDER BY RANDOM()
    LIMIT 1
  `).get();
  if (dueList) {
    const cnt = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no = ?').get(dueList.list_no);
    const spotCount = Math.min(30, cnt.cnt);
    const words = db.prepare(`
      SELECT id, word, phonetic, part_of_speech, chinese_definition
      FROM words
      WHERE is_extra = 0 AND list_no = ?
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
      })),
    };
  }

  // PET 热身词（不计时不计分）
  const petWords = db.prepare(`
    SELECT id, word, phonetic, part_of_speech, chinese_definition
    FROM words
    WHERE level = 'pet' AND is_extra = 0
    ORDER BY RANDOM()
    LIMIT 10
  `).all().map(w => ({
    wordId: w.id, word: w.word, phonetic: w.phonetic,
    partOfSpeech: w.part_of_speech, chineseDefinition: w.chinese_definition,
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
    spotCheckList: spotCheck,
    petWarmupCount: petWords.length,
    petWarmupWords: petWords,
    today: {
      trainedSeconds: todayAgg.trainedSeconds,
      completed: todayAgg.completed,
      sessionCount: todayAgg.sessionCount,
    },
    allListsDone: !todayList,
  });
});

// GET /api/daily-plan/status — 今日训练状态
router.get('/status', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const today = dateString();

  const { debt } = computeDebtChain(db, userId);
  const targetMinutes = Math.min(BASE_TARGET_MINUTES + debt, MAX_TARGET_MINUTES);

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
  const userId = getUserId();
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
      INSERT INTO list_completion (list_no, first_completed_date)
      VALUES (?, ?)
      ON CONFLICT(list_no) DO NOTHING
    `).run(session.list_no, dateString());
  }

  res.json({ ok: true, sessionId: session.id });
});

// POST /api/spot-check — 提交抽查结果
// body: { listNo, results: [{wordId, correct}] }
// 正确率 ≥80% 通过并记录抽查日期；否则标记待重背（次日简报优先重背）
router.post('/spot-check', (req, res) => {
  const db = getDb();
  const { listNo, results } = req.body || {};

  if (!listNo || !results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'listNo and results array required' });
  }

  const row = db.prepare('SELECT * FROM list_completion WHERE list_no = ?').get(listNo);
  if (!row) {
    return res.status(404).json({ error: `List ${listNo} 未完成背诵，无需抽查` });
  }

  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const accuracy = Math.round((correct / total) * 100);
  const passed = accuracy >= 80;

  db.prepare(`
    UPDATE list_completion SET
      spot_check_date = ?,
      pending_review = ?
    WHERE list_no = ?
  `).run(dateString(), passed ? 0 : 1, listNo);

  res.json({ ok: true, listNo, total, correct, accuracy, passed });
});

module.exports = router;
