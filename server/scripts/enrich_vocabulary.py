"""Complete vocabulary enrichment pipeline:
Phase 1: Match 中译英 720 entries to English words via DeepSeek (batch 3 lists/call = 8 calls)
Phase 2: Generate definitions for remaining words via DeepSeek (batch 40 words/call)
Phase 3: Output final word_bank.json for migration script

All DeepSeek API calls have retry logic. Output is idempotent - can resume from checkpoint.
"""
import json
import os
import re
import time
import urllib.request
import urllib.error
from pypdf import PdfReader

BASE = r"C:\Users\15782\Downloads\雅思训练词库"
DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'db')
CHECKPOINT_FILE = os.path.join(DB_DIR, 'enrich_checkpoint.json')
OUTPUT_FILE = os.path.join(DB_DIR, 'word_bank.json')

# Load API key
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path) as f:
    for line in f:
        if line.startswith('DEEPSEEK_API_KEY='):
            API_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

BASE_URL = "https://api.deepseek.com/v1/chat/completions"

def deepseek_call(messages, max_tokens=4000, temperature=0.1, retries=3):
    """Make a DeepSeek API call with retries"""
    data = json.dumps({
        "model": "deepseek-chat",
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }).encode('utf-8')

    for attempt in range(retries):
        try:
            req = urllib.request.Request(BASE_URL, data=data, headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            })
            with urllib.request.urlopen(req, timeout=180) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result['choices'][0]['message']['content']
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 5
                print(f"  Retry in {wait}s... ({e})")
                time.sleep(wait)
            else:
                print(f"  FAILED after {retries} attempts: {e}")
                return None


def parse_pdfs():
    """Parse both PDFs and return structured data"""
    # Parse 英译中
    reader = PdfReader(f"{BASE}\\雅思 List 1-24 英译中.pdf")
    text = ""
    for page in reader.pages:
        t = page.extract_text()
        if t: text += t + "\n"

    en_lists = {}
    current = None
    for line in text.split('\n'):
        line = line.strip()
        if not line: continue
        m = re.search(r'List[：:]?\s*(\d+)', line)
        if m:
            current = int(m.group(1))
            if current not in en_lists: en_lists[current] = []
            continue
        if any(s in line for s in ['蚂蚁贝瑞','雅思/','学生姓名','默写','准确率','批改','意见','序号 英文']):
            continue
        m = re.match(r'^(\d{1,4})\s+([a-zA-Z][-a-zA-Z\s]*?)\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s*$', line)
        if m and current:
            word = m.group(2).strip().lower()
            # Handle multi-word like "synchronized swimming"
            word = re.sub(r'\s+', ' ', word)
            en_lists[current].append({
                'seq': int(m.group(1)),
                'word': word,
                'pos': m.group(3).strip()
            })

    # Parse 中译英
    reader2 = PdfReader(f"{BASE}\\雅思 List 1-24 中译英.pdf")
    text2 = ""
    for page in reader2.pages:
        t = page.extract_text()
        if t: text2 += t + "\n"

    cn_lists = {}
    current = None
    for line in text2.split('\n'):
        line = line.strip()
        if not line: continue
        m = re.search(r'List[：:]?\s*(\d+)', line)
        if m:
            current = int(m.group(1))
            if current not in cn_lists: cn_lists[current] = []
            continue
        if any(s in line for s in ['蚂蚁贝瑞','雅思/','学生姓名','默写','准确率','批改','意见','序号 英文']):
            continue
        m = re.match(r'^(\d{1,3})\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s+(.+)$', line)
        if m and current:
            cn_lists[current].append({
                'seq': int(m.group(1)),
                'pos': m.group(2).strip(),
                'chinese_def': m.group(3).strip()
            })

    return en_lists, cn_lists


