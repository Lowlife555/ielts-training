import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { useElapsed } from '../hooks/useTimer';
import { useSwipe } from '../hooks/useSwipe';
import { useTouch } from '../context/TouchContext';
import { speak } from '../utils/speech';
import TrainingTimer from '../components/TrainingTimer';
import { Volume2, Check, X } from 'lucide-react';

export default function MainStudy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { isTouch } = useTouch();
  const session = location.state?.session;
  const plan = location.state?.plan;

  const words = session?.words || [];
  const [phase, setPhase] = useState('first'); // first | grind
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [results, setResults] = useState([]); // 第一遍: [{wordId, correct}]
  const [wrongPool, setWrongPool] = useState([]); // 错词: [{wordId, ...}]
  const [grindIndex, setGrindIndex] = useState(0);
  const [grindRound, setGrindRound] = useState(1);
  const [abandoning, setAbandoning] = useState(false);

  const elapsed = useElapsed(session?.startTime);

  useEffect(() => {
    if (!session) navigate('/daily', { replace: true });
  }, [session, navigate]);

  const total = words.length;
  const poolSize = wrongPool.length;

  const goNext = useCallback((passWrongPool, passResults) => {
    const hasSpotCheck = plan?.spotCheckList && plan.spotCheckList.words?.length > 0;
    if (hasSpotCheck) {
      navigate('/daily/spotcheck', { state: { session, plan, wrongPool: passWrongPool, mainResults: passResults } });
    } else {
      navigate('/daily/spelling', { state: { session, plan, wrongPool: passWrongPool, mainResults: passResults } });
    }
  }, [navigate, session, plan]);

  // 进入错词死磕
  const startGrind = useCallback((wrongWords) => {
    if (wrongWords.length === 0) {
      // 第一遍全对，直接进入下一阶段
      goNext([], results);
      return;
    }
    setWrongPool(wrongWords);
    setPhase('grind');
    setGrindIndex(0);
    setGrindRound(1);
    setShowMeaning(false);
  }, [goNext, results]);

  // 第一遍标记会/不会
  const markFirst = useCallback((correct) => {
    if (phase !== 'first') return;
    const word = words[currentIndex];
    if (!word) return;
    const newResults = [...results, { wordId: word.wordId, correct, wrongPool: !correct }];
    setResults(newResults);
    setShowMeaning(false);
    if (currentIndex + 1 >= total) {
      startGrind(newResults.filter(r => !r.correct).map(r => r.wordId));
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [phase, words, currentIndex, results, total, startGrind]);

  // 错词死磕标记
  const markGrind = useCallback((correct) => {
    if (phase !== 'grind') return;
    const remaining = wrongPool.filter((_, i) => i !== grindIndex);
    if (correct) {
      // 会的移出错词池
      if (remaining.length === 0) {
        goNext(wrongPool, results);
        return;
      }
      setWrongPool(remaining);
      setGrindIndex(prev => Math.min(prev, remaining.length - 1));
    } else {
      // 不会的继续留在池中，标记后回池底
      const last = remaining.length;
      setWrongPool([...remaining, wrongPool[grindIndex]]);
      setGrindIndex(last);
      setGrindRound(r => r + 1);
    }
    setShowMeaning(false);
  }, [phase, wrongPool, grindIndex, goNext, results]);

  // 第一遍完成后的过渡 UI 由 startGrind 直接跳转或进入死磕

  const currentWord = phase === 'first' ? words[currentIndex] : wrongPool[grindIndex];

  const enterKey = useCallback(() => {
    if (!currentWord) return;
    if (!showMeaning) { setShowMeaning(true); return; }
    if (phase === 'first' && currentIndex + 1 >= total) {
      markFirst(true); // 最后一张卡显示释义后，提示用户标记
    }
  }, [currentWord, showMeaning, phase, currentIndex, total, markFirst]);

  const abandon = useCallback(async () => {
    if (abandoning) return;
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    setAbandoning(true);
    try {
      await api.abandonTraining({ sessionId: session.sessionId, durationSeconds: elapsed, mainResults: results });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, session, elapsed, results, showToast, navigate]);

  // 触屏手势：点卡片翻面；左右滑动 = 会/不会（未翻面时视为翻面）
  const swipe = useSwipe({
    enabled: isTouch,
    onLeft: () => { if (showMeaning) { if (phase === 'first') markFirst(false); else markGrind(false); } else setShowMeaning(true); },
    onRight: () => { if (showMeaning) { if (phase === 'first') markFirst(true); else markGrind(true); } else setShowMeaning(true); },
    onTap: () => { if (!showMeaning) setShowMeaning(true); },
  });

  useKeyboard({
    'Enter': enterKey,
    '1': () => { if (showMeaning) { if (phase === 'first') markFirst(true); else markGrind(true); } },
    '2': () => { if (showMeaning) { if (phase === 'first') markFirst(false); else markGrind(false); } },
    'ArrowRight': () => { if (showMeaning) { if (phase === 'first') markFirst(true); else markGrind(true); } },
    ' ': (e) => { e.preventDefault(); if (currentWord) speak(currentWord.word); },
    'Escape': abandon,
  }, true, [enterKey, markFirst, markGrind, showMeaning, phase, currentWord, abandon]);

  if (!session) return null;

  const isGrind = phase === 'grind';
  const progress = isGrind
    ? ((poolSize - wrongPool.length) / poolSize) * 100
    : ((currentIndex + (showMeaning ? 1 : 0)) / total) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium flex items-center gap-2 ${isGrind ? 'text-amber-600' : 'text-indigo-600'}`}>
          {isGrind ? `🔄 错词死磕 · 第 ${grindRound} 轮` : `📖 英译中 · List ${session.listNo}`}
          {!isGrind && <span className="text-gray-400 font-normal">{currentIndex + 1} / {total}</span>}
          {isGrind && <span className="text-gray-400 font-normal">剩余 {wrongPool.length} / {poolSize}</span>}
        </span>
        <TrainingTimer
          elapsed={elapsed}
          targetMinutes={plan?.targetMinutes || 60}
          onAbandon={abandon}
          onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
        />
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${isGrind ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      {/* Card */}
      {currentWord && (
        <div
          className={`card text-center py-12 min-h-[320px] flex flex-col justify-center ${isTouch ? 'no-select' : ''}`}
          {...swipe}
        >
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">List {session.listNo}</span>
          <div className="text-4xl font-bold text-gray-900 mb-3">{currentWord.word}</div>
          <div className="flex items-center justify-center gap-2 mb-4">
            {currentWord.phonetic && <span className="text-lg text-gray-400">{currentWord.phonetic}</span>}
            {currentWord.partOfSpeech && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-sm rounded">{currentWord.partOfSpeech}</span>
            )}
          </div>

          <button onClick={() => speak(currentWord.word)}
            className={`mx-auto mb-6 w-12 h-12 ${isTouch ? 'w-14 h-14' : ''} bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors`}>
            <Volume2 className="w-6 h-6 text-indigo-600" />
          </button>

          <div className={`transition-all duration-300 ${showMeaning ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <p className="text-2xl text-gray-700 mb-6">{currentWord.chineseDefinition}</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <button
                onClick={() => isGrind ? markGrind(true) : markFirst(true)}
                className={`flex items-center justify-center gap-1 px-4 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors ${isTouch ? 'min-h-[52px] text-base' : ''}`}
              >
                <Check className="w-5 h-5" /> {isTouch ? '会' : '会 (1)'}
              </button>
              <button
                onClick={() => isGrind ? markGrind(false) : markFirst(false)}
                className={`flex items-center justify-center gap-1 px-4 py-3 rounded-lg bg-red-400 text-white font-medium hover:bg-red-500 transition-colors ${isTouch ? 'min-h-[52px] text-base' : ''}`}
              >
                <X className="w-5 h-5" /> {isTouch ? '不会' : '不会 (2)'}
              </button>
            </div>
          </div>

          {!showMeaning && (
            <p className="text-sm text-gray-400">
              <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Enter</kbd> 显示释义</span>
              <span className="touch-hint hidden">点卡片 显示释义</span>
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-4 space-x-3">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 发音</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 显示释义</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">1 / 2</kbd> 会 / 不会</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工</span>
        <span className="touch-hint hidden">← 不会 · 点卡片翻面 · 会 →</span>
      </p>
    </div>
  );
}
