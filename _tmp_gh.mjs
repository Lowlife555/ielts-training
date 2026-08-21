async function get(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
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
  const q = 'https://api.github.com/search/repositories?q=coca+20000+frequency&sort=stars&per_page=8';
  const t = await get(q);
  if (!t) return;
  const j = JSON.parse(t);
  (j.items || []).forEach(r => console.log(`${r.full_name} ★${r.stargazers_count} — ${(r.description || '').slice(0, 80)}`));
})();
