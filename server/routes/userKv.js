/**
 * /api/user-kv — 用户记忆 KV 存储
 *
 * GET  /api/user-kv          — 获取当前用户全部 KV（可选 ?keys=k1,k2 过滤）
 * GET  /api/user-kv/:key     — 获取单个 key
 * PUT  /api/user-kv          — 批量 upsert（body: { "k1": v1, "k2": v2 }）
 * DELETE /api/user-kv/:key   — 删除单个 key
 *
 * 所有 value 均为 JSON 值（字符串/数字/布尔/数组/对象），存取自动序列化/反序列化。
 * 遵循项目风格：requireAuth 中间件、getDb()、CommonJS。
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

/**
 * GET /api/user-kv
 * 查询参数 ?keys=k1,k2,k3 — 仅返回指定 key（逗号分隔）
 * 无参数时返回当前用户全部 KV
 */
router.get('/', (req, res) => {
  const db = getDb();
  const keysParam = req.query.keys;

  let rows;
  if (keysParam) {
    const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return res.json({});
    }
    const placeholders = keys.map(() => '?').join(',');
    rows = db.prepare(
      `SELECT key, value FROM user_kv WHERE user_id = ? AND key IN (${placeholders})`
    ).all(req.user.id, ...keys);
  } else {
    rows = db.prepare(
      'SELECT key, value FROM user_kv WHERE user_id = ?'
    ).all(req.user.id);
  }

  const result = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  res.json(result);
});

/**
 * GET /api/user-kv/:key — 获取单个 key
 * 不存在的 key 返回 404
 */
router.get('/:key', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT key, value FROM user_kv WHERE user_id = ? AND key = ?'
  ).get(req.user.id, req.params.key);

  if (!row) {
    return res.status(404).json({ error: `Key not found: ${req.params.key}` });
  }

  let parsed;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = row.value;
  }
  res.json({ [row.key]: parsed });
});

/**
 * PUT /api/user-kv — 批量 upsert
 * Body: { "settings.voiceSource": "local", "ui.theme": "dark" }
 * 接受任意 JSON 值（字符串、数字、布尔、数组、对象均自动序列化）
 * 返回写入后的完整 key-value 对象
 */
router.put('/', (req, res) => {
  const db = getDb();
  const body = req.body || {};

  if (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return res.status(400).json({ error: '请求体必须是非空对象 { key: value }' });
  }

  const upsert = db.prepare(`
    INSERT INTO user_kv (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `);

  const result = {};
  const txn = db.transaction(() => {
    for (const [key, value] of Object.entries(body)) {
      const jsonValue = JSON.stringify(value);
      upsert.run(req.user.id, key, jsonValue);
      result[key] = value;
    }
  });
  txn();

  res.json(result);
});

/**
 * DELETE /api/user-kv/:key — 删除单个 key
 * 不存在的 key 也返回 200（幂等删除）
 */
router.delete('/:key', (req, res) => {
  const db = getDb();
  db.prepare(
    'DELETE FROM user_kv WHERE user_id = ? AND key = ?'
  ).run(req.user.id, req.params.key);

  res.json({ deleted: req.params.key });
});

module.exports = router;
