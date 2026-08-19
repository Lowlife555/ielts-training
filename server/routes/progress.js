/**
 * V7.4.2 训练进度快照（断点续练）
 *
 * - POST /api/progress         保存进度快照（任意 JSON 对象，直接 JSON.stringify 存储）
 * - GET  /api/progress/current 获取最新未完成会话的快照（断点续练）
 *
 * snapshot 结构由前端定义（当前阶段/当前词/错词池等），服务端只负责存取，
 * 不解析内容。
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// POST /api/progress — 保存进度快照
// body: { sessionId, snapshot }（snapshot 为任意 JSON 对象）
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { sessionId, snapshot } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return res.status(400).json({ error: 'snapshot must be an object' });
    }

    // 校验会话属于当前用户
    const session = db.prepare(
      'SELECT * FROM daily_sessions WHERE id = ? AND user_id = ?'
    ).get(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.prepare('UPDATE daily_sessions SET progress_json = ? WHERE id = ?')
      .run(JSON.stringify(snapshot), sessionId);

    res.json({ ok: true });
  } catch (err) {
    console.warn('保存进度快照失败:', err.message);
    res.status(500).json({ error: '保存进度快照失败' });
  }
});

// GET /api/progress/current — 获取最新未完成会话的进度快照
router.get('/current', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const row = db.prepare(`
      SELECT id, list_no, progress_json FROM daily_sessions
      WHERE user_id = ? AND progress_json IS NOT NULL AND progress_json != '' AND completed = 0
      ORDER BY id DESC LIMIT 1
    `).get(userId);

    if (!row) {
      return res.json({ resume: null });
    }

    try {
      const snapshot = JSON.parse(row.progress_json);
      res.json({ resume: { sessionId: row.id, listNo: row.list_no, snapshot } });
    } catch (e) {
      // progress_json 不是合法 JSON → 无可恢复快照
      res.json({ resume: null });
    }
  } catch (err) {
    console.warn('获取进度快照失败:', err.message);
    res.status(500).json({ error: '获取进度快照失败' });
  }
});

module.exports = router;
