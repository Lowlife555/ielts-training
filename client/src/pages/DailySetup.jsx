import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { ArrowLeft, Zap, Clock, BookOpen } from 'lucide-react';

export default function DailySetup() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [count, setCount] = useState(50);
  const [level, setLevel] = useState('pet');
  const [loading, setLoading] = useState(false);

  useKeyboard({ 'Escape': () => navigate('/') }, true, [navigate]);

  const startSession = async () => {
    setLoading(true);
    try {
      const data = await api.getDailySession(count, level);
      navigate('/daily/flashcards', { state: { session: data } });
    } catch (err) {
      showToast('启动学习失败: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-8">
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      <div className="card text-center">
        <div className="text-5xl mb-4">📅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">每日单词训练</h1>
        <p className="text-gray-500 mb-8">单词卡学习 → 测验 → 订正 → 生成巩固表</p>

        {/* Level selection */}
        <div className="max-w-sm mx-auto space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-2">词汇级别</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLevel('pet')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  level === 'pet'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">PET 基础</div>
                <div className="text-xs text-gray-500 mt-1">约2000词 · 基础词汇</div>
                <div className="text-xs text-green-600 mt-1">完整英中释义</div>
              </button>
              <button
                onClick={() => setLevel('ielts')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  level === 'ielts'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">IELTS 进阶</div>
                <div className="text-xs text-gray-500 mt-1">约2200词 · 雅思高频</div>
                <div className="text-xs text-indigo-600 mt-1">真题词汇</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-2">每日单词数量</label>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setCount(50)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  count === 50
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-1" /> 50词
              </button>
              <button
                onClick={() => setCount(100)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  count === 100
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <BookOpen className="w-4 h-4 inline mr-1" /> 100词
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              {count === 50 ? '预计用时：学习5分钟 + 测验3分钟' : '预计用时：学习10分钟 + 测验5分钟'}
            </p>
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={loading}
          className="btn-primary text-lg px-10 py-3 disabled:opacity-50"
        >
          {loading ? '准备中...' : `开始今日训练 (${count}词)`}
        </button>
      </div>
    </div>
  );
}
