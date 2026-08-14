/**
 * v20.0 Migration: v7.3.2 版本公告
 * - 判分增强：中文异形词归一化（雇佣↔雇用、帐↔账）+ 保守字符重叠
 * - 参考开源方案（RapidFuzz/FuzzyWuzzy 的 token 思想 + HanLP 异形词处理）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v20.0 Migration: v7.3.2 Announcement ===\n');

  const content = JSON.stringify([
    'V7.3.2 判分增强：',
    '1. 中文异形词归一化：雇佣↔雇用、帐↔账、繁体↔简体等常见变体自动识别',
    '2. 保守字符重叠容错：释义与输入共享核心字符时判对',
    '3. 零误伤：无关答案（如"苹果"）不会误判',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('V7.3.2', 'V7.3.2 更新', ?)
  `).run(content);

  console.log('V7.3.2 announcement seeded.');
  console.log('\n=== v20.0 Migration Complete ===');
  closeDb();
}

migrate();
