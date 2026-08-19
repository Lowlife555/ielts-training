import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { useConfirm } from '../../hooks/useConfirm';
import { speak } from '../../utils/speech';
import { checkEnglishAnswer, checkChineseAnswer } from '../../utils/answerCheck';
import TrainingTimer from '../../components/training/TrainingTimer';
import FlipCard from '../../components/ui/FlipCard';
import { useDictationSession } from '../../hooks/useDictationSession';
import { Volume2, CheckCircle, XCircle, Target, Home, RotateCcw, Check, X, BookOpen } from 'lucide-react';

const CHECK_COUNT = 30;
const PASS_RATE = 80;

export default function SpellCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { confirm, dialog } = useConfirm();
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
  // V7.4.1: 拼写自背 → 自测 → 拼写抽查 三阶段
  const [stage, setStage] = useState('review'); // review | selftest | test
  const [reviewMarked, setReviewMarked] = useState({});
  const [reviewFlipped, setReviewFlipped] = useState(new Set());

  const elapsed = useElapsed(session?.startTime);
  const currentWord = words[currentIndex];

  useEffect(() => {
    if (!session) navigate('/daily', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    if (session && !finished) inputRef.current?.focus();
  }, [session, finished, currentIndex]);

  // 用 ref 追踪最新 results，避免 setTimeout 闭包读到旧值
  const resultsRef = useRef([]);
  useEffect(() => { resultsRef.current = results; }, [results]);

  // finish 必须先于 submitAnswer 声明（否则 submitAnswer 闭包引用 TDZ 报错：Cannot access 'finish' before initialization）
  const finish = useCallback(async (finalResults) => {
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
  }, [session, elapsed, restedSeconds, showToast]);

  const submitAnswer = useCallback(() => {
    if (feedback || !userInput.trim() || submitting) return;
    const isCorrect = checkEnglishAnswer(userInput, currentWord.word, { allowMorph: true, allowEdit: false });
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    const newResult = { wordId: currentWord.id ?? currentWord.wordId, correct: isCorrect, answer: userInput.trim() };
    const nextResults = [...resultsRef.current, newResult];
    setResults(nextResults);
    resultsRef.current = nextResults;
    // V7.4.1: 不自动前进，展示答案后由用户点下一个/Enter
  }, [feedback, userInput, currentWord, submitting]);

  const goNext = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      finish(resultsRef.current);
    } else {
      setCurrentIndex(i => i + 1);
      setUserInput('');
      setFeedback(null);
      inputRef.current?.focus();
    }
  }, [currentIndex, words, finish]);

  // ===== 拼写自测（测"不会"词，复用 useDictationSession 错词重测）=====
  const selftest = useDictationSession({
    judge: (input, word) => checkChineseAnswer(input, word.keywords, word.synonyms, word.chineseDefinition, { allowSynonym: true }),
    onComplete: () => {
      showToast('🎉 拼写自测完成！全部"不会"词已消灭', 'success');
      setStage('test');
    },
  });

  const startSelftest = () => {
    const notMarked = (session?.words || []).filter(w => reviewMarked[w.id ?? w.wordId] === false);
    if (notMarked.length === 0) {
      showToast('没有标记"不会"的词，直接开始拼写测试', 'info');
      setStage('test');
      return;
    }
    selftest.start(notMarked);
    setStage('selftest');
  };

  const abandon = useCallback(async () => {
    if (abandoning || submitting) return;
    const ok = await confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
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
    'Enter': () => {
      if (stage === 'test') {
        if (finished && outcome) { goReport(); return; }
        if (feedback) goNext();
        else submitAnswer();
      }
      if (stage === 'selftest') { if (selftest.feedback) selftest.goNext(); else selftest.submit(); }
    },
    ' ': (e) => {
      e.preventDefault();
      if (stage === 'test' && currentWord && !finished) speak(currentWord.word);
      if (stage === 'selftest' && selftest.currentWord) speak(selftest.currentWord.word);
    },
    'Escape': () => {
      if (finished) navigate('/');
      else if (stage === 'selftest') setStage('review');
      else abandon();
    },
  }, true, [stage, submitAnswer, goNext, selftest, currentWord, finished, outcome, abandon, navigate]);

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

  // ===== 拼写自背（展示本 list 全部词翻卡）=====
  if (stage === 'review') {
    const allWords = session?.words || [];
    const notMarkedCount = allWords.filter(w => reviewMarked[w.id ?? w.wordId] === false).length;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-indigo-600 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> 拼写自背 · List {session.listNo} · 共 {allWords.length} 词
          </span>
          <TrainingTimer
            elapsed={elapsed}
            targetMinutes={plan?.targetMinutes || 60}
            onAbandon={abandon}
            onReachedCap={() => showToast('已达今日上限 2 小时，欠债已结清，可以收工', 'success')}
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">拼写自背</h1>
          <p className="text-sm text-gray-500">
            先看英文回忆中文释义，重点记拼写 · 点卡片翻卡核对 · 标记会/不会后开始测试
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {allWords.map((w, idx) => {
            const wid = w.id ?? w.wordId;
            const isFlipped = reviewFlipped.has(wid);
            const isMarked = reviewMarked[wid] === true;
            const isNotMarked = reviewMarked[wid] === false;
            return (
              <div key={wid} className={`relative ${isMarked ? 'border-2 border-green-300 rounded-xl' : isNotMarked ? 'border-2 border-red-200 rounded-xl' : ''}`}>
                <span className="absolute -top-2 left-2 text-[10px] text-gray-400 bg-gray-50 px-1 rounded z-10">{idx + 1}.</span>
                <FlipCard
                  word={w}
                  flipped={isFlipped}
                  onClick={() => {
                    setReviewFlipped(prev => {
                      const next = new Set(prev);
                      if (next.has(wid)) next.delete(wid);
                      else next.add(wid);
                      return next;
                    });
                  }}
                  showMarked={() => (
                    <>
                      {isMarked && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">会</span>}
                      {isNotMarked && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-500 rounded">不会</span>}
                    </>
                  )}
                  markNode={
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewMarked(m => ({ ...m, [wid]: true })); }}
                        className={`p-2 rounded-lg transition-colors ${isMarked ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-green-50'}`}
                        title="会 (1)"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewMarked(m => ({ ...m, [wid]: false })); }}
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

        <div className="flex gap-3">
          {notMarkedCount > 0 && (
            <button onClick={startSelftest} className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2">
              <Target className="w-5 h-5" /> 自测"不会"词（{notMarkedCount} 个）
            </button>
          )}
          <button onClick={() => setStage('test')} className="btn-primary flex-1 py-3">
            开始拼写测试 →
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">1 / 2</kbd> 会 / 不会 · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读</span>
          <span className="touch-hint hidden">点卡片翻卡 · 标记会/不会 · 开始测试</span>
        </p>
      </div>
    );
  }

  // ===== 拼写自测（测"不会"词，错词循环）=====
  if (stage === 'selftest') {
    const sw = selftest.currentWord;
    const progress = selftest.words.length ? (selftest.currentIndex / selftest.words.length) * 100 : 0;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-purple-600">
            🎯 拼写自测 · 消灭 {selftest.words.length} 个"不会"词
            {selftest.round > 1 ? ` · 第 ${selftest.round} 轮重测` : ''} · {selftest.currentIndex + 1} / {selftest.words.length}
          </span>
          <button onClick={() => setStage('review')} className="btn-secondary px-4 py-1.5 text-sm">
            ← 返回自背
          </button>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
          <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {sw && (
          <div className="card text-center">
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
                    <span className="flex items-center justify-center gap-1"><CheckCircle className="w-5 h-5" /> 正确!</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1"><XCircle className="w-5 h-5" /> 错误 · 将重测</span>
                  )}
                  <div className="mt-2 text-sm text-gray-600">
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
                  <span className="flex items-center justify-center gap-1">
                    <XCircle className="w-5 h-5" /> 错误
                  </span>
                )}
                {/* V7.4.1: 无论对错都展示正确答案，答对但不确定时也能再记忆 */}
                <div className="mt-2 text-sm">
                  正确答案: <span className="font-semibold text-green-600">{currentWord.word}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        {feedback ? (
          <button onClick={goNext} className="btn-primary px-8">
            <span className="kbd-hint">下一个 (Enter)</span>
            <span className="touch-hint hidden">下一个</span>
          </button>
        ) : (
          <button
            onClick={submitAnswer}
            disabled={!userInput.trim() || submitting}
            className="btn-primary px-8"
          >
            <span className="kbd-hint">提交 (Enter)</span>
            <span className="touch-hint hidden">提交</span>
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 朗读
          · <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 收工
        </span>
        <span className="touch-hint hidden">输入英文拼写后提交</span>
      </p>
      {dialog}
    </div>
  );
}
