/**
 * v16.0 Migration: 判分近义词库
 * - word_meanings 增加 synonyms 列（JSON 数组：中文近义表达变体）
 * - 数据填充由 server/scripts/enrichSynonyms.js 独立完成（DeepSeek 批量，不在部署流程内）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v16.0 Migration: Synonyms Column ===\n');

  console.log('[1/1] Adding synonyms column to word_meanings...');
  const cols = db.prepare('PRAGMA table_info(word_meanings)').all().map(c => c.name);
  if (!cols.includes('synonyms')) {
    db.exec('ALTER TABLE word_meanings ADD COLUMN synonyms TEXT');
    console.log('synonyms column added.');
  } else {
    console.log('synonyms already exists, skip.');
  }

  console.log('\n=== v16.0 Migration Complete ===');
  closeDb();
}

migrate();
