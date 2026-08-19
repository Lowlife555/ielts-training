import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { useConfirm } from '../../hooks/useConfirm';
import { speak } from '../../utils/speech';
import { checkChineseAnswer } from '../../utils/answerCheck';
import TrainingTimer from '../../components/training/TrainingTimer';
import FlipCard from '../../components/ui/FlipCard';
import { useSettings } from '../../context/SettingsContext';
import { useDictationSession } from '../../hooks/useDictationSession';
import { useProgressSync, clearLocalSnapshot, saveLocalSnapshot } from '../../hooks/useProgressSync';
import { Check, X, Play, Coffee, Timer, Volume2, ChevronRight, Target } from 'lucide-react';

const TIME_UP_BUFFER = 10 * 60; // 剩余不足 10 分钟不再开始新批次

export default function MainStudy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { confirm, dialog } = useConfirm();
  const { settings } = useSettings();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const resumeSnap = location.state?.resumeSnapshot; // V7.4.2 单词级断点恢复快照
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

  const [phase, setPhase] = useState(resumeSnap?.stage || 'wordtable'); // wordtable | dictation | rest | selftest
  // V7.3.1/V7.4.2: 支持断点续训——从 resumeFrom/快照指定的批次开始
  const [batchIndex, setBatchIndex] = useState(() => {
    const r = resumeSnap?.batchIndex ?? location.state?.resumeFrom;
    return typeof r === 'number' && r > 0 ? r : 0;
  });
  const currentBatch = batches[batchIndex] || [];
  const [completedBatches, setCompletedBatches] = useState(() => {
    const r = resumeSnap?.completedBatches ?? location.state?.resumeFrom;
    return typeof r === 'number' && r > 0 ? r : 0;
  });

  // 单词表状态
  const [flippedSet, setFlippedSet] = useState(() => new Set(resumeSnap?.flipped || [])); // 已翻到背面(隐藏释义)的单词
  const [marked, setMarked] = useState(() => resumeSnap?.marked || {});

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
  const flipTraceRef = useRef([]); // 翻卡痕迹缓存（开始背诵时批量提交留痕）

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
    // V7.3.1: 记录已完成批次（供断点续训）
    setCompletedBatches(b => Math.max(b, batchIndex + 1));
    if (batchIndex + 1 >= batches.length || timeUp) {
      clearLocalSnapshot(); // 本环节完成，进入下一环节（各自有独立快照）
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

    const isCorrect = checkChineseAnswer(userInput, currentDictWord.keywords, currentDictWord.synonyms, currentDictWord.chineseDefinition, { allowSynonym: true });
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // 答对的词记入本轮已通过集合（重测轮次剔除用）
    if (isCorrect) {
      roundPassedRef.current.add(currentDictWord.wordId);
    }

    // 首试统计
    if (isCorrect) {
      dictStatsRef.current.total += 1;
      dictStatsRef.current.correct += 1;
    } else {
      dictStatsRef.current.total += 1;
    }

    api.submitDictation(session?.listNo, {
      wordId: currentDictWord.wordId,
      isCorrect,
      userAnswer: userInput.trim(),
    }).catch((err) => {
      console.warn('Failed to save dictation result:', err.message);
    });
    // 不自动前进：停留展示对错与完整释义，由用户手动进入下一个
  }, [userInput, feedback, currentDictWord, session]);

  // 手动前进到下一个词（反馈显示后点"下一个"/Enter）
  const goNextDictation = useCallback(() => {
    if (currentIndex + 1 >= dictWords.length) {
      // 本轮结束：下一轮只重测未通过的词（已通过的直接剔除）
      const retryWords = dictWords.filter(w => !roundPassedRef.current.has(w.wordId));
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
  }, [currentIndex, dictWords, batchDictationDone]);

  // 开始默写本批
  const startDictation = () => {
    setDictWords(currentBatch);
    setRound(1);
    setCurrentIndex(0);
    roundPassedRef.current = new Set();
    setUserInput('');
    setFeedback(null);
    // 批量提交翻卡痕迹（学习留痕）
    if (flipTraceRef.current.length) {
      api.recordTrace({ sessionId: session.sessionId, events: flipTraceRef.current }).catch(() => {});
      flipTraceRef.current = [];
    }
    setPhase('dictation');
  };

  // ===== 自测（测"不会"词，复用 useDictationSession 错词重测状态机）=====
  const selftest = useDictationSession({
    judge: (input, word) => checkChineseAnswer(input, word.keywords, word.synonyms, word.chineseDefinition, { allowSynonym: true }),
    onAnswer: (word, isCorrect, answer) => {
      // 自测留痕（历史可见，但不计入正式成绩）
      api.recordTrace({
        sessionId: session.sessionId,
        events: [{ wordId: word.id ?? word.wordId, eventType: isCorrect ? 'selftest_correct' : 'selftest_wrong', answer }],
      }).catch(() => {});
    },
    onComplete: () => {
      showToast('🎉 自测完成！全部"不会"词已消灭', 'success');
      setPhase('wordtable');
    },
  });

  const startSelftest = () => {
    const notMarked = currentBatch.filter(w => marked[w.wordId] === false);
    if (notMarked.length === 0) {
      showToast('本批没有标记"不会"的词', 'info');
      return;
    }
    selftest.start(notMarked);
    setPhase('selftest');
  };

  const endSelftest = () => {
    setPhase('wordtable');
  };

  // V7.4.2: 进度快照（单词级双写：localStorage + 服务器），版本更新打断后精确恢复
  const snapshot = useMemo(() => {
    if (!session) return null;
    const base = {
      stage: phase,
      listNo: session.listNo,
      batchIndex,
      completedBatches,
      marked,
      flipped: [...flippedSet],
    };
    if (phase === 'dictation') {
      return {
        ...base,
        currentIndex,
        round,
        wrongPool: dictWords.filter(w => !roundPassedRef.current.has(w.wordId)).map(w => w.wordId),
      };
    }
    if (phase === 'selftest') {
      return {
        ...base,
        selftestWords: selftest.words.map(w => w.id ?? w.wordId),
        selftestIndex: selftest.currentIndex,
        selftestRound: selftest.round,
      };
    }
    return base;
  }, [phase, session, batchIndex, completedBatches, marked, flippedSet, currentIndex, round, dictWords, selftest]);

  useProgressSync(session?.sessionId, snapshot);

  // V7.4.2: 恢复默写/自测的单词级状态（打断后精确继续）
  const resumeAppliedRef = useRef(false);
  useEffect(() => {
    if (!resumeSnap || resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    if (resumeSnap.stage === 'dictation' && Array.isArray(resumeSnap.wrongPool) && resumeSnap.wrongPool.length > 0) {
      const wrongIds = new Set(resumeSnap.wrongPool);
      const wrongWords = currentBatch.filter(w => wrongIds.has(w.wordId));
      if (wrongWords.length > 0) {
        setDictWords(wrongWords);
        setRound(resumeSnap.round || 1);
        setCurrentIndex(resumeSnap.currentIndex || 0);
        roundPassedRef.current = new Set(currentBatch.filter(w => !wrongIds.has(w.wordId)).map(w => w.wordId));
      }
    }
    if (resumeSnap.stage === 'selftest' && Array.isArray(resumeSnap.selftestWords) && resumeSnap.selftestWords.length > 0) {
      const ids = new Set(resumeSnap.selftestWords);
      const words = currentBatch.filter(w => ids.has(w.wordId));
      if (words.length > 0) {
        selftest.start(words, { round: resumeSnap.selftestRound || 1, index: resumeSnap.selftestIndex || 0 });
      }
    }
  }, [resumeSnap]);

  const abandon = useCallback(async () => {
    if (abandoning) return;
    const ok = await confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
    if (!ok) return;
    setAbandoning(true);
    try {
      await api.abandonTraining({
        sessionId: session.sessionId,
        durationSeconds: Math.max(0, elapsed - restedSecondsRef.current),
        mainResults: [],
        completedBatches,
      });
      showToast('已收工，进度已保存', 'info');
      // V7.4.2: 手动退出 → 快照回环节起点（下次从单词卡界面开始，而非精确单词）
      const exitSnap = {
        sessionId: session.sessionId,
        stage: 'wordtable',
        listNo: session.listNo,
        batchIndex,
        completedBatches,
        marked,
        flipped: [],
      };
      saveLocalSnapshot(exitSnap);
      api.saveProgress({ sessionId: session.sessionId, snapshot: exitSnap }).catch(() => {});
      navigate('/');
    } catch (err) {
      showToast('收工失败: ' + err.message, 'error');
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, session, elapsed, showToast, navigate]);

  useKeyboard({
    'Enter': () => {
      if (phase === 'dictation') {
        if (feedback) goNextDictation();
        else submitDictation();
      }
      if (phase === 'selftest') { if (selftest.feedback) selftest.goNext(); else selftest.submit(); }
      if (phase === 'rest') skipRest();
    },
    ' ': (e) => {
      e.preventDefault();
      if (phase === 'dictation' && currentDictWord) speak(currentDictWord.word);
      if (phase === 'selftest' && selftest.currentWord) speak(selftest.currentWord.word);
    },
    'Escape': () => {
      if (phase === 'selftest') endSelftest();
      else abandon();
    },
  }, true, [phase, submitDictation, goNextDictation, feedback, abandon, currentDictWord, skipRest]);

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
              else setFlippedSet(new Set(currentBatch.map(w => w.wordId)));
            }}
            className="mt-3 text-sm font-medium px-3 py-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-gray-300"
          >
            {showAllMeaning ? '显示全部释义' : '隐藏全部释义'}
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {currentBatch.map((word, idx) => {
            const isFlipped = flippedSet.has(word.wordId);
            const isMarked = marked[word.wordId] === true;
            const isNotMarked = marked[word.wordId] === false;
            return (
              <div key={word.wordId} className={`relative ${isMarked ? 'border-2 border-green-300 rounded-xl' : isNotMarked ? 'border-2 border-red-200 rounded-xl' : ''}`}>
                <span className="absolute -top-2 left-2 text-[10px] text-gray-400 bg-gray-50 px-1 rounded z-10">{startIndex + idx + 1}.</span>
                <FlipCard
                  word={word}
                  flipped={isFlipped}
                  onClick={() => {
                    setFlippedSet(prev => {
                      const next = new Set(prev);
                      if (next.has(word.wordId)) next.delete(word.wordId);
                      else next.add(word.wordId);
                      return next;
                    });
                    flipTraceRef.current.push({ wordId: word.wordId, eventType: 'flip' });
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
                        onClick={(e) => { e.stopPropagation(); setMarked(m => ({ ...m, [word.wordId]: true })); }}
                        className={`p-2 rounded-lg transition-colors ${isMarked ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-green-50'}`}
                        title="会 (1)"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarked(m => ({ ...m, [word.wordId]: false }));
                          // 点"不会"后翻回释义面（正面），立即展示答案学习，同时保留红色"不会"标记
                          setFlippedSet(prev => {
                            const next = new Set(prev);
                            next.delete(word.wordId);
                            return next;
                          });
                        }}
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

        {currentBatch.some(w => marked[w.wordId] === false) && (
          <button
            onClick={startSelftest}
            className="btn-secondary w-full py-3 flex items-center justify-center gap-2 mb-3"
          >
            <Target className="w-5 h-5" />
            自测"不会"词（{currentBatch.filter(w => marked[w.wordId] === false).length} 个）
          </button>
        )}
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
        {dialog}
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
        {dialog}
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
                    <div>
                      <span className="flex items-center justify-center gap-1 mb-1">
                        <Check className="w-5 h-5" /> 正确!
                      </span>
                      <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                        {Array.isArray(currentDictWord.meanings) && currentDictWord.meanings.length > 0
                          ? currentDictWord.meanings.join('；')
                          : currentDictWord.chineseDefinition}
                      </p>
                    </div>
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
              {feedback && (
                <button onClick={goNextDictation} className="btn-primary w-full mt-4 py-2.5">
                  下一个 <ChevronRight className="w-4 h-4 inline" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          {!feedback && (
            <button
              onClick={submitDictation}
              disabled={!userInput.trim()}
              className="btn-primary px-8"
            >
              <span className="kbd-hint">提交 (Enter)</span>
              <span className="touch-hint hidden">提交</span>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 / 下一个
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
          </span>
          <span className="touch-hint hidden">输入中文词义后提交 · 答错自动重测</span>
        </p>
        {dialog}
      </div>
    );
  }

  // ===== 自测阶段（测"不会"词，错词循环直到消灭，可退回背诵）=====
  if (phase === 'selftest') {
    const sw = selftest.currentWord;
    const progress = selftest.words.length ? (selftest.currentIndex / selftest.words.length) * 100 : 0;
    const borderClass = selftest.feedback === 'correct'
      ? 'border-green-500 animate-pulse-green'
      : selftest.feedback === 'incorrect'
      ? 'border-red-500 animate-shake-red'
      : 'border-gray-200';

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-purple-600">
            🎯 自测 · 消灭 {selftest.words.length} 个"不会"词
            {selftest.round > 1 ? ` · 第 ${selftest.round} 轮重测` : ''} · {selftest.currentIndex + 1} / {selftest.words.length}
          </span>
          <button onClick={endSelftest} className="btn-secondary px-4 py-1.5 text-sm">
            ← 返回背诵
          </button>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
          <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {sw && (
          <div className={`card text-center border-2 transition-all duration-300 ${borderClass}`}>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">请填写该单词的中文释义</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => speak(sw.word)}
                  className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
                  title="朗读 (Space)"
                >
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                </button>
                <p className="text-4xl font-bold text-gray-900">{sw.word}</p>
              </div>
              <span className="text-sm text-gray-400 mt-1 inline-block">
                {sw.phonetic}
                {sw.partOfSpeech ? ` · ${sw.partOfSpeech}` : ''}
              </span>
            </div>

            <div className="max-w-sm mx-auto">
              <input
                type="text"
                value={selftest.userInput}
                onChange={(e) => selftest.setUserInput(e.target.value)}
                placeholder="输入中文词义..."
                className={`input-field text-center text-xl ${
                  selftest.feedback === 'correct' ? 'border-green-500 bg-green-50' :
                  selftest.feedback === 'incorrect' ? 'border-red-500 bg-red-50' : ''
                }`}
                autoComplete="off" autoCorrect="off" spellCheck="false"
                disabled={!!selftest.feedback}
              />
              {selftest.feedback && (
                <div className={`text-center mt-3 ${selftest.feedback === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
                  {selftest.feedback === 'correct' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Check className="w-5 h-5" /> 正确!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <X className="w-5 h-5" /> 错误 · 将重测
                    </span>
                  )}
                  {/* V7.4.1: 无论对错都展示正确答案，答对但不确定时也能再记忆 */}
                  <div className="mt-2 text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                    正确答案: <span className="font-semibold text-green-600">
                      {Array.isArray(sw.meanings) && sw.meanings.length > 0 ? sw.meanings.join('；') : sw.chineseDefinition}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          {selftest.feedback ? (
            <button onClick={selftest.goNext} className="btn-primary px-8">
              <span className="kbd-hint">下一个 (Enter)</span>
              <span className="touch-hint hidden">下一个</span>
            </button>
          ) : (
            <button onClick={selftest.submit} disabled={!selftest.userInput.trim()} className="btn-primary px-8">
              <span className="kbd-hint">提交 (Enter)</span>
              <span className="touch-hint hidden">提交</span>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 / 下一个
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
            · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 返回背诵
          </span>
          <span className="touch-hint hidden">输入中文释义后提交 · 查看答案后点下一个</span>
        </p>
        {dialog}
      </div>
    );
  }

  return null;
}

