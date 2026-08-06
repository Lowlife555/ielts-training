import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import Loading from '../components/Loading';
import { ArrowLeft, FileText, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function History() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useKeyboard({
    'Escape': () => navigate(-1),
  });

  useEffect(() => {
    api.getEssayHistory()
      .then((data) => setSubmissions(data.submissions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="加载记录..." />;

  // Prepare chart data (reverse to show chronological order)
  const chartData = [...submissions]
    .reverse()
    .map((s, idx) => {
      let scores = null;
      try { scores = typeof s.scores_json === 'string' ? JSON.parse(s.scores_json) : s.scores_json; } catch {}
      return {
        name: `#${idx + 1}`,
        overall: scores?.overall || 0,
        task: scores?.task_achievement || 0,
        coherence: scores?.coherence_cohesion || 0,
        lexical: scores?.lexical_resource || 0,
        grammar: scores?.grammatical_range || 0,
      };
    });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            学习记录
          </h1>
          <p className="text-sm text-gray-500">写作历史与分数趋势</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">还没有提交过作文</p>
          <Link to="/writing" className="btn-primary">去练习写作</Link>
        </div>
      ) : (
        <>
          {/* Score trend chart */}
          {chartData.length > 1 && (
            <div className="card mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">分数趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="overall" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Submission list */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">提交记录</h3>
            {submissions.map((s) => {
              let scores = null;
              try { scores = typeof s.scores_json === 'string' ? JSON.parse(s.scores_json) : s.scores_json; } catch {}

              return (
                <Link
                  key={s.id}
                  to={`/writing/result/${s.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.task_type === 'task1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {s.task_type === 'task1' ? 'Task 1' : 'Task 2'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.grading_status === 'completed' ? 'bg-green-100 text-green-700' :
                        s.grading_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.grading_status === 'completed' ? '已批改' :
                         s.grading_status === 'processing' ? '批改中' : '批改失败'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1 group-hover:text-gray-900">
                      {s.question_text}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {s.submitted_at}
                      </span>
                      <span>{s.word_count} 字</span>
                    </div>
                  </div>
                  {scores?.overall && (
                    <div className="ml-4 text-center">
                      <div className="text-3xl font-bold text-indigo-600">{scores.overall}</div>
                      <div className="text-xs text-gray-400">总分</div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
