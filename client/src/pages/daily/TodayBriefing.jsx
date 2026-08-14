import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Play, Clock, Flame, BookOpen, RefreshCw, Target, FlaskConical, ListOrdered, Layers } from 'lucide-react';

const TEST_LIST_COUNT = 24;
const BATCH_OPTIONS = [30, 40, 50, 100];

// 学习模式切换器：顺序模式（自动 List 1→24）/ 自定义模式（固定选某个 List，插队不丢顺序）
function ModeSwitcher({ plan, onSaved }) {
  const { showToast } = useApp();
  const [pick, setPick] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPick(plan?.customListNo || plan?.todayList?.listNo || 1);
  }, [plan]);

  const save = async (mode, listNo) => {
    setSaving(true);
    try {
      await api.setStudySettings({ mode, ...(mode === 'custom' ? { listNo } : {}) });
      showToast(
        mode === 'custom' ? `已切换为自定义模式：List ${listNo}` : '已切换为顺序模式',
        'success'
      );
      onSaved?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const custom = plan?.studyMode === 'custom';

  return (
    <div className="card mb-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ListOrdered className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">学习模式</h2>
        <span className="text-xs text-gray-400 ml-auto">
          顺序进度：{plan?.sequentialProgressList ? `List ${plan.sequentialProgressList} 待学` : '已全部完成'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => save('sequential')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              !custom ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            顺序模式
          </button>
          <button
            onClick={() => save('custom', pick)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              custom ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            自定义模式
          </button>
        </div>

        {custom && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">选择 List</label>
            <select
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              disabled={saving}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Array.from({ length: TEST_LIST_COUNT }, (_, i) => (
                <option key={i + 1} value={i + 1}>List {i + 1}</option>
              ))}
            </select>
            <button
              onClick={() => save('custom', pick)}
              disabled={saving || pick === plan?.customListNo}
              className="btn-primary !px-4 !py-2 text-sm"
            >
              确定
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {custom
          ? '自定义模式：固定学习所选 List（已完成也可选做复习）；切回顺序模式后从原进度继续，不会跳过中间的 List。'
          : '顺序模式：按 List 1 → 24 依次自动推进，抽考未达标会优先重背。'}
      </p>
    </div>
  );
}

export default function TodayBriefing() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testList, setTestList] = useState(1);
  const [testBusy, setTestBusy] = useState(false);
  const [batchSize, setBatchSize] = useState(30);
  const [resumeInfo, setResumeInfo] = useState(null);

  useEffect(() => {
    api.getDailyPlan()
      .then(setPlan)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    // V7.3.1: 断点续训信息
    api.getResumeInfo()
      .then(data => setResumeInfo(data.resume))
      .catch(() => {});
  }, []);

  const reload = () => api.getDailyPlan().then(setPlan);

  // V7.3.1: 继续上次进度（重学当前批 / 从断点续学）
  const continueResume = async (mode) => {
    if (!resumeInfo) return;
    setTestBusy(true);
    try {
      const session = await api.startTraining({ listNo: resumeInfo.listNo, targetMinutes: plan?.targetMinutes || 60, debtMinutes: 0 });
      navigate('/daily/study', {
        state: {
          session, plan,
          resumeFrom: mode === 'continue' ? resumeInfo.completedBatches : 0,
        },
      });
    } catch (err) {
      showToast('续训失败: ' + err.message, 'error');
    } finally {
      setTestBusy(false);
    }
  };

  const startNow = () => navigate('/daily/warmup', { state: { plan, batchSize } });

  // ===== 测试面板（admin_test 专属）：任意 List 任意环节直接进入 =====
  const testSession = async (listNo) => {
    return api.startTraining({ listNo, targetMinutes: 60, debtMinutes: 0 });
  };

  const testEnter = async (stage) => {
    setTestBusy(true);
    try {
      if (stage === 'warmup') {
        navigate('/daily/warmup', { state: { plan, batchSize } });
        return;
      }
      const session = await testSession(testList);
      if (stage === 'main') {
        navigate('/daily/study', { state: { session, plan } });
      } else if (stage === 'spelling') {
        navigate('/daily/spelling', { state: { session, plan, wrongPool: [], mainResults: [] } });
      } else if (stage === 'acceptance') {
        const wrongPool = session.words.slice(0, 3).map(w => ({
          wordId: w.wordId, word: w.word, chineseDefinition: w.chineseDefinition, partOfSpeech: w.partOfSpeech,
        }));
        navigate('/daily/acceptance', { state: { session, plan, wrongPool, mainResults: [] } });
      } else if (stage === 'spotcheck') {
        const { sessionId, startTime, spotCheck } = await api.getTestSpotCheck({ listNo: testList });
        navigate('/daily/spotcheck', {
          state: {
            session: { sessionId, startTime, listNo: testList },
            plan: { ...plan, spotCheckList: spotCheck },
          },
        });
      }
    } catch (err) {
      showToast('测试进入失败: ' + err.message, 'error');
    } finally {
      setTestBusy(false);
    }
  };

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

  if (plan.allListsDone && !user?.isTest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">24 个 List 已全部完成!</h1>
          <p className="text-gray-500 mb-8">恭喜！你可以去复习错词或做拼写练习巩固。</p>
          <button className="btn-primary" onClick={() => navigate('/')}>返回首页</button>
        </div>
        <ModeSwitcher plan={plan} onSaved={reload} />
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

      <ModeSwitcher plan={plan} onSaved={reload} />

      <div className="card animate-fade-in">
        {/* 今日已完成横幅 */}
        {plan.today?.completed && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div className="flex-1">
              <div className="font-bold text-green-700">今日任务已完成</div>
              <div className="text-xs text-green-600">
                今日已训练 {Math.floor((plan.today?.trainedSeconds || 0) / 60)} 分钟
              </div>
            </div>
            <button onClick={() => navigate('/daily/report', { state: { report: { durationSeconds: plan.today?.trainedSeconds || 0, dictationAccuracy: null, spellingAccuracy: null, spotCheckAccuracy: null, completed: true }, plan, passed: true } })} className="btn-primary !py-2 !px-4 text-sm">
              查看结算
            </button>
          </div>
        )}

        {/* 断点续训横幅 */}
        {resumeInfo && !plan.today?.completed && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-3xl">▶️</span>
            <div className="flex-1">
              <div className="font-bold text-indigo-700">上次进度：List {resumeInfo.listNo} 已完成 {resumeInfo.completedBatches} 批</div>
              <div className="text-xs text-indigo-600">可选择从断点继续，或从本批重新开始</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => continueResume('relearn')} disabled={testBusy} className="btn-secondary !py-2 !px-3 text-sm">本批重学</button>
              <button onClick={() => continueResume('continue')} disabled={testBusy} className="btn-primary !py-2 !px-3 text-sm">从断点继续</button>
            </div>
          </div>
        )}

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
          {todayList && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
              <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-medium text-gray-900">
                  {todayList.isReback ? `优先重背 List ${todayList.listNo}` : todayList.isCustom ? `已选 List ${todayList.listNo}` : `新词 List ${todayList.listNo}`}
                  <span className="text-sm text-gray-400 font-normal"> · {todayList.wordCount} 词</span>
                  {todayList.isCustom && (
                    <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">自定义</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">英译中主任务 → 错词死磕 → 中译英拼写 → 验收</div>
              </div>
            </div>
          )}

          {!todayList && user?.isTest && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-indigo-200 bg-indigo-50">
              <FlaskConical className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-medium text-gray-900">测试账号：24 个 List 均已可测</div>
                <div className="text-xs text-gray-500">下方测试面板可选任意 List 直接进入任意环节</div>
              </div>
            </div>
          )}

          {plan.pendingReviewLists && plan.pendingReviewLists.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <RefreshCw className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-800">
                  待重背 List {plan.pendingReviewLists.map(l => l.list_no).join('、')}
                </div>
                <div className="text-xs text-amber-600">
                  {plan.pendingReviewLists.length === 1 ? '上次抽查未达标，优先重背' : `共 ${plan.pendingReviewLists.length} 个 List 未达标`}
                </div>
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

          {/* 背诵词数（番茄钟批次） */}
          <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="font-medium text-gray-900">一口气背诵词数（番茄钟批次）</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BATCH_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setBatchSize(n)}
                  className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    batchSize === n
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {n} 词
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {todayList && batchSize < todayList.wordCount
                ? `共 ${todayList.wordCount} 词，按 ${batchSize} 词一批分 ${Math.ceil(todayList.wordCount / batchSize)} 批背诵，批间休息 5 分钟（可跳过，不计时）`
                : '每批背完后休息 5 分钟（可跳过），不足一批的剩余词作为最后一批'}
            </p>
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
          <span className="kbd-hint">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Enter</kbd> 现在开始 ·{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded">Esc</kbd> 返回
          </span>
          <span className="touch-hint hidden">点「现在开始」进入今日训练</span>
        </p>
      </div>

      {/* 测试面板（仅测试账号可见）：无惩罚机制 + 任意 List/环节直入 */}
      {user?.isTest && (
        <div className="card mt-6 border-dashed border-indigo-300">
          <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1">
            <FlaskConical className="w-5 h-5" />
            测试面板
            <span className="text-xs font-normal bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              无惩罚机制 · 目标恒 60 分钟 · 永不欠债
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">选一个 List，任意环节直接进入（跳过正常串联流程）</p>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600 shrink-0">List</label>
            <select
              value={testList}
              onChange={(e) => setTestList(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Array.from({ length: TEST_LIST_COUNT }, (_, i) => (
                <option key={i + 1} value={i + 1}>List {i + 1}</option>
              ))}
            </select>
            {testBusy && <span className="text-sm text-gray-400">准备中...</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onClick={() => testEnter('warmup')} className="btn-secondary !px-2" disabled={testBusy}>
              🏃 热身
            </button>
            <button onClick={() => testEnter('main')} className="btn-primary !px-2" disabled={testBusy}>
              📖 主任务
            </button>
            <button onClick={() => testEnter('spelling')} className="btn-primary !px-2" disabled={testBusy}>
              ✍️ 拼写
            </button>
            <button onClick={() => testEnter('spotcheck')} className="btn-primary !px-2" disabled={testBusy}>
              🎯 抽查
            </button>
            <button onClick={() => testEnter('acceptance')} className="btn-primary !px-2" disabled={testBusy}>
              ✅ 验收
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
