import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useApp } from '../../context/AppContext';
import { speak, setSpeechConfig, getSpeechConfig } from '../../utils/speech';
import { ArrowLeft, Volume2, RotateCcw, Download, Trash2, CalendarDays } from 'lucide-react';

const VOICE_SOURCES = [
  { value: 'local', label: '本地语音', desc: '系统离线发音，最稳' },
  { value: 'youdao', label: '有道词典', desc: '真人发音，需联网' },
  { value: 'baidu', label: '百度翻译', desc: '清晰自然，需联网' },
];

const ACCENTS = [
  { value: 'us', label: '美音' },
  { value: 'uk', label: '英音' },
];

const REST_OPTIONS = [3, 5, 10];
const TARGET_OPTIONS = [30, 45, 60, 90, 120];

export default function Settings() {
  const { settings, update } = useSettings();
  const { showToast } = useApp();
  const [saving, setSaving] = useState(false);

  const persist = useCallback(async (patch) => {
    setSaving(true);
    try {
      await update(patch);
      showToast('设置已保存', 'success');
    } catch (err) {
      showToast('保存失败: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [update, showToast]);

  const previewVoice = useCallback((source, accent) => {
    // 试听时临时切音源，不改全局配置
    const old = getSpeechConfig();
    setSpeechConfig({ source, accent });
    speak('dictionary', { source, accent });
    setSpeechConfig(old);
  }, []);

  const clearCache = () => {
    const keys = ['ielts_mode', 'ielts_touch_override', 'ielts_study_mode_old', 'ielts_draft'];
    for (const k of keys) localStorage.removeItem(k);
    showToast('本地缓存已清除（登录状态保留）', 'info');
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      studyMode: localStorage.getItem('ielts_study_mode') || null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ielts-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('设置已导出', 'success');
  };

  if (!settings) return null;

  const Row = ({ label, desc, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div>
        <div className="text-sm text-gray-700">{label}</div>
        {desc && <div className="text-xs text-gray-400 mt-0.5">{desc}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );

  const Segment = ({ value, options, onSelect }) => (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => { if (value !== o.value) onSelect(o.value); }}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const Toggle = ({ value, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/me" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">设置</h1>
          <p className="text-xs text-gray-400">账号设置云端同步，任何设备生效</p>
        </div>
      </div>

      {/* 读音设置 */}
      <div className="card mb-4 p-0 overflow-hidden">
        <div className="px-5 py-3 bg-indigo-50 text-indigo-700 text-sm font-semibold">
          🔊 读音
        </div>

        <Row label="读音音源" desc="发音引擎，本地最稳，网络音源需联网">
          <Segment
            value={settings.voiceSource}
            options={VOICE_SOURCES.map(s => ({ value: s.value, label: s.label }))}
            onSelect={(v) => persist({ voiceSource: v })}
          />
        </Row>

        <Row label="音色" desc="仅 有道/本地 支持区分美/英音">
          <Segment
            value={settings.voiceAccent}
            options={ACCENTS}
            onSelect={(v) => persist({ voiceAccent: v })}
          />
        </Row>

        <Row label="试听" desc="用当前选择读一个示例词">
          <button
            onClick={() => previewVoice(settings.voiceSource, settings.voiceAccent)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" /> dictionary
          </button>
        </Row>
      </div>

      {/* 学习偏好 */}
      <div className="card mb-4 p-0 overflow-hidden">
        <div className="px-5 py-3 bg-green-50 text-green-700 text-sm font-semibold">
          📚 学习偏好
        </div>

        <Row label="显示音标" desc="背词卡片上是否显示音标">
          <Toggle
            value={settings.showPhonetic}
            onToggle={() => persist({ showPhonetic: !settings.showPhonetic })}
          />
        </Row>

        <Row label="番茄钟休息时长" desc="每批背诵后的休息时间">
          <Segment
            value={settings.restMinutes}
            options={REST_OPTIONS.map(m => ({ value: m, label: `${m}分` }))}
            onSelect={(v) => persist({ restMinutes: v })}
          />
        </Row>

        <Row label="每日目标时长" desc="基础目标，欠债在此之上累加（上限 120 分）">
          <Segment
            value={settings.baseTargetMinutes}
            options={TARGET_OPTIONS.map(m => ({ value: m, label: `${m}分` }))}
            onSelect={(v) => persist({ baseTargetMinutes: v })}
          />
        </Row>
      </div>

      {/* 数据管理 */}
      <div className="card mb-4 p-0 overflow-hidden">
        <div className="px-5 py-3 bg-gray-100 text-gray-700 text-sm font-semibold">
          💾 数据管理
        </div>

        <Row label="训练历史" desc="按日历查看每次训练结算与词级明细">
          <Link
            to="/training-history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" /> 查看
          </Link>
        </Row>

        <Row label="清除本地缓存" desc="清掉界面模式等本地偏好（不影响账号数据）">
          <button
            onClick={clearCache}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> 清除
          </button>
        </Row>

        <Row label="导出设置" desc="备份当前设置到本地 JSON 文件">
          <button
            onClick={exportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
        </Row>

        <Row label="重置为默认" desc="所有设置恢复默认值">
          <button
            onClick={() => persist({
              voiceSource: 'local', voiceAccent: 'us', showPhonetic: true,
              restMinutes: 5, baseTargetMinutes: 60,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
        </Row>
      </div>

      {saving && <p className="text-center text-xs text-gray-400 mb-4">保存中...</p>}

      <p className="text-center text-xs text-gray-400 mt-4">
        设置保存后立即生效 · 读音音源在朗读按钮/空格键时使用
      </p>
    </div>
  );
}
