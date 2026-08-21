import fs from 'node:fs';

const text = fs.readFileSync('D:\\ielts-training\\_tmp_spbank_readme.md', 'utf8');

// 解析: - Word (**pos**) - meaning.  支持多词短语
const lines = text.split('\n');
const words = [];
let category = 'other';
for (const line of lines) {
  const cat = line.match(/^##\s+(.+)$/);
  if (cat) { category = cat[1].trim(); continue; }
  const m = line.match(/^-\s+(.+?)\s+\(\*\*[^*]+\*\*\)\s*-/);
  if (m) {
    words.push({ word: m[1].trim(), category });
  }
}
console.log('parsed words:', words.length);

// 去重（保持大小写信息）
const seen = new Set();
const uniq = [];
for (const w of words) {
  const key = w.word.toLowerCase();
  if (!seen.has(key)) { seen.add(key); uniq.push(w); }
}
console.log('unique (case-insensitive):', uniq.length);

fs.writeFileSync('D:\\ielts-training\\_tmp_spbank_words.json', JSON.stringify(uniq, null, 1), 'utf8');

// 输出词表（小写）
fs.writeFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', uniq.map(w => w.word.toLowerCase()).join('\n'), 'utf8');

// 分类统计
const byCat = {};
for (const w of uniq) byCat[w.category] = (byCat[w.category] || 0) + 1;
console.log('\n=== categories ===');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`${n}\t${c}`));

// 样例
console.log('\n=== sample ===');
uniq.slice(0, 30).forEach(w => console.log(`${w.word} [${w.category}]`));
