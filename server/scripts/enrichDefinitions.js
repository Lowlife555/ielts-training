/**
 * P1-5: 释义深度扩充脚本（DeepSeek 批量）
 *
 * 用法:
 *   node scripts/enrichDefinitions.js                # 默认扩充所有不足 3 义项的词
 *   node scripts/enrichDefinitions.js --lists 1,2    # 仅处理指定 List（全量重处理）
 *   node scripts/enrichDefinitions.js --dry-run      # 只预览待处理词，不调用 API
 *   node scripts/enrichDefinitions.js --all          # 全部 IELTS 词强制重处理
 *
 * 特性:
 *   - 幂等/断点续跑：checkpoint 记录已处理词（server/db/enrich_checkpoint.json 的 processed 字段）
 *   - 每批 35 词，失败重试 3 次（指数退避），超时 60s
 *   - 已满足 3+ 义项的词默认跳过
 */
const path = require('path');
const fs = require('fs');
const { getDb, closeDb } = require('../db/database');

const CHECKPOINT_PATH = path.join(__dirname, '..', 'db', 'enrich_checkpoint.json');
const BATCH_SIZE = 35;
const RETRY = 3;
const TIMEOUT_MS = 60000;
const MODEL = 'deepseek-chat';

// --- args ---
const args = process.argv.slice(2);
const listsIdx = args.findIndex(a => a.startsWith('--lists'));
let lists = null;
if (listsIdx >= 0) {
  const val = args[listsIdx].includes('=') ? args[listsIdx].split('=')[1] : args[listsIdx + 1];
  lists = val.split(',').map(Number).filter(n => !isNaN(n));
}
const dryRun = args.includes('--dry-run');
const forceAll = args.includes('--all');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const API_KEY = process.env.DEEPSEEK_API_KEY;

function loadCheckpoint() {
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
    return { processed: new Set(data.processed || []), raw: data };
  } catch { return { processed: new Set(), raw: {} }; }
}

function saveCheckpoint(state) {
  state.raw.processed = [...state.processed];
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(state.raw, null, 2));
}

function defCount(def) {
  return (def || '').split('；').filter(s => s.trim()).length;
}

function callDeepSeek(words) {
  const prompt = `你是资深雅思词汇编纂专家。请为以下每个英文单词编写 3-4 个核心中文义项。
要求：
1. 义项要完整准确，覆盖常见考试含义（含词性差异带来的不同义项）；
2. 用分号分隔多个义项；
3. 每个义项前用方括号标注词性缩写（n/v/adj/adv/prep/conj/aux 等），如"[v.] 加快；促进"；
4. 若原有释义给出的是常用搭配或固定词组含义，保留最重要的；
5. 只输出一个 JSON 数组，不要输出任何其他文字：
[{"word":"accelerate","defs":"[v.] 加速；促进","pos":"v"}, ...]

单词列表：
${words.map(w => `${w.word}（${w.part_of_speech || '?'}）原释义：${w.chinese_definition}`).join('\n')}`;

  return fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是雅思词汇释义专家，输出严格 JSON，不要输出任何多余文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 6000,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const json = content.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  });
}

async function enrichBatch(words, state) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    try {
      const results = await callDeepSeek(words);
      if (!Array.isArray(results) || results.length === 0) throw new Error('空结果');
      const db = getDb();
      const update = db.prepare('UPDATE words SET chinese_definition = ? WHERE id = ?');
      const updateAll = db.transaction(() => {
        for (const r of results) {
          if (!r || !r.word || !r.defs) continue;
          const row = db.prepare('SELECT id FROM words WHERE word = ? COLLATE NOCASE').get(r.word);
          if (!row) continue;
          update.run(r.defs.trim(), row.id);
          state.processed.add(r.word.toLowerCase());
        }
      });
      updateAll();
      saveCheckpoint(state);
      return results.length;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
  throw new Error(`批次失败（重试 ${RETRY} 次）: ${lastErr.message}`);
}

async function main() {
  if (!API_KEY) {
    console.error('缺少 DEEPSEEK_API_KEY（server/.env）');
    process.exit(1);
  }
  const db = getDb();
  const state = loadCheckpoint();
  const processed = state.processed;

  let rows;
  if (lists) {
    rows = db.prepare(`
      SELECT id, word, part_of_speech, chinese_definition, list_no FROM words
      WHERE is_extra = 0 AND list_no IN (${lists.map(() => '?').join(',')})
      ORDER BY list_no
    `).all(...lists);
  } else if (forceAll) {
    rows = db.prepare(`
      SELECT id, word, part_of_speech, chinese_definition, list_no FROM words
      WHERE is_extra = 0 AND list_no IS NOT NULL
      ORDER BY list_no
    `).all();
  } else {
    rows = db.prepare(`
      SELECT id, word, part_of_speech, chinese_definition, list_no FROM words
      WHERE is_extra = 0 AND list_no IS NOT NULL
      ORDER BY list_no
    `).all().filter(r => defCount(r.chinese_definition) < 3 && !processed.has(r.word.toLowerCase()));
  }

  console.log(`待处理: ${rows.length} 词${lists ? `（Lists ${lists.join(',')}）` : ''}${dryRun ? ' [DRY RUN]' : ''}`);
  if (dryRun) {
    rows.slice(0, 20).forEach(r => console.log(`  L${r.list_no} ${r.word}: ${r.chinese_definition}`));
    closeDb();
    return;
  }

  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const label = `[${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}]`;
    try {
      const n = await enrichBatch(batch, state);
      total += n;
      console.log(`${label} ✅ 处理 ${n} 词（累计 ${total}）`);
    } catch (e) {
      console.error(`${label} ❌ ${e.message}（断点已保存，重跑可续）`);
    }
  }

  console.log(`\n完成: 成功 ${total}/${rows.length} 词`);
  const sample = db.prepare(`SELECT word, chinese_definition FROM words WHERE is_extra=0 AND list_no IS NOT NULL ORDER BY RANDOM() LIMIT 10`).all();
  console.log('\n--- 抽验 ---');
  sample.forEach(r => console.log(`  ${r.word}: ${r.chinese_definition}`));
  closeDb();
}

main().catch(e => { console.error(e); process.exit(1); });
