/**
 * v10.0 Migration: 词义判定测试数据
 * - word_meanings: 完整多义项释义 + 判词关键词(来自 v6_meanings.json,2318 词)
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();
  console.log('=== v10.0 Migration: Word Meanings ===\n');

  console.log('[1/2] Creating word_meanings table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS word_meanings (
      word_id INTEGER PRIMARY KEY,
      meanings TEXT NOT NULL,
      keywords TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'youdao',
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  console.log('[2/2] Importing from v6_meanings.json...');
  const dataPath = path.join(__dirname, 'v6_meanings.json');
  if (!fs.existsSync(dataPath)) {
    console.log('v6_meanings.json not found, skip import.');
  } else {
    const state = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const results = state.results || {};
    const words = db.prepare('SELECT id, word FROM words').all();
    const wordIdMap = new Map(words.map(w => [w.word, w.id]));
    const ins = db.prepare(`
      INSERT OR REPLACE INTO word_meanings (word_id, meanings, keywords, source)
      VALUES (?, ?, ?, 'youdao')
    `);
    let imported = 0;
    const tx = db.transaction(() => {
      for (const [word, data] of Object.entries(results)) {
        const id = wordIdMap.get(word);
        if (!id) continue;
        if (!Array.isArray(data.meanings) || data.meanings.length === 0) continue;
        ins.run(id, JSON.stringify(data.meanings), JSON.stringify(data.keywords || []));
        imported++;
      }
    });
    tx();
    console.log(`Imported ${imported} words into word_meanings.`);
  }

  const count = db.prepare('SELECT COUNT(*) c FROM word_meanings').get().c;
  console.log(`word_meanings total rows: ${count}`);

  console.log('\n=== v10.0 Migration Complete ===');
  closeDb();
}

migrate();
