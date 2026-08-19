/**
 * v25.0 Migration: v7.4.3 版本公告
 * - 抽查/热身 双 Enter 触发修复（提交与翻页合并为一次按键）
 * - 独立拼写测试 / 词义判定 改为手动前进（提交后停留展示答案）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v25.0 Migration: v7.4.3 Announcement ===\n');

  const content = JSON.stringify([
    'V7.4.3 测验统一手动前进：',
    '1. 修复抽查环节按 Enter 直接跳下一词（应停留展示答案后手动前进）',
    '2. 热身环节同步修复同类双触发隐患，去掉 700ms 等待限制',
    '3. 独立拼写测试、词义判定改为提交后展示答案，由用户点「下一个」/ Enter 前进',
    '4. 答对也展示正确答案，便于巩固记忆',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('V7.4.3', 'V7.4.3 更新', ?)
  `).run(content);

  console.log('V7.4.3 announcement seeded.');
  console.log('\n=== v25.0 Migration Complete ===');
  closeDb();
}

migrate();
