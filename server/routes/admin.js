const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAdmin, hashPassword } = require('../auth');
const { computeDebtChain, dateString } = require('./dailyPlan');

function getUserStats(db, userId) {
  const today = dateString();

  const todaySessions = db.prepare(
    'SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ?'
  ).all(userId, today);
  const todayTrained = todaySessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);

  const totals = db.prepare(`
    SELECT
      COUNT(*) as totalSessions,
      SUM(duration_seconds) as totalSeconds,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedSessions
    FROM daily_sessions WHERE user_id = ?
  `).get(userId);

  const listsDone = db.prepare(
    'SELECT COUNT(*) c FROM list_completion WHERE user_id = ?'
  ).get(userId).c;

  const pendingReview = db.prepare(
    'SELECT COUNT(*) c FROM list_completion WHERE user_id = ? AND pending_review = 1'
  ).get(userId).c;

  const mastered = db.prepare(
    'SELECT COUNT(*) c FROM user_word_progress WHERE user_id = ? AND mastered = 1'
  ).get(userId).c;

  const debt = computeDebtChain(db, userId).debt;

  return {
    todayTrainedSeconds: todayTrained,
    todayCompleted: todaySessions.some(s => s.completed),
    totalSessions: totals.totalSessions || 0,
    totalSeconds: totals.totalSeconds || 0,
    completedSessions: totals.completedSessions || 0,
    listsDone,
    pendingReviewLists: pendingReview,
    masteredWords: mastered,
    debtMinutes: debt,
  };
}

// GET /api/admin/users — 所有账号 + 状态
router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, is_admin, status, created_at, last_login_at FROM users ORDER BY id').all();
  const list = users.map(u => ({ ...u, stats: getUserStats(db, u.id) }));
  res.json({ users: list });
});

// POST /api/admin/users/:id/reset-password { newPassword }
router.post('/users/:id/reset-password', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: '新密码至少 6 位' });
  }
  if (id === req.user.id) return res.status(400).json({ error: '不能重置自己的密码' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), id);
  // 重置密码后踢出所有会话
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/toggle-status — 禁用/启用
router.post('/users/:id/toggle-status', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: '不能操作自己的账号' });

  const user = db.prepare('SELECT id, status FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const next = user.status === 'active' ? 'disabled' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(next, id);
  if (next === 'disabled') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  res.json({ ok: true, status: next });
});

module.exports = router;
