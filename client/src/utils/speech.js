/**
 * Speak text using Web Speech API.
 *
 * For China users: always prefers LOCAL Microsoft voices (offline).
 * Google voices require internet access to Google servers, which are blocked in CN.
 *
 * KEY RULE: speak() must be called synchronously within a user gesture.
 * No setTimeout, no await — Chrome silently rejects deferred speech.
 */

function pickVoice() {
  const all = window.speechSynthesis?.getVoices() || [];

  // Filter to local (offline) voices only
  const localVoices = all.filter(v => v.localService === true);

  // Priority: any local English voice
  const priority = [
    // US English (local)
    (v) => v.lang === 'en-US',
    // British English (local) — very common in China Windows installs
    (v) => v.lang === 'en-GB',
    // Any local English
    (v) => v.lang.startsWith('en'),
    // Any local voice at all (fallback)
    () => true,
  ];

  for (const fn of priority) {
    const match = localVoices.find(fn);
    if (match) return match;
  }

  // Last resort: any voice including remote
  return all[0] || null;
}

export function speak(text, options = {}) {
  const { rate = 0.8 } = options;

  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

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
