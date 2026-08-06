import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import Loading from '../components/Loading';
import { useKeyboard } from '../hooks/useKeyboard';
import { speak } from '../utils/speech';
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function WordStudy() {
  const { topic } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDefinition, setShowDefinition] = useState(false);

  // Fetch words for the topic
  useEffect(() => {
    const params = { limit: 100 };
    if (topic && topic !== 'all') params.topic = topic;

    api.getWords(params)
      .then((data) => {
        setWords(data.words);
        const startId = searchParams.get('wordId');
        if (startId) {
          const idx = data.words.findIndex(w => w.id === parseInt(startId));
          if (idx >= 0) setCurrentIndex(idx);
        }
      })
      .finally(() => setLoading(false));
  }, [topic, searchParams]);

  const speakWord = useCallback((word) => {
    speak(word);
  }, []);

  const goTo = useCallback((index) => {
    if (index >= 0 && index < words.length) {
      setCurrentIndex(index);
      setShowDefinition(false);
    }
  }, [words.length]);

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useKeyboard({
    'Enter': () => {
      if (!showDefinition) {
        setShowDefinition(true);
      } else {
        next();
      }
    },
    'ArrowRight': next,
    'ArrowLeft': prev,
    ' ': (e) => {
      e.preventDefault();
      if (currentWord) speakWord(currentWord.word);
    },
    'Escape': () => navigate(-1),
  }, true, [showDefinition, currentIndex, next, prev, speakWord, navigate, words]);

  // Note: Chrome blocks auto-speak (not a user gesture).
  // User must press Space or click the speaker button to hear pronunciation.

  if (loading) return <Loading text="加载单词..." />;
  if (words.length === 0) return <div className="text-center py-20 text-gray-500">暂无单词数据</div>;

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link to={`/words/${topic || ''}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {words.length}</span>
        <button
          onClick={() => setShowDefinition(!showDefinition)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Word card */}
      <div className="card text-center py-12" onClick={() => setShowDefinition(true)}>
        {/* Word */}
        <div className="mb-2">
          <span className="text-4xl font-bold text-gray-900">{currentWord.word}</span>
        </div>

        {/* Phonetic & POS */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-lg text-gray-400">{currentWord.phonetic}</span>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-sm rounded">{currentWord.part_of_speech}</span>
        </div>

        {/* Speak button */}
        <button
          onClick={(e) => { e.stopPropagation(); speakWord(currentWord.word); }}
          className="mx-auto mb-6 w-14 h-14 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
          title="朗读 (Space)"
        >
          <Volume2 className="w-7 h-7 text-indigo-600" />
        </button>

        {/* Definition (toggle) */}
        <div className={`transition-all duration-300 ${showDefinition ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <p className="text-2xl text-gray-700 mb-3">{currentWord.chinese_definition}</p>
          {currentWord.example_sentence && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
              <p className="text-sm text-gray-600 italic">"{currentWord.example_sentence}"</p>
              {currentWord.example_translation && (
                <p className="text-xs text-gray-400 mt-1">{currentWord.example_translation}</p>
              )}
            </div>
          )}
        </div>

        {/* Hint if hidden */}
        {!showDefinition && (
          <p className="text-sm text-gray-400 mt-2">
            按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> 显示释义
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          上一个
        </button>
        <button
          onClick={() => speakWord(currentWord.word)}
          className="btn-secondary flex items-center gap-1"
          title="Space"
        >
          <Volume2 className="w-4 h-4" />
          朗读
        </button>
        <button
          onClick={next}
          disabled={currentIndex === words.length - 1}
          className="btn-primary flex items-center gap-1 disabled:opacity-30"
        >
          下一个
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">← →</kbd> 切换</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Space</kbd> 发音</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> {showDefinition ? '下一个' : '显示释义'}</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回</span>
      </div>
    </div>
  );
}
