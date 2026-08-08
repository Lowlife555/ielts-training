/**
 * v6.0 Migration: 用户系统（注册/登录/管理）
 * - users 增加 password_hash / is_admin / status / last_login_at
 * - 新增 sessions 表（token 会话）
 * - list_completion 重建为按用户隔离（user_id + list_no 复合主键）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v6.0 Migration: User System ===\n');

  // Step 1: users new columns
  console.log('[1/4] Upgrading users...');
  const userCols = [
    ['password_hash', 'TEXT'],
    ['is_admin', 'INTEGER DEFAULT 0'],
    ['status', 'TEXT DEFAULT "active"'],
    ['last_login_at', 'TEXT'],
  ];
  for (const [col, type] of userCols) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
      console.log(`  Added column: ${col}`);
    } catch (e) {
      // already exists
    }
  }

  // Step 2: sessions table
  console.log('\n[2/4] Creating sessions table...');
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
  console.log('  sessions table ready');

  // Step 3: rebuild list_completion with per-user isolation
  console.log('\n[3/4] Rebuilding list_completion (per-user)...');
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
  `);
  db.exec(`
    INSERT OR IGNORE INTO list_completion_new (user_id, list_no, first_completed_date, spot_check_date, pending_review, reback_completed_date)
    SELECT 1, list_no, first_completed_date, spot_check_date, pending_review, reback_completed_date
    FROM list_completion;
  `);
  db.exec('DROP TABLE IF EXISTS list_completion');
  db.exec('ALTER TABLE list_completion_new RENAME TO list_completion');
  console.log('  list_completion rebuilt with PRIMARY KEY (user_id, list_no)');

  // Step 4: verify
  console.log('\n[4/4] Verifying...');
  console.log(`  users columns: ${db.prepare('PRAGMA table_info(users)').all().map(c => c.name).join(', ')}`);
  console.log(`  sessions exists: ${!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get()}`);
  console.log(`  list_completion keys: ${db.prepare('PRAGMA table_info(list_completion)').all().map(c => c.name).join(', ')}`);

  console.log('\n=== v6.0 Migration Complete ===');
  closeDb();
}

migrate();
