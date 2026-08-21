import fs from 'node:fs';

async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) });
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
  if (!t) { console.log('HF FAIL — 尝试 GitHub'); }
  else {
    fs.writeFileSync('D:\\ielts-training\\_tmp_oxf_raw.md', t, 'utf8');
    console.log('HF OK len:', t.length);
    console.log(t.slice(0, 500));
    return;
  }
  const cands = [
    'https://raw.githubusercontent.com/sarathkumar-g/oxford5000/main/oxford_5000.txt',
    'https://raw.githubusercontent.com/winterdl/oxford-5000-vocabulary-audio-definition/main/oxford5000.txt',
  ];
  for (const u of cands) {
    const x = await get(u);
    if (x) { fs.writeFileSync('D:\\ielts-training\\_tmp_oxf_raw.md', x, 'utf8'); console.log('GH OK', u, 'len:', x.length); console.log(x.slice(0, 500)); return; }
  }
  console.log('ALL FAIL');
})();
