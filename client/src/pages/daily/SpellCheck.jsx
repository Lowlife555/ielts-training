import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { speak } from '../../utils/speech';
import { checkEnglishAnswer } from '../../utils/answerCheck';
import TrainingTimer from '../../components/training/TrainingTimer';
import { Volume2, CheckCircle, XCircle, Target, Home, RotateCcw } from 'lucide-react';

const CHECK_COUNT = 30;
const PASS_RATE = 80;

export default function SpellCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const dictationStats = location.state?.dictationStats;
  const spotCheckAccuracy = location.state?.spotCheckAccuracy;
  const restedSeconds = location.state?.restedSeconds || 0;

  // 今天背过的全部词 = session.words,随机抽 30 词(不足取全部)
  const [words, setWords] = useState(() => {
    const pool = session?.words || [];
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(CHECK_COUNT, shuffled.length));
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [finished, setFinished] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const inputRef = useRef(null);

  const elapsed = useElapsed(session?.startTime);
  const currentWord = words[currentIndex];

  useEffect(() => {
    if (!session) navigate('/daily', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    if (session && !finished) inputRef.current?.focus();
  }, [session, finished, currentIndex]);

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting) return;
    const isCorrect = checkEnglishAnswer(userInput, currentWord.word, { allowMorph: true, allowEdit: false });
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setResults(prev => [...prev, { wordId: currentWord.id, correct: isCorrect, answer: userInput.trim() }]);

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        finish([...results, { wordId: currentWord.id, correct: isCorrect, answer: userInput.trim() }]);
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentIndex, currentWord, words, results, submitting]);

  const finish = async (finalResults) => {
    setFinished(true);
    setSubmitting(true);
    try {
      const res = await api.submitSpellCheck({
        sessionId: session.sessionId,
        durationSeconds: Math.max(0, elapsed - restedSeconds),
        results: finalResults,
      });
      setOutcome(res);
      showToast(res.passed ? '🎉 拼写抽查通过，今日训练完成!' : '拼写抽查未达标，List 已标记待重背', res.passed ? 'success' : 'warning');
    } catch (err) {
      showToast('提交失败: ' + err.message, 'error');
      setFinished(false);
    } finally {
      setSubmitting(false);
    }
  };

  const abandon = useCallback(async () => {
    if (abandoning || submitting) return;
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    setAbandoning(true);
    try {
      await api.abandonTraining({
        sessionId: session.sessionId,
        durationSeconds: Math.max(0, elapsed - restedSeconds),
        mainResults: [],
      });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, submitting, session, elapsed, restedSeconds, showToast, navigate]);

  useKeyboard({
    'Enter': () => { if (finished && outcome) goReport(); else submitAnswer(); },
    ' ': (e) => { e.preventDefault(); if (currentWord && !finished) speak(currentWord.word); },
    'Escape': () => { if (finished) navigate('/'); else abandon(); },
  }, true, [submitAnswer, currentWord, finished, outcome, abandon, navigate]);

  if (!session) return null;

  const goReport = () => {
    const report = {
      durationSeconds: outcome.durationSeconds,
      completed: outcome.completed,
      dictationAccuracy: dictationStats && dictationStats.total > 0
        ? Math.round((dictationStats.correct / dictationStats.total) * 100)
        : null,
      spellingAccuracy: outcome.accuracy,
      spotCheckAccuracy: spotCheckAccuracy ?? null,
      wrongPoolCount: null,
    };
    navigate('/daily/report', { state: { report, plan, passed: outcome.passed } });
  };

  // 结果页
  if (finished && outcome) {
    const passed = outcome.passed;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="card animate-fade-in">
          <div className="text-6xl mb-4">{passed ? '🎉' : '📌'}</div>
          <h1 className={`text-3xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-amber-600'}`}>
            {passed ? '拼写抽查通过!' : '拼写抽查未达标'}
          </h1>
          <p className="text-lg text-gray-500 mb-6">
            List {session.listNo} · 正确率 <span className={`font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>{outcome.accuracy}%</span>
            （{outcome.correct}/{outcome.total}）{passed ? ' ≥ 80%' : ' < 80%'}
          </p>

          {passed ? (
            <p className="text-sm text-gray-500 mb-8">今日训练完成，List 已标记完成，明天见!</p>
          ) : (
            <div className="mb-8">
              <p className="text-sm text-amber-600 mb-2">该 List 已标记待重背，明日简报将优先安排重背</p>
              <p className="text-sm text-gray-400">今日训练未达标，将按欠债规则计算</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {!passed && (
              <button onClick={() => { setFinished(false); setOutcome(null); setResults([]); setCurrentIndex(0); setUserInput(''); setFeedback(null); }} className="btn-secondary flex items-center gap-1">
                <RotateCcw className="w-4 h-4" />
                重新拼写
              </button>
            )}
            <button onClick={goReport} className="btn-primary flex items-center gap-1">
              <Target className="w-4 h-4" />
              查看今日报告
            </button>
            <Link to="/" className="btn-secondary flex items-center gap-1">
              <Home className="w-4 h-4" />
              返回首页
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 查看报告</span>
          <span className="touch-hint hidden">拼写抽查完成！</span>
        </p>
      </div>
    );
  }

  const progress = (currentIndex / words.length) * 100;
  const borderClass = feedback === 'correct'
    ? 'border-green-500 animate-pulse-green'
    : feedback === 'incorrect'
    ? 'border-red-500 animate-shake-red'
    : 'border-gray-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-green-600 flex items-center gap-2">
          <Target className="w-4 h-4" /> 拼写抽查 · 今天背过的词随机 {words.length} 词
          <span className="text-gray-400 font-normal">正确率 ≥ {PASS_RATE}% 算过</span>
        </span>
        <TrainingTimer
          elapsed={elapsed}
          targetMinutes={plan?.targetMinutes || 60}
          onAbandon={abandon}
          onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
        />
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {currentWord && (
        <div className={`card text-center border-2 transition-all duration-300 ${borderClass}`}>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">请根据中文释义拼写英文单词</p>
            <p className="text-3xl font-bold text-gray-900">{currentWord.chineseDefinition}</p>
            <span className="text-sm text-gray-400 mt-1 inline-block">
              {currentWord.partOfSpeech || ''}
            </span>
          </div>

          <div className="max-w-sm mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="输入英文单词..."
              className={`input-field text-center text-xl font-mono ${
                feedback === 'correct' ? 'border-green-500 bg-green-50' :
                feedback === 'incorrect' ? 'border-red-500 bg-red-50' : ''
              }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              disabled={!!feedback}
            />
            {feedback && (
              <div className={`text-center mt-3 ${feedback === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
                {feedback === 'correct' ? (
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-5 h-5" /> 正确!
                  </span>
                ) : (
                  <div>
                    <span className="flex items-center justify-center gap-1">
                      <XCircle className="w-5 h-5" /> 错误
                    </span>
                    <p className="text-sm mt-1">
                      正确答案: <span className="font-semibold text-green-600">{currentWord.word}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <button
          onClick={submitAnswer}
          disabled={!userInput.trim() || !!feedback || submitting}
          className="btn-primary px-8"
        >
          <span className="kbd-hint">提交 (Enter)</span>
          <span className="touch-hint hidden">提交</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
        </span>
        <span className="touch-hint hidden">输入英文拼写后提交</span>
      </p>
    </div>
  );
}
