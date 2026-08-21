/**
 * v26.0 Migration: 中译英选词优化词表（V7.4.5）
 *
 * 建两张词表，供中译英拼写选词做"优先级分层"：
 *   - zhenti_spelling_words: 真题考过拼写的词（剑桥雅思听力拼写词库 2031 + 词库已有 Cambridge 真题词 282，合并 2255）
 *   - oxford_words: 牛津 5000 常用词（A1–C1，去重 4054）
 *
 * 选词策略（server/routes/training.js）：
 *   1) 优先真题拼写词
 *   2) 不足则用牛津 5000 常用词
 *   3) 再不足用 List 剩余词随机补足（保证每天 ≥20 词）
 *
 * 词表文件: server/db/data/zhenti_spelling_words.txt / oxford_5000.txt
 * IDEMPOTENT: 可重复执行。
 */
const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

function loadWords(fileName) {
  const file = path.join(__dirname, 'data', fileName);
  if (!fs.existsSync(file)) {
    console.log(`  ⚠ ${fileName} 不存在，跳过导入`);
    return [];
  }
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

function migrate() {
  const db = getDb();
  console.log('=== v26.0 Migration: 中译英选词词表 ===\n');

  db.exec(`CREATE TABLE IF NOT EXISTS zhenti_spelling_words (
    word TEXT PRIMARY KEY
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS oxford_words (
    word TEXT PRIMARY KEY
  )`);

  const seedZhenti = db.prepare('INSERT OR IGNORE INTO zhenti_spelling_words (word) VALUES (?)');
  const zhentiWords = loadWords('zhenti_spelling_words.txt');
  db.transaction(() => {
    for (const w of zhentiWords) seedZhenti.run(w);
  })();
  const zhentiCount = db.prepare('SELECT COUNT(*) AS c FROM zhenti_spelling_words').get().c;
  console.log(`  ✓ zhenti_spelling_words: ${zhentiCount} 词（导入 ${zhentiWords.length} 条）`);

  const seedOxf = db.prepare('INSERT OR IGNORE INTO oxford_words (word) VALUES (?)');
  const oxfWords = loadWords('oxford_5000.txt');
  db.transaction(() => {
    for (const w of oxfWords) seedOxf.run(w);
  })();
  const oxfCount = db.prepare('SELECT COUNT(*) AS c FROM oxford_words').get().c;
  console.log(`  ✓ oxford_words: ${oxfCount} 词（导入 ${oxfWords.length} 条）`);

  const content = JSON.stringify([
    'V7.4.5 中译英选词优化：',
    '1. 优先选择真题中考过拼写的词（剑桥听力拼写词库 2031 + 真题词 282）',
    '2. 其次选牛津 5000 常用词',
    '3. 数量不够时用本 List 剩余词随机补足，保证每天 ≥20 词',
    '4. 告别生僻词，练的都是真题考过的拼写',
  ]);
  db.prepare(`
    INSERT OR IGNORE INTO announcements (version, title, content)
    VALUES ('V7.4.5', 'V7.4.5 更新', ?)
  `).run(content);
  console.log('V7.4.5 announcement seeded.');

  console.log('\n=== v26.0 Migration Complete ===');
  closeDb();
}

migrate();
