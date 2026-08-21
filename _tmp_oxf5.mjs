import fs from 'node:fs';

const levels = ['OF3KA1', 'OF3KA2', 'OF3KB1', 'OF3KB2', 'OF3KC1'];
const words = [];
for (const lv of levels) {
  const t = fs.readFileSync(`D:\\ielts-training\\_tmp_oxf_${lv}.csv`, 'utf8');
  const lines = t.split('\n').filter(l => l.trim());
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());
  const wordIdx = header.indexOf('WORD');
  if (wordIdx === -1) { console.log('no WORD col in', lv, header); continue; }
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const w = (cols[wordIdx] || '').trim();
    if (w && /^[a-zA-Z'-]+$/.test(w)) words.push(w);
  }
  console.log(lv, 'header:', header.join('/'), 'wordIdx:', wordIdx, 'parsed:', lines.length - 1);
}
const uniq = [...new Set(words.map(w => w.toLowerCase()))];
console.log('\nmerged unique words:', uniq.length);
fs.writeFileSync('D:\\ielts-training\\_tmp_oxf5000.txt', uniq.join('\n'), 'utf8');
console.log('sample:', uniq.slice(0, 40).join(', '));
