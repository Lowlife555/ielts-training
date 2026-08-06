import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { speak } from '../utils/speech';

export default function DailyQuiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const session = location.state?.session;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!session) navigate('/daily', { replace: true }); }, [session, navigate]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [currentIndex]);

  const words = session?.words || [];
  const currentWord = words[currentIndex];

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting) return;
    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setAnswers(prev => [...prev, { wordId: currentWord.wordId, userAnswer: userInput.trim() }]);

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        finishQuiz();
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 600);
  }, [userInput, feedback, currentIndex, currentWord, words.length, submitting]);

  const finishQuiz = async () => {
    setSubmitting(true);
    try {
      const updatedAnswers = [...answers, { wordId: currentWord.wordId, userAnswer: userInput.trim() }];
      const result = await api.submitDailyQuiz({ sessionId: session.sessionId, answers: updatedAnswers });
      showToast(`测验完成! 正确率: ${result.accuracy}%`, 'success');
      if (result.wrongCount > 0) {
        navigate('/daily/correction', { state: { session, quizResult: result } });
      } else {
        navigate('/daily/report', { state: { sessionId: session.sessionId } });
      }
    } catch (err) {
      showToast('提交失败: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useKeyboard({
    'Enter': () => submitAnswer(),
    'Escape': () => {},
  }, true, [submitAnswer]);

  if (!session) return null;
  const progress = ((currentIndex) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">✍️ 拼写测验</span>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
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
            <p className="text-sm text-gray-500 mb-1">请根据中文释义拼写单词</p>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <button onClick={submitAnswer} disabled={!userInput.trim() || !!feedback} className="btn-primary px-8">
          提交 (Enter)
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 · 答完后自动进入下一题
      </p>
    </div>
  );
}
