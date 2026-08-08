import { useNavigate, useLocation } from 'react-router-dom';
import { formatDuration } from '../../hooks/useTimer';
import { Home, Clock, Target, Sparkles, RefreshCw } from 'lucide-react';

export default function DailyReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const report = location.state?.report;
  const plan = location.state?.plan;
  const passed = location.state?.passed;

  if (!report) return null;

  const stats = [
    {
      label: '中文默写',
      value: report.dictationAccuracy !== null && report.dictationAccuracy !== undefined ? `${report.dictationAccuracy}%` : '—',
      desc: '番茄钟批次关键词判分',
    },
    {
      label: '拼写抽查',
      value: report.spellingAccuracy !== null ? `${report.spellingAccuracy}%` : '—',
      desc: report.completed ? '今天背过的词随机30 ≥80% 通过' : '未达标，待重背',
    },
    {
      label: '间隔抽查',
      value: report.spotCheckAccuracy !== null && report.spotCheckAccuracy !== undefined ? `${report.spotCheckAccuracy}%` : '—',
      desc: report.spotCheckAccuracy !== null && report.spotCheckAccuracy !== undefined ? '背完3天后抽查' : '今日无',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <div className="card animate-fade-in">
        <div className="text-6xl mb-4">{passed === false ? '📌' : '🎉'}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {passed === false ? '今日训练未达标' : '今日任务完成!'}
        </h1>
        <p className="text-gray-500 mb-8">
          {passed === false ? (
            <span className="text-amber-600">List {plan?.todayList?.listNo} 拼写抽查未达 80%，已标记待重背</span>
          ) : (
            <>List {plan?.todayList?.listNo} 已完成，明天见！</>
          )}
        </p>

        {/* 时长与目标 */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div className="text-left">
              <div className="text-xl font-bold">{formatDuration(report.durationSeconds)}</div>
              <div className="text-xs text-gray-400">本次训练用时</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Target className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="text-xl font-bold">{plan?.targetMinutes ?? 60} 分钟</div>
              <div className="text-xs text-gray-400">今日目标</div>
            </div>
          </div>
        </div>

        {/* 三项正确率 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-indigo-600">{s.value}</div>
              <div className="text-sm text-gray-600 mt-1">{s.label}</div>
              <div className="text-xs text-gray-400 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* 待重背提示 */}
        {passed === false && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm mb-8">
            <RefreshCw className="w-4 h-4" />
            次日简报将优先安排重背该 List
          </div>
        )}

        {/* 结清提示 */}
        {plan?.targetMinutes >= 120 && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            今日为 2 小时上限目标，练满即视为欠债结清
          </div>
        )}

        <button onClick={() => navigate('/')} className="btn-primary px-10">
          <Home className="w-4 h-4 inline mr-1" /> 返回首页
        </button>
      </div>
    </div>
  );
}