def phase1_match_definitions(en_lists, cn_lists, checkpoint):
    """Match 中译英 definitions to English words via DeepSeek.
    Process 3 lists per API call = 8 calls total.
    """
    if 'phase1_done' in checkpoint:
        print("Phase 1 already complete, skipping...")
        return checkpoint.get('matched_defs', {})

    matched_defs = checkpoint.get('matched_defs', {})
    done_lists = set()
    for word_key in matched_defs:
        for entry in matched_defs[word_key] if isinstance(matched_defs[word_key], list) else [matched_defs[word_key]]:
            if isinstance(entry, dict) and 'list_no' in entry:
                done_lists.add(entry['list_no'])

    pending = [ln for ln in sorted(cn_lists.keys()) if ln not in done_lists]

    if not pending:
        print("All lists already matched!")
        return matched_defs

    print(f"Phase 1: Matching {len(pending)} lists ({len(done_lists)} done)")

    # Process in batches of 3 lists
    batch_size = 3
    for bi in range(0, len(pending), batch_size):
        batch_lists = pending[bi:bi+batch_size]
        print(f"\n  Batch {bi//batch_size + 1}: Lists {batch_lists}")

        # Build prompt
        prompt_parts = []
        for ln in batch_lists:
            words_str = "\n".join([f"  - {w['word']} ({w['pos']})" for w in en_lists[ln]])
            defs_str = "\n".join([f"    {j+1}. [{e['pos']}] {e['chinese_def']}" for j, e in enumerate(cn_lists[ln])])
            prompt_parts.append(f"LIST {ln} WORDS:\n{words_str}\n\nLIST {ln} DEFINITIONS:\n{defs_str}")

        prompt = f"""Match each Chinese definition to its English word within the SAME list. Return ONLY a JSON object with list numbers as keys, each containing a mapping of definition numbers to {{word, chinese_def}}.

IMPORTANT:
- Match by MEANING, not just part of speech
- Each word can only be used ONCE per list
- Words MUST be from the provided list
- For definitions whose meaning doesn't match any word, use null

{chr(10).join(prompt_parts)}

Return format:
{{"1": {{"1": {{"word": "absence", "chinese_def": "缺席"}}, "2": {{"word": "abstract", "chinese_def": "抽象的"}}, ...}}, "2": {{...}}}}
"""

        content = deepseek_call([
            {"role": "system", "content": "You are a precise IELTS vocabulary matching assistant. Output ONLY valid JSON, no explanation."},
            {"role": "user", "content": prompt}
        ], max_tokens=4000)

        if not content:
            print(f"  FAILED batch {batch_lists}")
            continue

        # Parse result
        try:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                for ln_str, matches in result.items():
                    ln = int(ln_str)
                    if ln not in matched_defs:
                        matched_defs[ln] = {}
                    for def_num_str, match_info in matches.items():
                        if match_info and isinstance(match_info, dict) and 'word' in match_info:
                            word = match_info['word'].strip().lower()
                            if word not in matched_defs[ln]:
                                matched_defs[ln][word] = []
                            matched_defs[ln][word].append({
                                'pos': cn_lists[ln][int(def_num_str)-1]['pos'],
                                'chinese_def': match_info.get('chinese_def', cn_lists[ln][int(def_num_str)-1]['chinese_def'])
                            })
                print(f"  Matched {sum(len(v) for v in matched_defs.get(ln, {}).values())} words in lists {list(result.keys())}")
            else:
                print(f"  Could not parse JSON from response")
        except Exception as e:
            print(f"  Parse error: {e}")
            print(f"  Raw response: {content[:300]}")

        # Save checkpoint
        checkpoint['matched_defs'] = matched_defs
        with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
            json.dump(checkpoint, f, ensure_ascii=False, indent=2)

        time.sleep(2)  # Rate limit

    checkpoint['phase1_done'] = True
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, ensure_ascii=False, indent=2)

    return matched_defs


