import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { useElapsed } from '../hooks/useTimer';
import { useSwipe } from '../hooks/useSwipe';
import { useTouch } from '../context/TouchContext';
import TrainingTimer from '../components/TrainingTimer';
import { speak } from '../utils/speech';
import { Volume2, Check, X, Target, ChevronRight } from 'lucide-react';

export default function SpotCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { isTouch } = useTouch();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const wrongPool = location.state?.wrongPool || [];
  const mainResults = location.state?.mainResults || [];

  const words = plan?.spotCheckList?.words || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const elapsed = useElapsed(session?.startTime);
  const currentWord = words[currentIndex];

  const mark = useCallback((correct) => {
    if (!currentWord || finished) return;
    const newResults = [...results, { wordId: currentWord.wordId, correct }];
    setResults(newResults);
    setShowMeaning(false);
    if (currentIndex + 1 >= words.length) {
      submit(newResults);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentWord, results, currentIndex, words.length, finished]);

  const submit = async (finalResults) => {
    setFinished(true);
    setSubmitting(true);
    try {
      const res = await api.submitSpotCheck({ listNo: plan.spotCheckList.listNo, results: finalResults });
      setOutcome(res);
      showToast(res.passed ? '抽查通过!' : '抽查未达标，已标记待重背', res.passed ? 'success' : 'warning');
    } catch (err) {
      showToast('提交失败: ' + err.message, 'error');
      setFinished(false);
    } finally {
      setSubmitting(false);
    }
  };

  const abandon = useCallback(async () => {
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    try {
      await api.abandonTraining({ sessionId: session.sessionId, durationSeconds: elapsed, mainResults });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    }
  }, [session, elapsed, showToast, navigate]);

  // 触屏手势：点卡片显示释义；左右滑动 = 会/不会
  const swipe = useSwipe({
    enabled: isTouch,
    onLeft: () => { if (showMeaning) mark(false); else setShowMeaning(true); },
    onRight: () => { if (showMeaning) mark(true); else setShowMeaning(true); },
    onTap: () => { if (!showMeaning) setShowMeaning(true); },
  });

  useKeyboard({
    'Enter': () => { if (!showMeaning && !finished) setShowMeaning(true); },
    '1': () => { if (showMeaning) mark(true); },
    '2': () => { if (showMeaning) mark(false); },
    ' ': (e) => { e.preventDefault(); if (currentWord) speak(currentWord.word); },
    'Escape': abandon,
  }, true, [showMeaning, mark, currentWord, finished, abandon]);

  if (!session || !plan?.spotCheckList) return null;

  const continueToSpelling = () => {
    navigate('/daily/spelling', { state: { session, plan, wrongPool, mainResults } });
  };

  // 结果页
  if (finished && outcome) {
    const passed = outcome.passed;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="card animate-fade-in">
          <div className={`text-6xl mb-4 ${passed ? '' : ''}`}>{passed ? '🎉' : '📌'}</div>
          <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-amber-600'}`}>
            {passed ? '抽查通过!' : '未达标，标记待重背'}
          </h2>
          <p className="text-gray-500 mb-6">
            List {outcome.listNo} · 正确率 <span className="font-bold text-gray-900">{outcome.accuracy}%</span>（{outcome.correct}/{outcome.total}）
            {passed ? ' ≥ 80%' : ' < 80%'}
          </p>
          {!passed && (
            <p className="text-sm text-amber-600 mb-6">该 List 已标记待重背，明日简报将优先安排重背</p>
          )}
          <button onClick={continueToSpelling} className="btn-primary px-8">
            继续今日训练 <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      </div>
    );
  }

  const progress = (currentIndex / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-green-600 flex items-center gap-2">
          <Target className="w-4 h-4" /> 抽查 List {plan.spotCheckList.listNo}
          <span className="text-gray-400 font-normal">正确率 ≥ {plan.spotCheckList.passRate}% 算过</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
          <TrainingTimer
            elapsed={elapsed}
            targetMinutes={plan?.targetMinutes || 60}
            onAbandon={abandon}
            onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
          />
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      {currentWord && (
        <div
          className={`card text-center py-12 min-h-[320px] flex flex-col justify-center ${isTouch ? 'no-select' : ''}`}
          {...swipe}
        >
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">抽查 · List {plan.spotCheckList.listNo}</span>
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
            <p className="text-2xl text-gray-700 mb-6">{currentWord.chineseDefinition}</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <button
                onClick={() => mark(true)}
                className={`flex items-center justify-center gap-1 px-4 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors ${isTouch ? 'min-h-[52px] text-base' : ''}`}
              >
                <Check className="w-5 h-5" /> {isTouch ? '会' : '会 (1)'}
              </button>
              <button
                onClick={() => mark(false)}
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
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">1 / 2</kbd> 会 / 不会</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工</span>
        <span className="touch-hint hidden">← 不会 · 点卡片翻面 · 会 →</span>
      </p>
    </div>
  );
}
