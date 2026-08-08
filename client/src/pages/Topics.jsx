import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import Loading from '../components/Loading';
import { useKeyboard } from '../hooks/useKeyboard';
import { BookOpen, TrendingUp } from 'lucide-react';

const topicIcons = {
  education: '🎓', environment: '🌍', technology: '💻', society: '👥',
  health: '🏥', economy: '💰', culture: '🎨', science: '🔬',
};

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useKeyboard({
    'Escape': () => window.history.back(),
  });

  useEffect(() => {
    api.getTopics().then(setTopics).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载话题..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📖 单词背诵</h1>
        <p className="text-gray-500">按话题分类学习 IELTS 核心词汇</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <Link
            key={topic.topic}
            to={`/words/${topic.topic}`}
            className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="text-4xl mb-3">{topicIcons[topic.topic] || '📚'}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{topic.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{topic.wordCount} 个单词</p>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${topic.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>已掌握 {topic.masteredCount}</span>
              <span className="flex items-center gap-1 text-indigo-500 font-medium">
                <TrendingUp className="w-3 h-3" />
                {topic.progress}%
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/spelling-test" className="btn-primary">✍️ 开始拼写测试</Link>
        <Link to="/review-words" className="btn-secondary">🔄 今日复习</Link>
        <Link to="/wrong-words" className="btn-secondary">📝 错词本</Link>
      </div>
    </div>
  );
}