def phase2_generate_definitions(en_lists, matched_defs, checkpoint):
    """Generate enriched definitions for words that don't have one yet.
    Use DeepSeek to generate 2-4 义项 per word.
    Batch 40 words per call.
    """
    if 'phase2_done' in checkpoint:
        print("Phase 2 already complete, skipping...")
        return checkpoint.get('generated_defs', {})

    generated_defs = checkpoint.get('generated_defs', {})

    # Collect all words and check which need definitions
    all_words = []
    for ln in sorted(en_lists.keys()):
        for w in en_lists[ln]:
            word_key = f"{ln}:{w['word']}"
            has_match = ln in matched_defs and w['word'] in matched_defs[ln]
            has_generated = word_key in generated_defs
            if not has_match and not has_generated:
                all_words.append({'list_no': ln, 'word': w['word'], 'pos': w['pos']})

    if not all_words:
        print("All words already have definitions!")
        checkpoint['phase2_done'] = True
        return generated_defs

    print(f"Phase 2: Generating definitions for {len(all_words)} words")

    batch_size = 40
    for bi in range(0, len(all_words), batch_size):
        batch = all_words[bi:bi+batch_size]
        print(f"\n  Batch {bi//batch_size + 1}/{(len(all_words)-1)//batch_size + 1} ({len(batch)} words)")

        words_str = "\n".join([f"{i+1}. {w['word']} ({w['pos']}) [List {w['list_no']}]" for i, w in enumerate(batch)])

        prompt = f"""For each numbered IELTS vocabulary word below, provide 2-4 core Chinese definitions (义项), separated by semicolons. These should be the most common/tested meanings for IELTS preparation.

Format - return ONLY a JSON object:
{{"1": "核心义项1；核心义项2；核心义项3", "2": "义项1；义项2", ...}}

Words:
{words_str}

Requirements:
- 2-4 distinct definitions per word, covering different contexts
- Add part-of-speech labels only when the meaning differs by POS (e.g., "n. 缺席；v. 缺乏")
- Prioritize IELTS-common meanings
- Use semicolons (；) as separators between different senses
- Return ONLY the JSON object, no other text
"""

        content = deepseek_call([
            {"role": "system", "content": "You are an expert IELTS vocabulary assistant. Output ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ], max_tokens=4000, temperature=0.2)

        if not content:
            print(f"  FAILED batch starting at index {bi}")
            continue

        try:
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                count = 0
                for num_str, chinese_def in result.items():
                    idx = int(num_str) - 1
                    if 0 <= idx < len(batch):
                        w = batch[idx]
                        word_key = f"{w['list_no']}:{w['word']}"
                        generated_defs[word_key] = {
                            'word': w['word'],
                            'list_no': w['list_no'],
                            'pos': w['pos'],
                            'chinese_def': chinese_def
                        }
                        count += 1
                print(f"  Generated {count} definitions")
            else:
                print(f"  Could not parse JSON")
                print(f"  Raw: {content[:200]}")
        except Exception as e:
            print(f"  Parse error: {e}")

        # Save checkpoint
        checkpoint['generated_defs'] = generated_defs
        with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
            json.dump(checkpoint, f, ensure_ascii=False, indent=2)

        time.sleep(1.5)  # Rate limit

    checkpoint['phase2_done'] = True
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, ensure_ascii=False, indent=2)

    return generated_defs


def build_final_bank(en_lists, matched_defs, generated_defs):
    """Combine all definitions into final word bank"""
    word_bank = {}  # word -> {list_no, seq, pos, chinese_def}

    for ln in sorted(en_lists.keys()):
        for w in en_lists[ln]:
            word = w['word']
            definitions = []

            # Priority 1: matched from 中译英 PDF
            if ln in matched_defs and word in matched_defs[ln]:
                for m in matched_defs[ln][word]:
                    definitions.append(m['chinese_def'])

            # Priority 2: generated
            word_key = f"{ln}:{word}"
            if word_key in generated_defs:
                definitions.append(generated_defs[word_key]['chinese_def'])

            # Combine
            if definitions:
                # Take the longest/most detailed one, or combine unique ones
                combined = '；'.join(sorted(set('；'.join(definitions).split('；'))))
            else:
                combined = ''

            word_bank[word] = {
                'list_no': ln,
                'seq': w['seq'],
                'pos': w['pos'],
                'chinese_def': combined
            }

    # Stats
    with_def = sum(1 for v in word_bank.values() if v['chinese_def'])
    without_def = sum(1 for v in word_bank.values() if not v['chinese_def'])
    print(f"\n=== Final Word Bank ===")
    print(f"Total words: {len(word_bank)}")
    print(f"With definitions: {with_def}")
    print(f"Without definitions: {without_def}")

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(word_bank, f, ensure_ascii=False, indent=2)
    print(f"Saved to {OUTPUT_FILE}")

    return word_bank


def main():
    # Load or init checkpoint
    checkpoint = {}
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        print(f"Loaded checkpoint: phase1={'done' if checkpoint.get('phase1_done') else 'pending'}, phase2={'done' if checkpoint.get('phase2_done') else 'pending'}")

    print("Parsing PDFs...")
    en_lists, cn_lists = parse_pdfs()
    total_en = sum(len(v) for v in en_lists.values())
    total_cn = sum(len(v) for v in cn_lists.values())
    print(f"Parsed: {total_en} words, {total_cn} 中译英 entries across {len(en_lists)} lists")

    # Phase 1: Match 中译英 definitions
    print("\n" + "="*50)
    print("PHASE 1: Matching 中译英 definitions")
    print("="*50)
    matched_defs = phase1_match_definitions(en_lists, cn_lists, checkpoint)

    # Phase 2: Generate definitions for remaining words
    print("\n" + "="*50)
    print("PHASE 2: Generating definitions")
    print("="*50)
    generated_defs = phase2_generate_definitions(en_lists, matched_defs, checkpoint)

    # Build final word bank
    print("\n" + "="*50)
    print("BUILDING FINAL WORD BANK")
    print("="*50)
    word_bank = build_final_bank(en_lists, matched_defs, generated_defs)

if __name__ == '__main__':
    main()
