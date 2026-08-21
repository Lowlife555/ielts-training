import fs from 'node:fs';

const RAW = 'https://raw.githubusercontent.com/prantomollick/IELTS-Listening-Spelling-Bank/main/README.md';

async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return await r.text();
      console.log('status', r.status);
      return null;
    } catch (e) {
      console.log(`retry ${i + 1}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  return null;
}

(async () => {
  const text = await get(RAW);
  if (!text) return;
  fs.writeFileSync('D:\\ielts-training\\_tmp_spbank_readme.md', text, 'utf8');
  console.log('len:', text.length);
  console.log(text.slice(0, 3000));
})();
