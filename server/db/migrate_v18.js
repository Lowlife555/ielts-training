/**
 * v18.0 Migration: V7.3.1 结算与进度
 * - training_summaries：每次训练结算（词级明细 + 时长 + 各环节正确率）
 * - daily_sessions 增加 completed_batches（已完成批次，用于断点续训）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v18.0 Migration: Training Summary & Progress ===\n');

  console.log('[1/2] Creating training_summaries table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      list_no INTEGER,
      duration_seconds INTEGER DEFAULT 0,
      main_accuracy REAL,
      spelling_accuracy REAL,
      acceptance_accuracy REAL,
      spot_accuracy REAL,
      completed INTEGER DEFAULT 0,
      word_stats TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (session_id) REFERENCES daily_sessions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_summaries_user_time ON training_summaries (user_id, created_at);
  `);
  console.log('training_summaries table ready.');

  console.log('[2/2] Adding completed_batches to daily_sessions...');
  const cols = db.prepare('PRAGMA table_info(daily_sessions)').all().map(c => c.name);
  if (!cols.includes('completed_batches')) {
    db.exec('ALTER TABLE daily_sessions ADD COLUMN completed_batches INTEGER DEFAULT 0');
    console.log('completed_batches column added.');
  } else {
    console.log('completed_batches already exists, skip.');
  }

  console.log('\n=== v18.0 Migration Complete ===');
  closeDb();
}

migrate();
