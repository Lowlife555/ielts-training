/**
 * v13.0 Migration: v7.2.1 版本公告
 * - 修复热身页：提交后不再自动跳词、展示对错与答案、跳过按钮无输入也可前进、最后可进入主任务
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v13.0 Migration: v7.2.1 Announcement ===\n');

  const content = JSON.stringify([
    '修复热身流程两个问题：',
    '1. 提交答案后不再自动跳转——停留展示对/错与正确答案，点「下一个」或按 Enter 前进',
    '2. 无输入时点「跳过」也能前进，最后一题点「跳过/开始主任务」可正常进入背诵环节',
    '3. 新增设置页：读音音源（本地/有道/百度）、音色、音标开关、番茄钟休息时长、每日目标时长',
    '4. 背诵页支持 3D 翻卡：默认看完整释义，点卡片翻转核对英文+音标',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('v7.2.1', 'v7.2.1 更新', ?)
  `).run(content);

  console.log('v7.2.1 announcement seeded.');
  console.log('\n=== v13.0 Migration Complete ===');
  closeDb();
}

migrate();
