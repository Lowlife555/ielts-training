import { useEffect, useState } from 'react';
import { X, Clock, Target, CheckCircle, XCircle } from 'lucide-react';
import { formatDuration } from '../../hooks/useTimer';

/**
 * V7.3.1: 训练结算弹窗
 * 展示本次训练的词级明细（每个词错了几遍）+ 时长 + 各环节正确率。
 * 可关闭，数据来自 training_summaries（关闭后可再次打开）。
 */
export default function SummaryModal({ summary, onClose }) {
  const [wordStats, setWordStats] = useState([]);

  useEffect(() => {
    if (summary?.wordStats) setWordStats(summary.wordStats);
  }, [summary]);

  if (!summary) return null;

  const totalErrors = wordStats.reduce((acc, w) => acc + (w.errors || 0), 0);
  const stats = [
    { label: '用时', value: formatDuration(summary.durationSeconds || 0), icon: Clock },
    { label: '中文默写', value: summary.mainAccuracy !== null && summary.mainAccuracy !== undefined ? `${summary.mainAccuracy}%` : '—' },
    { label: '拼写', value: summary.spellingAccuracy !== null && summary.spellingAccuracy !== undefined ? `${summary.spellingAccuracy}%` : '—' },
    { label: '验收', value: summary.acceptanceAccuracy !== null && summary.acceptanceAccuracy !== undefined ? `${summary.acceptanceAccuracy}%` : '—' },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 animate-fade-in p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-indigo-600 text-white shrink-0">
          <div>
            <div className="font-bold text-lg">
              {summary.completed ? '🎉 训练结算' : '📌 训练结算'}
            </div>
            <div className="text-xs text-white/70">
              {summary.listNo ? `List ${summary.listNo}` : '本次训练'} · {summary.createdAt?.slice(0, 10) || ''}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 汇总 */}
        <div className="grid grid-cols-4 gap-2 px-5 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 词级明细 */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">单词明细（{wordStats.length} 词）</h3>
            <span className="text-xs text-gray-400">共错 {totalErrors} 次</span>
          </div>
          <div className="space-y-1.5">
            {wordStats.map((w, idx) => {
              const wrong = (w.errors || 0) > 0;
              return (
                <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${wrong ? 'bg-red-50' : 'bg-green-50/60'}`}>
                  <span className={`font-medium ${wrong ? 'text-red-700' : 'text-green-700'}`}>
                    {wrong ? <XCircle className="w-4 h-4 inline mr-1" /> : <CheckCircle className="w-4 h-4 inline mr-1" />}
                    {w.word}
                  </span>
                  <span className={`text-xs ${wrong ? 'text-red-500' : 'text-green-600'}`}>
                    {wrong ? `错 ${w.errors} 次` : '全对'}
                  </span>
                </div>
              );
            })}
            {wordStats.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">暂无词级数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
