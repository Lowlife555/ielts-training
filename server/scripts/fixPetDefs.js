/**
 * V7.3.0 fix: PET 异常释义修复（释义为纯词性标注的词）
 * 问题：部分 PET 词 chinese_definition 是纯词性（如 "adj./adv./v"），无实际中文含义，
 *       导致判分无基准、显示无意义。
 * 修复：用 DeepSeek 为这些词重新生成规范释义，并同步更新 keywords/synonyms。
 *
 * 用法: node scripts/fixPetDefs.js [--dry-run]
 * 幂等：重复执行安全（已修复的释义不再处理）。
 */
const path = require('path');
const { getDb, closeDb } = require('../db/database');

const dryRun = process.argv.includes('--dry-run');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const API_KEY = process.env.DEEPSEEK_API_KEY;

const BATCH_SIZE = 40;
const RETRY = 3;
const TIMEOUT_MS = 90000;
const MODEL = 'deepseek-chat';

// 纯词性标注模式（无中文实义）
const WEIRD_RE = /^(?:adj|adv|v|n|pron|prep|conj|aux|det|num|int|art)\s*[\/.、，,;\s]*(?:adj|adv|v|n|pron|prep|conj|aux|det|num|int|art)*$/i;
// 含实义但混入词性前缀的也重写（如 "n./adj./adv.东方;向东方"）
const MIXED_RE = /^[a-z]+\/[a-z]+\/[a-z]+\./i;

function isWeird(def) {
  const d = String(def || '').trim();
  if (!d) return true; // 空释义
  if (WEIRD_RE.test(d)) return true; // 纯词性标注
  if (MIXED_RE.test(d)) return true; // 词性堆叠 + 无实义
  return false;
}

async function callDeepSeek(words) {
  const prompt = `你是资深 PET 词汇教学专家。以下单词的释义有误（缺失或混乱），请为每个单词重新编写规范的中文释义。

要求：
1. 释义 2-6 个常用义项，用分号分隔，每个义项 2-8 个汉字；
2. 义项前用方括号标注词性缩写（n/v/adj/adv/prep/conj/pron 等），如"[v.] 烤；烘焙"；
3. 只输出一个 JSON 数组，不要输出任何其他文字：
[{"word":"bake","defs":"[v.] 烤；烘焙","keywords":["烤","烘焙"],"synonyms":["烘烤","烤制"]}]

单词列表：
${words.map(w => `${w.word}（原释义：${w.chinese_definition}）`).join('\n')}`;

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是 PET 词汇教学专家，输出严格 JSON，不要输出任何多余文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('No JSON in response: ' + content.slice(0, 200));
  return JSON.parse(content.slice(start, end + 1));
}

async function main() {
  if (!API_KEY) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1); }
  const db = getDb();

  const rows = db.prepare(`
    SELECT w.id, w.word, w.chinese_definition AS def
    FROM words w WHERE w.level = 'pet' AND w.is_extra = 0
  `).all();
  const todo = rows.filter(r => isWeird(r.def));
  console.log(`PET 词共 ${rows.length}，异常释义 ${todo.length} 个`);
  if (dryRun) {
    for (const r of todo.slice(0, 30)) console.log(`  ${r.word}: "${r.def}"`);
    closeDb();
    return;
  }
  if (todo.length === 0) { closeDb(); return; }

  const updateDef = db.prepare('UPDATE words SET chinese_definition = ? WHERE id = ?');
  const updateWM = db.prepare('UPDATE word_meanings SET meanings = ?, keywords = ?, synonyms = ? WHERE word_id = ?');
  let ok = 0, fail = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    let lastErr = null;
    for (let attempt = 1; attempt <= RETRY; attempt++) {
      try {
        const results = await callDeepSeek(batch);
        const txn = db.transaction(() => {
          for (const r of results) {
            if (!r || !r.word) continue;
            const row = db.prepare('SELECT id FROM words WHERE word = ? COLLATE NOCASE').get(r.word);
            if (!row) continue;
            if (r.defs && r.defs.trim().length > 2) {
              updateDef.run(r.defs.trim(), row.id);
            }
            const kws = Array.isArray(r.keywords) ? r.keywords : [];
            const syns = Array.isArray(r.synonyms) ? r.synonyms : [];
            const clean = (arr) => [...new Set(arr.map(s => String(s).trim()).filter(s => s.length >= 1 && !/[，。；、]/.test(s)))];
            const ck = clean(kws), cs = clean(syns);
            updateWM.run(JSON.stringify([r.defs.trim()]), JSON.stringify(ck), JSON.stringify(cs), row.id);
            ok++;
          }
        });
        txn();
        console.log(`[${Math.min(i + batch.length, todo.length)}/${todo.length}] 批 ${i / BATCH_SIZE + 1} 完成`);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < RETRY) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    if (lastErr) {
      fail += batch.length;
      console.log(`[批 ${i / BATCH_SIZE + 1} 最终失败] ${lastErr.message}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
  closeDb();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
