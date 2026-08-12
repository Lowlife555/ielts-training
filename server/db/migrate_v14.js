/**
 * v14.0 Migration: 用户记忆 KV 存储系统
 * - 新建 user_kv 表（user_id + key 复合主键，value 存 JSON）
 * - 将现有 user_settings 数据迁移到 KV（key 格式：settings.voiceSource 等）
 * - user_settings 表保留不动（兼容运行），此后新用户数据优先写入 KV
 *
 * IDEMPOTENT: Safe to run multiple times. INSERT OR IGNORE 保证不重复。
 *             如果已是 KV 中没有的记录，补迁；已有则跳过。
 */
const { getDb, closeDb } = require('./database');

/**
 * user_settings → KV key 映射
 * 命名规范：namespace.camelCaseKey
 *   - settings.*  用户偏好设置
 *   - 未来可扩展：ui.*, training.*, writing.* 等
 */
const SETTINGS_ROW_MAP = {
  voice_source:      'settings.voiceSource',
  voice_accent:      'settings.voiceAccent',
  show_phonetic:     'settings.showPhonetic',
  rest_minutes:      'settings.restMinutes',
  base_target_minutes: 'settings.baseTargetMinutes',
};

function migrate() {
  const db = getDb();
  console.log('=== v14.0 Migration: User KV Storage ===\n');

  // 1. 建表
  console.log('[1/3] Creating user_kv table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_kv (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '""',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_kv_user ON user_kv (user_id);
  `);
  console.log('user_kv table ready.');

  // 2. 为后续高效读取常一起访问的 key，建 (user_id, key) 已经是 PK 索引
  console.log('[2/3] Checking table structure...');
  const cols = db.prepare("PRAGMA table_info('user_kv')").all();
  console.log(`  ${cols.length} columns, primary key on: ${cols.filter(c => c.pk).map(c => c.name).join(', ')}`);

  // 3. 迁移 user_settings → KV（仅当 user_settings 表存在时）
  console.log('[3/3] Migrating user_settings → KV...');
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
  ).get();

  if (!tableCheck) {
    console.log('  user_settings table not found — skipping migration.');
    console.log('\n=== v14.0 Migration Complete ===');
    closeDb();
    return;
  }

  const rows = db.prepare('SELECT * FROM user_settings').all();
  if (rows.length === 0) {
    console.log('  No rows in user_settings — nothing to migrate.');
    console.log('\n=== v14.0 Migration Complete ===');
    closeDb();
    return;
  }

  const upsert = db.prepare(`
    INSERT OR IGNORE INTO user_kv (user_id, key, value, updated_at)
    VALUES (?, ?, ?, COALESCE(?, datetime('now')))
  `);

  let count = 0;
  for (const row of rows) {
    for (const [col, kvKey] of Object.entries(SETTINGS_ROW_MAP)) {
      let val = row[col];
      // SQLite stores booleans as 0/1 — 转回 JS 语义存入 JSON
      if (col === 'show_phonetic') {
        val = val ? true : false;
      }
      upsert.run(row.user_id, kvKey, JSON.stringify(val), row.updated_at);
      count++;
    }
  }

  console.log(`  Migrated ${rows.length} users × ${Object.keys(SETTINGS_ROW_MAP).length} keys = ${count} KV entries.`);

  // 验证
  const kvCount = db.prepare('SELECT COUNT(*) as cnt FROM user_kv').get();
  console.log(`  user_kv total rows after migration: ${kvCount.cnt}`);

  console.log('\n=== v14.0 Migration Complete ===');
  closeDb();
}

migrate();
