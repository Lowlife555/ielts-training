import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import { speak as speakUtil } from '../utils/speech';
import Loading from '../components/Loading';
import { ArrowLeft, Volume2, BookOpen, AlertCircle } from 'lucide-react';

export default function WrongWords() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useKeyboard({
    'Escape': () => navigate(-1),
    'ArrowRight': () => setCurrentIndex(i => Math.min(i + 1, words.length - 1)),
    'ArrowLeft': () => setCurrentIndex(i => Math.max(i - 1, 0)),
    ' ': (e) => {
      e.preventDefault();
      if (words[currentIndex]) {
        speakUtil(words[currentIndex].word);
      }
    },
  }, true, [words, currentIndex]);

  useEffect(() => {
    api.getWrongWords()
      .then((data) => setWords(data.words))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载错词本..." />;

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">太棒了！</h2>
        <p className="text-gray-500 mb-6">你没有错词记录，继续保持！</p>
        <Link to="/spelling-test" className="btn-primary">去拼写测试</Link>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/words" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            错词本
          </h1>
          <p className="text-sm text-gray-500">{words.length} 个需要复习的单词</p>
        </div>
      </div>

      {/* Word card */}
      {currentWord && (
        <div className="card text-center py-10">
          <div className="mb-2">
            <span className="text-4xl font-bold text-gray-900">{currentWord.word}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-lg text-gray-400">{currentWord.phonetic}</span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-sm rounded">{currentWord.part_of_speech}</span>
          </div>
          <button
            onClick={() => speakUtil(currentWord.word)}
            className="mx-auto mb-6 w-14 h-14 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
          >
            <Volume2 className="w-7 h-7 text-indigo-600" />
          </button>
          <p className="text-2xl text-gray-700 mb-3">{currentWord.chinese_definition}</p>
          {currentWord.example_sentence && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600 italic">"{currentWord.example_sentence}"</p>
              <p className="text-xs text-gray-400 mt-1">{currentWord.example_translation}</p>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-400">
            拼错 <span className="font-semibold text-red-500">{currentWord.incorrect_count}</span> 次
            · 正确 <span className="font-semibold text-green-500">{currentWord.correct_count}</span> 次
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
          disabled={currentIndex === 0}
          className="btn-secondary disabled:opacity-30"
        >
          ← 上一个
        </button>
        <span className="text-sm text-gray-400 py-2">{currentIndex + 1} / {words.length}</span>
        <button
          onClick={() => setCurrentIndex(i => Math.min(i + 1, words.length - 1))}
          disabled={currentIndex === words.length - 1}
          className="btn-primary disabled:opacity-30"
        >
          下一个 →
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">← →</kbd> 切换
        · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Space</kbd> 发音
        · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回
      </p>
    </div>
  );
}
