/**
 * 中文释义宽松判分工具（英译中/中文默写答题用）
 *
 * 宽松策略（参考 Anki/扇贝等同类项目对近义表达的宽容处理 + V7.3.2 变体归一化）：
 *  1. 清洗：去除词性前缀、全半角标点、省略号(如 "位于...")、多余空白
 *  2. 助词剥离：输入末尾的 的/地/得/着/了/过 等不影响核心语义
 *  3. 双向匹配：输入包含关键词 OR 关键词包含输入（解决 "位于..." vs "位于"）
 *  4. 关键词来源：优先 word_meanings.keywords；缺省时从完整释义多分隔符拆取
 *  5. 变体归一化（V7.3.2）：异形词归一化（雇佣↔雇用、帐↔账）+ 保守字符重叠
 */

const PUNCT = /[，,。;；、()（）<>《》「」"'“”"~～·•\-—–]/g;
const ELLIPSIS = /[.．]{2,}|…{1,}/g;
const SUFFIX_PARTICLES = /(的|地|得|着|了|过|之|与|和)$/g;
const POS_PREFIX = /^[a-z]+\.\s*/i;

import { variantMatch, charOverlapMatch } from './variantNormalize.js';

function cleanKw(k) {
  return String(k || '')
    .replace(POS_PREFIX, '')
    .replace(PUNCT, '')
    .replace(ELLIPSIS, '')
    .replace(/\s+/g, '')
    .replace(SUFFIX_PARTICLES, '')
    .trim();
}

export function fallbackKeywords(def) {
  return String(def || '')
    .split(/[;；,，、/／|｜+＋]/)
    .map(cleanKw)
    .filter(k => k.length >= 1); // 允许单字（如释义"糖"→"糖"）
}

/**
 * 宽松判分：用户输入与任一关键词双向匹配即算对。
 * @param {string} input 用户输入的中文释义
 * @param {string[]} [keywords] word_meanings.keywords（可能为 JSON 字符串）
 * @param {string} [chineseDefinition] 兜底释义来源
 */
// 常见虚词/助词（单字重叠兜底时排除，避免"的/了/和"等误触发）
const STOP_CHARS = new Set('的得地着了过和与及或而以因为被把很太最也都无不有在是一之其这那们些中上下大小多少更较等即可能会要就才又再还只仅并且但却所已经正从向对于由自到给让使用当像似若虽然但故此另各每某任何什么怎样那里时候'.split(''));

/** 单字重叠：双方至少 2 个汉字，且共享任意一个非虚词汉字（多义词场景兜底，如"逃离"vs"逃跑"共享"逃"） */
function singleCharOverlap(input, keyword) {
  if (!input || !keyword || input.length < 2 || keyword.length < 2) return false;
  for (const ch of input) {
    if (!STOP_CHARS.has(ch) && keyword.includes(ch)) return true;
  }
  return false;
}

/** 多义词判定：释义含分号（多义项）或含 ≥2 个词性标记（n./v./adj. 等） */
function isPolysemous(def) {
  if (!def) return false;
  const posCount = (String(def).match(/[a-z]+\./gi) || []).length;
  return /[;；]/.test(def) || posCount >= 2;
}

/** 单个候选词匹配：单字精确 + 双向包含 + 变体归一化 + 保守字符重叠 + 多义词单字重叠兜底 */
function matchCandidate(cleanInput, candidate, allowSingleChar = false) {
  const ck = cleanKw(candidate);
  if (!ck) return false;
  if (ck.length === 1) return cleanInput === ck; // 单字仅精确匹配（"糖"不命中"糖水"）
  if (cleanInput.includes(ck)) return true;
  if (ck.includes(cleanInput) && cleanInput.length >= 2) return true;
  if (variantMatch(cleanInput, ck)) return true;
  if (charOverlapMatch(cleanInput, ck)) return true;
  if (allowSingleChar && singleCharOverlap(cleanInput, ck)) return true;
  return false;
}

/**
 * 宽松判分：用户输入与任一关键词/近义词双向匹配即算对。
 * @param {string} input 用户输入的中文释义
 * @param {string[]} [keywords] word_meanings.keywords（可能为 JSON 字符串）
 * @param {string} [chineseDefinition] 兜底释义来源
 * @param {string[]} [synonyms] word_meanings.synonyms（近义词/释义变体，可选）
 */
export function checkAnswer(input, keywords, chineseDefinition, synonyms) {
  const cleanInput = cleanKw(input);
  if (!cleanInput) return false;

  let kws = keywords || [];
  if (typeof kws === 'string') {
    try { kws = JSON.parse(kws); } catch { kws = []; }
  }
  if (!Array.isArray(kws) || kws.length === 0) {
    kws = fallbackKeywords(chineseDefinition || '');
  }

  // 多义词（bolt 的"螺栓/闪电/逃跑"等多义项）场景放宽：允许单字重叠兜底
  const allowSingleChar = isPolysemous(chineseDefinition);
  for (const k of kws) {
    if (matchCandidate(cleanInput, k, allowSingleChar)) return true;
  }
  if (Array.isArray(synonyms)) {
    for (const s of synonyms) {
      if (matchCandidate(cleanInput, s, allowSingleChar)) return true;
    }
  }
  return false;
}
