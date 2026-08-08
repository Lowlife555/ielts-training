import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Loading from '../../components/ui/Loading';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react';

export default function Lists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useKeyboard({
    'Escape': () => window.history.back(),
  });

  useEffect(() => {
    api.getLists()
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载 List..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/words" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 IELTS List 背诵</h1>
          <p className="text-gray-500">按 List 1-24 背诵完整释义 · 背诵完点「开始测试」进行中文默写</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <Link
            key={list.listNo}
            to={`/lists/${list.listNo}`}
            className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">List {list.listNo}</h3>
                <p className="text-sm text-gray-500">{list.wordCount} 个单词</p>
              </div>
              <BookOpen className="w-6 h-6 text-indigo-500" />
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${list.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>已掌握 {list.masteredCount}</span>
              <span className="flex items-center gap-1 text-indigo-500 font-medium">
                <TrendingUp className="w-3 h-3" />
                {list.progress}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
