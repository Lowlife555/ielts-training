"""Use DeepSeek API to:
1. Match 中译英 entries (POS + Chinese def) to their English words within each List
2. Generate enriched definitions (2-4 义项) for all IELTS words

Strategy: Call DeepSeek once per List for matching (24 calls), then batch-generate
definitions for remaining words (~50 words per call).

Reuses DEEPSEEK_API_KEY from server/.env
"""
import json
import os
import re
import time
import urllib.request
import urllib.error

# Load API key from server/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
api_key = None
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('DEEPSEEK_API_KEY='):
                api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                break

if not api_key:
    print("ERROR: DEEPSEEK_API_KEY not found in server/.env")
    exit(1)

print(f"API Key found: {api_key[:8]}...{api_key[-4:]}")

BASE_URL = "https://api.deepseek.com/v1/chat/completions"

def deepseek_call(messages, max_tokens=2000, temperature=0.1):
    """Make a DeepSeek API call"""
    data = json.dumps({
        "model": "deepseek-chat",
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }).encode('utf-8')

    req = urllib.request.Request(BASE_URL, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    })

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            content = result['choices'][0]['message']['content']
            return content
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error {e.code}: {e.read().decode('utf-8')[:500]}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None


def match_list_definitions(list_no, en_words, cn_entries):
    """Use DeepSeek to match 中译英 entries to their English words.
    en_words: [{word, pos}] for this list
    cn_entries: [{pos, chinese_def}] for this list (30 entries)
    Returns: [{word, pos, chinese_def}] matched
    """
    # Build word list for prompt
    word_list = "\n".join([f"- {w['word']} ({w['pos']})" for w in en_words])
    def_list = "\n".join([f"{i+1}. {e['pos']} {e['chinese_def']}" for i, e in enumerate(cn_entries)])

    prompt = f"""You are matching Chinese definitions to English IELTS vocabulary words.

List {list_no} words (with part of speech):
{word_list}

Definitions to match (numbered, with part of speech):
{def_list}

For each numbered definition, find the ONE English word from the list above whose meaning matches the Chinese definition AND whose part of speech is compatible. Return ONLY a JSON object mapping definition numbers to English words.

Example format:
{{"1": "assess", "2": "administration", "3": "auditorium"}}

IMPORTANT:
- Match by meaning AND part of speech compatibility
- Each word can only be used ONCE
- Return ONLY the JSON object, no other text
- All words MUST come from the list above
"""

    content = deepseek_call([
        {"role": "user", "content": prompt}
    ], max_tokens=1000)

    if not content:
        return None

    # Parse JSON response
    try:
        # Try to extract JSON block
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group(0))
            # Convert to list
            matched = []
            for i in range(1, len(cn_entries) + 1):
                key = str(i)
                if key in result:
                    entry = cn_entries[i-1]
                    matched.append({
                        'word': result[key].strip().lower(),
                        'pos': entry['pos'],
                        'chinese_def': entry['chinese_def']
                    })
            return matched
        else:
            print(f"  Could not parse JSON from: {content[:200]}")
            return None
    except Exception as e:
        print(f"  Parse error: {e}")
        return None


def main():
    # Load the parsed data from PDFs
    # We'll load from the pdf_extracted_defs.json or re-parse

    # Load existing map data
    db_dir = os.path.join(os.path.dirname(__file__), '..', 'db')
    map_path = os.path.join(db_dir, 'ielts_list_map.json')
    with open(map_path, encoding='utf-8') as f:
        list_map = json.load(f)

    # Load the PDF extraction we just did (re-parse)
    from pypdf import PdfReader
    BASE = r"C:\Users\15782\Downloads\雅思训练词库"

    # Parse 英译中 for word lists
    def parse_en():
        reader = PdfReader(f"{BASE}\\雅思 List 1-24 英译中.pdf")
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t: text += t + "\n"

        lists = {}
        current = None
        for line in text.split('\n'):
            line = line.strip()
            if not line: continue
            m = re.search(r'List[：:]?\s*(\d+)', line)
            if m:
                current = int(m.group(1))
                if current not in lists: lists[current] = []
                continue
            if any(s in line for s in ['蚂蚁贝瑞','雅思/','学生姓名','默写','准确率','批改','意见','序号 英文']):
                continue
            m = re.match(r'^(\d{1,4})\s+([a-zA-Z][-a-zA-Z\s]*?)\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s*$', line)
            if m and current:
                lists[current].append({'seq': int(m.group(1)), 'word': m.group(2).strip().lower(), 'pos': m.group(3).strip()})
        return lists

    # Parse 中译英 for definitions
    def parse_cn():
        reader = PdfReader(f"{BASE}\\雅思 List 1-24 中译英.pdf")
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t: text += t + "\n"

        lists = {}
        current = None
        for line in text.split('\n'):
            line = line.strip()
            if not line: continue
            m = re.search(r'List[：:]?\s*(\d+)', line)
            if m:
                current = int(m.group(1))
                if current not in lists: lists[current] = []
                continue
            if any(s in line for s in ['蚂蚁贝瑞','雅思/','学生姓名','默写','准确率','批改','意见','序号 英文']):
                continue
            m = re.match(r'^(\d{1,3})\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s+(.+)$', line)
            if m and current:
                lists[current].append({'seq': int(m.group(1)), 'pos': m.group(2).strip(), 'chinese_def': m.group(3).strip()})
        return lists

    print("Re-parsing PDFs...")
    en_lists = parse_en()
    cn_lists = parse_cn()

    total_en = sum(len(v) for v in en_lists.values())
    total_cn = sum(len(v) for v in cn_lists.values())
    print(f"Parsed: {total_en} words in {len(en_lists)} lists, {total_cn} def entries")

    # Test with List 1 first
    print("\n=== TEST: Matching List 1 ===")
    list1_en = en_lists[1]
    list1_cn = cn_lists[1]
    print(f"List 1: {len(list1_en)} words, {len(list1_cn)} defs")

    result = match_list_definitions(1, list1_en, list1_cn)
    if result:
        print(f"Matched {len(result)} entries:")
        for r in result[:5]:
            print(f"  {r['word']}: {r['pos']} {r['chinese_def']}")

        # Save test result
        test_path = os.path.join(db_dir, 'list1_match_test.json')
        with open(test_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"Saved to {test_path}")
    else:
        print("FAILED to match List 1")

if __name__ == '__main__':
    main()
