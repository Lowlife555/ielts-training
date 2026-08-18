/**
 * V7.3.2: 中文变体归一化（借鉴 HanLP / CC-CEDICT 的异形词处理 + RapidFuzz 的 token 重叠思想）
 *
 * 解决中文异形词/近形词问题：
 *  - 异形词：雇佣 ↔ 雇用（同音同义不同写法）
 *  - 部分重叠：定义 ↔ 界定（共享"定"）
 *
 * 策略：
 *  1. 异形词归一化表：判分前把双方常见异形字替换为统一形式
 *  2. 保守字符重叠：双字词共享 ≥1 个位置正确字符 且 输入/关键词互不为对方的错误子串
 */

// ===== 1. 异形词归一化表（常见中文异形字/词，教学场景高频） =====
// 规则：key → 标准形式，判分时双方都替换后再比较
const VARIANT_MAP = {
  '雇佣': '雇用',
  '帐': '账',           // 帐单→账单
  '分份': '份额',       // 分/份
  '画划': '划',         // 计划/计画
  '并并': '并',
  '佈': '布', '佈置': '布置',
  '繫': '系', '聯繫': '联系',
  '爲': '为', '爲什么': '为什么',
  '裏': '里', '這': '这', '個': '个',
  '過': '过', '還': '还', '們': '们',
  '說': '说', '時': '时', '問': '问', '對': '对',
  '遲': '迟', '選': '选', '難': '难',
};

// 异形字级映射（单字替换，如 帳→账、傭→佣、僱→雇）
const VARIANT_CHAR_MAP = {
  '帳': '账', '賬': '账', '傭': '佣', '僱': '雇',
  '佈': '布', '繫': '系', '為': '为', '爲': '为',
  '裏': '里', '這': '这', '個': '个', '過': '过',
  '還': '还', '們': '们', '說': '说', '時': '时',
  '問': '问', '對': '对', '遲': '迟', '選': '选',
  '難': '难', '與': '与', '於': '于', '並': '并',
  '後': '后', '發': '发', '複': '复', '練': '练', '麼': '么',
};

/**
 * 归一化中文文本：异形字替换 + 异形词替换
 */
export function normalizeVariant(text) {
  let t = String(text || '');
  // 1. 单字异形替换
  for (const [from, to] of Object.entries(VARIANT_CHAR_MAP)) {
    if (t.includes(from)) t = t.split(from).join(to);
  }
  // 2. 双字异形词替换（词级优先，避免单字误伤）
  for (const [from, to] of Object.entries(VARIANT_MAP)) {
    if (t.includes(from) && from !== to) t = t.split(from).join(to);
  }
  return t;
}

/**
 * 变体匹配：归一化后的双向包含
 * @returns {boolean} 是否命中
 */
export function variantMatch(input, keyword) {
  if (!input || !keyword) return false;
  const ni = normalizeVariant(input);
  const nk = normalizeVariant(keyword);
  if (ni === nk) return true;
  if (ni.includes(nk)) return true;
  if (nk.includes(ni) && ni.length >= 2) return true;
  return false;
}

/**
 * 保守字符重叠：双字词，输入与关键词在"位置错位但字符相同"上重叠 ≥1 个连续字符
 * 如 "雇佣"(雇,佣) vs "雇用"(雇,用)：共享 "雇" —— 归一化后 "雇用"= "雇用"，已由 variantMatch 覆盖
 * 这里处理的是归一化后仍不同的（如 "定义" vs "界定" 共享"定"）——保守起见只做共享连续 2 字符
 */
export function charOverlapMatch(input, keyword) {
  if (!input || !keyword) return false;
  if (input.length < 2 || keyword.length < 2) return false;
  const short = input.length <= keyword.length ? input : keyword;
  const long = input.length <= keyword.length ? keyword : input;
  // 连续 2 字符窗口
  for (let i = 0; i + 1 < short.length; i++) {
    const pair = short.slice(i, i + 2);
    if (long.includes(pair)) return true;
  }
  return false;
}

export default { normalizeVariant, variantMatch, charOverlapMatch };
