import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useKeyboard } from '../hooks/useKeyboard';
import { speak } from '../utils/speech';
import { Volume2, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function DailyFlashcards() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = location.state?.session;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [studiedCount, setStudiedCount] = useState(0);

  useEffect(() => {
    if (!session) navigate('/daily', { replace: true });
  }, [session, navigate]);

  const words = session?.words || [];
  const currentWord = words[currentIndex];

  const speakWord = useCallback((w) => { if (w) speak(w); }, []);

  const next = useCallback(() => {
    if (currentIndex < words.length - 1) {
      if (!showMeaning) setStudiedCount(c => c + 1);
      setCurrentIndex(i => i + 1);
      setShowMeaning(false);
    }
  }, [currentIndex, words.length, showMeaning]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setShowMeaning(false);
    }
  }, [currentIndex]);

  useKeyboard({
    'Enter': () => { if (!showMeaning) setShowMeaning(true); else next(); },
    'ArrowRight': next,
    'ArrowLeft': prev,
    ' ': (e) => { e.preventDefault(); if (currentWord) speakWord(currentWord.word); },
    'Escape': () => {
      if (currentIndex >= words.length - 1 || studiedCount >= words.length) {
        navigate('/daily/quiz', { state: { session } });
      }
    },
  }, true, [showMeaning, currentIndex, next, prev, speakWord, currentWord, navigate, session, studiedCount, words.length]);

  if (!session) return null;

  const progress = words.length > 0 ? ((studiedCount + (showMeaning ? 1 : 0)) / words.length) * 100 : 0;

  // If all cards studied, show transition
  if (currentIndex >= words.length - 1 && showMeaning) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">单词卡学习完成!</h2>
        <p className="text-gray-500 mb-8">已学习 {words.length} 个单词，准备开始测验</p>
        <button
          onClick={() => navigate('/daily/quiz', { state: { session } })}
          className="btn-primary text-lg px-8 py-3"
        >
          开始测验 →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/daily" className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
        <button onClick={() => setShowMeaning(!showMeaning)} className="p-2 hover:bg-gray-100 rounded-lg" title="显示/隐藏释义">
          {showMeaning ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard */}
      {currentWord && (
        <div className="card text-center py-12 min-h-[300px] flex flex-col justify-center">
          <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">{currentWord.topic}</span>
          <div className="text-4xl font-bold text-gray-900 mb-3">{currentWord.word}</div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg text-gray-400">{currentWord.phonetic}</span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-sm rounded">{currentWord.partOfSpeech}</span>
          </div>

          <button onClick={() => speakWord(currentWord.word)}
            className="mx-auto mb-6 w-12 h-12 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors">
            <Volume2 className="w-6 h-6 text-indigo-600" />
          </button>

          {/* Meaning toggle */}
          <div className={`transition-all duration-300 ${showMeaning ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <p className="text-2xl text-gray-700 mb-3">{currentWord.chineseDefinition}</p>
            {currentWord.exampleSentence && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
                <p className="text-sm text-gray-600 italic">"{currentWord.exampleSentence}"</p>
                {currentWord.exampleTranslation && (
                  <p className="text-xs text-gray-400 mt-1">{currentWord.exampleTranslation}</p>
                )}
              </div>
            )}
          </div>

          {!showMeaning && (
            <p className="text-sm text-gray-400">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Enter</kbd> 显示释义</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={prev} disabled={currentIndex === 0} className="btn-secondary disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 inline" /> 上一个
        </button>
        <button onClick={() => speakWord(currentWord?.word)} className="btn-secondary">
          <Volume2 className="w-4 h-4 inline" /> 发音
        </button>
        <button onClick={next} disabled={currentIndex >= words.length - 1 && showMeaning} className="btn-primary">
          {showMeaning ? '下一个' : '显示释义'} <ChevronRight className={`w-4 h-4 inline ${showMeaning ? '' : 'hidden'}`} />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 space-x-3">
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Space</kbd> 发音</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">← →</kbd> 切换</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> {showMeaning ? '下一个' : '显示释义'}</span>
      </p>
    </div>
  );
}
