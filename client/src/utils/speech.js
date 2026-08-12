/**
 * 多音源朗读工具
 * 音源: local(Web Speech 本地) / youdao(有道词典) / baidu(百度翻译)
 * 设置由 SettingsContext 调用 setSpeechConfig 注入。
 *
 * KEY RULE: 本地语音 speak() 必须同步调用（用户手势内），
 * 网络音源(有道/百度)用 <audio> 播放 MP3，无此限制。
 */

let config = {
  source: 'local', // 'local' | 'youdao' | 'baidu'
  accent: 'us',    // 'us' | 'uk'（有道 type=1/2；本地语音 en-US/en-GB）
  rate: 0.8,       // 仅本地语音使用
};

export function setSpeechConfig(cfg) {
  config = { ...config, ...cfg };
}

export function getSpeechConfig() {
  return { ...config };
}

/** 有道词典音频 URL（免 key，type=1 美音 / type=2 英音） */
export function youdaoAudioUrl(word, accent = config.accent) {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${accent === 'uk' ? 2 : 1}`;
}

/** 百度翻译 TTS URL（免 key） */
export function baiduAudioUrl(word) {
  return `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=3&source=web`;
}

let audioEl = null;
function playUrl(url, onerror) {
  if (typeof window === 'undefined') return;
  try {
    if (!audioEl) audioEl = new Audio();
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.src = url;
    audioEl.onerror = () => { onerror && onerror(); };
    audioEl.play().catch(() => { onerror && onerror(); });
  } catch (e) {
    console.warn('Audio play failed:', e.message);
  }
}

function pickVoice() {
  const all = window.speechSynthesis?.getVoices() || [];

  // Filter to local (offline) voices only
  const localVoices = all.filter(v => v.localService === true);

  const wantLang = config.accent === 'uk' ? 'en-GB' : 'en-US';

  // Priority: preferred accent → any local English → any local → any
  const priority = [
    (v) => v.lang === wantLang,
    (v) => v.lang.startsWith('en'),
    () => true,
  ];

  for (const fn of priority) {
    const match = localVoices.find(fn);
    if (match) return match;
  }

  return all[0] || null;
}

/**
 * 朗读指定文本。
 * @param {string} text 要朗读的英文文本
 * @param {object} options { source?, accent?, rate? } — 缺省用全局 config
 */
export function speak(text, options = {}) {
  const src = options.source || config.source;
  const accent = options.accent || config.accent;

  if (!text || typeof window === 'undefined') return;

  if (src === 'youdao') {
    playUrl(youdaoAudioUrl(text, accent), () => {
      console.warn('Youdao TTS failed, fallback to local voice:', text);
      speakLocal(text, options.rate || config.rate);
    });
    return;
  }

  if (src === 'baidu') {
    playUrl(baiduAudioUrl(text), () => {
      console.warn('Baidu TTS failed, fallback to local voice:', text);
      speakLocal(text, options.rate || config.rate);
    });
    return;
  }

  speakLocal(text, options.rate || config.rate);
}

/** 本地 Web Speech API（离线，Chrome 需同步调用） */
function speakLocal(text, rate = 0.8) {
  if (!window.speechSynthesis) return;

  const synth = window.speechSynthesis;

  // Resume if paused, then cancel any ongoing speech
  if (synth.paused) synth.resume();
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.rate = rate;
  utterance.volume = 1;

  utterance.onerror = (e) => {
    if (e.error === 'canceled' || e.error === 'interrupted') return;
    console.warn('Speech error:', e.error, 'voice:', voice?.name);
  };

  // SYNCHRONOUS call — required by Chrome
  synth.speak(utterance);
}

export default speak;
