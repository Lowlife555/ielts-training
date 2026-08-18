/**
 * v23.0 Migration: 学习痕迹事件表（V7.4.0 学习留痕）
 *
 * 记录"看得到但不计入正式成绩"的学习痕迹：
 *   - flip            翻卡看释义
 *   - selftest_correct 自测答对
 *   - selftest_wrong   自测答错
 *
 * 正式环节（默写/拼写/验收/抽查）仍由 daily_sessions / daily_session_words 记录，
 * 两者分开，历史页"看得到全部"，但正确率/掌握度只算正式环节。
 *
 * IDEMPOTENT: 可重复执行。
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v23.0 Migration: 学习痕迹事件表 ===\n');

  db.exec(`
    CREATE TABLE IF NOT EXISTS study_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER,
      word_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      answer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      session_date TEXT NOT NULL DEFAULT (date('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_study_events_user_date ON study_events(user_id, session_date);
  `);
  console.log('  ✓ study_events 表就绪');

  console.log('\n=== v23.0 Migration Complete ===');
  closeDb();
}

migrate();
