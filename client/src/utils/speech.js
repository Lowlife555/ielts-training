/**
 * Speak a word using the Web Speech API.
 * Includes Chrome bug workaround: cancel() + setTimeout to avoid stuck state.
 *
 * @param {string} text - The text to speak
 * @param {Object} options
 * @param {string} options.lang - Language code (default 'en-US')
 * @param {number} options.rate - Speech rate (default 0.75)
 */
export function speak(text, options = {}) {
  const { lang = 'en-US', rate = 0.75 } = options;

  // Chrome bug workaround: if speaking or pending, cancel and wait
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }

  // Give the cancel a microtask to yield the event loop
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('Speech synthesis error:', e.error);
    };
    window.speechSynthesis.speak(utterance);
  }, 50);
}

export default speak;
