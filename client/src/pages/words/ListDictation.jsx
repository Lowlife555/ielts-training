import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { speak } from '../../utils/speech';
import { checkAnswer } from '../../utils/checkAnswer';
import Loading from '../../components/ui/Loading';
import { ArrowLeft, Volume2, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';

const COUNT_OPTIONS = [
  { value: 0, label: '全部' },
  { value: 50, label: '50 词' },
  { value: 100, label: '100 词' },
];

export default function ListDictation() {
  const { listNo } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [words, setWords] = useState([]);
  const [testWords, setTestWords] = useState([]);
  const [round, setRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState([]); // 每词结果（correct=最终，firstTry=首试）
  const roundPassedRef = useRef(new Set()); // 本轮已答对的词 id（跨轮次累积通过词，用于剔除重测）
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getListWords(listNo)
      .then((data) => setWords(data.words))
      .catch((err) => showToast('加载失败: ' + err.message, 'error'))
      .finally(() => setLoading(false));
  }, [listNo, showToast]);

  useEffect(() => {
    if (started && !finished) inputRef.current?.focus();
  }, [started, finished, currentIndex]);

  const startTest = () => {
    const count = selectedCount > 0 ? Math.min(selectedCount, words.length) : words.length;
    const pick = words.slice(0, count);
    setTestWords(pick);
    setRound(1);
    setCurrentIndex(0);
    setResults([]);
    roundPassedRef.current = new Set();
    setFeedback(null);
    setUserInput('');
    setFinished(false);
    setStarted(true);
  };

  const currentWord = testWords[currentIndex];

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting || !currentWord) return;

    const isCorrect = checkAnswer(userInput, currentWord.keywords, currentWord.chineseDefinition);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // 答对的词记入本轮已通过集合（重测轮次剔除用）
    if (isCorrect) {
      roundPassedRef.current.add(currentWord.id);
    }

    setResults(prev => {
      const idx = prev.findIndex(r => r.wordId === currentWord.id);
      let next;
      if (idx === -1) {
        next = [...prev, { wordId: currentWord.id, correct: isCorrect, firstTry: isCorrect, answer: userInput.trim() }];
      } else if (isCorrect) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], correct: true, answer: userInput.trim() };
        next = copy;
      } else {
        next = prev;
      }
      return next;
    });

    api.submitDictation(listNo, {
      wordId: currentWord.id,
      isCorrect,
      userAnswer: userInput.trim(),
    }).catch((err) => {
      console.warn('Failed to save dictation result:', err.message);
    });

    setTimeout(() => {
      if (currentIndex + 1 >= testWords.length) {
        // 下一轮只重测本轮未通过的词（已通过的直接剔除）
        const retryWords = testWords.filter(w => !roundPassedRef.current.has(w.id));
        if (retryWords.length > 0) {
          setTestWords(retryWords);
          setRound(r => r + 1);
          setCurrentIndex(0);
          setUserInput('');
          setFeedback(null);
          inputRef.current?.focus();
        } else {
          setFinished(true);
          setFeedback(null);
        }
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentIndex, currentWord, testWords, submitting, listNo]);

  useKeyboard({
    'Enter': () => { if (started) submitAnswer(); },
    'Escape': () => {
      if (finished) navigate(`/lists/${listNo}`);
      else if (started) setStarted(false);
      else navigate(-1);
    },
    ' ': (e) => {
      if (started && !finished && currentWord) {
        e.preventDefault();
        speak(currentWord.word);
      }
    },
  }, true, [started, finished, submitAnswer, navigate, currentWord, listNo]);

  if (loading) return <Loading text="加载题目..." />;

  // Setup screen
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={`/lists/${listNo}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回背诵
        </Link>

        <div className="card text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">✏️ List {listNo} · 中文默写</h1>
          <p className="text-gray-500 mb-8">显示英文，默写中文词义 · 关键词判分 · 答错自动重测</p>

          <div className="max-w-sm mx-auto space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">测试词数（共 {words.length} 词）</label>
              <div className="grid grid-cols-3 gap-2">
                {COUNT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedCount(opt.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedCount === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={startTest} className="btn-primary text-lg px-8 py-3">
            开始默写
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const correctCount = results.filter(r => r.correct).length;
    const firstTryCount = results.filter(r => r.firstTry).length;
    const accuracy = results.length > 0 ? Math.round((firstTryCount / results.length) * 100) : 0;
    const wrongResults = results.filter(r => !r.firstTry);

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${accuracy >= 80 ? 'text-yellow-400' : 'text-gray-300'}`} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">默写完成!</h1>
          <p className="text-lg text-gray-500 mb-6">
            首试正确率 <span className={`font-bold ${accuracy >= 80 ? 'text-green-600' : 'text-red-500'}`}>{accuracy}%</span>
            （{firstTryCount}/{results.length}）
          </p>

          {wrongResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-red-600 mb-3">需要复习的单词：</h3>
              <div className="space-y-2 text-left">
                {wrongResults.map((r, idx) => {
                  const wordData = testWords.find(w => w.id === r.wordId);
                  if (!wordData) return null;
                  const meaningText = Array.isArray(wordData.meanings) && wordData.meanings.length > 0
                    ? wordData.meanings.join('；')
                    : wordData.chineseDefinition;
                  return (
                    <div key={idx} className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-600">{wordData.word}</span>
                          <button onClick={() => speak(wordData.word)} className="text-gray-400 hover:text-indigo-600">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-400">{wordData.phonetic}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{meaningText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => { setStarted(false); setFinished(false); }} className="btn-secondary flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              重新测试
            </button>
            <Link to={`/lists/${listNo}`} className="btn-primary">
              返回背诵
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回</span>
          <span className="touch-hint hidden">默写完成！</span>
        </p>
      </div>
    );
  }

  const progress = (currentIndex / testWords.length) * 100;
  const borderClass = feedback === 'correct'
    ? 'border-green-500 animate-pulse-green'
    : feedback === 'incorrect'
    ? 'border-red-500 animate-shake-red'
    : 'border-gray-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setStarted(false)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm font-medium text-amber-600">
          ✏️ List {listNo} 默写 · {round > 1 ? `第 ${round} 轮` : ''} · {currentIndex + 1} / {testWords.length}
        </span>
        <div className="w-8" />
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className={`card text-center border-2 transition-all duration-300 ${borderClass}`}>
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">请默写该单词的中文词义</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => speak(currentWord.word)}
              className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
              title="朗读 (Space)"
            >
              <Volume2 className="w-5 h-5 text-indigo-600" />
            </button>
            <p className="text-4xl font-bold text-gray-900">{currentWord.word}</p>
          </div>
          <span className="text-sm text-gray-400 mt-1 inline-block">
            {currentWord.phonetic}
            {currentWord.partOfSpeech ? ` · ${currentWord.partOfSpeech}` : ''}
          </span>
        </div>

        <div className="max-w-sm mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="输入中文词义..."
            className={`input-field text-center text-xl ${
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
                    <XCircle className="w-5 h-5" /> 错误 · 将重测
                  </span>
                  <p className="text-sm mt-1">
                    参考答案: <span className="font-semibold text-green-600">
                      {Array.isArray(currentWord.meanings) && currentWord.meanings.length > 0
                        ? currentWord.meanings.join('；')
                        : currentWord.chineseDefinition}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={submitAnswer}
          disabled={!userInput.trim() || !!feedback}
          className="btn-primary px-8"
        >
          <span className="kbd-hint">提交 (Enter)</span>
          <span className="touch-hint hidden">提交</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 提交 · 错词自动重测直到默写正确
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Space</kbd> 朗读
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 退出
        </span>
        <span className="touch-hint hidden">输入中文词义后提交 · 答错自动重测直到默写正确</span>
      </p>
    </div>
  );
}
