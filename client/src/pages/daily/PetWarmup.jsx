import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useTouch } from '../../context/TouchContext';
import { speak } from '../../utils/speech';
import { checkAnswer } from '../../utils/checkAnswer';
import { Volume2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

/**
 * PET 热身：前 5 词中译英（输入英文判分），后 5 词英译中（输入中文判分）。
 * 不计时不计分，答错显示正确答案，用于唤醒状态。
 */
export default function PetWarmup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { isTouch } = useTouch();
  const plan = location.state?.plan;
  const batchSize = location.state?.batchSize || 30;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef(null);
  const submitLockRef = useRef(false); // 防止 Enter 双触发重复提交
  const feedbackShownAtRef = useRef(0); // 反馈显示时间戳（防止提交后立即 Enter 跳过）

  const words = plan?.petWarmupWords || [];
  const currentWord = words[currentIndex];
  const isCeMode = currentIndex < 5; // 前5中译英，后5英译中

  useEffect(() => { inputRef.current?.focus(); }, [currentIndex]);

  const startMain = useCallback(async () => {
    if (!plan?.todayList || starting) return;
    setStarting(true);
    try {
      const session = await api.startTraining({
        listNo: plan.todayList.listNo,
        batchSize,
        targetMinutes: plan.targetMinutes,
        debtMinutes: plan.debtMinutes,
      });
      navigate('/daily/study', { state: { session, plan, batchSize } });
    } catch (err) {
      showToast('启动训练失败: ' + err.message, 'error');
      setStarting(false);
    }
  }, [plan, starting, navigate, showToast, batchSize]);

  const goNext = useCallback(() => {
    submitLockRef.current = false;
    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1);
      setUserInput('');
      setFeedback(null);
    } else {
      startMain();
    }
  }, [currentIndex, words.length, startMain]);

  const submitAnswer = useCallback(() => {
    if (feedback || submitLockRef.current || !userInput.trim() || !currentWord) return;
    submitLockRef.current = true;
    let isCorrect;
    if (isCeMode) {
      // 中译英：拼写判分（忽略大小写）
      isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    } else {
      // 英译中：关键词判分
      isCorrect = checkAnswer(userInput, currentWord.keywords, currentWord.chineseDefinition);
    }
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    feedbackShownAtRef.current = Date.now();
    submitLockRef.current = false;
    // 不自动跳转：停留展示对错与答案，由用户主动前进
  }, [userInput, feedback, currentWord, isCeMode]);

  const prev = useCallback(() => {
    submitLockRef.current = false;
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setUserInput('');
      setFeedback(null);
    }
  }, [currentIndex]);

  useKeyboard({
    'Enter': () => {
      // 输入框聚焦时 Enter 由 input.onKeyDown 处理（避免双触发提交）
      if (document.activeElement === inputRef.current) return;
      if (!feedback) submitAnswer();
      else {
        // 反馈刚显示 700ms 内忽略 Enter，避免提交后连按/长按瞬间跳过导致看不到反馈
        if (Date.now() - feedbackShownAtRef.current < 700) return;
        goNext();
      }
    },
    'ArrowRight': goNext,
    'ArrowLeft': prev,
    ' ': (e) => { e.preventDefault(); if (currentWord) speak(currentWord.word); },
    'Escape': () => navigate('/daily'),
  }, true, [feedback, currentIndex, goNext, prev, submitAnswer, currentWord, navigate]);

  if (!plan) return null;

  const isLast = currentIndex >= words.length - 1;
  const borderClass = feedback === 'correct' ? 'border-green-300 bg-green-50/50' : feedback === 'incorrect' ? 'border-red-300 bg-red-50/40' : '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
          🏃 热身 · 不计时不计分
          <span className="text-indigo-500">{isCeMode ? '中译英' : '英译中'}</span>
        </span>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-green-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
      </div>

      {/* Card */}
      {currentWord && (
        <div className={`card text-center py-10 min-h-[300px] flex flex-col justify-center transition-all duration-300 ${borderClass}`}>
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">PET 热身 · {isCeMode ? '看中文，写出英文' : '看英文，写出中文'}</span>

          {isCeMode ? (
            // 中译英：显示中文，输入英文
            <div className="mb-6">
              <p className="text-2xl text-gray-700 font-medium leading-relaxed max-w-md mx-auto">{currentWord.chineseDefinition}</p>
            </div>
          ) : (
            // 英译中：显示英文+音标，输入中文
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-4xl font-bold text-gray-900">{currentWord.word}</p>
                <button
                  onClick={() => speak(currentWord.word)}
                  className={`ml-2 w-12 h-12 ${isTouch ? 'w-14 h-14' : ''} bg-green-50 hover:bg-green-100 rounded-full flex items-center justify-center transition-colors`}
                >
                  <Volume2 className="w-6 h-6 text-green-600" />
                </button>
              </div>
              {currentWord.phonetic && <span className="text-lg text-gray-400">{currentWord.phonetic}</span>}
            </div>
          )}

          {feedback ? (
            <div className="max-w-md mx-auto">
              {feedback === 'correct' ? (
                <p className="flex items-center justify-center gap-2 text-green-600 font-medium mb-3">
                  <CheckCircle className="w-5 h-5" /> 正确！
                </p>
              ) : (
                <div className="mb-3">
                  <p className="flex items-center justify-center gap-2 text-red-500 font-medium mb-1">
                    <XCircle className="w-5 h-5" /> 正确答案：
                  </p>
                  <p className="text-xl font-semibold text-gray-900">{currentWord.word} <span className="text-sm text-gray-400">{currentWord.phonetic}</span></p>
                  <p className="text-sm text-gray-500 mt-1">{currentWord.chineseDefinition}</p>
                </div>
              )}
              <button onClick={goNext} className="btn-primary w-full py-2.5">
                {isLast ? (starting ? '准备中...' : '开始主任务 →') : '下一个'}
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); } }}
                placeholder={isCeMode ? '输入英文单词' : '输入中文释义'}
                className="input-field text-center text-lg py-3"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                onClick={submitAnswer}
                disabled={!userInput.trim()}
                className="btn-primary w-full mt-3 py-2.5 disabled:opacity-40"
              >
                确认
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={prev} disabled={currentIndex === 0} className="btn-secondary disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 inline" /> 上一个
        </button>
        <button
          onClick={() => { if (feedback) goNext(); else if (userInput.trim()) submitAnswer(); else goNext(); }}
          className="btn-secondary"
        >
          跳过 <ChevronRight className="w-4 h-4 inline" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 space-x-3">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 提交/下一个</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 发音</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">← →</kbd> 切换</span>
        <span className="touch-hint hidden">输入答案点确认 · 跳过可切词</span>
      </p>
    </div>
  );
}
