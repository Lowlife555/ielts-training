/**
 * v11.0 Migration: 每日训练番茄钟批次大小
 * - daily_sessions 增加 batch_size INTEGER(本次训练每批背诵词数 30/40/50/100)
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v11.0 Migration: Training Batch Size ===\n');

  console.log('[1/1] Adding batch_size column to daily_sessions...');
  const cols = db.prepare('PRAGMA table_info(daily_sessions)').all().map(c => c.name);
  if (!cols.includes('batch_size')) {
    db.exec('ALTER TABLE daily_sessions ADD COLUMN batch_size INTEGER');
    console.log('batch_size column added.');
  } else {
    console.log('batch_size already exists, skip.');
  }

  console.log('\n=== v11.0 Migration Complete ===');
  closeDb();
}

migrate();
