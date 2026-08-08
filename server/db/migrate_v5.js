/**
 * v5.0 Migration: v4.0 每日训练流程数据支持
 * - daily_sessions 增加 List 编号/计时/完成标记/各阶段正确率字段
 * - daily_session_words 增加 英译中/中译英/验收 结果字段
 * - 新增 list_completion 表（List 完成/抽查/待重背 状态）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v5.0 Migration: v4.0 Daily Training Flow ===\n');

  // Step 1: daily_sessions new columns
  console.log('[1/4] Upgrading daily_sessions...');
  const sessionCols = [
    ['list_no', 'INTEGER'],
    ['start_time', 'TEXT'],
    ['end_time', 'TEXT'],
    ['duration_seconds', 'INTEGER DEFAULT 0'],
    ['target_minutes', 'INTEGER DEFAULT 60'],
    ['debt_minutes', 'INTEGER DEFAULT 0'],
    ['completed', 'INTEGER DEFAULT 0'],
    ['main_accuracy', 'REAL'],
    ['spelling_accuracy', 'REAL'],
    ['acceptance_accuracy', 'REAL'],
    ['wrong_pool_count', 'INTEGER DEFAULT 0'],
  ];
  for (const [col, type] of sessionCols) {
    try {
      db.exec(`ALTER TABLE daily_sessions ADD COLUMN ${col} ${type}`);
      console.log(`  Added column: ${col}`);
    } catch (e) {
      // already exists
    }
  }

  // Step 2: daily_session_words new columns
  console.log('\n[2/4] Upgrading daily_session_words...');
  const wordCols = [
    ['main_correct', 'INTEGER'],
    ['wrong_pool', 'INTEGER DEFAULT 0'],
    ['spelling_correct', 'INTEGER'],
    ['spelling_answer', 'TEXT'],
    ['acceptance_correct', 'INTEGER'],
    ['acceptance_answer', 'TEXT'],
  ];
  for (const [col, type] of wordCols) {
    try {
      db.exec(`ALTER TABLE daily_session_words ADD COLUMN ${col} ${type}`);
      console.log(`  Added column: ${col}`);
    } catch (e) {
      // already exists
    }
  }

  // Step 3: list_completion table
  console.log('\n[3/4] Creating list_completion table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS list_completion (
      list_no INTEGER PRIMARY KEY,
      first_completed_date TEXT NOT NULL,
      spot_check_date TEXT,
      pending_review INTEGER DEFAULT 0,
      reback_completed_date TEXT
    );
  `);

  // Step 4: verify
  console.log('\n[4/4] Verifying...');
  const session = db.prepare('PRAGMA table_info(daily_sessions)').all().map(c => c.name);
  console.log(`  daily_sessions columns: ${session.length}`);
  const words = db.prepare('PRAGMA table_info(daily_session_words)').all().map(c => c.name);
  console.log(`  daily_session_words columns: ${words.length}`);
  console.log(`  list_completion exists: ${!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='list_completion'").get()}`);

  console.log('\n=== v5.0 Migration Complete ===');
  closeDb();
}

migrate();
