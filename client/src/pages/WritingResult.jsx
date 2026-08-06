import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import Loading from '../components/Loading';
import { ArrowLeft, RotateCcw, Check, X, Lightbulb } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from 'recharts';

const criteriaLabels = {
  task_achievement: '任务完成度',
  coherence_cohesion: '连贯与衔接',
  lexical_resource: '词汇资源',
  grammatical_range: '语法范围',
};

export default function WritingResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useKeyboard({
    'Escape': () => navigate('/writing'),
  });

  useEffect(() => {
    api.getEssayResult(id)
      .then((data) => {
        // Parse JSON fields if needed
        const parsed = { ...data };
        if (typeof parsed.scores === 'string') parsed.scores = JSON.parse(parsed.scores);
        if (typeof parsed.feedback === 'string') parsed.feedback = JSON.parse(parsed.feedback);
        if (typeof parsed.corrections === 'string') parsed.corrections = JSON.parse(parsed.corrections);
        setResult(parsed);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading text="加载批改结果..." />;
  if (!result) return <div className="text-center py-20 text-gray-500">结果不存在</div>;

  const scores = result.scores || {};
  const feedback = result.feedback || {};
  const corrections = result.corrections || [];

  const radarData = Object.entries(criteriaLabels).map(([key, label]) => ({
    criterion: label,
    score: scores[key] || 0,
    fullMark: 9,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/writing" className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </div>

      {/* Overall score */}
      <div className="card text-center mb-6">
        <p className="text-sm text-gray-500 mb-2">总评分</p>
        <div className="text-6xl font-bold text-indigo-600 mb-2">{scores.overall || '-'}</div>
        <p className="text-sm text-gray-400">满分 9.0 · 字数 {result.word_count}</p>
      </div>

      {/* Radar chart */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">四项评分</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 9]} tickCount={6} />
              <Radar name="Your Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Individual scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{scores[key] || '-'}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback.strengths && feedback.strengths.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            优点
          </h3>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.weaknesses && feedback.weaknesses.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            需改进
          </h3>
          <ul className="space-y-2">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed comments */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">详细评语</h3>
        {Object.entries(criteriaLabels).map(([key, label]) => {
          const commentKey = `${key}_comment`;
          const comment = feedback[commentKey];
          if (!comment) return null;
          return (
            <div key={key} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
              <h4 className="text-sm font-medium text-gray-700 mb-1">{label}</h4>
              <p className="text-sm text-gray-500">{comment}</p>
            </div>
          );
        })}
      </div>

      {/* Corrections */}
      {corrections.length > 0 && corrections[0].original !== '(Sample correction)' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            逐句修改
          </h3>
          <div className="space-y-3">
            {corrections.map((c, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded shrink-0 mt-0.5">
                    {c.type}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-red-500 line-through">{c.original}</p>
                    <p className="text-sm text-green-600 font-medium">→ {c.correction}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Link to="/writing" className="btn-secondary flex items-center gap-1">
          <RotateCcw className="w-4 h-4" />
          重新练习
        </Link>
        <Link to="/history" className="btn-primary">
          查看历史
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回选题页
      </p>
    </div>
  );
}
