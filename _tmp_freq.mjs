import fs from 'node:fs';

async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return await r.text();
      console.log('status', r.status, url);
      return null;
    } catch (e) {
      console.log(`retry ${i + 1} ${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  return null;
}

(async () => {
  // google-10000-english
  const t10 = await get('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt');
  if (t10) {
    fs.writeFileSync('D:\\ielts-training\\_tmp_freq10k.txt', t10, 'utf8');
    console.log('10k saved, words:', t10.split('\n').filter(Boolean).length);
  }
  // 尝试 COCA 20k 类来源: github 上 "wordfreq" 数据 或 coca 20000
  const candidates = [
    ['https://raw.githubusercontent.com/ValiantEagle/WordFrequency/master/word_frequency.csv', 'csv'],
  ];
  for (const [u] of candidates) {
    const t = await get(u);
    if (t) { fs.writeFileSync('D:\\ielts-training\\_tmp_freq_cand.txt', t, 'utf8'); console.log('cand saved:', u, 'len', t.length); break; }
  }
})();
