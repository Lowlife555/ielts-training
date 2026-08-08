/**
 * v6.0 词义补全抓取脚本(有道词典)
 * - 抓取全部单词完整中文释义(断点续传到 v6_meanings.json)
 * - 自动提取判词关键词(义项拆分)
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'v6_meanings.json');
const DELAY_MS = 220;
const RETRY = 3;

function loadState() {
  if (!fs.existsSync(OUT)) return { results: {}, failures: [] };
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return { results: {}, failures: [] }; }
}

function saveState(state) {
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, OUT);
}

function extractKeywords(text) {
  const cleaned = text
    .replace(/[（(]([^）)]*)[）)]/g, (_, inner) => ',' + inner)
    .replace(/\s+/g, '');
  const parts = cleaned.split(/[;；,，、]/).map(s => s.trim()).filter(Boolean);
  const kws = new Set();
  for (const p of parts) {
    if (p.length < 2) continue;
    if (/^(的|地|得|了|着|过|在|用|把|将|被|对|与|和|或|其|这|那)$/.test(p)) continue;
    kws.add(p);
  }
  return [...kws];
}

async function fetchWord(word) {
  const url = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`;
  for (let i = 0; i <= RETRY; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const trs = data?.ec?.word?.[0]?.trs;
      if (!Array.isArray(trs) || trs.length === 0) return null;
      const meanings = [];
      const kws = new Set();
      for (const tr of trs) {
        const text = tr?.tr?.[0]?.l?.i?.[0];
        if (typeof text !== 'string') continue;
        meanings.push(text.trim());
        extractKeywords(text).forEach(k => kws.add(k));
      }
      if (meanings.length === 0) return null;
      return { meanings, keywords: [...kws] };
    } catch (e) {
      if (i === RETRY) throw e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

async function main() {
  const { getDb, closeDb } = require('./database');
  const db = getDb();
  const words = db.prepare("SELECT word FROM words WHERE is_extra = 0 AND list_no IS NOT NULL ORDER BY list_no, id").all().map(r => r.word);
  closeDb();
  const state = loadState();

  let done = Object.keys(state.results).length;
  let failed = state.failures.length;
  const seen = new Set(state.failures);
  for (const word of words) {
    if (state.results[word]) continue;
    try {
      const data = await fetchWord(word);
      if (data) {
        state.results[word] = data;
        done++;
      } else {
        if (!seen.has(word)) { state.failures.push(word); failed++; }
      }
    } catch (e) {
      console.error('FAIL', word, e.message);
      if (!seen.has(word)) { state.failures.push(word); failed++; }
    }
    if ((done) % 50 === 0) {
      saveState(state);
      console.log(`progress: ${done}/${words.length} (+${failed} fail)`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS + Math.random() * 80));
  }
  saveState(state);
  console.log('Done. success:', done, 'failed:', failed, 'total:', words.length);
}

main().catch(e => { console.error(e); process.exit(1); });
