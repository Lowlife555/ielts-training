/**
 * v19.0 Migration: v7.3.1 版本公告
 * - 默写对错都手动前进 + 答对显示完整释义
 * - 抽查改输入判分（与默写形式一致）
 * - 修复验收页崩溃（finish TDZ）导致拼写测试无法提交
 * - 训练结算弹窗 + 历史日历页
 * - 断点续训（批次进度保留）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v19.0 Migration: v7.3.1 Announcement ===\n');

  const content = JSON.stringify([
    'V7.3.1 更新内容：',
    '1. 中文默写：答对答错都会停留展示对/错与完整释义，点「下一个」手动前进',
    '2. 抽查改为输入判分：看英文输入中文，系统判断对错（与默写形式一致）',
    '3. 修复拼写测试完成后无法提交的问题（验收页崩溃）',
    '4. 新增训练结算：完成训练后弹窗展示词级明细（每个词错了几次+用时），可随时重新打开',
    '5. 设置页新增「训练历史」：日历样式查看每次训练记录',
    '6. 断点续训：中途退出保留批次进度，下次可从断点继续',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('V7.3.1', 'V7.3.1 更新', ?)
  `).run(content);

  console.log('V7.3.1 announcement seeded.');
  console.log('\n=== v19.0 Migration Complete ===');
  closeDb();
}

migrate();
