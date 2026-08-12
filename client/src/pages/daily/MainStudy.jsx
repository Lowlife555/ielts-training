import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { speak } from '../../utils/speech';
import { checkAnswer } from '../../utils/checkAnswer';
import TrainingTimer from '../../components/training/TrainingTimer';
import FlipCard from '../../components/ui/FlipCard';
import { useSettings } from '../../context/SettingsContext';
import { Check, X, Play, Coffee, Timer, Volume2 } from 'lucide-react';

const TIME_UP_BUFFER = 10 * 60; // 剩余不足 10 分钟不再开始新批次

export default function MainStudy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { settings } = useSettings();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const batchSize = session?.batchSize || location.state?.batchSize || 30;
  const restMinutes = settings?.restMinutes || 5;

  const allWords = session?.words || [];

  // 批次划分:List 内顺序,最后不足一批的剩余词作为最后一批
  const batches = useMemo(() => {
    const out = [];
    for (let i = 0; i < allWords.length; i += batchSize) {
      out.push(allWords.slice(i, i + batchSize));
    }
    return out;
  }, [allWords, batchSize]);

  const [phase, setPhase] = useState('wordtable'); // wordtable | dictation | rest
  const [batchIndex, setBatchIndex] = useState(0);
  const currentBatch = batches[batchIndex] || [];

  // 单词表状态
  const [flippedSet, setFlippedSet] = useState(new Set()); // 已翻到背面(隐藏释义)的单词
  const [marked, setMarked] = useState({});

  // 默写状态
  const [dictWords, setDictWords] = useState([]);
  const [round, setRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const roundPassedRef = useRef(new Set()); // 本轮已答对的词 id（重测轮次剔除用）

  // 休息状态
  const [restLeft, setRestLeft] = useState(5 * 60);
  const [restRunning, setRestRunning] = useState(false);

  const [abandoning, setAbandoning] = useState(false);
  const inputRef = useRef(null);

  const elapsed = useElapsed(session?.startTime);

  // 统计:默写首试正确率、休息累计时长(休息不计入训练时长)
  const dictStatsRef = useRef({ total: 0, correct: 0 });
  const restedSecondsRef = useRef(0);

  useEffect(() => {
    if (!session) navigate('/daily', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    if (phase === 'dictation') inputRef.current?.focus();
  }, [phase, currentIndex, dictWords.length]);

  // 休息倒计时
  useEffect(() => {
    if (!restRunning || phase !== 'rest') return;
    const timer = setInterval(() => {
      setRestLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setRestRunning(false);
          nextAfterRest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restRunning, phase]);

  const remainingSeconds = (plan?.targetMinutes || 60) * 60 - elapsed;
  const timeUp = remainingSeconds < TIME_UP_BUFFER;

  // 进入抽查环节(整个 List 完成或剩余不足 10 分钟)
  const goCheck = useCallback(() => {
    const stats = dictStatsRef.current;
    const dictationStats = { total: stats.total, correct: stats.correct };
    const hasSpotCheck = plan?.spotCheckList?.words?.length > 0;
    if (hasSpotCheck) {
      navigate('/daily/spotcheck', {
        state: { session, plan, wrongPool: [], mainResults: [], dictationStats },
      });
    } else {
      navigate('/daily/spellcheck', {
        state: { session, plan, dictationStats, restedSeconds: restedSecondsRef.current },
      });
    }
  }, [navigate, session, plan]);

  // 默写一批完成
  const batchDictationDone = useCallback(() => {
    if (batchIndex + 1 >= batches.length || timeUp) {
      goCheck();
    } else {
      setPhase('rest');
      setRestLeft(restMinutes * 60);
      setRestRunning(true);
    }
  }, [batchIndex, batches.length, timeUp, goCheck]);

  const nextAfterRest = useCallback(() => {
    const rem = (plan?.targetMinutes || 60) * 60 - elapsed;
    if (rem < TIME_UP_BUFFER) {
      goCheck();
      return;
    }
    setBatchIndex(i => i + 1);
    setPhase('wordtable');
    setFlippedSet(new Set());
    setMarked({});
  }, [plan, elapsed, goCheck]);

  const skipRest = () => {
    setRestRunning(false);
    nextAfterRest();
  };

  // ===== 默写答题(关键词判分 + 错词重测) =====
  const currentDictWord = dictWords[currentIndex];

  const submitDictation = useCallback(() => {
    if (feedback || !userInput.trim() || !currentDictWord) return;

    const isCorrect = checkAnswer(userInput, currentDictWord.keywords, currentDictWord.chineseDefinition);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // 答对的词记入本轮已通过集合（重测轮次剔除用）
    if (isCorrect) {
      roundPassedRef.current.add(currentDictWord.id);
    }

    // 首试统计
    if (isCorrect) {
      dictStatsRef.current.total += 1;
      dictStatsRef.current.correct += 1;
    } else {
      dictStatsRef.current.total += 1;
    }

    api.submitDictation(session?.listNo, {
      wordId: currentDictWord.id,
      isCorrect,
      userAnswer: userInput.trim(),
    }).catch((err) => {
      console.warn('Failed to save dictation result:', err.message);
    });

    setTimeout(() => {
      if (currentIndex + 1 >= dictWords.length) {
        // 下一轮只重测本轮未通过的词（已通过的直接剔除）
        const retryWords = dictWords.filter(w => !roundPassedRef.current.has(w.id));
        if (retryWords.length > 0) {
          setDictWords(retryWords);
          setRound(r => r + 1);
          setCurrentIndex(0);
          setUserInput('');
          setFeedback(null);
          inputRef.current?.focus();
        } else {
          batchDictationDone();
        }
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
        inputRef.current?.focus();
      }
    }, 800);
  }, [userInput, feedback, currentDictWord, dictWords, currentIndex, batchDictationDone, session]);

  // 开始默写本批
  const startDictation = () => {
    setDictWords(currentBatch);
    setRound(1);
    setCurrentIndex(0);
    roundPassedRef.current = new Set();
    setUserInput('');
    setFeedback(null);
    setPhase('dictation');
  };

  const abandon = useCallback(async () => {
    if (abandoning) return;
    const ok = window.confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    setAbandoning(true);
    try {
      await api.abandonTraining({
        sessionId: session.sessionId,
        durationSeconds: Math.max(0, elapsed - restedSecondsRef.current),
        mainResults: [],
      });
      showToast('已收工，进度已保存', 'info');
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, session, elapsed, showToast, navigate]);

  useKeyboard({
    'Enter': () => {
      if (phase === 'dictation') submitDictation();
      if (phase === 'rest') skipRest();
    },
    ' ': (e) => {
      e.preventDefault();
      if (phase === 'dictation' && currentDictWord) speak(currentDictWord.word);
    },
    'Escape': abandon,
  }, true, [phase, submitDictation, abandon, currentDictWord, skipRest]);

  if (!session) return null;

  // ===== 单词表阶段 =====
  if (phase === 'wordtable') {
    const showAllMeaning = flippedSet.size >= currentBatch.length && currentBatch.length > 0;
    const startIndex = batchIndex * batchSize;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-indigo-600">
            📖 单词表 · List {session.listNo} · 第 {batchIndex + 1} 批（{currentBatch.length} 词）
            {batches.length > 1 && <span className="text-gray-400 font-normal"> / 共 {batches.length} 批</span>}
          </span>
          <span className="flex items-center gap-3">
            <TrainingTimer
              elapsed={elapsed}
              targetMinutes={plan?.targetMinutes || 60}
              onAbandon={abandon}
              onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
            />
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${((batchIndex + (currentIndex / Math.max(currentBatch.length, 1))) / batches.length) * 100}%` }} />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">本批背诵单词</h1>
          <p className="text-sm text-gray-500">
            <span className="kbd-hint">先看释义回忆单词，点击卡片翻卡核对 · 1/2 键标记会/不会（仅记录）· 标记后点「开始背诵」</span>
            <span className="touch-hint hidden">点卡片翻卡核对 · 标记会/不会后点「开始背诵」</span>
          </p>
          <button
            onClick={() => {
              if (showAllMeaning) setFlippedSet(new Set());
              else setFlippedSet(new Set(currentBatch.map(w => w.id)));
            }}
            className="mt-3 text-sm font-medium px-3 py-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-gray-300"
          >
            {showAllMeaning ? '显示全部释义' : '隐藏全部释义'}
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {currentBatch.map((word, idx) => {
            const isFlipped = flippedSet.has(word.id);
            const isMarked = marked[word.id] === true;
            const isNotMarked = marked[word.id] === false;
            return (
              <div key={word.id} className={`relative ${isMarked ? 'border-2 border-green-300 rounded-xl' : isNotMarked ? 'border-2 border-red-200 rounded-xl' : ''}`}>
                <span className="absolute -top-2 left-2 text-[10px] text-gray-400 bg-gray-50 px-1 rounded z-10">{startIndex + idx + 1}.</span>
                <FlipCard
                  word={word}
                  flipped={isFlipped}
                  onClick={() => {
                    setFlippedSet(prev => {
                      const next = new Set(prev);
                      if (next.has(word.id)) next.delete(word.id);
                      else next.add(word.id);
                      return next;
                    });
                  }}
                  showMarked={(w) => (
                    <>
                      {isMarked && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">会</span>}
                      {isNotMarked && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-500 rounded">不会</span>}
                    </>
                  )}
                  markNode={
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMarked(m => ({ ...m, [word.id]: true })); }}
                        className={`p-2 rounded-lg transition-colors ${isMarked ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-green-50'}`}
                        title="会 (1)"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMarked(m => ({ ...m, [word.id]: false })); }}
                        className={`p-2 rounded-lg transition-colors ${isNotMarked ? 'bg-red-100 text-red-500' : 'text-gray-400 hover:bg-red-50'}`}
                        title="不会 (2)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  }
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={startDictation}
          className="btn-primary w-full text-lg py-3 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          开始背诵（默写本批 {currentBatch.length} 词）
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">1 / 2</kbd> 会 / 不会
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
          </span>
          <span className="touch-hint hidden">点卡片翻卡 · 标记会/不会 · 开始背诵</span>
        </p>
      </div>
    );
  }

  // ===== 休息阶段 =====
  if (phase === 'rest') {
    const mm = Math.floor(restLeft / 60);
    const ss = String(restLeft % 60).padStart(2, '0');
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <Timer className="w-4 h-4" /> 休息时间
          </span>
          <TrainingTimer
            elapsed={elapsed}
            targetMinutes={plan?.targetMinutes || 60}
            onAbandon={abandon}
          />
        </div>

        <div className="card py-16">
          <div className="text-6xl mb-4"><Coffee /></div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">休息一下</h1>
          <p className="text-gray-500 mb-6">
            第 {batchIndex + 1} 批完成，休息 {restMinutes} 分钟（不计入训练时长）
          </p>
          <div className="text-6xl font-mono font-bold text-amber-600 mb-8">
            {mm}:{ss}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={skipRest} className="btn-primary px-8">
              跳过休息，开始下一批
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 跳过休息
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
          </span>
          <span className="touch-hint hidden">休息 {restMinutes} 分钟或点按钮继续</span>
        </p>
      </div>
    );
  }

  // ===== 默写阶段 =====
  if (phase === 'dictation') {
    const progress = (currentIndex / dictWords.length) * 100;
    const borderClass = feedback === 'correct'
      ? 'border-green-500 animate-pulse-green'
      : feedback === 'incorrect'
      ? 'border-red-500 animate-shake-red'
      : 'border-gray-200';

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-amber-600">
            ✏️ 默写 · List {session.listNo} · 第 {batchIndex + 1} 批
            {round > 1 ? ` · 第 ${round} 轮重测` : ''} · {currentIndex + 1} / {dictWords.length}
          </span>
          <TrainingTimer
            elapsed={elapsed}
            targetMinutes={plan?.targetMinutes || 60}
            onAbandon={abandon}
            onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
          />
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
          <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {currentDictWord && (
          <div className={`card text-center border-2 transition-all duration-300 ${borderClass}`}>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">请默写该单词的中文词义</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => speak(currentDictWord.word)}
                  className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
                  title="朗读 (Space)"
                >
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                </button>
                <p className="text-4xl font-bold text-gray-900">{currentDictWord.word}</p>
              </div>
              <span className="text-sm text-gray-400 mt-1 inline-block">
                {currentDictWord.phonetic}
                {currentDictWord.partOfSpeech ? ` · ${currentDictWord.partOfSpeech}` : ''}
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
                      <Check className="w-5 h-5" /> 正确!
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center justify-center gap-1">
                        <X className="w-5 h-5" /> 错误 · 将重测
                      </span>
                      <p className="text-sm mt-1">
                        参考答案: <span className="font-semibold text-green-600">
                          {Array.isArray(currentDictWord.meanings) && currentDictWord.meanings.length > 0
                            ? currentDictWord.meanings.join('；')
                            : currentDictWord.chineseDefinition}
                        </span>
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
            onClick={submitDictation}
            disabled={!userInput.trim() || !!feedback}
            className="btn-primary px-8"
          >
            <span className="kbd-hint">提交 (Enter)</span>
            <span className="touch-hint hidden">提交</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 · 错词自动重测直到默写正确
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
          </span>
          <span className="touch-hint hidden">输入中文词义后提交 · 答错自动重测</span>
        </p>
      </div>
    );
  }

  return null;
}
