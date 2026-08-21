import Database from 'better-sqlite3';
import fs from 'node:fs';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });
const freq10k = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_freq10k.txt', 'utf8').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean));
console.log('10k freq size:', freq10k.size);

const rows = db.prepare(`SELECT id, word, list_no, level FROM words WHERE is_extra = 0`).all();
const byList = {};
for (const r of rows) {
  const k = r.level === 'pet' ? 'PET' : `IELTS-L${r.list_no}`;
  if (!byList[k]) byList[k] = { total: 0, in10k: 0 };
  byList[k].total++;
  if (freq10k.has(r.word.toLowerCase())) byList[k].in10k++;
}

console.log('\n=== 10k freq coverage ===');
const keys = Object.keys(byList).sort((a, b) => {
  const na = parseInt(a.match(/\d+/)?.[0] || '0'), nb = parseInt(b.match(/\d+/)?.[0] || '0');
  return (a.startsWith('IELTS') ? 0 : 1) - (b.startsWith('IELTS') ? 0 : 1) || na - nb;
});
let tTotal = 0, tIn = 0;
for (const k of keys) {
  const v = byList[k];
  tTotal += v.total; tIn += v.in10k;
  console.log(`${k.padEnd(10)} ${String(v.in10k).padStart(4)}/${String(v.total).padStart(4)} = ${(v.in10k / v.total * 100).toFixed(0)}%`);
}
console.log(`\nTOTAL: ${tIn}/${tTotal} = ${(tIn / tTotal * 100).toFixed(1)}%`);

// 不在10k的 IELTS 词样例
const notIn = rows.filter(r => r.level === 'ielts' && !freq10k.has(r.word.toLowerCase())).map(r => r.word);
console.log('\nIELTS words NOT in 10k freq:', notIn.length, 'sample:', notIn.slice(0, 40).join(', '));

db.close();
