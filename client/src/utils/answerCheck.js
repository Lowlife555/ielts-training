/**
 * 统一判分工具（V7.3.0）
 *
 * 英文拼写判分 checkEnglishAnswer：
 *   ① 精确匹配（忽略大小写）
 *   ② 词形归一化（复数/过去式/进行时）→ 再匹配
 *   ③ 编辑距离 ≤1（Damerau-Levenshtein：增/删/改/换位）
 *
 * 中文释义判分 checkChineseAnswer：
 *   ① 现有宽松关键词（助词剥离 + 双向包含，来自 checkAnswer.js）
 *   ② 近义词库命中（word_meanings.synonyms）
 *
 * 场景参数（opts）：
 *   allowMorph   — 词形变化容错（默认 true，考核场景也开：认可正确变形）
 *   allowEdit    — 编辑距离容错（默认 true；验收/抽查建议 false）
 *   allowSynonym — 近义词容错（默认 true；验收/抽查建议 false）
 */
import { checkAnswer as keywordCheck, fallbackKeywords } from './checkAnswer.js';

// ===== 编辑距离（Damerau-Levenshtein，含换位） =====
function damerauLevenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // 删除
        dp[i][j - 1] + 1,       // 插入
        dp[i - 1][j - 1] + cost // 替换
      );
      // 相邻换位（Damerau）
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// ===== 词形归一化（规则版，处理常见规则变化） =====
// 注意：不处理不规则变化（lead→led、go→went 等），保持判错
function morphRoot(word) {
  const w = word.toLowerCase();
  if (w.length < 4) return w;

  // 进行时 -ing
  if (w.endsWith('ing')) {
    const base = w.slice(0, -3);
    // 双写辅音 + ing：running → run、stopping → stop
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2] && !'aeiou'.includes(base[base.length - 1])) {
      return base.slice(0, -1);
    }
    // 去 e + ing：making → make、using → use（"mak"+"e"、"us"+"e"）
    // 规则：base 以"单元音+辅音"结尾（且辅音非 y）→ 原词以 e 结尾 → 补 e
    // 反例：play → "ay" 双元音结尾，不补 e
    const last = base[base.length - 1];
    const prev = base[base.length - 2];
    if (base.length >= 3 && 'aeiou'.includes(prev) && !'aeiouy'.includes(last) && last !== 'y') {
      return base + 'e';
    }
    return base;
  }

  // 过去式 -ied：studied → study
  if (w.endsWith('ied')) return w.slice(0, -3) + 'y';
  // 过去式 -ed / -d
  if (w.endsWith('ed')) {
    let base = w.slice(0, -2);
    // 双写辅音 + ed：stopped → stop
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2] && !'aeiou'.includes(base[base.length - 1])) {
      return base.slice(0, -1);
    }
    // 去 e + ed：used → use、created → create（"us"+"e"、"creat"+"e"）
    if (/[bcdfghjklmnpqrstvwxyz]$/.test(base) && 'aeiou'.includes(base[base.length - 2])) {
      return base + 'e';
    }
    return base;
  }

  // 复数 -ies：studies → study
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  // 复数 -es：boxes → box、watches → watch
  if (w.endsWith('es')) {
    const base = w.slice(0, -2);
    if (base.endsWith('s') || base.endsWith('x') || base.endsWith('z') || base.endsWith('ch') || base.endsWith('sh')) {
      return base;
    }
  }
  // 复数 -s：books → book
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
    const base = w.slice(0, -1);
    if (base.length >= 2) return base;
  }

  return w;
}

// 常见英文单词集：输入是真实存在的另一个词时，编辑距离容错不生效（避免 quite/quiet 误判）
const COMMON_WORDS = new Set(`
the be to of and a in that have i it for not on with he as you do at this but his by from
they we say her she or an will my one all would there their what so up out if about who get
which go me when make can like time no just him know take people into year your good some
could them see other than then now look only come its over think also back after use two how
our work first well way even new want because any these give day most us quite quiet site
sight write right light night might white fight tight bite kite apple great green grow
water watch wash wish wide wear were where here there their hear hair hour our are
quiet quite quit queue queen quick quake quest quote quite
`.trim().split(/\s+/));

/** 编辑距离容错：仅当输入不是真实存在的常见单词时允许（避免 quite→quiet 类误判） */
function editDistanceAllowed(clean, target, opts) {
  if (!opts.allowEdit) return false;
  // 输入是常见独立单词（且与目标词不同）→ 不适用编辑距离容错
  if (COMMON_WORDS.has(clean) && clean !== target) return false;
  return damerauLevenshtein(clean, target) <= 1;
}

/**
 * 英文拼写判分。
 * @param {string} input 用户输入
 * @param {string} word 正确单词
 * @param {object} opts { allowMorph, allowEdit }
 * @returns {boolean}
 */
export function checkEnglishAnswer(input, word, opts = {}) {
  const { allowMorph = true, allowEdit = true } = opts;
  if (!input || !word) return false;

  const clean = input.trim().toLowerCase();
  const target = word.trim().toLowerCase();
  if (!clean || !target) return false;

  // ① 精确匹配
  if (clean === target) return true;

  // ② 词形归一化后匹配
  if (allowMorph) {
    if (morphRoot(clean) === morphRoot(target)) return true;
  }

  // ③ 编辑距离 ≤1（输入为常见独立单词时禁用，避免 quite/quiet 误判）
  if (allowEdit) {
    if (editDistanceAllowed(clean, target, { allowEdit })) return true;
    // 归一化后的编辑距离（处理 studies→study 等长词形差异）
    if (allowMorph && Math.abs(clean.length - target.length) <= 2) {
      const mInput = morphRoot(clean);
      const mTarget = morphRoot(target);
      if (mInput !== mTarget && editDistanceAllowed(mInput, mTarget, { allowEdit })) return true;
    }
  }

  return false;
}

/**
 * 中文释义判分。
 * @param {string} input 用户输入
 * @param {string[]} [keywords] word_meanings.keywords
 * @param {string[]} [synonyms] word_meanings.synonyms（近义词/释义变体）
 * @param {string} [chineseDefinition] 兜底释义
 * @param {object} opts { allowSynonym }
 * @returns {boolean}
 */
export function checkChineseAnswer(input, keywords, synonyms, chineseDefinition, opts = {}) {
  const { allowSynonym = true } = opts;
  if (!input) return false;
  // 关键词 + 近义词统一走 checkAnswer 的 matchCandidate（消除两处双向包含逻辑重复）
  return keywordCheck(input, keywords, chineseDefinition, allowSynonym ? synonyms : undefined);
}

export { morphRoot, damerauLevenshtein, fallbackKeywords };
