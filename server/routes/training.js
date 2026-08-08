const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

const SPELLING_MIN_COUNT = 20;

function dateString() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/training/start — 开启当日主训练会话（开始计时）
// body: { listNo }
router.post('/start', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const { listNo } = req.body || {};

  if (!listNo) return res.status(400).json({ error: 'listNo required' });

  const listWords = db.prepare(`
    SELECT id, word, phonetic, part_of_speech, chinese_definition
    FROM words
    WHERE is_extra = 0 AND list_no = ?
    ORDER BY word ASC
  `).all(listNo);

  if (listWords.length === 0) {
    return res.status(404).json({ error: `List ${listNo} 没有单词` });
  }

  const now = new Date();
  const result = db.prepare(`
    INSERT INTO daily_sessions (user_id, session_date, level, word_count, status, list_no, start_time, target_minutes, debt_minutes)
    VALUES (?, ?, 'ielts', ?, 'studying', ?, ?, ?, ?)
  `).run(userId, dateString(), listWords.length, listNo,
    now.toISOString(), req.body.targetMinutes || 60, req.body.debtMinutes || 0);

  const sessionId = result.lastInsertRowid;

  // 中译英拼写词：20%（约 20 词，不足 20 词取全部）
  const spellingCount = Math.min(
    Math.max(Math.ceil(listWords.length * 0.2), SPELLING_MIN_COUNT),
    listWords.length
  );
  const spellingWords = db.prepare(`
    SELECT id, word, phonetic, part_of_speech, chinese_definition
    FROM words
    WHERE is_extra = 0 AND list_no = ?
    ORDER BY RANDOM()
    LIMIT ?
  `).all(listNo, spellingCount);

  const toView = (w) => ({
    wordId: w.id,
    word: w.word,
    phonetic: w.phonetic,
    partOfSpeech: w.part_of_speech,
    chineseDefinition: w.chinese_definition,
  });

  res.json({
    sessionId,
    listNo,
    total: listWords.length,
    words: listWords.map(toView),
    spellingWords: spellingWords.map(toView),
    startTime: now.toISOString(),
  });
});

