import Database from 'better-sqlite3';
import fs from 'node:fs';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });
const spbank = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
const freq10k = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_freq10k.txt', 'utf8').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean));
const camb = new Set(db.prepare(`SELECT word FROM words WHERE source LIKE 'Cambridge%'`).all().map(r => r.word.toLowerCase()));
const zhenti = new Set([...spbank, ...camb]);
console.log('zhenti set:', zhenti.size, '| 10k:', freq10k.size);

// 场景模拟: 中译英从 List 抽 20% 词,策略=真题词优先,不足用「词频内」补,再无随机补
// 统计每个 List: 真题词数量 / 真题+10k词数量 / 需要20%
const rows = db.prepare(`SELECT id, word, list_no, level FROM words WHERE is_extra = 0 AND list_no IS NOT NULL`).all();
const byList = {};
for (const r of rows) {
  const k = r.level === 'pet' ? 'PET' : `L${r.list_no}`;
  if (!byList[k]) byList[k] = { total: 0, inZ: 0, inZor10k: 0, inNone: [] };
  byList[k].total++;
  const w = r.word.toLowerCase();
  if (zhenti.has(w)) byList[k].inZ++;
  if (zhenti.has(w) || freq10k.has(w)) byList[k].inZor10k++;
  else byList[k].inNone.push(r.word);
}

console.log('\n=== strategy simulation (20% needs) ===');
const keys = Object.keys(byList).sort((a, b) => (a.startsWith('PET') ? 1 : 0) - (b.startsWith('PET') ? 1 : 0) || parseInt(a.slice(1)) - parseInt(b.slice(1)));
let zCount = 0, zor10kCount = 0, noneCount = 0;
for (const k of keys) {
  const v = byList[k];
  const need = Math.ceil(v.total * 0.2);
  zCount += v.inZ; zor10kCount += v.inZor10k; noneCount += v.inNone.length;
  console.log(`${k.padEnd(5)} total=${String(v.total).padStart(3)} need20%=${String(need).padStart(2)} | 真题=${String(v.inZ).padStart(3)} 真题+10k=${String(v.inZor10k).padStart(3)} 双否=${String(v.inNone.length).padStart(3)}`);
}
console.log(`\n合计: 真题词=${zCount} 真题∪10k=${zor10kCount} 都不在=${noneCount}`);

// 双否词样例(最可能被砍的)
const allNone = [];
for (const k of keys) allNone.push(...byList[k].inNone);
console.log('\n双否词总数:', allNone.length, '样例:', allNone.slice(0, 50).join(', '));

// 抽查30词可行性(真题+10k)
console.log('\n=== spotcheck 30 (真题∪10k) ===');
for (const k of keys) {
  const v = byList[k];
  const need = Math.min(30, v.total);
  const ok = v.inZor10k >= need;
  console.log(`${k.padEnd(5)} need=${String(need).padStart(2)} available=${String(v.inZor10k).padStart(3)} ${ok ? 'OK' : 'SHORT ' + (need - v.inZor10k)}`);
}

db.close();
