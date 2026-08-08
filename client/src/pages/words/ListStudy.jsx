import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import Loading from '../../components/ui/Loading';
import { useKeyboard } from '../../hooks/useKeyboard';
import { speak } from '../../utils/speech';
import { ArrowLeft, Volume2, Eye, EyeOff, Play, ChevronDown, ChevronUp } from 'lucide-react';

export default function ListStudy() {
  const { listNo } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

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

  const toggleAll = () => {
    setShowAll(prev => !prev);
    if (!showAll) {
      setExpanded(new Set(words.map(w => w.id)));
    } else {
      setExpanded(new Set());
    }
  };

  const toggleWord = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
            showAll
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {showAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showAll ? '隐藏全部释义' : '显示全部释义'}
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">List {listNo}</h1>
        <p className="text-sm text-gray-500">
          <span className="kbd-hint">先自行背诵，完毕后点下方「开始测试」进行中文默写</span>
          <span className="touch-hint hidden">先自行背诵，完毕后点「开始测试」</span>
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
        {words.map((word, idx) => {
          const isExpanded = expanded.has(word.id);
          const meaningText = Array.isArray(word.meanings) && word.meanings.length > 0
            ? word.meanings.join('；')
            : word.chineseDefinition;
          return (
            <div
              key={word.id}
              className={`card transition-colors ${word.mastered === 1 ? 'border-green-200' : ''}`}
            >
              <button
                onClick={() => toggleWord(word.id)}
                className="w-full flex items-center justify-between text-left py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm text-gray-400 w-8">{idx + 1}.</span>
                    <span className="text-lg font-semibold text-gray-900">{word.word}</span>
                    <span className="text-sm text-gray-400">{word.phonetic}</span>
                    {word.partOfSpeech && (
                      <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{word.partOfSpeech}</span>
                    )}
                    {word.mastered === 1 && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">已掌握</span>
                    )}
                  </div>
                  {isExpanded ? (
                    <p className="text-sm text-gray-700 ml-8">{meaningText}</p>
                  ) : (
                    <p className="text-sm text-gray-400 ml-8">
                      <span className="kbd-hint">点击查看释义</span>
                      <span className="touch-hint hidden">点按展开释义</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="朗读 (Space)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
            </div>
          );
        })}
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
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回 · 背诵完毕后开始测试
      </p>
    </div>
  );
}
