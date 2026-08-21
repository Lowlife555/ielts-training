// 生成词表数据文件: zhenti_spelling_words.txt (真题拼写词) + oxford_5000.txt
// 输出到 server/db/data/
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const OUT = 'D:\\ielts-training\\server\\db\\data';
fs.mkdirSync(OUT, { recursive: true });

// 1. 真题拼写词 = spbank 2031 + 词库已有 Cambridge 282
const spbank = fs.readFileSync('D:\\ielts-training\\_tmp_spbank_wordlist.txt', 'utf8')
  .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });
const camb = db.prepare(`SELECT word FROM words WHERE source LIKE 'Cambridge%'`).all()
  .map(r => r.word.trim().toLowerCase());
const zhenti = [...new Set([...spbank, ...camb])].sort();
console.log('zhenti spelling words:', zhenti.length);
fs.writeFileSync(path.join(OUT, 'zhenti_spelling_words.txt'), zhenti.join('\n') + '\n', 'utf8');

// 2. Oxford 5000 (4054 去重词)
const oxf = fs.readFileSync('D:\\ielts-training\\_tmp_oxf5000.txt', 'utf8')
  .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
console.log('oxford 5000 words:', oxf.length);
fs.writeFileSync(path.join(OUT, 'oxford_5000.txt', ), oxf.join('\n') + '\n', 'utf8');

// 3. 与词库匹配情况
const dbWords = new Set(db.prepare(`SELECT word FROM words`).all().map(r => r.word.trim().toLowerCase()));
const zInDb = zhenti.filter(w => dbWords.has(w)).length;
const oxfInDb = oxf.filter(w => dbWords.has(w)).length;
console.log(`zhenti∩词库: ${zInDb}/${zhenti.length} | oxf∩词库: ${oxfInDb}/${oxf.length}`);
db.close();
