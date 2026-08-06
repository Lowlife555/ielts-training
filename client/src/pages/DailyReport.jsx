import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import Loading from '../components/Loading';
import { Trophy, Target, RotateCcw, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';

export default function DailyReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useKeyboard({
    'Escape': () => navigate('/daily'),
    'Enter': () => navigate('/daily'),
  }, true, [navigate]);

  useEffect(() => {
    if (!sessionId) { navigate('/daily', { replace: true }); return; }
    api.getDailyReport(sessionId)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  if (loading) return <Loading text="生成学习报告..." />;
  if (!report) return <div className="text-center py-20 text-gray-500">报告不存在</div>;

  const { session, summary, consolidationTable } = report;
  const quizAcc = session.quizAccuracy || 0;
  const corrAcc = session.correctionAccuracy;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Trophy className={`w-16 h-16 mx-auto mb-4 ${quizAcc >= 80 ? 'text-yellow-400' : 'text-gray-300'}`} />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">今日学习报告</h1>
        <p className="text-gray-500">{session.date} · {session.wordCount}词 · {session.level === 'pet' ? 'PET基础' : 'IELTS进阶'}</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <BookOpen className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{summary.totalWords}</div>
          <div className="text-xs text-gray-500">学习单词</div>
        </div>
        <div className="card text-center">
          <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{quizAcc}%</div>
          <div className="text-xs text-gray-500">测验正确率</div>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-600">{corrAcc != null ? `${corrAcc}%` : '-'}</div>
          <div className="text-xs text-gray-500">订正正确率</div>
        </div>
        <div className="card text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{summary.needsPractice}</div>
          <div className="text-xs text-gray-500">需巩固单词</div>
        </div>
      </div>

      {/* Consolidation table */}
      {consolidationTable.length > 0 && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            当日巩固表（需重点复习）
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2">单词</th>
                  <th className="pb-2">词性</th>
                  <th className="pb-2">释义</th>
                  <th className="pb-2">错误回答</th>
                  <th className="pb-2">错误次数</th>
                </tr>
              </thead>
              <tbody>
                {consolidationTable.map((w, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{w.word}</td>
                    <td className="py-2 text-gray-500">{w.partOfSpeech}</td>
                    <td className="py-2 text-gray-700">{w.chineseDefinition}</td>
                    <td className="py-2 text-red-500">{w.quizAnswer || '-'}</td>
                    <td className="py-2 text-gray-500">{w.timesIncorrect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full word list */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">完整单词列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2">#</th>
                <th className="pb-2">单词</th>
                <th className="pb-2">释义</th>
                <th className="pb-2">测验</th>
                <th className="pb-2">订正</th>
                <th className="pb-2">正确/错误</th>
              </tr>
            </thead>
            <tbody>
              {report.allWords.map((w, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 font-semibold text-gray-900">{w.word}</td>
                  <td className="py-2 text-gray-600 text-xs">{w.chineseDefinition}</td>
                  <td className="py-2">{w.quizCorrect ? '✅' : <span className="text-red-500" title={w.quizAnswer}>❌</span>}</td>
                  <td className="py-2">{w.correctionCorrect === null ? '-' : w.correctionCorrect ? '✅' : '❌'}</td>
                  <td className="py-2 text-xs">
                    <span className="text-green-600">{w.timesCorrect}</span>/
                    <span className="text-red-500">{w.timesIncorrect}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Link to="/daily" className="btn-secondary flex items-center gap-1">
          <RotateCcw className="w-4 h-4" /> 新一轮训练
        </Link>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        按 <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 或 <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 开始新一轮
      </p>
    </div>
  );
}