// POST /api/training/complete — 训练完成（验收通过）
// body: { sessionId, durationSeconds, mainResults: [{wordId, correct, wrongPool}],
//         spellingResults: [{wordId, correct, answer}],
//         acceptanceResults: [{wordId, correct, answer}] }
router.post('/complete', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const { sessionId, durationSeconds, mainResults = [], spellingResults = [], acceptanceResults = [] } = req.body || {};

  const session = db.prepare('SELECT * FROM daily_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // 验收必须全部正确才算完成
  const acceptanceTotal = acceptanceResults.length;
  const acceptanceCorrect = acceptanceResults.filter(r => r.correct).length;
  // 无错词（漏网之鱼为 0）视为验收通过；有错词则必须全部拼对（correct 为最终结果）
  const acceptancePassed = acceptanceTotal === 0 || (acceptanceCorrect === acceptanceTotal);
  // 正确率用首试成绩（firstTry），更真实反映记忆水平
  const firstTryCorrect = acceptanceResults.filter(r => (r.firstTry !== undefined ? r.firstTry : r.correct)).length;

  const mainTotal = mainResults.length;
  const mainCorrect = mainResults.filter(r => r.correct).length;
  const spellingTotal = spellingResults.length;
  const spellingCorrect = spellingResults.filter(r => r.correct).length;
  const wrongPoolWords = mainResults.filter(r => r.wrongPool).map(r => r.wordId);

  // 权威时长：服务端 start_time 为准，取较小值
  const serverElapsed = session.start_time
    ? Math.max(0, Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000))
    : 0;
  const finalDuration = Math.min(durationSeconds || 0, serverElapsed || Infinity);

  const endTime = new Date().toISOString();

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE daily_sessions SET
        status = ?, completed = ?, duration_seconds = ?, end_time = ?,
        main_accuracy = ?, spelling_accuracy = ?, acceptance_accuracy = ?,
        wrong_pool_count = ?
      WHERE id = ?
    `).run(
      acceptancePassed ? 'completed' : 'finished',
      acceptancePassed ? 1 : 0,
      finalDuration,
      endTime,
      mainTotal ? Math.round((mainCorrect / mainTotal) * 100) : null,
      spellingTotal ? Math.round((spellingCorrect / spellingTotal) * 100) : null,
      acceptanceTotal ? Math.round((firstTryCorrect / acceptanceTotal) * 100) : null,
      wrongPoolWords.length,
      sessionId
    );

    // 逐词记录（先清空该会话旧记录，避免重复）
    db.prepare('DELETE FROM daily_session_words WHERE session_id = ?').run(sessionId);

    const insertWord = db.prepare(`
      INSERT INTO daily_session_words (session_id, word_id, study_order, main_correct, wrong_pool, spelling_correct, spelling_answer, acceptance_correct, acceptance_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 合并同一词的多阶段结果到一行
    const merged = new Map();
    let order = 0;
    for (const r of mainResults) {
      order++;
      merged.set(r.wordId, { order, wordId: r.wordId, mainCorrect: r.correct ? 1 : 0, wrongPool: r.wrongPool ? 1 : 0 });
    }
    for (const r of spellingResults) {
      if (!merged.has(r.wordId)) merged.set(r.wordId, { order: ++order, wordId: r.wordId });
      const row = merged.get(r.wordId);
      row.spellingCorrect = r.correct ? 1 : 0;
      row.spellingAnswer = r.answer || '';
    }
    for (const r of acceptanceResults) {
      if (!merged.has(r.wordId)) merged.set(r.wordId, { order: ++order, wordId: r.wordId });
      const row = merged.get(r.wordId);
      row.acceptanceCorrect = r.correct ? 1 : 0;
      row.acceptanceAnswer = r.answer || '';
    }
    for (const row of merged.values()) {
      insertWord.run(sessionId, row.wordId, row.order,
        row.mainCorrect ?? null, row.wrongPool ?? 0,
        row.spellingCorrect ?? null, row.spellingAnswer ?? null,
        row.acceptanceCorrect ?? null, row.acceptanceAnswer ?? null);
    }

    // List 完成标记（验收通过时）
    if (acceptancePassed && session.list_no) {
      db.prepare(`
        INSERT INTO list_completion (list_no, first_completed_date)
        VALUES (?, ?)
        ON CONFLICT(list_no) DO NOTHING
      `).run(session.list_no, dateString());
    }
  });
  update();

  res.json({
    ok: true,
    sessionId,
    completed: acceptancePassed ? 1 : 0,
    durationSeconds: finalDuration,
    mainAccuracy: mainTotal ? Math.round((mainCorrect / mainTotal) * 100) : null,
    spellingAccuracy: spellingTotal ? Math.round((spellingCorrect / spellingTotal) * 100) : null,
    acceptanceAccuracy: acceptanceTotal ? Math.round((firstTryCorrect / acceptanceTotal) * 100) : null,
    wrongPoolCount: wrongPoolWords.length,
  });
});

// POST /api/training/abandon — 中途收工（保存部分进度）
// body: { sessionId, durationSeconds, mainResults?, spellingResults? }
router.post('/abandon', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const { sessionId, durationSeconds, mainResults = [] } = req.body || {};

  const session = db.prepare('SELECT * FROM daily_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const serverElapsed = session.start_time
    ? Math.max(0, Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000))
    : 0;
  const finalDuration = Math.min(durationSeconds || 0, serverElapsed || Infinity);

  const mainTotal = mainResults.length;
  const mainCorrect = mainResults.filter(r => r.correct).length;

  db.prepare(`
    UPDATE daily_sessions SET
      status = 'abandoned', duration_seconds = ?, end_time = ?,
      main_accuracy = ?, wrong_pool_count = ?
    WHERE id = ?
  `).run(
    finalDuration,
    new Date().toISOString(),
    mainTotal ? Math.round((mainCorrect / mainTotal) * 100) : null,
    mainResults.filter(r => r.wrongPool).length,
    sessionId
  );

  res.json({ ok: true, sessionId, durationSeconds: finalDuration });
});

module.exports = router;
