import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSwipe } from '../../hooks/useSwipe';
import { useTouch } from '../../context/TouchContext';
import { speak } from '../../utils/speech';
import { Volume2, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function PetWarmup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { isTouch } = useTouch();
  const plan = location.state?.plan;
  const batchSize = location.state?.batchSize || 30;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [starting, setStarting] = useState(false);

  const words = plan?.petWarmupWords || [];
  const currentWord = words[currentIndex];

  const startMain = useCallback(async () => {
    if (!plan?.todayList || starting) return;
    setStarting(true);
    try {
      const session = await api.startTraining({
        listNo: plan.todayList.listNo,
        batchSize,
        targetMinutes: plan.targetMinutes,
        debtMinutes: plan.debtMinutes,
      });
      navigate('/daily/study', { state: { session, plan, batchSize } });
    } catch (err) {
      showToast('启动训练失败: ' + err.message, 'error');
      setStarting(false);
    }
  }, [plan, starting, navigate, showToast]);

  const next = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1);
      setShowMeaning(false);
    } else {
      startMain();
    }
  }, [currentIndex, words.length, startMain]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setShowMeaning(false);
    }
  }, [currentIndex]);

  // 主按钮：未翻面时 = 显示释义；已翻面时 = 下一个/开始主任务（文案与行为必须一致）
  const mainAction = useCallback(() => {
    if (!showMeaning) { setShowMeaning(true); return; }
    next();
  }, [showMeaning, next]);

  // 触屏手势：左右滑动切换；点卡片只翻面（已显示时点击无操作，避免误触跳题）
  const swipe = useSwipe({
    enabled: isTouch,
    onLeft: () => { if (showMeaning) next(); else setShowMeaning(true); },
    onRight: () => { if (showMeaning) prev(); else setShowMeaning(true); },
    onTap: () => { if (!showMeaning) setShowMeaning(true); },
  });

  useKeyboard({
    'Enter': () => { if (!showMeaning) setShowMeaning(true); else next(); },
    'ArrowRight': next,
    'ArrowLeft': prev,
    ' ': (e) => { e.preventDefault(); if (currentWord) speak(currentWord.word); },
    'Escape': () => navigate('/daily'),
  }, true, [showMeaning, currentIndex, next, prev, currentWord, navigate, startMain]);

  if (!plan) return null;

  const isLast = currentIndex >= words.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
          🏃 热身 · 不计时不计分
        </span>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
        <button onClick={() => setShowMeaning(!showMeaning)} className="p-2 hover:bg-gray-100 rounded-lg" title="显示/隐藏释义">
          {showMeaning ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-green-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + (showMeaning ? 1 : 0)) / words.length) * 100}%` }} />
      </div>

      {/* Flashcard */}
      {currentWord && (
        <div
          className={`card text-center py-12 min-h-[300px] flex flex-col justify-center ${isTouch ? 'no-select' : ''}`}
          {...swipe}
        >
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">PET 热身</span>
          <div className="text-4xl font-bold text-gray-900 mb-3">{currentWord.word}</div>
          <div className="flex items-center justify-center gap-2 mb-4">
            {currentWord.phonetic && <span className="text-lg text-gray-400">{currentWord.phonetic}</span>}
            {currentWord.partOfSpeech && (
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-sm rounded">{currentWord.partOfSpeech}</span>
            )}
          </div>

          <button onClick={() => speak(currentWord.word)}
            className={`mx-auto mb-6 w-12 h-12 ${isTouch ? 'w-14 h-14' : ''} bg-green-50 hover:bg-green-100 rounded-full flex items-center justify-center transition-colors`}>
            <Volume2 className="w-6 h-6 text-green-600" />
          </button>

          <div className={`transition-all duration-300 ${showMeaning ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <p className="text-2xl text-gray-700">{currentWord.chineseDefinition}</p>
          </div>

          {!showMeaning && (
            <p className="text-sm text-gray-400">
              <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Enter</kbd> 显示释义</span>
              <span className="touch-hint hidden">点卡片 显示释义</span>
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={prev} disabled={currentIndex === 0} className="btn-secondary disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 inline" /> 上一个
        </button>
        <button onClick={mainAction} disabled={starting} className="btn-primary">
          {isLast && showMeaning ? (starting ? '准备中...' : '开始主任务 →') : showMeaning ? '下一个' : '显示释义'}
          <ChevronRight className={`w-4 h-4 inline ${showMeaning ? '' : 'hidden'}`} />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 space-x-3">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 发音</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">← →</kbd> 切换</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> {showMeaning ? (isLast ? '开始' : '下一个') : '显示释义'}</span>
        <span className="touch-hint hidden">← 上一个 · 点卡片翻面 · 下一个 →</span>
      </p>
    </div>
  );
}
