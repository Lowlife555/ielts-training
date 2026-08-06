import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PenLine, BarChart3, TrendingUp, Target, Clock, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import Loading from '../components/Loading';
import { useKeyboard } from '../hooks/useKeyboard';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useKeyboard({
    'Escape': () => window.history.back(),
  });

  useEffect(() => {
    api.getOverview()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载学习数据..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">加载失败: {error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">重试</button>
      </div>
    );
  }

  const statCards = [
    { label: '总词汇量', value: stats?.totalWords || 0, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: '已掌握', value: stats?.masteredWords || 0, icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '今日待复习', value: stats?.todayReviewCount || 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '错词本', value: stats?.wrongWordsCount || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          📚 IELTS 6.5 智能备考
        </h1>
        <p className="text-lg text-gray-500">
          基于艾宾浩斯遗忘曲线 · 雅思真题词汇 · AI写作批改
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {statCards.map((card) => (
          <div key={card.label} className="card text-center">
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mx-auto mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Main modules */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Vocabulary module */}
        <Link to="/words" className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <BookOpen className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">单词背诵</h2>
              <p className="text-sm text-gray-500 mb-4">
                8大话题分类 · 280+高频词汇 · 拼写测试 · 间隔复习
              </p>
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                开始学习 →
              </div>
            </div>
          </div>
        </Link>

        {/* Writing module */}
        <Link to="/writing" className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <PenLine className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">写作训练</h2>
              <p className="text-sm text-gray-500 mb-4">
                剑桥真题Task 1+2 · AI四项评分 · 范文对比 · 逐句修改
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                开始练习 →
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/words" className="btn-secondary text-center text-sm">📖 话题浏览</Link>
        <Link to="/spelling-test" className="btn-secondary text-center text-sm">✍️ 拼写测试</Link>
        <Link to="/wrong-words" className="btn-secondary text-center text-sm">📝 错词复习</Link>
        <Link to="/history" className="btn-secondary text-center text-sm flex items-center justify-center gap-1">
          <BarChart3 className="w-4 h-4" />
          学习记录
        </Link>
      </div>

      {/* Essay score trend */}
      {stats?.totalEssays > 0 && (
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            写作统计
          </h3>
          <p className="text-sm text-gray-500">
            已提交 <span className="font-semibold text-gray-700">{stats.totalEssays}</span> 篇作文
            {stats.averageEssayScore && (
              <> · 平均分 <span className="font-semibold text-indigo-600">{stats.averageEssayScore}</span></>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
