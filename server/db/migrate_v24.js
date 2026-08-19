/**
 * v24.0 Migration: 训练进度快照字段（V7.4.2 断点续练）
 *
 * 给 daily_sessions 增加 progress_json TEXT 字段：
 *   - 训练过程中随时保存"进度快照"（当前阶段/当前词/错词池等任意 JSON）
 *   - 前端据此支持"今日未完成 → 断点续练"
 *
 * 用 PRAGMA table_info 检查列是否存在，不存在才 ALTER TABLE ADD COLUMN。
 *
 * IDEMPOTENT: 可重复执行。
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v24.0 Migration: 训练进度快照字段 ===\n');

  // 检查 daily_sessions.progress_json 列是否存在
  const cols = db.prepare('PRAGMA table_info(daily_sessions)').all().map(c => c.name);
  if (cols.includes('progress_json')) {
    console.log('  ✓ daily_sessions.progress_json 已存在，跳过');
  } else {
    db.exec('ALTER TABLE daily_sessions ADD COLUMN progress_json TEXT');
    console.log('  ✓ daily_sessions 新增列 progress_json TEXT');
  }

  console.log('\n=== v24.0 Migration Complete ===');
  closeDb();
}

migrate();
