const { getDb } = require('./db/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SESSION_DAYS = 30;

function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
  db.prepare(
    'INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(userId, token, now.toISOString(), expires.toISOString());
  return token;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

/** 校验 Bearer token，注入 req.user */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: '未登录' });

  const db = getDb();
  const session = db.prepare(`
    SELECT s.user_id, u.username, u.is_admin, u.status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) return res.status(401).json({ error: '登录已过期，请重新登录' });
  if (session.status !== 'active') return res.status(403).json({ error: '账号已被禁用' });

  req.user = { id: session.user_id, username: session.username, isAdmin: session.is_admin };
  next();
}

/** 校验 token 且要求管理员 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: '需要管理员权限' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin, createSession, hashPassword, verifyPassword, SESSION_DAYS };
