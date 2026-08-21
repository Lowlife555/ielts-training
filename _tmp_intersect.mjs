import Database from 'better-sqlite3';
import fs from 'node:fs';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });

// words 表结构
const cols = db.prepare(`SELECT name FROM pragma_table_info('words')`).all().map(r => r.name);
console.log('words cols:', cols.join(', '));

const rows = db.prepare(`SELECT id, word, list_no, is_extra, source FROM words`).all();
console.log('total words:', rows.length);

const byList = {};
for (const r of rows) {
  const k = r.is_extra ? 'extra' : `list_${r.list_no ?? 'null'}`;
  byList[k] = (byList[k] || 0) + 1;
}
console.log('byList:', JSON.stringify(byList));

// 拼写词表
const spbank = new Set(fs.readFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
console.log('spbank words:', spbank.size);

// 交集：非 extra 词库 ∩ 拼写词表
const nonExtra = rows.filter(r => !r.is_extra);
const intersect = nonExtra.filter(r => spbank.has(r.word.toLowerCase()));
console.log('non-extra words:', nonExtra.length, '| in spbank:', intersect.length, `(${(intersect.length / nonExtra.length * 100).toFixed(1)}%)`);

// 词库中不在拼写表里的（会被排除的词）——统计
const notIn = nonExtra.filter(r => !spbank.has(r.word.toLowerCase()));
console.log('non-extra NOT in spbank:', notIn.length);

// 拼写表中不在词库的
const dbWords = new Set(rows.map(r => r.word.toLowerCase()));
const spNotInDb = [...spbank].filter(w => !dbWords.has(w));
console.log('spbank NOT in word db:', spNotInDb.length);

// 保存
fs.writeFileSync('D:\\ielts-training\\_tmp_intersect.json', JSON.stringify({
  total: rows.length,
  nonExtra: nonExtra.length,
  inSpbank: intersect.length,
  notInSpbank: notIn.length,
  spbankTotal: spbank.size,
  spbankNotInDb: spNotInDb.length,
}, null, 1), 'utf8');

// 列出词库∩拼写表的词（供检查）
fs.writeFileSync('D:\\ielts-training\\_tmp_intersect_words.txt', intersect.map(r => r.word).sort().join('\n'), 'utf8');
// 列出词库中不在拼写表的词
fs.writeFileSync('D:\\ielts-training\\_tmp_notspbank_words.txt', notIn.map(r => r.word).sort().join('\n'), 'utf8');
// 拼写表中不在词库的词
fs.writeFileSync('D:\\ielts-training\\_tmp_spbank_notindb.txt', spNotInDb.sort().join('\n'), 'utf8');

db.close();
