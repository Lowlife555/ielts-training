import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import Loading from '../../components/ui/Loading';
import FlipCard from '../../components/ui/FlipCard';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ArrowLeft, Eye, EyeOff, Play } from 'lucide-react';

export default function ListStudy() {
  const { listNo } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 默认全部显示释义（正面）；flippedSet = 已翻到背面（隐藏释义）的单词
  const [flippedSet, setFlippedSet] = useState(new Set());
  const [allFlipped, setAllFlipped] = useState(false);

  useKeyboard({
    'Escape': () => navigate(-1),
  });

  useEffect(() => {
    setLoading(true);
    api.getListWords(listNo)
      .then((data) => {
        setWords(data.words);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [listNo]);

  // 全局切换：全部翻到背面(隐藏释义) / 全部翻回正面(显示释义)
  const toggleAll = () => {
    const next = !allFlipped;
    setAllFlipped(next);
    setFlippedSet(next ? new Set(words.map(w => w.id)) : new Set());
  };

  // 单卡翻转：翻过的不再算"全部"
  const toggleWord = (id) => {
    setFlippedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === words.length) setAllFlipped(true);
      else if (next.size < words.length) setAllFlipped(false);
      return next;
    });
  };

  if (loading) return <Loading text="加载 List 单词..." />;
  if (words.length === 0) return <div className="text-center py-20 text-gray-500">该 List 暂无单词</div>;

  const masteredCount = words.filter(w => w.mastered === 1).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/lists" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <span className="text-sm text-gray-400">共 {total} 词 · 已掌握 {masteredCount}</span>
        <button
          onClick={toggleAll}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border-2 transition-colors ${
            allFlipped
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {allFlipped ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {allFlipped ? '显示全部释义' : '隐藏全部释义'}
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">List {listNo}</h1>
        <p className="text-sm text-gray-500">
          <span className="kbd-hint">先看释义回忆单词，点击卡片翻卡核对 · 完毕后点「开始测试」</span>
          <span className="touch-hint hidden">点卡片翻卡核对 · 完毕后点「开始测试」</span>
        </p>
      </div>

      {/* Start test (top) */}
      <button
        onClick={() => navigate(`/lists/${listNo}/test`)}
        className="btn-primary w-full text-lg py-3 mb-6 flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        开始测试
      </button>

      {/* Word list */}
      <div className="space-y-2">
        {words.map((word, idx) => (
          <FlipCard
            key={word.id}
            word={word}
            flipped={flippedSet.has(word.id)}
            onClick={() => toggleWord(word.id)}
            showMarked={(w) => w.mastered === 1 && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">已掌握</span>
            )}
          />
        ))}
      </div>

      {/* Start test (bottom) */}
      <button
        onClick={() => navigate(`/lists/${listNo}/test`)}
        className="btn-primary w-full text-lg py-3 mt-6 flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        开始测试
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回 ·
        <span className="kbd-hint"> 点卡片翻卡 · 显示释义时再点翻回</span>
        <span className="touch-hint hidden"> 点卡片翻卡 · 点喇叭发音</span>
      </p>
    </div>
  );
}
