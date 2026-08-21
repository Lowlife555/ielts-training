import Database from 'better-sqlite3';

const db = new Database('D:\\ielts-training\\server\\db\\ielts.db', { readonly: true });

const rows = db.prepare(`SELECT difficulty_level, COUNT(*) as cnt FROM words WHERE is_extra=0 GROUP BY difficulty_level ORDER BY cnt DESC`).all();
console.log('difficulty_level distribution (non-extra):');
rows.forEach(r => console.log(`${String(r.difficulty_level).padEnd(20)} ${r.cnt}`));

// level 字段分布
const lv = db.prepare(`SELECT level, COUNT(*) as cnt FROM words WHERE is_extra=0 GROUP BY level`).all();
console.log('\nlevel distribution:');
lv.forEach(r => console.log(`${String(r.level).padEnd(10)} ${r.cnt}`));

// topic 分布
const tp = db.prepare(`SELECT topic, COUNT(*) as cnt FROM words WHERE is_extra=0 GROUP BY topic ORDER BY cnt DESC LIMIT 15`).all();
console.log('\ntopic top15:');
tp.forEach(r => console.log(`${String(r.topic).padEnd(30)} ${r.cnt}`));

db.close();
