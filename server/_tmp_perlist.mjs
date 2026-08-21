import Database from 'better-sqlite3';
import fs from 'node:fs';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });
const spbank = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean));

// 项目已有 Cambridge 真题词（is_extra=1, source 含 Cambridge）
const camb = db.prepare(`SELECT word FROM words WHERE source LIKE 'Cambridge%'`).all().map(r => r.word.toLowerCase());
console.log('existing Cambridge words in db:', camb.length);
const cambSet = new Set(camb);

// 合并真题集合
const zhentiSet = new Set([...spbank, ...cambSet]);
console.log('merged zhenti set size:', zhentiSet.size);

// 按 list_no 统计（非 extra）
const rows = db.prepare(`SELECT id, word, list_no, level FROM words WHERE is_extra = 0`).all();
const byList = {};
for (const r of rows) {
  const k = r.level === 'pet' ? 'PET' : `IELTS-L${r.list_no}`;
  if (!byList[k]) byList[k] = { total: 0, inZhenti: 0, notIn: [] };
  byList[k].total++;
  if (zhentiSet.has(r.word.toLowerCase())) byList[k].inZhenti++;
  else byList[k].notIn.push(r.word);
}

console.log('\n=== per-list coverage (non-extra) ===');
const keys = Object.keys(byList).sort((a, b) => {
  const na = parseInt(a.match(/\d+/)?.[0] || '0'), nb = parseInt(b.match(/\d+/)?.[0] || '0');
  return (a.startsWith('IELTS') ? 0 : 1) - (b.startsWith('IELTS') ? 0 : 1) || na - nb;
});
for (const k of keys) {
  const v = byList[k];
  console.log(`${k.padEnd(10)} total=${String(v.total).padStart(4)} inZhenti=${String(v.inZhenti).padStart(4)} (${(v.inZhenti / v.total * 100).toFixed(0)}%) 20%=${Math.round(v.total * 0.2)}`);
}

// 保存每个 list 的 inZhenti 词
const out = {};
for (const k of keys) {
  out[k] = {
    total: byList[k].total,
    inZhenti: byList[k].inZhenti,
    inZhentiWords: rows.filter(r => {
      const kk = r.level === 'pet' ? 'PET' : `IELTS-L${r.list_no}`;
      return kk === k && zhentiSet.has(r.word.toLowerCase());
    }).map(r => r.word),
  };
}
fs.writeFileSync('D:\\ielts-training\\_tmp_perlist.json', JSON.stringify(out, null, 1), 'utf8');

// 抽查 List 30 词时,若只在真题词里抽,够吗? 30词需求 vs inZhenti
console.log('\n=== spotcheck feasibility (need 30, or total if less) ===');
for (const k of keys) {
  const v = byList[k];
  const need = Math.min(30, v.total);
  console.log(`${k.padEnd(10)} need=${String(need).padStart(3)} available_inZhenti=${v.inZhenti} ${v.inZhenti >= need ? 'OK' : 'SHORT ' + (need - v.inZhenti)}`);
}

db.close();
