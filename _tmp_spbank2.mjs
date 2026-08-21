import fs from 'node:fs';

const REQ = 'https://api.github.com/repos/prantomollick/IELTS-Listening-Spelling-Bank';

async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return await r.text();
      console.log('status', r.status, 'for', url);
      return null;
    } catch (e) {
      console.log(`retry ${i + 1} for ${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  return null;
}

(async () => {
  const tree = await get(REQ + '/git/trees/main?recursive=1');
  if (!tree) { console.log('TREE FAIL'); return; }
  const j = JSON.parse(tree);
  const files = (j.tree || []).map(f => f.path);
  console.log('=== all files ===');
  files.forEach(f => console.log(f));
  fs.writeFileSync('D:\\ielts-training\\_tmp_spbank_files.json', JSON.stringify(files, null, 1), 'utf8');
})();
