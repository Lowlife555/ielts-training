/**
 * v17.0 Migration: v7.2.4 版本公告
 * - 判分优化：英文拼写容错(词形变化+编辑距离≤1)、中文近义词库(IELTS+PET 全量)
 * - PET 词库修复：单字核心义/空释义/脏词名补齐
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v17.0 Migration: v7.2.4 Announcement ===\n');

  const content = JSON.stringify([
    'V7.2.4 判分优化更新：',
    '1. 英文拼写容错：词形变化（复数/过去式/进行时）+ 编辑距离≤1（如 silence 打成 silense 也判对）',
    '2. 中文近义词库：IELTS 2318 词 + PET 1720 词全部生成近义表达（如释义"寂静"写"安静"也判对）',
    '3. PET 词库修复：单字核心义（如 sugar→糖）、空释义、脏词名全部补齐',
    '4. 场景分级：学习场景全开容错；验收/抽查保持严格（仅认可正确词形）',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('V7.2.4', 'V7.2.4 更新', ?)
  `).run(content);

  console.log('V7.2.4 announcement seeded.');
  console.log('\n=== v17.0 Migration Complete ===');
  closeDb();
}

migrate();
