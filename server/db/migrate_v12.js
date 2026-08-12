/**
 * v12.0 Migration: 用户设置（读音音源/音色/音标开关/番茄钟休息时长/每日目标时长）
 * - 新建 user_settings 表（user_id 主键，与 users 一一对应）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

const DEFAULTS = {
  voice_source: 'local',
  voice_accent: 'us',
  show_phonetic: 1,
  rest_minutes: 5,
  base_target_minutes: 60,
};

function migrate() {
  const db = getDb();
  console.log('=== v12.0 Migration: User Settings ===\n');

  console.log('[1/2] Creating user_settings table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      voice_source TEXT NOT NULL DEFAULT 'local',
      voice_accent TEXT NOT NULL DEFAULT 'us',
      show_phonetic INTEGER NOT NULL DEFAULT 1,
      rest_minutes INTEGER NOT NULL DEFAULT 5,
      base_target_minutes INTEGER NOT NULL DEFAULT 60,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log('user_settings table ready.');

  console.log('[2/2] Backfilling defaults for existing users...');
  const users = db.prepare('SELECT id FROM users').all();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, voice_source, voice_accent, show_phonetic, rest_minutes, base_target_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let n = 0;
  for (const u of users) {
    insert.run(u.id, DEFAULTS.voice_source, DEFAULTS.voice_accent, DEFAULTS.show_phonetic, DEFAULTS.rest_minutes, DEFAULTS.base_target_minutes);
    n++;
  }
  console.log(`Backfilled ${n} users.`);

  console.log('\n=== v12.0 Migration Complete ===');
  closeDb();
}

migrate();
