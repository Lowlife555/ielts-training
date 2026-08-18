import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { useConfirm } from '../../hooks/useConfirm';
import { useTouch } from '../../context/TouchContext';
import TrainingTimer from '../../components/training/TrainingTimer';
import { speak } from '../../utils/speech';
import { checkChineseAnswer } from '../../utils/answerCheck';
import { Volume2, CheckCircle, XCircle, Target, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * V7.3.1: 抽查改为输入判分（看英文→输入中文→系统判分→手动前进）
 * 与当天默写形式一致。正确率 ≥80% 通过，否则标记待重背。
 */
export default function SpotCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { confirm, dialog } = useConfirm();
  const { isTouch } = useTouch();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const wrongPool = location.state?.wrongPool || [];
  const mainResults = location.state?.mainResults || [];

  const words = plan?.spotCheckList?.words || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const submitLockRef = useRef(false);

  const elapsed = useElapsed(session?.startTime);
  const currentWord = words[currentIndex];

  useEffect(() => { inputRef.current?.focus(); }, [currentIndex]);

  const submitAnswer = useCallback(() => {
    if (feedback || submitLockRef.current || !userInput.trim() || !currentWord || finished) return;
    submitLockRef.current = true;
    const isCorrect = checkChineseAnswer(userInput, currentWord.keywords, currentWord.synonyms, currentWord.chineseDefinition, { allowSynonym: true });
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    submitLockRef.current = false;
  }, [userInput, feedback, currentWord, finished]);

  const goNext = useCallback(() => {
    submitLockRef.current = false;
    const newResults = [...results, { wordId: currentWord.wordId, correct: feedback === 'correct' }];
    setResults(newResults);
    if (currentIndex + 1 >= words.length) {
      submit(newResults);
    } else {
      setCurrentIndex(i => i + 1);
      setUserInput('');
      setFeedback(null);
    }
  }, [currentIndex, words.length, results, feedback, currentWord]);

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
    const ok = await confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    try {
      await api.abandonTraining({ sessionId: session.sessionId, durationSeconds: elapsed, mainResults });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    }
  }, [session, elapsed, showToast, navigate]);

  useKeyboard({
    'Enter': () => {
      if (finished && outcome) { continueToSpellCheck(); return; }
      if (document.activeElement === inputRef.current) return; // 输入框聚焦由 input.onKeyDown 处理
      if (!feedback) submitAnswer();
      else goNext();
    },
    ' ': (e) => { e.preventDefault(); if (currentWord && !finished) speak(currentWord.word); },
    'Escape': () => { if (finished) navigate('/'); else abandon(); },
  }, true, [feedback, submitAnswer, goNext, currentWord, finished, outcome, abandon, navigate]);

  if (!session || !plan?.spotCheckList) return null;

  const continueToSpellCheck = () => {
    navigate('/daily/spellcheck', {
      state: {
        session, plan, wrongPool, mainResults,
        dictationStats: location.state?.dictationStats,
        spotCheckAccuracy: outcome ? outcome.accuracy : null,
        restedSeconds: location.state?.restedSeconds || 0,
      },
    });
  };

  // 结果页
  if (finished && outcome) {
    const passed = outcome.passed;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="card animate-fade-in">
          <div className="text-6xl mb-4">{passed ? '🎉' : '📌'}</div>
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
          <button onClick={continueToSpellCheck} className="btn-primary px-8">
            继续拼写抽查 <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      </div>
    );
  }

  const progress = (currentIndex / words.length) * 100;
  const borderClass = feedback === 'correct' ? 'border-green-300 bg-green-50/40' : feedback === 'incorrect' ? 'border-red-300 bg-red-50/40' : '';

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
        <div className={`card text-center py-10 min-h-[320px] flex flex-col justify-center transition-all duration-300 ${borderClass}`}>
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">抽查 · List {plan.spotCheckList.listNo} · 看英文写中文</span>

          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-4xl font-bold text-gray-900">{currentWord.word}</p>
            <button
              onClick={() => speak(currentWord.word)}
              className={`ml-2 w-12 h-12 ${isTouch ? 'w-14 h-14' : ''} bg-green-50 hover:bg-green-100 rounded-full flex items-center justify-center transition-colors`}
            >
              <Volume2 className="w-6 h-6 text-green-600" />
            </button>
          </div>
          {currentWord.phonetic && <span className="text-lg text-gray-400 mb-4">{currentWord.phonetic}</span>}

          {feedback ? (
            <div className="max-w-md mx-auto">
              {feedback === 'correct' ? (
                <div>
                  <p className="flex items-center justify-center gap-2 text-green-600 font-medium mb-1">
                    <CheckCircle className="w-5 h-5" /> 正确!
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">{currentWord.chineseDefinition}</p>
                </div>
              ) : (
                <div className="mb-2">
                  <p className="flex items-center justify-center gap-2 text-red-500 font-medium mb-1">
                    <XCircle className="w-5 h-5" /> 错误
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    参考答案: <span className="font-semibold text-green-600">{currentWord.chineseDefinition}</span>
                  </p>
                </div>
              )}
              <button onClick={goNext} className="btn-primary w-full py-2.5 mt-3">
                {currentIndex + 1 >= words.length ? '提交抽查结果' : '下一个'} <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); } }}
                placeholder="输入中文释义..."
                className="input-field text-center text-xl py-3"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                onClick={submitAnswer}
                disabled={!userInput.trim()}
                className="btn-primary w-full mt-3 py-2.5 disabled:opacity-40"
              >
                确认
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setUserInput(''); setFeedback(null); } }}
          disabled={currentIndex === 0}
          className="btn-secondary disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 inline" /> 上一个
        </button>
        <button
          onClick={() => { if (feedback) goNext(); else if (userInput.trim()) submitAnswer(); else if (currentIndex + 1 < words.length) { setCurrentIndex(i => i + 1); setUserInput(''); } }}
          className="btn-secondary"
        >
          跳过 <ChevronRight className="w-4 h-4 inline" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 space-x-3">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交/下一个</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 发音</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工</span>
        <span className="touch-hint hidden">输入中文释义后确认 · 答对答错手动前进</span>
      </p>
      {dialog}
    </div>
  );
}
