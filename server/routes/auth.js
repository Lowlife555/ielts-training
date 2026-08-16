const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth, createSession, hashPassword, verifyPassword } = require('../auth');

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;

function isDefaultUnclaimed(db) {
  const user = db.prepare('SELECT id, username, password_hash FROM users ORDER BY id LIMIT 1').get();
  return user && user.id === 1 && user.username === 'default' && !user.password_hash;
}

/** 管理员由环境变量 ADMIN_USERNAME 显式指定，不再"首个注册者自动提权" */
function isAdminUsername(username) {
  const adminName = (process.env.ADMIN_USERNAME || '').trim();
  return !!adminName && username === adminName;
}

// POST /api/auth/register { username, password }
// 规则：开放注册；管理员由环境变量 ADMIN_USERNAME 指定（首个注册者仅接管 default 用户数据，不再自动提权）
router.post('/register', (req, res) => {
  const db = getDb();
  const { username, password } = req.body || {};

  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: '用户名需为 2-20 位字母/数字/下划线/中文' });
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });

  const isAdmin = isAdminUsername(username) ? 1 : 0;

  if (isDefaultUnclaimed(db)) {
    // 首个注册者：接管 default 用户（id=1），数据原地不动；管理员身份由 ADMIN_USERNAME 决定
    db.prepare(`
      UPDATE users SET username = ?, password_hash = ?, is_admin = ?, status = 'active'
      WHERE id = 1
    `).run(username, hashPassword(String(password)), isAdmin);
    const user = db.prepare('SELECT id, username, is_admin, is_test FROM users WHERE id = 1').get();
    const token = createSession(user.id);
    return res.json({ token, user: { ...user, isAdmin: !!user.is_admin, isTest: !!user.is_test } });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '用户名已被注册' });

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, is_admin, status, created_at)
    VALUES (?, ?, ?, 'active', ?)
  `).run(username, hashPassword(String(password)), isAdmin, new Date().toISOString());

  const user = db.prepare('SELECT id, username, is_admin, is_test FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = createSession(user.id);
  res.json({ token, user: { ...user, isAdmin: !!user.is_admin, isTest: !!user.is_test } });
});

// POST /api/auth/login { username, password }
router.post('/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: '账号已被禁用，请联系管理员' });

  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
  const token = createSession(user.id);
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: !!user.is_admin, isTest: !!user.is_test } });
});

// POST /api/auth/logout — 销毁当前 token
router.post('/logout', requireAuth, (req, res) => {
  const db = getDb();
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

// GET /api/auth/me — 当前登录用户
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
