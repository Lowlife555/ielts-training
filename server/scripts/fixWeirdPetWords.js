const { getDb, closeDb } = require('../db/database');

// 脏词名 → 正确释义/关键词/近义词（手动修复，DeepSeek 词名匹配不上）
const FIXES = [
  {
    word: 'direct',
    def: '[adj.] 直接的；[adv.] 径直地；[v.] 指导；指挥；管理',
    keywords: ['直接', '指导', '指挥', '径直'],
    synonyms: ['指引', '带领', '管理', '直接了当'],
  },
  {
    word: 'downstairsadv./n./adj',
    def: '[adv.] 在楼下；往楼下；[n.] 楼下；[adj.] 楼下的',
    keywords: ['楼下', '在楼下', '往楼下'],
    synonyms: ['楼下', '底楼'],
  },
  {
    word: 'southn./adj./ad',
    def: '[n.] 南；南方；[adj.] 南方的；[adv.] 向南；在南方',
    keywords: ['南', '南方', '向南'],
    synonyms: ['南方', '南边', '南部'],
  },
];

function main() {
  const db = getDb();
  console.log('=== Fix: 脏词名 PET 词 ===\n');
  const updateDef = db.prepare('UPDATE words SET chinese_definition = ? WHERE word = ?');
  const upsertWM = db.prepare(`
    INSERT INTO word_meanings (word_id, meanings, keywords, synonyms, source)
    VALUES (?, ?, ?, ?, 'v7.3-pet')
    ON CONFLICT (word_id) DO UPDATE SET meanings = excluded.meanings, keywords = excluded.keywords, synonyms = excluded.synonyms, source = excluded.source
  `);

  for (const f of FIXES) {
    const row = db.prepare('SELECT id FROM words WHERE word = ?').get(f.word);
    if (!row) { console.log(`  ${f.word}: 不存在，跳过`); continue; }
    updateDef.run(f.def, f.word);
    upsertWM.run(row.id, JSON.stringify(f.def.split('；')), JSON.stringify(f.keywords), JSON.stringify(f.synonyms));
    console.log(`  ${f.word}: 已修复`);
  }
  console.log('\n完成');
  closeDb();
}
main();
