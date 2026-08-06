import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import Loading from '../components/Loading';
import { ArrowLeft, Star, FileText, Filter } from 'lucide-react';

const chartTypeNames = {
  bar: '柱状图', line: '折线图', pie: '饼图', table: '表格',
  process: '流程图', map: '地图',
};

const questionTypeNames = {
  opinion: '观点类', discussion: '讨论类', problem_solution: '问题解决',
  advantages_disadvantages: '利弊分析', two_part: '双问题',
};

export default function WritingQuestions() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | task1 | task2

  useKeyboard({
    'Escape': () => navigate(-1),
  });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter !== 'all') params.task_type = filter;

    api.getWritingQuestions(params)
      .then((data) => setQuestions(data.questions))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📝 写作训练</h1>
          <p className="text-sm text-gray-500">剑桥雅思真题 Task 1 & Task 2</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: '全部' },
          { key: 'task1', label: '📊 Task 1 (图表)' },
          { key: 'task2', label: '📝 Task 2 (议论文)' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Link
              key={q.id}
              to={`/writing/${q.id}`}
              className="card block hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      q.task_type === 'task1'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {q.task_type === 'task1' ? 'Task 1' : 'Task 2'}
                    </span>
                    {q.chart_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {chartTypeNames[q.chart_type] || q.chart_type}
                      </span>
                    )}
                    {q.question_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {questionTypeNames[q.question_type] || q.question_type}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: q.difficulty }, (_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900 transition-colors">
                    {q.question_text}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {q.source} · {q.word_limit_min}字以上
                  </p>
                </div>
                <FileText className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
