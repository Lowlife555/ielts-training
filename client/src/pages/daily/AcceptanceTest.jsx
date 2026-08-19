import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useElapsed } from '../../hooks/useTimer';
import { useConfirm } from '../../hooks/useConfirm';
import { useDictationSession } from '../../hooks/useDictationSession';
import { useProgressSync, clearLocalSnapshot } from '../../hooks/useProgressSync';
import TrainingTimer from '../../components/training/TrainingTimer';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { speak } from '../../utils/speech';
import { checkEnglishAnswer } from '../../utils/answerCheck';

export default function AcceptanceTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { confirm, dialog } = useConfirm();
  const session = location.state?.session;
  const plan = location.state?.plan;
  const wrongPool = location.state?.wrongPool || [];
  const mainResults = location.state?.mainResults || [];
  const spellingResults = location.state?.spellingResults || [];
  const resumeSnap = location.state?.resumeSnapshot; // V7.4.2 单词级断点恢复快照

  const initialWords = useMemo(() => wrongPool.map(w => ({ wordId: w.wordId, word: w.word, chineseDefinition: w.chineseDefinition, partOfSpeech: w.partOfSpeech })), [wrongPool]);

  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const resumedRef = useRef(false); // V7.4.2: 已按快照恢复验收词 → 跳过"无错词直接完成"

  const elapsed = useElapsed(session?.startTime);

  useEffect(() => { if (!session) navigate('/daily', { replace: true }); }, [session, navigate]);

  // 注意：finish 必须先于 useDictationSession 声明（onComplete 引用它）
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
      clearLocalSnapshot(); // V7.4.2: 本环节完成，快照清空
      showToast(report.completed ? '🎉 验收通过，今日任务完成!' : '验收完成', 'success');
      navigate('/daily/report', { state: { report, plan } });
    } catch (err) {
      showToast('提交失败: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [session, elapsed, mainResults, spellingResults, navigate, showToast, plan]);

  const {
    words, round, currentIndex, currentWord,
    userInput, setUserInput, feedback, results, start, submit, goNext,
  } = useDictationSession({
    judge: (input, word) => checkEnglishAnswer(input, word.word, { allowMorph: true, allowEdit: false }),
    onComplete: (finalResults) => finish(finalResults),
  });

  useEffect(() => { if (session) start(initialWords); }, [session, start]);

  // V7.4.2: 进度快照（单词级双写：localStorage + 服务器），打断后精确恢复
  const snapshot = useMemo(() => {
    if (!session) return null;
    return { stage: 'acceptance', listNo: session.listNo, currentIndex, round, words: words.map(w => w.wordId) };
  }, [session, currentIndex, round, words]);

  useProgressSync(session?.sessionId, snapshot);

  // V7.4.2: 恢复验收的单词级状态（打断后精确继续；词对象从 initialWords/wrongPool 找，兜底 session.words）
  // 必须位于自动 start 之后（覆盖其重置）、"无错词直接完成" effect 之前（避免误触发完成）
  const resumeAppliedRef = useRef(false);
  useEffect(() => {
    if (!resumeSnap || resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    if (resumeSnap.stage === 'acceptance' && Array.isArray(resumeSnap.words) && resumeSnap.words.length > 0) {
      const ids = new Set(resumeSnap.words);
      let ws = initialWords.filter(w => ids.has(w.wordId));
      if (ws.length === 0 && Array.isArray(session?.words)) {
        ws = session.words.filter(w => ids.has(w.wordId ?? w.id));
      }
      if (ws.length > 0) {
        start(ws, { round: resumeSnap.round || 1, index: resumeSnap.currentIndex || 0 });
        resumedRef.current = true;
      }
    }
  }, [resumeSnap]);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [currentIndex]);

  // 没有错词（漏网之鱼为 0）→ 直接完成
  useEffect(() => {
    if (session && initialWords.length === 0 && !submitting && !resumedRef.current) {
      finish([]);
    }
  }, [session, initialWords.length, submitting, finish]);

  const abandon = useCallback(async () => {
    if (submitting) return;
    const ok = await confirm('确定要收工吗？本次进度将保存，欠债规则照常计算。');
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
    'Enter': () => { if (feedback) goNext(); else submit(); },
    'Escape': abandon,
    ' ': (e) => {
      if (feedback && currentWord) { e.preventDefault(); speak(currentWord.word); }
    },
  }, true, [submit, abandon, feedback, currentWord]);

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
                  <span className="flex items-center justify-center gap-1"><XCircle className="w-5 h-5" /> 错误 · 将重测</span>
                )}
                {/* V7.4.1: 无论对错都展示正确答案，答对但不确定时也能再记忆 */}
                <div className="mt-2">
                  <p className="text-sm">正确答案: <span className="font-semibold text-green-600">{currentWord.word}</span></p>
                  <button onClick={() => speak(currentWord.word)} className="mt-1 text-xs text-indigo-500 hover:underline flex items-center gap-1 mx-auto">
                    <Volume2 className="w-3 h-3" /> 听发音
                  </button>
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
          <button onClick={submit} disabled={!userInput.trim() || submitting} className="btn-primary px-8">
            <span className="kbd-hint">提交 (Enter)</span>
            <span className="touch-hint hidden">提交</span>
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交 / 下一个 · 查看答案后点下一个</span>
        <span className="touch-hint hidden">拼对为止 · 查看答案后点下一个</span>
      </p>
      {dialog}
    </div>
  );
}
