/**
 * V7.4.0 学习痕迹 + 学习报告
 *
 * - POST /api/trace       批量记录学习事件（flip / selftest_correct / selftest_wrong）
 * - GET  /api/trace/today 查询某日痕迹（翻卡/自测统计 + 词列表）
 * - GET  /api/trace/report 生成某日学习报告（汇总 + DeepSeek AI 薄弱项/进步项分析）
 *
 * 痕迹与正式成绩分离：study_events 记录"看得到"的痕迹，正确率/掌握度仍只算
 * daily_sessions / daily_session_words 的正式环节。
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// POST /api/trace — 批量记录学习事件
// body: { sessionId?, events: [{ wordId, eventType, answer? }] }
router.post('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { sessionId, events } = req.body || {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array required' });
  }

  const insert = db.prepare(`
    INSERT INTO study_events (user_id, session_id, word_id, event_type, answer)
    VALUES (?, ?, ?, ?, ?)
  `);
  let count = 0;
  const txn = db.transaction(() => {
    for (const ev of events) {
      if (!ev || !ev.wordId || !ev.eventType) continue;
      insert.run(userId, sessionId || null, ev.wordId, ev.eventType, ev.answer || null);
      count++;
    }
  });
  txn();

  res.json({ ok: true, count });
});

// GET /api/trace/today?date=YYYY-MM-DD — 查询某日痕迹
router.get('/today', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const events = db.prepare(`
    SELECT se.id, se.word_id, se.event_type, se.answer, se.created_at, w.word, w.chinese_definition
    FROM study_events se JOIN words w ON w.id = se.word_id
    WHERE se.user_id = ? AND se.session_date = ?
    ORDER BY se.id
  `).all(userId, date);

  const flipIds = new Set(events.filter(e => e.event_type === 'flip').map(e => e.word_id));
  const selftest = events.filter(e => e.event_type.startsWith('selftest'));
  const selftestIds = new Set(selftest.map(e => e.word_id));
  const correct = selftest.filter(e => e.event_type === 'selftest_correct').length;
  const wrong = selftest.filter(e => e.event_type === 'selftest_wrong').length;

  res.json({
    date,
    flipCount: flipIds.size,
    selftestCount: selftestIds.size,
    selftestCorrect: correct,
    selftestWrong: wrong,
    events,
  });
});

// GET /api/trace/report?date=YYYY-MM-DD — 生成学习报告 + AI 分析
router.get('/report', async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  // 1) 痕迹
  const events = db.prepare(`
    SELECT se.word_id, se.event_type, w.word, w.chinese_definition
    FROM study_events se JOIN words w ON w.id = se.word_id
    WHERE se.user_id = ? AND se.session_date = ?
    ORDER BY se.id
  `).all(userId, date);

  const flipIds = new Set(events.filter(e => e.event_type === 'flip').map(e => e.word_id));
  const selftestEvents = events.filter(e => e.event_type.startsWith('selftest'));
  const wrongWords = selftestEvents.filter(e => e.event_type === 'selftest_wrong').map(e => e.word);
  const rightWords = selftestEvents.filter(e => e.event_type === 'selftest_correct').map(e => e.word);

  // 2) 正式训练
  const sessions = db.prepare(`
    SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ?
  `).all(userId, date);
  const trainedSeconds = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
  const completed = sessions.some(s => s.completed);
  const mainAcc = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.main_accuracy || 0), 0) / sessions.length)
    : null;
  const spellingAcc = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.spelling_accuracy || 0), 0) / sessions.length)
    : null;
  const acceptanceAcc = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.acceptance_accuracy || 0), 0) / sessions.length)
    : null;

  const summary = {
    date,
    flipCount: flipIds.size,
    selftestCount: new Set(selftestEvents.map(e => e.word_id)).size,
    selftestCorrect: selftestEvents.filter(e => e.event_type === 'selftest_correct').length,
    selftestWrong: wrongWords.length,
    trainedSeconds,
    completed,
    mainAccuracy: mainAcc,
    spellingAccuracy: spellingAcc,
    acceptanceAccuracy: acceptanceAcc,
  };

  // 3) AI 分析（DeepSeek）
  let ai = null;
  try {
    ai = await analyzeWithAI(summary, wrongWords, rightWords);
  } catch (err) {
    console.warn('AI 分析失败（降级为规则总结）:', err.message);
    ai = fallbackAnalysis(summary, wrongWords, rightWords);
  }

  res.json({ summary, ai, wrongWords: [...new Set(wrongWords)], rightWords: [...new Set(rightWords)] });
});

async function analyzeWithAI(summary, wrongWords, rightWords) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const prompt = `你是一名雅思学习教练。根据学生今日的学习数据，生成简短、具体、可执行的学习总结，指出薄弱项和进步项。

今日学习数据：
- 翻卡背诵：${summary.flipCount} 个单词
- 自测：${summary.selftestCount} 个单词，答对 ${summary.selftestCorrect} 个，答错 ${summary.selftestWrong} 个
- 答错的词：${wrongWords.length ? wrongWords.join('、') : '无'}
- 答对的词：${rightWords.length ? rightWords.join('、') : '无'}
- 正式默写正确率：${summary.mainAccuracy ?? '—'}%
- 正式拼写正确率：${summary.spellingAccuracy ?? '—'}%
- 正式验收正确率：${summary.acceptanceAccuracy ?? '—'}%

请输出严格 JSON（不要额外文字）：
{
  "summary": "一句话总结今日学习状态",
  "weaknesses": ["薄弱项1", "薄弱项2"],
  "strengths": ["进步项1", "进步项2"],
  "advice": "针对明日的一条具体建议"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是雅思学习教练，输出严格 JSON，不要多余文字。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`DeepSeek HTTP ${resp.status}`);
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('No JSON in AI response');
    return JSON.parse(content.slice(start, end + 1));
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackAnalysis(summary, wrongWords, rightWords) {
  const weaknesses = wrongWords.length ? [`自测错词：${wrongWords.join('、')}`] : ['暂无自测错词'];
  const strengths = rightWords.length ? [`自测已掌握：${rightWords.join('、')}`] : ['今日完成翻卡背诵'];
  return {
    summary: summary.completed ? '今日训练已完成，继续保持' : '今日训练未完成，明日补上',
    weaknesses,
    strengths,
    advice: '错词建议明日优先复习',
  };
}

module.exports = router;
