/**
 * V7.3.0 fix: PET 单字释义词兜底修复
 * 问题：sugar 释义"糖"，但 keywords 只有"食糖"，synonyms 无"糖"——用户写"糖"判错。
 * 修复：对释义为单字（或含单字核心义）的 PET 词，把释义本身加入 keywords 与 synonyms。
 *
 * 幂等：重复执行安全（先清已加标记再补）。
 */
const { getDb, closeDb } = require('../db/database');

function splitDef(def) {
  // 拆释义为候选词：按分号/逗号/顿号拆分，过滤空
  return String(def || '')
    .split(/[;；,，、/／|｜+＋]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function main() {
  const db = getDb();
  console.log('=== Fix: PET 单字释义兜底 ===\n');

  // 找释义含单字核心义的 PET 词（释义本身 ≤2 字，或拆分后含单字）
  const rows = db.prepare(`
    SELECT w.id, w.word, w.chinese_definition AS def, wm.keywords, wm.synonyms
    FROM words w JOIN word_meanings wm ON wm.word_id = w.id
    WHERE w.level = 'pet'
  `).all();

  let fixed = 0;
  const txn = db.transaction(() => {
    const update = db.prepare('UPDATE word_meanings SET keywords = ?, synonyms = ? WHERE word_id = ?');
    for (const r of rows) {
      const parts = splitDef(r.def);
      // 收集单字核心义：释义整体是单字，或拆分出的任一候选是单字
      const singleCores = parts.filter(p => p.length === 1);
      if (singleCores.length === 0) continue;

      let kws = [];
      let syns = [];
      try { kws = JSON.parse(r.keywords || '[]'); } catch {}
      try { syns = JSON.parse(r.synonyms || '[]'); } catch {}
      if (!Array.isArray(kws)) kws = [];
      if (!Array.isArray(syns)) syns = [];

      let changed = false;
      for (const core of singleCores) {
        if (!kws.includes(core)) { kws.push(core); changed = true; }
        if (!syns.includes(core)) { syns.push(core); changed = true; }
      }
      if (changed) {
        update.run(JSON.stringify(kws), JSON.stringify(syns), r.id);
        fixed++;
        console.log(`  ${r.word}: def="${r.def}" → kw+${singleCores.join(',')}`);
      }
    }
  });
  txn();

  console.log(`\n修复 ${fixed} 个 PET 单字释义词。`);
  closeDb();
}

main();
