import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useApp } from '../../context/AppContext';
import { speak as speakUtil } from '../../utils/speech';
import { checkEnglishAnswer } from '../../utils/answerCheck';
import Loading from '../../components/ui/Loading';
import { ArrowLeft, Volume2, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';

export default function SpellingTest() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState([]); // { wordId, correct, userAnswer }
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testMode, setTestMode] = useState('see_cn_type_en'); // see_cn_type_en | hear_type_en
  const inputRef = useRef(null);

  const startTest = async () => {
    setLoading(true);
    try {
      const params = { count: 20 };
      if (selectedTopic) params.topic = selectedTopic;
      const data = await api.getSpellingTest(params);
      setWords(data.words);
      setCurrentIndex(0);
      setResults([]);
      setFeedback(null);
      setFinished(false);
      setUserInput('');
      setTestStarted(true);
    } catch (err) {
      showToast('加载题目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = useCallback((word) => {
    speakUtil(word, { rate: 0.7 });
  }, []);

  const submitAnswer = useCallback(() => {
    if (feedback || finished) return;
    if (!userInput.trim()) return;

    const currentWord = words[currentIndex];
    const       isCorrect = checkEnglishAnswer(userInput, currentWord.answer);

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setResults(prev => [...prev, {
      wordId: currentWord.id,
      correct: isCorrect,
      userAnswer: userInput.trim(),
    }]);

    // Submit to backend
    api.submitSpellingResult({
      wordId: currentWord.id,
      userAnswer: userInput.trim(),
      isCorrect,
    }).catch((err) => {
      console.warn('Failed to save spelling result:', err.message);
      showToast('保存进度失败，请检查网络', 'warning');
    });
    // V7.4.3: 不自动翻页，展示答案后由用户点下一个/Enter 前进
  }, [userInput, feedback, finished, currentIndex, words]);

  const goNext = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      setFinished(true);
      setFeedback(null);
    } else {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setFeedback(null);
      inputRef.current?.focus();
    }
  }, [currentIndex, words.length]);

  useKeyboard({
    'Enter': () => {
      if (!testStarted) return;
      if (finished) {
        navigate('/words');
        return;
      }
      if (feedback) goNext();
      else submitAnswer();
    },
    'Escape': () => {
      if (finished) {
        navigate('/words');
      } else if (testStarted) {
        setTestStarted(false);
      } else {
        navigate(-1);
      }
    },
    ' ': (e) => {
      if (testStarted && !finished && words[currentIndex] && testMode === 'hear_type_en') {
        e.preventDefault();
        speakWord(words[currentIndex].answer);
      }
    },
  }, true, [testStarted, finished, submitAnswer, goNext, feedback, navigate, currentIndex, words, testMode, speakWord]);

  // Auto-focus input
  useEffect(() => {
    if (testStarted && !finished) {
      inputRef.current?.focus();
    }
  }, [testStarted, finished, currentIndex]);

  // Setup screen
  if (!testStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/words" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        <div className="card text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">✍️ 拼写测试</h1>
          <p className="text-gray-500 mb-8">看中文释义，拼写英文单词 · 每次20题</p>

          <div className="max-w-sm mx-auto space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">测试模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTestMode('see_cn_type_en')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    testMode === 'see_cn_type_en'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  看中文 → 拼英文
                </button>
                <button
                  onClick={() => setTestMode('hear_type_en')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    testMode === 'hear_type_en'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  听发音 → 拼英文
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">选择话题（可选）</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="input-field"
              >
                <option value="">全部话题（随机）</option>
                <option value="education">教育</option>
                <option value="environment">环境</option>
                <option value="technology">科技</option>
                <option value="society">社会</option>
                <option value="health">健康</option>
                <option value="economy">经济</option>
                <option value="culture">文化</option>
                <option value="science">科学</option>
              </select>
            </div>
          </div>

          <button onClick={startTest} className="btn-primary text-lg px-8 py-3">
            开始测试
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <Loading text="准备题目..." />;

  // Finished screen
  if (finished) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    const wrongResults = results.filter(r => !r.correct);

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${accuracy >= 80 ? 'text-yellow-400' : 'text-gray-300'}`} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">测试完成!</h1>
          <p className="text-lg text-gray-500 mb-6">
            正确率 <span className={`font-bold ${accuracy >= 80 ? 'text-green-600' : 'text-red-500'}`}>{accuracy}%</span>
            （{correctCount}/{results.length}）
          </p>

          {/* Wrong words review */}
          {wrongResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-red-600 mb-3">需要复习的单词：</h3>
              <div className="space-y-2 text-left">
                {wrongResults.map((r, idx) => {
                  const wordData = words.find(w => w.id === r.wordId);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                      <div>
                        <span className="text-sm line-through text-red-400 mr-2">{r.userAnswer}</span>
                        <span className="text-sm font-semibold text-green-600">→ {wordData?.answer}</span>
                      </div>
                      <span className="text-xs text-gray-400">{wordData?.prompt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => { setTestStarted(false); setFinished(false); }} className="btn-secondary flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              重新测试
            </button>
            <Link to="/wrong-words" className="btn-primary">
              查看错词本
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
           <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 或 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回</span>
           <span className="touch-hint hidden">测试完成！</span>
        </p>
      </div>
    );
  }

  // Test screen
  const currentWord = words[currentIndex];
  const borderClass = feedback === 'correct'
    ? 'border-green-500 animate-pulse-green'
    : feedback === 'incorrect'
    ? 'border-red-500 animate-shake-red'
    : 'border-gray-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setTestStarted(false)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
        <div className="w-8" />
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentIndex) / words.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className={`card ${borderClass} border-2 transition-all duration-300`}>
        <div className="text-center mb-6">
          {testMode === 'hear_type_en' && (
            <button
              onClick={() => speakWord(currentWord.answer)}
              className="mx-auto mb-4 w-16 h-16 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
            >
              <Volume2 className="w-8 h-8 text-indigo-600" />
            </button>
          )}
          <p className="text-lg text-gray-500 mb-1">
            {testMode === 'hear_type_en' ? '请听发音，拼写单词' : '请根据中文释义拼写单词'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{currentWord.prompt}</p>
          {currentWord.partOfSpeech && (
            <span className="text-sm text-gray-400 mt-1 inline-block">{currentWord.partOfSpeech}</span>
          )}
        </div>

        {/* Input */}
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

          {/* Feedback */}
          {feedback && (
            <div className={`text-center mt-3 animate-fade-in ${
              feedback === 'correct' ? 'text-green-600' : 'text-red-500'
            }`}>
              {feedback === 'correct' ? (
                <div>
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-5 h-5" /> 正确!
                  </span>
                  <p className="text-sm mt-1">
                    正确答案: <span className="font-semibold text-green-600">{currentWord.answer}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <span className="flex items-center justify-center gap-1">
                    <XCircle className="w-5 h-5" /> 错误!
                  </span>
                  <p className="text-sm mt-1">
                    正确答案: <span className="font-semibold text-green-600">{currentWord.answer}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div className="text-center mt-6">
        {feedback ? (
          <button onClick={goNext} className="btn-primary px-8">
            <span className="kbd-hint">下一个 (Enter)</span>
            <span className="touch-hint hidden">下一个</span>
          </button>
        ) : (
          <button onClick={submitAnswer} className="btn-primary px-8" disabled={!userInput.trim()}>
            <span className="kbd-hint">提交 (Enter)</span>
            <span className="touch-hint hidden">提交</span>
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 提交 / 下一个
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 退出测试
        </span>
        <span className="touch-hint hidden">输入后点提交 · 查看答案后点下一个</span>
      </p>
    </div>
  );
}
