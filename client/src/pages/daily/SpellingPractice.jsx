import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed, formatDuration } from '../../hooks/useTimer';
import TrainingTimer from '../../components/training/TrainingTimer';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { speak } from '../../utils/speech';
import { checkEnglishAnswer } from '../../utils/answerCheck';

export default function SpellingPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const wrongPool = location.state?.wrongPool || [];
  const mainResults = location.state?.mainResults || [];

  const words = session?.spellingWords || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [spellingResults, setSpellingResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [abandoning, setAbandoning] = useState(false);
  const inputRef = useRef(null);

  const elapsed = useElapsed(session?.startTime);

  useEffect(() => { if (!session) navigate('/daily', { replace: true }); }, [session, navigate]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [currentIndex]);

  const currentWord = words[currentIndex];

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim()) return;
    const isCorrect = checkEnglishAnswer(userInput, currentWord.word);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    const newResults = [...spellingResults, { wordId: currentWord.wordId, correct: isCorrect, answer: userInput.trim() }];
    setSpellingResults(newResults);

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        navigate('/daily/acceptance', { state: { session, plan, wrongPool, mainResults, spellingResults: newResults } });
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentIndex, currentWord, words.length, spellingResults, navigate, session, plan, wrongPool, mainResults]);

  const abandon = useCallback(async () => {
    if (abandoning) return;
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    setAbandoning(true);
    try {
      await api.abandonTraining({ sessionId: session.sessionId, durationSeconds: elapsed, mainResults });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, session, elapsed, mainResults, showToast, navigate]);

  useKeyboard({
    'Enter': () => submitAnswer(),
    'Escape': abandon,
    ' ': (e) => {
      if (feedback && currentWord) { e.preventDefault(); speak(currentWord.word); }
    },
  }, true, [submitAnswer, abandon, feedback, currentWord]);

  if (!session) return null;

  const progress = (currentIndex / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-indigo-600">✍️ 中译英拼写 · List {session.listNo}</span>
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
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {currentWord && (
        <div className={`card text-center border-2 transition-all duration-300 ${
          feedback === 'correct' ? 'border-green-500 animate-pulse-green' :
          feedback === 'incorrect' ? 'border-red-500 animate-shake-red' : 'border-gray-200'
        }`}>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">请根据中文释义拼写英文单词</p>
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
                    <span className="flex items-center justify-center gap-1"><XCircle className="w-5 h-5" /> 错误</span>
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
        <button onClick={submitAnswer} disabled={!userInput.trim() || !!feedback} className="btn-primary px-8">
          <span className="kbd-hint">提交 (Enter)</span>
          <span className="touch-hint hidden">提交</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 · 答完后自动进入下一题 · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工</span>
        <span className="touch-hint hidden">输入完成后点提交 · 答完自动进入下一题</span>
      </p>
    </div>
  );
}
