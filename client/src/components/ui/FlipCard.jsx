/**
 * v7.2 3D 翻卡组件（0.3s 翻转）
 * 正面 = 单词+音标+完整释义；背面 = 单词+音标（隐藏释义）
 * flipped=false → 正面；flipped=true → 背面
 */
import { Volume2 } from 'lucide-react';
import { speak } from '../../utils/speech';
import { useSettings } from '../../context/SettingsContext';

export default function FlipCard({ word, flipped, onClick, markNode, showMarked, className = '' }) {
  const { settings } = useSettings();
  const showPhonetic = settings?.showPhonetic !== false;

  const meaningText = Array.isArray(word.meanings) && word.meanings.length > 0
    ? word.meanings.join('；')
    : word.chineseDefinition;

  const posBadge = word.partOfSpeech && (
    <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{word.partOfSpeech}</span>
  );

  // 朗读按钮：正反两面共用（stopPropagation 防止触发翻卡）
  const speakBtn = (
    <button
      onClick={(e) => { e.stopPropagation(); speak(word.word); }}
      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
      title="朗读 (Space)"
      aria-label="朗读"
    >
      <Volume2 className="w-4 h-4" />
    </button>
  );

  return (
    <div
      className={`flip-card cursor-pointer ${flipped ? 'flipped' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flip-card-inner">
        {/* 正面：完整释义（含朗读按钮） */}
        <div className="flip-face flip-front bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-semibold text-gray-900">{word.word}</span>
            {showPhonetic && word.phonetic && <span className="text-sm text-gray-400">{word.phonetic}</span>}
            {posBadge}
            {speakBtn}
            {showMarked?.(word)}
          </div>
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{meaningText}</p>
        </div>

        {/* 背面：仅英文+音标（释义隐藏，含朗读按钮） */}
        <div className="flip-face flip-back bg-indigo-50 rounded-xl border border-indigo-200 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-semibold text-gray-900">{word.word}</span>
            {showPhonetic && word.phonetic && <span className="text-sm text-gray-400">{word.phonetic}</span>}
            {posBadge}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {speakBtn}
            {markNode}
          </div>
        </div>
      </div>
    </div>
  );
}
