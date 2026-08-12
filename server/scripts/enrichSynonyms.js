/**
 * V7.3.0: 判分近义词扩充脚本（DeepSeek 批量）
 *
 * 为 IELTS List 词（is_extra=0）生成中文近义表达变体，写入 word_meanings.synonyms。
 * 判分时用户输入命中近义词即判对（如释义"寂静；无声"，近义词含"安静"）。
 *
 * 用法:
 *   node scripts/enrichSynonyms.js                # 默认处理全部未扩充的 IELTS 词
 *   node scripts/enrichSynonyms.js --lists 1,2    # 仅处理指定 List
 *   node scripts/enrichSynonyms.js --dry-run      # 只预览待处理词，不调用 API
 *   node scripts/enrichSynonyms.js --all          # 全部 IELTS 词强制重处理
 *   node scripts/enrichSynonyms.js --sample 20    # 随机抽 20 词验证质量（不写库）
 *   node scripts/enrichSynonyms.js --pet          # 为 PET 词建 word_meanings（keywords+synonyms）
 *
 * 特性:
 *   - 幂等/断点续跑：checkpoint 记录已处理词（server/db/synonym_checkpoint.json）
 *   - 每批 40 词，失败重试 3 次（指数退避），超时 90s
 */
const path = require('path');
const fs = require('fs');
const { getDb, closeDb } = require('../db/database');

