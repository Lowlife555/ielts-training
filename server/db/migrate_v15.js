/**
 * v15.0 Migration: v7.2.2 版本公告
 * - 修复热身反馈、单卡翻卡、设置齿轮入口、KV 用户记忆存储系统
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v15.0 Migration: v7.2.2 Announcement ===\n');

  const content = JSON.stringify([
    'v7.2.2 更新内容：',
    '1. 修复背诵单词表：点击单词卡片只翻转该卡片（此前会全部一起翻）',
    '2. 修复热身反馈：提交后停留展示对/错与正确答案，按 Enter 太快不会再跳过',
    '3. 设置入口：顶部导航栏新增齿轮图标，点击直达设置页',
    '4. 全新用户记忆存储系统（KV）：设置等用户数据统一云端存储，后续版本迭代不再丢设置',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('v7.2.2', 'v7.2.2 更新', ?)
  `).run(content);

  console.log('v7.2.2 announcement seeded.');
  console.log('\n=== v15.0 Migration Complete ===');
  closeDb();
}

migrate();
