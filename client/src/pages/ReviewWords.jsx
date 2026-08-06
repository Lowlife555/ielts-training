import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import { useApp } from '../context/AppContext';
import { speak as speakUtil } from '../utils/speech';
import Loading from '../components/Loading';
import { ArrowLeft, Volume2 } from 'lucide-react';

const qualityLabels = [
  { value: 0, label: '完全忘记', color: '#ef4444' },    // red-500
  { value: 1, label: '有印象但不记得', color: '#f97316' }, // orange-500
  { value: 2, label: '记得一点', color: '#eab308' },      // yellow-500
  { value: 3, label: '基本记得', color: '#84cc16' },       // lime-500
  { value: 4, label: '记得很清楚', color: '#22c55e' },     // green-500
  { value: 5, label: '完全掌握', color: '#10b981' },        // emerald-500
];

export default function ReviewWords() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);

  const speakWord = useCallback((word) => {
    speakUtil(word);
  }, []);

  useEffect(() => {
    api.getReviewWords()
      .then((data) => setWords(data.words))
      .finally(() => setLoading(false));
  }, []);

  const handleQuality = async (quality) => {
    const word = words[currentIndex];
    try {
      await api.submitReviewResult({ wordId: word.id, quality });
    } catch (err) {
      console.warn('Failed to save review result:', err.message);
      showToast('保存复习结果失败，请检查网络连接', 'error');
    }

    if (currentIndex + 1 >= words.length) {
      setFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  useKeyboard({
    'Enter': () => {
      if (finished) {
        navigate('/words');
        return;
      }
      if (!showAnswer) {
        setShowAnswer(true);
      }
    },
    'Escape': () => {
      if (finished) {
        navigate('/words');
      } else {
        navigate(-1);
      }
    },
    ' ': (e) => {
      if (!finished && words[currentIndex]) {
        e.preventDefault();
        speakWord(words[currentIndex].word);
      }
    },
    '1': () => !finished && showAnswer && handleQuality(0),
    '2': () => !finished && showAnswer && handleQuality(1),
    '3': () => !finished && showAnswer && handleQuality(2),
    '4': () => !finished && showAnswer && handleQuality(3),
    '5': () => !finished && showAnswer && handleQuality(4),
    '6': () => !finished && showAnswer && handleQuality(5),
  }, true, [finished, showAnswer, currentIndex, words, navigate, speakWord, handleQuality]);

  if (loading) return <Loading text="加载复习计划..." />;

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">今天没有需要复习的单词</h2>
        <p className="text-gray-500 mb-6">你的间隔复习计划是最新的！</p>
        <Link to="/words" className="btn-primary">去学习新单词</Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">复习完成！</h2>
        <p className="text-gray-500 mb-6">今天复习了 {words.length} 个单词</p>
        <div className="flex gap-3 justify-center">
          <Link to="/words" className="btn-primary">去学习新单词</Link>
          <Link to="/wrong-words" className="btn-secondary">查看错词本</Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 或 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回
        </p>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/words" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">🔄 间隔复习</h1>
          <p className="text-sm text-gray-500">{currentIndex + 1} / {words.length}</p>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
      </div>

      <div className="card text-center py-10">
        <button
          onClick={() => speakWord(currentWord.word)}
          className="mx-auto mb-6 w-16 h-16 bg-indigo-50 hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors"
        >
          <Volume2 className="w-8 h-8 text-indigo-600" />
        </button>

        {!showAnswer ? (
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{currentWord.word}</p>
            <p className="text-gray-400 mb-4">{currentWord.phonetic}</p>
            <p className="text-sm text-gray-500">
              你还记得这个词的意思吗？按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> 查看答案
            </p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{currentWord.word}</p>
            <p className="text-gray-400 mb-2">{currentWord.phonetic}</p>
            <p className="text-2xl text-gray-700 mb-4">{currentWord.chinese_definition}</p>
            {currentWord.example_sentence && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 italic">"{currentWord.example_sentence}"</p>
                <p className="text-xs text-gray-400 mt-1">{currentWord.example_translation}</p>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-3">你的记忆程度？</p>
            <div className="flex flex-wrap justify-center gap-2">
              {qualityLabels.map((q) => (
                <button
                  key={q.value}
                  onClick={() => handleQuality(q.value)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: q.color }}
                >
                  <span className="block text-lg">{q.value}</span>
                  {q.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">1-6</kbd> 快速选择
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
