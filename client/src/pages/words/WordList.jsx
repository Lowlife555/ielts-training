import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import Loading from '../../components/ui/Loading';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ArrowLeft, Volume2, Search } from 'lucide-react';
import { speak as speakUtil } from '../../utils/speech';

const topicNames = {
  education: '教育', environment: '环境', technology: '科技', society: '社会',
  health: '健康', economy: '经济', culture: '文化', science: '科学',
};

export default function WordList() {
  const { topic } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [words, setWords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useKeyboard({
    'Escape': () => window.history.back(),
  });

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (topic) params.topic = topic;
    if (searchQuery) params.search = searchQuery;

    api.getWords(params)
      .then((data) => {
        setWords(data.words);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [topic, page, searchQuery]);

  const speakWord = (word) => {
    speakUtil(word, { rate: 0.8 });
  };

  const title = topic ? `${topicNames[topic] || topic} · 词汇列表` : searchQuery ? `搜索: ${searchQuery}` : '词汇列表';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/words" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {pagination && <p className="text-sm text-gray-500">共 {pagination.total} 个单词</p>}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : words.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">没有找到匹配的单词</p>
        </div>
      ) : (
        <>
          {/* Word list */}
          <div className="space-y-2">
            {words.map((word, idx) => (
              <div key={word.id} className="card flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-400 w-6">{idx + 1 + (page - 1) * 20}.</span>
                    <span className="text-lg font-semibold text-gray-900">{word.word}</span>
                    <span className="text-sm text-gray-400">{word.phonetic}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{word.part_of_speech}</span>
                    {word.mastered === 1 && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">已掌握</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 ml-10">{word.chinese_definition}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => speakWord(word.word)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="朗读 (Space)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="btn-secondary text-sm"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