const CHECKPOINT_PATH = path.join(__dirname, '..', 'db', 'synonym_checkpoint.json');
const BATCH_SIZE = 40;
const RETRY = 3;
const TIMEOUT_MS = 90000;
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
const petMode = args.includes('--pet');
const sampleIdx = args.findIndex(a => a.startsWith('--sample'));
const sample = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1]) || 20 : 0;

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
  state.raw.updatedAt = new Date().toISOString();
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(state.raw, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callDeepSeek(words, petMode = false) {
  let prompt;
  if (petMode) {
    prompt = `你是资深 PET 词汇教学专家。请为以下每个英文单词，根据其给定的中文释义，生成判分数据。

请为每个单词输出两部分：
1. keywords：3-6 个"核心释义关键词"（用户默写中文时输入的核心词，如释义"明亮的"→关键词含"明亮"；释义"允许"→关键词含"允许/许可"）。每个关键词 2-6 个汉字，不带标点词性。
2. synonyms：3-6 个"近义表达变体"（与释义语义一致的口语化表达，如"明亮"→变体含"光亮/亮堂/明晃晃"；"允许"→变体含"准许/容许/让"）。

要求：
- keywords 与 synonyms 可以有交集但不要完全相同；
- 全部为 2-6 个汉字的常用表达，不要生僻词；
- 只输出一个 JSON 对象，key 为单词，value 为 {"keywords": [...], "synonyms": [...]}，不要输出任何其他文字：
{"bright":{"keywords":["明亮","光亮"],"synonyms":["亮堂","明晃晃","闪亮"]}}

单词列表：
${words.map(w => `${w.word}（${w.part_of_speech || '?'}）释义：${w.chinese_definition}`).join('\n')}`;
  } else {
    prompt = `你是资深雅思词汇教学专家。请为以下每个英文单词，根据其给定的中文释义，生成 3-6 个"用户默写时可能输入的近义表达"（中文释义变体）。

要求：
1. 变体必须与给定释义语义一致，是**同义或近义的中文表达**（如释义"寂静；无声"→ 变体可含"安静/沉默/肃静/不出声/宁静"）；
2. 变体必须是**用户答题时自然可能写出的词**，不要给出书面语生僻词；
3. 每个变体 2-6 个汉字，不要带标点和词性前缀；
4. 不要包含与原释义完全相同的字面重复（避免冗余），但要确保至少一个变体是核心义项的常用口语表达；
5. 只输出一个 JSON 对象，key 为单词，value 为变体数组，不要输出任何其他文字：
{"silence":["安静","沉默","肃静","不出声"],"quiet":["安静","平静","轻声","静谧"]}

单词列表：
${words.map(w => `${w.word}（${w.part_of_speech || '?'}）释义：${w.chinese_definition}`).join('\n')}`;
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是雅思词汇教学专家，输出严格 JSON，不要输出任何多余文字。' },
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
  // 提取 JSON（兼容可能的前后杂质）
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in response: ' + content.slice(0, 200));
  return JSON.parse(content.slice(start, end + 1));
}

async function main() {
  const db = getDb();

  let query;
  const params = [];
  if (petMode) {
    // PET 模式：选取所有无 word_meanings 记录的 PET 词
    query = `
      SELECT w.id, w.word, w.part_of_speech AS pos, w.chinese_definition AS def
      FROM words w
      LEFT JOIN word_meanings wm ON wm.word_id = w.id
      WHERE w.level = 'pet' AND w.is_extra = 0 AND wm.word_id IS NULL
      ORDER BY w.id
    `;
  } else {
    query = `
      SELECT w.id, w.word, w.part_of_speech AS pos, w.chinese_definition AS def, wm.synonyms
      FROM words w
      JOIN word_meanings wm ON wm.word_id = w.id
      WHERE w.is_extra = 0
    `;
    if (lists && lists.length > 0) {
      query += ` AND w.list_no IN (${lists.map(() => '?').join(',')})`;
      params.push(...lists);
    }
    query += ' ORDER BY w.list_no, w.id';
  }

  let words = db.prepare(query).all(...params);

  const state = loadCheckpoint();

  // 抽样验证模式：随机抽 sample 个调用 API 看质量，不写库
  if (sample > 0) {
    const picked = [...words].sort(() => Math.random() - 0.5).slice(0, sample);
    console.log(`抽样验证 ${picked.length} 词（不写库）...\n`);
    for (let i = 0; i < picked.length; i += BATCH_SIZE) {
      const batch = picked.slice(i, i + BATCH_SIZE);
      try {
        const result = await callDeepSeek(batch, petMode);
        for (const w of batch) {
          console.log(`  ${w.word}: ${JSON.stringify(result[w.word] || [])}`);
        }
      } catch (err) {
        console.log(`  [批 ${i / BATCH_SIZE + 1} 失败] ${err.message}`);
      }
      if (i + BATCH_SIZE < picked.length) await sleep(300);
    }
    closeDb();
    return;
  }

  if (dryRun) {
    const todo = words.filter(w => forceAll || !state.processed.has(w.id));
    console.log(`待处理 ${todo.length} 词（dry-run，不调用 API）`);
    closeDb();
    return;
  }

  // 过滤：默认只处理未处理过的；--all 强制全部
  let todo = forceAll ? words : words.filter(w => !state.processed.has(w.id));
  if (todo.length === 0) {
    console.log(petMode ? '全部 PET 词已处理，无需重复（--all 强制重跑）' : '全部 IELTS 词已扩充，无需处理（--all 强制重跑）');
    closeDb();
    return;
  }
  console.log(`待处理 ${todo.length} 词（共 ${words.length}）...`);

  const updateIELTS = db.prepare('UPDATE word_meanings SET synonyms = ? WHERE word_id = ?');
  const insertPET = db.prepare(
    'INSERT OR REPLACE INTO word_meanings (word_id, meanings, keywords, synonyms, source) VALUES (?, ?, ?, ?, ?)'
  );
  let ok = 0, fail = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    let lastErr = null;
    for (let attempt = 1; attempt <= RETRY; attempt++) {
      try {
        const result = await callDeepSeek(batch, petMode);
        const txn = db.transaction(() => {
          for (const w of batch) {
            const item = result[w.word];
            if (petMode) {
              // PET：写入 keywords + synonyms，meanings 用原释义
              const kws = Array.isArray(item?.keywords) ? item.keywords : [];
              const syns = Array.isArray(item?.synonyms) ? item.synonyms : [];
              const clean = (arr) => [...new Set(arr.map(s => String(s).trim()).filter(s => s.length >= 2 && !/[，。；、]/.test(s)))];
              const ck = clean(kws);
              const cs = clean(syns);
              if (ck.length > 0) {
                insertPET.run(w.id, JSON.stringify([w.def]), JSON.stringify(ck), JSON.stringify(cs), 'v7.3-pet');
                ok++;
              } else {
                fail++;
              }
            } else {
              const syns = Array.isArray(result[w.word]) ? result[w.word] : [];
              const cleaned = [...new Set(syns.map(s => String(s).trim()).filter(s => s.length >= 2 && !/[，。；、]/.test(s)))];
              if (cleaned.length > 0) {
                updateIELTS.run(JSON.stringify(cleaned), w.id);
                ok++;
              } else {
                fail++;
              }
            }
            state.processed.add(w.id);
          }
        });
        txn();
        saveCheckpoint(state);
        console.log(`[${i + batch.length}/${todo.length}] 批 ${i / BATCH_SIZE + 1} 完成`);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < RETRY) {
          await sleep(1000 * Math.pow(2, attempt - 1));
        }
      }
    }
    if (lastErr) {
      fail += batch.length;
      console.log(`[批 ${i / BATCH_SIZE + 1} 最终失败] ${lastErr.message}`);
    }
    await sleep(250); // 限速
  }

  console.log(`\n完成：成功 ${ok}，失败/空 ${fail}`);
  closeDb();
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
