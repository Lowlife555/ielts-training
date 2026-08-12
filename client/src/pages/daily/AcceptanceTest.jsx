import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import TrainingTimer from '../../components/training/TrainingTimer';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { speak } from '../../utils/speech';

export default function AcceptanceTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const wrongPool = location.state?.wrongPool || [];
  const mainResults = location.state?.mainResults || [];
  const spellingResults = location.state?.spellingResults || [];

  const initialWords = wrongPool.map(w => ({ wordId: w.wordId, word: w.word, chineseDefinition: w.chineseDefinition, partOfSpeech: w.partOfSpeech }));

  const [words, setWords] = useState(initialWords);
  const [round, setRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState([]); // 每词结果（correct=最终，firstTry=首试）
  const resultsRef = useRef([]);
  const roundPassedRef = useRef(new Set()); // 本轮已答对的词 id（重测轮次剔除用）
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const elapsed = useElapsed(session?.startTime);

  useEffect(() => { if (!session) navigate('/daily', { replace: true }); }, [session, navigate]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [currentIndex]);

  // 没有错词（漏网之鱼为 0）→ 直接完成
  useEffect(() => {
    if (session && initialWords.length === 0 && !submitting) {
      finish([]);
    }
  }, [session, initialWords.length, submitting, finish]);

  const currentWord = words[currentIndex];

  const finish = useCallback(async (finalResults) => {
    setSubmitting(true);
    try {
      const report = await api.completeTraining({
        sessionId: session.sessionId,
        durationSeconds: elapsed,
        mainResults,
        spellingResults,
        acceptanceResults: finalResults,
      });
      showToast(report.completed ? '🎉 验收通过，今日任务完成!' : '验收完成', 'success');
      navigate('/daily/report', { state: { report, plan } });
    } catch (err) {
      showToast('提交失败: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [session, elapsed, mainResults, spellingResults, navigate, showToast, plan]);

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting) return;
    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // 答对的词记入本轮已通过集合（重测轮次剔除用）
    if (isCorrect) {
      roundPassedRef.current.add(currentWord.wordId);
    }

    setResults(prev => {
      const idx = prev.findIndex(r => r.wordId === currentWord.wordId);
      let next;
      if (idx === -1) {
        // 首次尝试：记录首试正确率 firstTry
        next = [...prev, { wordId: currentWord.wordId, correct: isCorrect, firstTry: isCorrect, answer: userInput.trim() }];
      } else if (isCorrect) {
        // 后续轮次拼对：correct 更新为 true（首次成绩保留在 firstTry）
        const copy = [...prev];
        copy[idx] = { ...copy[idx], correct: true, answer: userInput.trim() };
        next = copy;
      } else {
        next = prev; // 后续轮次仍拼错：保持原状，继续重测
      }
      resultsRef.current = next;
      return next;
    });

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        // 下一轮只重测本轮未通过的词（已通过的直接剔除）
        const retryWords = words.filter(w => !roundPassedRef.current.has(w.wordId));
        if (retryWords.length > 0) {
          setWords(retryWords);
          setRound(r => r + 1);
          setCurrentIndex(0);
          setUserInput('');
          setFeedback(null);
          inputRef.current?.focus();
        } else {
          // 本轮全对：验收通过
          finish(resultsRef.current);
        }
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentIndex, currentWord, words, round, submitting, finish]);

  const abandon = useCallback(async () => {
    if (submitting) return;
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    try {
      await api.abandonTraining({ sessionId: session.sessionId, durationSeconds: elapsed, mainResults });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    }
  }, [submitting, session, elapsed, mainResults, showToast, navigate]);

  useKeyboard({
    'Enter': () => submitAnswer(),
    'Escape': abandon,
    ' ': (e) => {
      if (feedback && currentWord) { e.preventDefault(); speak(currentWord.word); }
    },
  }, true, [submitAnswer, abandon, feedback, currentWord]);

  if (!session) return null;

  if (initialWords.length === 0 && submitting) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">全部单词一次通过!</h2>
        <p className="text-gray-500">没有漏网之鱼，正在提交...</p>
      </div>
    );
  }

  const progress = (currentIndex / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-amber-600">✅ 验收测验 · List {session.listNo} · {round > 1 ? `第 ${round} 轮` : '漏网之鱼'} · 剩余 {words.length} 词</span>
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
        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {currentWord && (
        <div className={`card text-center border-2 transition-all duration-300 ${
          feedback === 'correct' ? 'border-green-500 animate-pulse-green' :
          feedback === 'incorrect' ? 'border-red-500 animate-shake-red' : 'border-gray-200'
        }`}>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">验收 · 请根据中文释义拼写（必须全部正确）</p>
            <p className="text-3xl font-bold text-gray-900">{currentWord.chineseDefinition}</p>
            <span className="text-sm text-gray-400 mt-1">{currentWord.partOfSpeech}</span>
          </div>

          <div className="max-w-sm mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="输入英文单词..."
              className={`input-field text-center text-xl font-mono ${
                feedback === 'correct' ? 'border-green-500 bg-green-50' :
                feedback === 'incorrect' ? 'border-red-500 bg-red-50' : ''
              }`}
              autoComplete="off" autoCorrect="off" spellCheck="false"
              disabled={!!feedback}
            />
            {feedback && (
              <div className={`text-center mt-3 ${feedback === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
                {feedback === 'correct' ? (
                  <span className="flex items-center justify-center gap-1"><CheckCircle className="w-5 h-5" /> 正确!</span>
                ) : (
                  <div>
                    <span className="flex items-center justify-center gap-1"><XCircle className="w-5 h-5" /> 错误 · 将重测</span>
                    <p className="text-sm mt-1">正确答案: <span className="font-semibold text-green-600">{currentWord.word}</span></p>
                    <button onClick={() => speak(currentWord.word)} className="mt-1 text-xs text-indigo-500 hover:underline flex items-center gap-1 mx-auto">
                      <Volume2 className="w-3 h-3" /> 听发音
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <button onClick={submitAnswer} disabled={!userInput.trim() || !!feedback || submitting} className="btn-primary px-8">
          <span className="kbd-hint">提交 (Enter)</span>
          <span className="touch-hint hidden">提交</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 · 错词自动重测直到全部正确</span>
        <span className="touch-hint hidden">拼对为止 · 错词自动重测直到全部正确</span>
      </p>
    </div>
  );
}
