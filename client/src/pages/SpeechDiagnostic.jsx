import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { speak } from '../utils/speech';
import { Volume2 } from 'lucide-react';

export default function SpeechDiagnostic() {
  const [log, setLog] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  useEffect(() => {
    addLog('Speech诊断页面已加载');

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const local = all.filter(v => v.localService);
      const remote = all.filter(v => !v.localService);
      setVoices(all);

      addLog(`共 ${all.length} 个语音 (本地离线: ${local.length}, 远程Google: ${remote.length})`);
      addLog(`--- 本地离线语音 (应使用这些) ---`);
      local.forEach(v => addLog(`  ✅ ${v.name} | ${v.lang}`));
      addLog(`--- Google远程语音 (中国不可用) ---`);
      remote.forEach(v => addLog(`  ❌ ${v.name} | ${v.lang}`));

      // Determine which voice speech.js will pick
      const enUsLocal = local.find(v => v.lang === 'en-US');
      const enGbLocal = local.find(v => v.lang === 'en-GB');
      const enAnyLocal = local.find(v => v.lang.startsWith('en'));
      const picked = enUsLocal || enGbLocal || enAnyLocal || local[0];
      setSelectedVoice(picked);
      if (picked) {
        addLog(`👉 speak() 将使用: ${picked.name} (${picked.lang}, local=${picked.localService})`, 'success');
      } else {
        addLog(`⚠️ 没有本地语音! 使用: ${all[0]?.name || 'none'}`, 'error');
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const testNow = () => {
    addLog('=== 测试 speak("hello world") ===');
    addLog(`使用语音: ${selectedVoice?.name || 'auto'} (${selectedVoice?.lang || 'auto'})`);

    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
    synth.cancel();

    const u = new SpeechSynthesisUtterance('hello world');
    if (selectedVoice) u.voice = selectedVoice;
    u.lang = selectedVoice?.lang || 'en-US';
    u.rate = 0.8;
    u.onstart = () => addLog('✅✅✅ onstart — 听到声音了吗？', 'success');
    u.onend = () => addLog('✅ onend — 播放完毕', 'success');
    u.onerror = (e) => addLog(`❌ onerror: ${e.error}`, 'error');
    synth.speak(u);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg"><Volume2 className="w-5 h-5 text-gray-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔊 Speech 诊断工具</h1>
          <p className="text-sm text-gray-500">测试本地 Microsoft 离线语音</p>
        </div>
      </div>

      {/* Selected voice */}
      <div className="card mb-4 bg-green-50 border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-1">当前选中的语音</h3>
        <p className="text-xl font-bold text-green-700">
          {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : '无'}
        </p>
        <p className="text-xs text-green-600 mt-1">
          {selectedVoice?.localService
            ? '✅ 本地离线语音 — 中国可用，无需VPN'
            : '⚠️ 远程语音 — 可能需要VPN'}
        </p>
      </div>

      {/* Voice list */}
      <div className="card mb-4">
        <h3 className="text-lg font-semibold mb-2">本地离线语音</h3>
        <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
          {voices.filter(v => v.localService).map((v, i) => (
            <div key={i} className="text-green-700">✅ {v.name} — {v.lang}</div>
          ))}
        </div>
      </div>

      {/* Test button */}
      <div className="card mb-4 text-center">
        <button onClick={testNow} className="btn-primary text-lg px-8 py-4 mb-3">
          🔊 测试发音 "hello world"
        </button>
        <p className="text-xs text-gray-400">使用 {selectedVoice?.name || 'auto'} 语音</p>
      </div>

      {/* Log */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">诊断日志</h3>
        <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-gray-600 mb-2">清空</button>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs space-y-0.5">
          {log.map((entry, i) => (
            <div key={i} className={
              entry.type === 'success' ? 'text-green-400 font-bold' :
              entry.type === 'error' ? 'text-red-400' :
              'text-gray-300'
            }>
              <span className="text-gray-500">[{entry.time}]</span> {entry.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
