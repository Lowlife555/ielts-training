/**
 * v9.0 Migration: 新版本公告
 * - announcements：版本公告（version 唯一）
 * - user_announcements：用户已读记录（每个版本每人仅首次显示）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v9.0 Migration: Announcements ===\n');

  console.log('[1/2] Creating tables...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_announcements (
      user_id INTEGER NOT NULL,
      announcement_id INTEGER NOT NULL,
      seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, announcement_id),
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    );
  `);

  console.log('[2/2] Seeding v5.4 announcement...');
  const content = JSON.stringify([
    '右上角新增模式切换按钮：触屏模式下随时可一键切回桌面模式（此前触屏模式无返回入口）',
    '新增新版本公告：每次版本更新，首次进入自动弹出更新说明',
    '触屏模式右上角新增操作帮助入口：查看全部触屏操作指引',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('v5.4', '新版本更新', ?)
  `).run(content);

  console.log('\n=== v9.0 Migration Complete ===');
  closeDb();
}

migrate();
