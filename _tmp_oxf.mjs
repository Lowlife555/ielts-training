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

const candidates = [
  ['https://raw.githubusercontent.com/glutanimate/wordlist-oxford5000/master/Oxford5000.txt', 'oxf5000'],
  ['https://raw.githubusercontent.com/oxfordlearnersdictionaries/wordlists/main/oxford5000.txt', 'oxf5000b'],
  ['https://raw.githubusercontent.com/olegtyshchenko/oxford-word-list/master/oxford-3000.txt', 'oxf3000'],
];

for (const [u, name] of candidates) {
  const t = await get(u);
  if (t && t.length > 1000) {
    fs.writeFileSync(`D:\\ielts-training\\_tmp_${name}.txt`, t, 'utf8');
    const words = t.split('\n').filter(l => l.trim());
    console.log(`OK ${name}: ${u} -> ${words.length} lines`);
  } else {
    console.log(`FAIL ${name}: ${u}`);
  }
}
