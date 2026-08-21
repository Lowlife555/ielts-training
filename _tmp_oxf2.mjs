import fs from 'node:fs';
import Database from 'better-sqlite3';

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
  const t = await get('https://huggingface.co/spaces/MK-316/oxford5k-audio/raw/main/list.md');
  if (!t) { console.log('FAIL'); return; }
  fs.writeFileSync('D:\\ielts-training\\_tmp_oxf_raw.md', t, 'utf8');
  console.log('len:', t.length);
  console.log(t.slice(0, 800));
})();
