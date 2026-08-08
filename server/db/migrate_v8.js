/**
 * v8.0 Migration: 学习模式（List 选择）
 * - users 增加 study_mode（sequential/custom）+ custom_list_no
 * - 顺序模式：按 List 1→24 自动推进
 * - 自定义模式：固定学用户选定的 List（插队，不影响顺序进度）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v8.0 Migration: Study Mode ===\n');

  console.log('[1/1] Upgrading users...');
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  const add = [
    ['study_mode', 'TEXT DEFAULT "sequential"'],
    ['custom_list_no', 'INTEGER'],
  ];
  for (const [col, type] of add) {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
      console.log(`  Added column: ${col}`);
    } else {
      console.log(`  ${col} already exists`);
    }
  }

  console.log('\n=== v8.0 Migration Complete ===');
  closeDb();
}

migrate();
