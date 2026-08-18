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
/** 单个候选词匹配：单字精确 + 双向包含 + 变体归一化 + 保守字符重叠 */
function matchCandidate(cleanInput, candidate) {
  const ck = cleanKw(candidate);
  if (!ck) return false;
  if (ck.length === 1) return cleanInput === ck; // 单字仅精确匹配（"糖"不命中"糖水"）
  if (cleanInput.includes(ck)) return true;
  if (ck.includes(cleanInput) && cleanInput.length >= 2) return true;
  if (variantMatch(cleanInput, ck)) return true;
  if (charOverlapMatch(cleanInput, ck)) return true;
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

  for (const k of kws) {
    if (matchCandidate(cleanInput, k)) return true;
  }
  if (Array.isArray(synonyms)) {
    for (const s of synonyms) {
      if (matchCandidate(cleanInput, s)) return true;
    }
  }
  return false;
}
