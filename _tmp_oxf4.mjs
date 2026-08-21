import fs from 'node:fs';

async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) });
      if (r.status === 200) return await r.text();
      console.log('status', r.status, url);
      return null;
    } catch (e) {
      console.log(`retry ${i + 1} ${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  return null;
}

const levels = ['OF3KA1', 'OF3KA2', 'OF3KB1', 'OF3KB2', 'OF3KC1', 'OF3KC2'];
const all = [];
for (const lv of levels) {
  const u = `https://huggingface.co/spaces/MK-316/oxford5k-audio/raw/main/${lv}.csv`;
  const t = await get(u);
  if (!t) { console.log('FAIL', lv); continue; }
  fs.writeFileSync(`D:\\ielts-training\\_tmp_oxf_${lv}.csv`, t, 'utf8');
  const lines = t.split('\n').filter(l => l.trim());
  console.log(lv, 'lines:', lines.length, '| first:', lines[0]?.slice(0, 80));
  all.push(...lines);
}
// 提取单词列(通常是第一列)
const words = [];
for (const line of all) {
  if (line.startsWith('#')) continue;
  const col = line.split(',')[0].trim();
  if (col && /^[a-zA-Z'-]+$/.test(col) && !/^(word|Word)$/.test(col)) words.push(col);
}
const uniq = [...new Set(words.map(w => w.toLowerCase()))];
console.log('\nmerged unique words:', uniq.length);
fs.writeFileSync('D:\\ielts-training\\_tmp_oxf5000.txt', uniq.join('\n'), 'utf8');
console.log('sample:', uniq.slice(0, 30).join(', '));
