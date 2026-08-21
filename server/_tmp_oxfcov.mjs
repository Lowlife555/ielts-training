import Database from 'better-sqlite3';
import fs from 'node:fs';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });
const oxf = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_oxf5000.txt', 'utf8').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean));
const spbank = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
const camb = new Set(db.prepare(`SELECT word FROM words WHERE source LIKE 'Cambridge%'`).all().map(r => r.word.toLowerCase()));
const zhenti = new Set([...spbank, ...camb]);
console.log('oxf5000:', oxf.size, '| zhenti:', zhenti.size);

// 检查之前 10k 漏掉的词在不在 oxf
for (const w of ['behave', 'adapt', 'insist', 'accompany', 'analyse', 'depart']) {
  console.log(`oxf has ${w}:`, oxf.has(w));
}

const rows = db.prepare(`SELECT id, word, list_no, level FROM words WHERE is_extra = 0 AND list_no IS NOT NULL`).all();
const byList = {};
for (const r of rows) {
  const k = r.level === 'pet' ? 'PET' : `L${r.list_no}`;
  if (!byList[k]) byList[k] = { total: 0, inZ: 0, inZorOxf: 0, inNone: [] };
  byList[k].total++;
  const w = r.word.toLowerCase();
  if (zhenti.has(w)) byList[k].inZ++;
  if (zhenti.has(w) || oxf.has(w)) byList[k].inZorOxf++;
  else byList[k].inNone.push(r.word);
}

console.log('\n=== strategy (真题优先 + Oxford5000 兜底) ===');
const keys = Object.keys(byList).sort((a, b) => (a.startsWith('PET') ? 1 : 0) - (b.startsWith('PET') ? 1 : 0) || parseInt(a.slice(1)) - parseInt(b.slice(1)));
for (const k of keys) {
  const v = byList[k];
  const need = Math.ceil(v.total * 0.2);
  const flag = v.inZorOxf >= need ? 'OK ' : 'SHORT';
  console.log(`${k.padEnd(5)} total=${String(v.total).padStart(3)} need20%=${String(need).padStart(2)} | 真题=${String(v.inZ).padStart(3)} 真题∪Oxf5k=${String(v.inZorOxf).padStart(3)} 双否=${String(v.inNone.length).padStart(3)} ${flag}`);
}

// 双否词样例
const allNone = [];
for (const k of keys) allNone.push(...byList[k].inNone);
console.log('\n双否词总数:', allNone.length);
console.log('样例:', allNone.slice(0, 60).join(', '));

console.log('\n=== spotcheck 30 (真题∪Oxf5k) ===');
for (const k of keys) {
  const v = byList[k];
  const need = Math.min(30, v.total);
  if (v.inZorOxf < need) console.log(`${k.padEnd(5)} need=${String(need).padStart(2)} available=${String(v.inZorOxf).padStart(3)} SHORT ${need - v.inZorOxf}`);
}
console.log('(未列出的 List 均 OK)');

db.close();
