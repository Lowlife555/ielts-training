import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import SummaryModal from '../../components/training/SummaryModal';
import { formatDuration } from '../../hooks/useTimer';
import { ArrowLeft, CalendarDays, Clock, Target } from 'lucide-react';

/**
 * V7.3.1: 训练历史记录页（日历样式 + 每日日程）
 * 按日期分组展示每次训练结算，点击某天可看该日全部结算，点结算弹窗查看词级明细。
 */
export default function TrainingHistory() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    api.getTrainingSummaries({ limit: 100 })
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 按日期分组
  const byDate = {};
  for (const s of summaries) {
    const d = (s.createdAt || '').slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const openSummary = useCallback((s) => setSelectedSummary(s), []);

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

      {dates.length === 0 && (
        <div className="card text-center py-16">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无训练记录</p>
          <p className="text-xs text-gray-400 mt-1">完成一次训练后，这里会展示结算明细</p>
        </div>
      )}

      {/* 日历样式：日期卡片 + 当日日程列表 */}
      <div className="space-y-4">
        {dates.map(date => (
          <div key={date} className={`card p-0 overflow-hidden ${selectedDate === date ? 'ring-2 ring-indigo-200' : ''}`}>
            <button
              onClick={() => setSelectedDate(selectedDate === date ? null : date)}
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
