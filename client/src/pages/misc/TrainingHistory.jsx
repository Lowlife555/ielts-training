import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import SummaryModal from '../../components/training/SummaryModal';
import { formatDuration } from '../../hooks/useTimer';
import { ArrowLeft, CalendarDays, Clock, Target, Sparkles, BookOpen, FlaskConical, TrendingDown, TrendingUp } from 'lucide-react';

/**
 * V7.4.0: 训练历史记录页（日历样式 + 每日日程 + 学习痕迹 + AI 学习报告）
 * - 顶部：今日学习报告（DeepSeek 分析薄弱项/进步项）
 * - 按日期分组：正式结算 + 当日痕迹（翻卡/自测）
 * - 痕迹与正式成绩分离：痕迹"看得到"，正确率只算正式环节
 */
export default function TrainingHistory() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [dateTraces, setDateTraces] = useState({});

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.getTrainingSummaries({ limit: 100 })
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setLoading(false));

    // 今日学习报告（含 AI 分析）
    api.getTraceReport({ date: today })
      .then(setReport)
      .catch(() => {})
      .finally(() => setReportLoading(false));
  }, [today]);

  // 按日期分组
  const byDate = {};
  for (const s of summaries) {
    const d = (s.createdAt || '').slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const openSummary = useCallback((s) => setSelectedSummary(s), []);

  const toggleDate = useCallback((date) => {
    setSelectedDate(prev => {
      const next = prev === date ? null : date;
      if (next && !dateTraces[date]) {
        api.getTraceToday({ date })
          .then(trace => setDateTraces(p => ({ ...p, [date]: trace })))
          .catch(() => {});
      }
      return next;
    });
  }, [dateTraces]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4 animate-pulse">📅</div>
        <p className="text-gray-500">加载训练历史...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">训练历史</h1>
          <p className="text-xs text-gray-400">共 {summaries.length} 次训练记录</p>
        </div>
      </div>

      {/* 今日学习报告（含 AI 分析） */}
      {report && report.ai && (
        <div className="card mb-6 border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">今日学习报告 · {report.summary.date}</h2>
          </div>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{report.ai.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="bg-red-50/70 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs font-semibold text-red-600 mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> 薄弱项
              </div>
              <ul className="text-xs text-gray-700 space-y-1">
                {report.ai.weaknesses.map((w, i) => <li key={i}>· {w}</li>)}
              </ul>
            </div>
            <div className="bg-green-50/70 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> 进步项
              </div>
              <ul className="text-xs text-gray-700 space-y-1">
                {report.ai.strengths.map((w, i) => <li key={i}>· {w}</li>)}
              </ul>
            </div>
          </div>

          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
            💡 {report.ai.advice}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> 翻卡 {report.summary.flipCount} 词</span>
            <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> 自测 {report.summary.selftestCount} 词（对 {report.summary.selftestCorrect} 错 {report.summary.selftestWrong}）</span>
            {report.summary.mainAccuracy !== null && <span>默写 {report.summary.mainAccuracy}%</span>}
            {report.summary.spellingAccuracy !== null && <span>拼写 {report.summary.spellingAccuracy}%</span>}
          </div>
        </div>
      )}

      {dates.length === 0 && (
        <div className="card text-center py-16">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无训练记录</p>
          <p className="text-xs text-gray-400 mt-1">完成一次训练后，这里会展示结算明细</p>
        </div>
      )}

      {/* 日历样式：日期卡片 + 当日日程 + 痕迹 */}
      <div className="space-y-4">
        {dates.map(date => (
          <div key={date} className={`card p-0 overflow-hidden ${selectedDate === date ? 'ring-2 ring-indigo-200' : ''}`}>
            <button
              onClick={() => toggleDate(date)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                {date}
              </span>
              <span className="text-xs text-gray-500">{byDate[date].length} 次训练</span>
            </button>

            {selectedDate === date && (
              <div className="divide-y divide-gray-100">
                {/* 当日学习痕迹（翻卡/自测） */}
                {dateTraces[date] && (dateTraces[date].flipCount > 0 || dateTraces[date].selftestCount > 0) && (
                  <div className="px-5 py-3 bg-amber-50/50 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" /> 翻卡 {dateTraces[date].flipCount} 词
                    </span>
                    <span className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                      自测 {dateTraces[date].selftestCount} 词（对 {dateTraces[date].selftestCorrect} 错 {dateTraces[date].selftestWrong}）
                    </span>
                  </div>
                )}

                {byDate[date].map(s => (
                  <button
                    key={s.id}
                    onClick={() => openSummary(s)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-indigo-50/50 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {s.completed ? '✅ 完成' : '📌 未达标'}
                        {s.listNo ? ` · List ${s.listNo}` : ''}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.createdAt?.slice(11, 16)} · {formatDuration(s.durationSeconds || 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        默写 {s.mainAccuracy !== null && s.mainAccuracy !== undefined ? `${s.mainAccuracy}%` : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        拼写 {s.spellingAccuracy !== null && s.spellingAccuracy !== undefined ? `${s.spellingAccuracy}%` : '—'}
                      </span>
                      <span className="text-indigo-600">查看明细 ›</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSummary && (
        <SummaryModal summary={selectedSummary} onClose={() => setSelectedSummary(null)} />
      )}
    </div>
  );
}
