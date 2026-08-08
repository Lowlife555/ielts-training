import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import { ArrowLeft, Play, Clock, Flame, BookOpen, RefreshCw, Target } from 'lucide-react';

export default function TodayBriefing() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDailyPlan()
      .then(setPlan)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startNow = () => navigate('/daily/warmup', { state: { plan } });

  useKeyboard({
    'Enter': () => plan && !plan.allListsDone && startNow(),
    'Escape': () => navigate('/'),
  }, true, [plan]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4 animate-pulse">📅</div>
        <p className="text-gray-500">正在生成今日简报...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-500 mb-4">加载失败: {error}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }

  if (plan.allListsDone) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">24 个 List 已全部完成!</h1>
        <p className="text-gray-500 mb-8">恭喜！你可以去复习错词或做拼写练习巩固。</p>
        <button className="btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const hasDebt = plan.debtMinutes > 0;
  const todayList = plan.todayList;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div className="card animate-fade-in">
        <div className="text-5xl mb-4">📅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">今日简报</h1>

        {/* 目标时长 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
            <Clock className="w-5 h-5" />
            今日目标时长: {plan.targetMinutes} 分钟
            {hasDebt && <span className="text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3" /> 含欠债 {plan.debtMinutes} 分钟
            </span>}
          </div>
          <p className="text-sm text-indigo-600/80">原因: {plan.reason}</p>
        </div>

        {/* 今日内容 */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <div className="font-medium text-gray-900">
                {todayList.isReback ? `优先重背 List ${todayList.listNo}` : `新词 List ${todayList.listNo}`}
                <span className="text-sm text-gray-400 font-normal"> · {todayList.wordCount} 词</span>
              </div>
              <div className="text-xs text-gray-500">英译中主任务 → 错词死磕 → 中译英拼写 → 验收</div>
            </div>
          </div>

          {plan.pendingReviewList && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <RefreshCw className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-800">待重背 List {plan.pendingReviewList}</div>
                <div className="text-xs text-amber-600">上次抽查未达标，优先重背</div>
              </div>
            </div>
          )}

          {plan.spotCheckList && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
              <Target className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <div className="font-medium text-green-800">抽查 List {plan.spotCheckList.listNo}</div>
                <div className="text-xs text-green-600">随机 {plan.spotCheckList.wordCount} 词 · 正确率 ≥ {plan.spotCheckList.passRate}% 算过</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <Play className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <div className="font-medium text-gray-900">PET 热身 {plan.petWarmupCount} 词</div>
              <div className="text-xs text-gray-500">热身不计时不计分，快速进入状态</div>
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/')} className="btn-secondary">
            稍后再说
          </button>
          <button onClick={startNow} className="btn-primary text-lg px-10">
            现在开始 (Enter)
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 现在开始 ·{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 返回
        </p>
      </div>
    </div>
  );
}
