/**
 * v22.0 Migration: 修复迁移链断裂
 *
 * 背景：migrate_v6.js（用户系统：sessions 表 + list_completion per-user 隔离）
 * 不在 package.json 的 migrate:all 链里（链跳过了 v6/v7/v8）。
 * 现有环境因历史部署表已存在未暴露，但全新环境会：
 *   1. sessions 表缺失 → 登录/注册报 "no such table: sessions"
 *   2. list_completion 仍是 v5 结构（无 user_id）→ daily-plan 查询报 "no such column: user_id"
 *
 * 本迁移幂等补齐这两处，可安全重复执行。
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v22.0 Migration: 修复迁移链断裂 ===\n');

  // 1. sessions 表（token 会话，requireAuth 依赖）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log('  ✓ sessions 表就绪');

  // 2. list_completion per-user 隔离（v5 无 user_id，v6 重建但不在链）
  const cols = db.prepare('PRAGMA table_info(list_completion)').all().map(c => c.name);
  if (!cols.includes('user_id')) {
    console.log('  list_completion 缺少 user_id，重建为 per-user 结构...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS list_completion_new (
        user_id INTEGER NOT NULL DEFAULT 1,
        list_no INTEGER NOT NULL,
        first_completed_date TEXT NOT NULL,
        spot_check_date TEXT,
        pending_review INTEGER DEFAULT 0,
        reback_completed_date TEXT,
        PRIMARY KEY (user_id, list_no)
      );
      INSERT OR IGNORE INTO list_completion_new (user_id, list_no, first_completed_date, spot_check_date, pending_review, reback_completed_date)
      SELECT 1, list_no, first_completed_date, spot_check_date, pending_review, reback_completed_date FROM list_completion;
      DROP TABLE list_completion;
      ALTER TABLE list_completion_new RENAME TO list_completion;
    `);
    console.log('  ✓ list_completion 已重建');
  } else {
    console.log('  ✓ list_completion 已含 user_id，无需处理');
  }

  console.log('\n=== v22.0 Migration Complete ===');
  closeDb();
}

migrate();
