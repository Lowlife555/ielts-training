import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useApp } from '../../context/AppContext';
import { speak as speakUtil } from '../../utils/speech';
import Loading from '../../components/ui/Loading';
import { ArrowLeft, Volume2, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';

const TOPICS = [
  { value: '', label: '全部话题（随机）' },
  { value: 'education', label: '教育' },
  { value: 'environment', label: '环境' },
  { value: 'technology', label: '科技' },
  { value: 'society', label: '社会' },
  { value: 'health', label: '健康' },
  { value: 'economy', label: '经济' },
  { value: 'culture', label: '文化' },
  { value: 'science', label: '科学' },
];

export default function MeaningTest() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [testMode, setTestMode] = useState('meaning'); // meaning | mixed
  const [testStarted, setTestStarted] = useState(false);
  const inputRef = useRef(null);

  const startTest = async () => {
    setLoading(true);
    try {
      const params = { count: 20, mode: testMode };
      if (selectedTopic) params.topic = selectedTopic;
      const data = await api.getMeaningTest(params);
      if (!data.words || data.words.length === 0) {
        showToast('该话题暂无词义数据', 'error');
        return;
      }
      setWords(data.words);
      setCurrentIndex(0);
      setResults([]);
      setFeedback(null);
      setSelectedOptionId(null);
      setUserInput('');
      setFinished(false);
      setTestStarted(true);
    } catch (err) {
      showToast('加载题目失败：' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = useCallback((word) => {
    speakUtil(word, { rate: 0.7 });
  }, []);

  const submitAnswer = useCallback(() => {
    if (feedback || finished) return;
    const currentWord = words[currentIndex];
    if (!currentWord) return;

    let isCorrect;
    let userAnswer;

    if (currentWord.type === 'meaning') {
      if (selectedOptionId == null) return;
      isCorrect = selectedOptionId === currentWord.correctOptionId;
      userAnswer = selectedOptionId;
    } else {
      if (!userInput.trim()) return;
      isCorrect = userInput.trim().toLowerCase() === currentWord.answer.toLowerCase();
      userAnswer = userInput.trim();
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setResults(prev => [...prev, {
      wordId: currentWord.id,
      type: currentWord.type,
      correct: isCorrect,
      userAnswer,
      selectedOptionId: currentWord.type === 'meaning' ? selectedOptionId : null,
    }]);

    api.submitMeaningResult({
      wordId: currentWord.id,
      type: currentWord.type,
      isCorrect,
      userAnswer: currentWord.type === 'meaning' ? String(selectedOptionId) : userAnswer,
      selectedOptionId: currentWord.type === 'meaning' ? selectedOptionId : undefined,
    }).catch((err) => {
      console.warn('Failed to save meaning result:', err.message);
      showToast('保存进度失败，请检查网络', 'warning');
    });

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        setFinished(true);
        setFeedback(null);
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedOptionId(null);
        setUserInput('');
        setFeedback(null);
        if (words[currentIndex + 1]?.type === 'spelling') {
          inputRef.current?.focus();
        }
      }
    }, 800);
  }, [userInput, selectedOptionId, feedback, finished, currentIndex, words, showToast]);

  useKeyboard({
    '1': () => { if (testStarted && !finished && words[currentIndex]?.type === 'meaning' && feedback == null && words[currentIndex]?.options?.[0]) pickOption(0); },
    '2': () => { if (testStarted && !finished && words[currentIndex]?.type === 'meaning' && feedback == null && words[currentIndex]?.options?.[1]) pickOption(1); },
    '3': () => { if (testStarted && !finished && words[currentIndex]?.type === 'meaning' && feedback == null && words[currentIndex]?.options?.[2]) pickOption(2); },
    '4': () => { if (testStarted && !finished && words[currentIndex]?.type === 'meaning' && feedback == null && words[currentIndex]?.options?.[3]) pickOption(3); },
    'Enter': () => {
      if (!testStarted) return;
      if (finished) {
        navigate('/words');
        return;
      }
      submitAnswer();
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
      if (testStarted && !finished && words[currentIndex]) {
        e.preventDefault();
        speakWord(words[currentIndex].word || words[currentIndex].answer);
      }
    },
  }, true, [testStarted, finished, submitAnswer, navigate, currentIndex, words, feedback, selectedOptionId]);

  useEffect(() => {
    if (testStarted && !finished && words[currentIndex]?.type === 'spelling') {
      inputRef.current?.focus();
    }
  }, [testStarted, finished, currentIndex, words]);

  function pickOption(idx) {
    const opt = words[currentIndex]?.options?.[idx];
    if (!opt) return;
    setSelectedOptionId(opt.id);
  }

  if (!testStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/words" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        <div className="card text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">🎯 词义判定</h1>
          <p className="text-gray-500 mb-8">看单词，从 4 个中文释义中选出正确项 · 每次20题</p>

          <div className="max-w-sm mx-auto space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">测试模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTestMode('meaning')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    testMode === 'meaning'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  词义判定
                </button>
                <button
                  onClick={() => setTestMode('mixed')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    testMode === 'mixed'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  词义 + 拼写混合
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
                {TOPICS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
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

          {wrongResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-red-600 mb-3">需要复习的单词：</h3>
              <div className="space-y-2 text-left">
                {wrongResults.map((r, idx) => {
                  const wordData = words.find(w => w.id === r.wordId);
                  return (
                    <div key={idx} className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-600">{wordData?.word}</span>
                        <span className="text-xs text-gray-400">{wordData?.phonetic}</span>
                      </div>
                      {r.type === 'meaning' && (
                        <p className="text-xs text-gray-500 mt-1">
                          正确答案：{wordData?.options?.find(o => o.id === wordData.correctOptionId)?.text}
                        </p>
                      )}
                      {r.type === 'spelling' && (
                        <p className="text-xs text-gray-500 mt-1">正确答案：{wordData?.answer}</p>
                      )}
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

  const currentWord = words[currentIndex];
  const borderClass = feedback === 'correct'
    ? 'border-green-500 animate-pulse-green'
    : feedback === 'incorrect'
    ? 'border-red-500 animate-shake-red'
    : 'border-gray-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setTestStarted(false)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
        <div className="w-8" />
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentIndex) / words.length) * 100}%` }} />
      </div>

      <div className={`card ${borderClass} border-2 transition-all duration-300`}>
        <div className="text-center mb-6">
          {currentWord.type === 'meaning' ? (
            <>
              <p className="text-lg text-gray-500 mb-1">请选择该单词的正确释义</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => speakWord(currentWord.word)}
                  className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                </button>
                <p className="text-3xl font-bold text-gray-900">{currentWord.word}</p>
              </div>
              <span className="text-sm text-gray-400 mt-1 inline-block">
                {currentWord.phonetic}
                {currentWord.partOfSpeech ? ` · ${currentWord.partOfSpeech}` : ''}
              </span>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-500 mb-1">请根据中文释义拼写单词</p>
              <p className="text-3xl font-bold text-gray-900">{currentWord.prompt}</p>
              {currentWord.partOfSpeech && (
                <span className="text-sm text-gray-400 mt-1 inline-block">{currentWord.partOfSpeech}</span>
              )}
            </>
          )}
        </div>

        {currentWord.type === 'meaning' ? (
          <div className="max-w-lg mx-auto space-y-2">
            {currentWord.options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              const showCorrect = feedback !== null && opt.id === currentWord.correctOptionId;
              const showWrong = feedback !== null && isSelected && opt.id !== currentWord.correctOptionId;
              return (
                <button
                  key={opt.id}
                  onClick={() => { if (feedback == null) pickOption(idx); }}
                  disabled={feedback !== null}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    showCorrect
                      ? 'border-green-500 bg-green-50'
                      : showWrong
                      ? 'border-red-500 bg-red-50'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold">
                      <span className="kbd-hint">[{idx + 1}]</span>
                      <span className="touch-hint hidden">{idx + 1}</span>
                    </span>
                    <span className="text-sm text-gray-700">{opt.text}</span>
                  </span>
                </button>
              );
            })}
            {feedback && (
              <div className={`text-center mt-3 animate-fade-in ${
                feedback === 'correct' ? 'text-green-600' : 'text-red-500'
              }`}>
                {feedback === 'correct' ? (
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-5 h-5" /> 正确!
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <XCircle className="w-5 h-5" /> 错误!
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
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
            />
            {feedback && (
              <div className={`text-center mt-3 animate-fade-in ${
                feedback === 'correct' ? 'text-green-600' : 'text-red-500'
              }`}>
                {feedback === 'correct' ? (
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-5 h-5" /> 正确!
                  </span>
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
        )}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={submitAnswer}
          className="btn-primary px-8"
          disabled={currentWord.type === 'meaning' ? selectedOptionId == null : !userInput.trim()}
        >
          <span className="kbd-hint">提交 (Enter)</span>
          <span className="touch-hint hidden">提交</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint">
          {currentWord.type === 'meaning' ? (
            <><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">1</kbd>-
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">4</kbd> 选择释义
              · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 提交
              · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">空格</kbd> 朗读
              · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 退出
            </>
          ) : (
            <><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 提交答案
              · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">空格</kbd> 朗读
              · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 退出测试
            </>
          )}
        </span>
        <span className="touch-hint hidden">点选释义后提交 · 答错会重测</span>
      </p>
    </div>
  );
}
