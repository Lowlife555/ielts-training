const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

const DEFAULTS = {
  voiceSource: 'local',
  voiceAccent: 'us',
  showPhonetic: true,
  restMinutes: 5,
  baseTargetMinutes: 60,
};

const ROW_MAP = {
  voiceSource: 'voice_source',
  voiceAccent: 'voice_accent',
  showPhonetic: 'show_phonetic',
  restMinutes: 'rest_minutes',
  baseTargetMinutes: 'base_target_minutes',
};

const VALID = {
  voiceSource: ['local', 'youdao', 'baidu'],
  voiceAccent: ['us', 'uk'],
  showPhonetic: [true, false],
  restMinutes: [3, 5, 10],
  baseTargetMinutes: [30, 45, 60, 90, 120],
};

function rowToSettings(row) {
  if (!row) return { ...DEFAULTS };
  return {
    voiceSource: row.voice_source,
    voiceAccent: row.voice_accent,
    showPhonetic: !!row.show_phonetic,
    restMinutes: row.rest_minutes,
    baseTargetMinutes: row.base_target_minutes,
  };
}

// GET /api/settings — 当前用户设置（缺省值兜底）
router.get('/', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  res.json(rowToSettings(row));
});

// PUT /api/settings — 部分更新（body 里给哪些字段改哪些）
router.put('/', (req, res) => {
  const db = getDb();
  const body = req.body || {};
  const current = rowToSettings(db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id));

  const updates = {};
  for (const key of Object.keys(ROW_MAP)) {
    if (body[key] === undefined) continue;
    if (!VALID[key].includes(body[key])) {
      return res.status(400).json({ error: `无效设置: ${key}` });
    }
    updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '没有需要更新的设置' });
  }

  const merged = { ...current, ...updates };
  db.prepare(`
    INSERT INTO user_settings (user_id, voice_source, voice_accent, show_phonetic, rest_minutes, base_target_minutes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (user_id) DO UPDATE SET
      voice_source = excluded.voice_source,
      voice_accent = excluded.voice_accent,
      show_phonetic = excluded.show_phonetic,
      rest_minutes = excluded.rest_minutes,
      base_target_minutes = excluded.base_target_minutes,
      updated_at = datetime('now')
  `).run(
    req.user.id,
    merged.voiceSource,
    merged.voiceAccent,
    merged.showPhonetic ? 1 : 0,
    merged.restMinutes,
    merged.baseTargetMinutes
  );

  res.json(merged);
});

module.exports = router;
