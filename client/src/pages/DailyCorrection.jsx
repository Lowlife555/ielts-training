import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function DailyCorrection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { session, quizResult } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!session || !quizResult) navigate('/daily', { replace: true }); }, [session, quizResult, navigate]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [currentIndex]);

  const wrongWords = quizResult?.wrongWords || [];
  const currentWrong = wrongWords[currentIndex];

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting) return;
    const isCorrect = userInput.trim().toLowerCase() === currentWrong.correctAnswer.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setAnswers(prev => [...prev, { wordId: currentWrong.wordId, userAnswer: userInput.trim() }]);

    setTimeout(() => {
      if (currentIndex + 1 >= wrongWords.length) {
        finishCorrection();
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentIndex, currentWrong, wrongWords.length, submitting]);

  const finishCorrection = async () => {
    setSubmitting(true);
    try {
      const allAnswers = [...answers, { wordId: currentWrong.wordId, userAnswer: userInput.trim() }];
      const result = await api.submitDailyCorrection({ sessionId: session.sessionId, answers: allAnswers });
      showToast(`订正完成! 正确率: ${result.accuracy}%`, 'success');
      navigate('/daily/report', { state: { sessionId: session.sessionId } });
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

  if (!wrongWords.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">全部正确!</h2>
        <p className="text-gray-500 mb-6">没有需要订正的单词</p>
        <button onClick={() => navigate('/daily/report', { state: { sessionId: session.sessionId } })} className="btn-primary">
          查看报告 <ArrowRight className="w-4 h-4 inline" />
        </button>
      </div>
    );
  }

  const progress = ((currentIndex) / wrongWords.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-orange-600">🔄 错词订正</span>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {wrongWords.length}</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {currentWrong && (
        <div className={`card text-center border-2 transition-all duration-300 ${
          feedback === 'correct' ? 'border-green-500 animate-pulse-green' :
          feedback === 'incorrect' ? 'border-red-500 animate-shake-red' : 'border-gray-200'
        }`}>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">上次你写的是：</p>
            <p className="text-lg text-red-500 line-through">{currentWrong.userAnswer}</p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">请重新拼写：</p>
            <p className="text-2xl font-bold text-green-700">{currentWrong.correctAnswer}</p>
            <p className="text-xs text-gray-400 mt-1">（请记住正确拼写后输入）</p>
          </div>

          <div className="max-w-sm mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="输入正确拼写..."
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
                  <span className="flex items-center justify-center gap-1"><XCircle className="w-5 h-5" /> 仍然错误，请多加练习</span>
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
        <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交答案
      </p>
    </div>
  );
}
