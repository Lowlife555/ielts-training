"""Extract all data from PDFs and produce a complete JSON word bank.
- 英译中 PDF: 2329 words with seq, word, POS (no definitions) - authoritative word→list mapping
- 中译英 PDF: 720 entries with POS + Chinese def (no English word) - key word definitions
- Strategy: Parse 英译中 for word list; parse 中译英 for definitions; match within same List by POS+semantics
"""
import json
import re
import os
from pypdf import PdfReader

BASE = r"C:\Users\15782\Downloads\雅思训练词库"

def parse_ielts_en_to_cn():
    """Parse 雅思 List 1-24 英译中.pdf - extract all words per list with POS"""
    reader = PdfReader(f"{BASE}\\雅思 List 1-24 英译中.pdf")
    full_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"

    # Parse structured entries
    # Pattern: seq_number + word + pos (definition column is blank)
    # List markers: "List：N" or similar

    lists = {}  # list_no -> [{seq, word, pos}]
    current_list = None

    lines = full_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect List header
        list_match = re.search(r'List[：:]?\s*(\d+)', line)
        if list_match:
            current_list = int(list_match.group(1))
            if current_list not in lists:
                lists[current_list] = []
            continue

        # Skip header/footer lines
        if any(skip in line for skip in ['蚂蚁贝瑞', '雅思/', '学生姓名', '默写', '准确率', '批改', '意见', '序号 英文']):
            continue

        # Match word entries: seq + word + pos
        # Pattern like: "1 absence n" or "2329 zipper n"
        match = re.match(r'^(\d{1,4})\s+([a-zA-Z][-a-zA-Z\s]*?)\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s*$', line)
        if match and current_list:
            seq = int(match.group(1))
            word = match.group(2).strip().lower()
            pos = match.group(3).strip()
            lists[current_list].append({
                'seq': seq,
                'word': word,
                'pos': pos
            })

    # Print stats
    total = sum(len(v) for v in lists.values())
    print(f"IELTS 英译中: {len(lists)} lists, {total} words total")
    for ln in sorted(lists.keys()):
        print(f"  List {ln}: {len(lists[ln])} words (seq {lists[ln][0]['seq']}-{lists[ln][-1]['seq']})")

    return lists

def parse_ielts_cn_to_en():
    """Parse 雅思 List 1-24 中译英.pdf - extract 30 definitions per list with POS"""
    reader = PdfReader(f"{BASE}\\雅思 List 1-24 中译英.pdf")
    full_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"

    lists = {}  # list_no -> [{seq, pos, chinese_def}]
    current_list = None

    lines = full_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect List header
        list_match = re.search(r'List[：:]?\s*(\d+)', line)
        if list_match:
            current_list = int(list_match.group(1))
            if current_list not in lists:
                lists[current_list] = []
            continue

        # Skip headers
        if any(skip in line for skip in ['蚂蚁贝瑞', '雅思/', '学生姓名', '默写', '准确率', '批改', '意见', '序号 英文']):
            continue

        # Match definition entries: seq + pos + chinese_definition
        # Pattern: "1   v 评估" or "30   n 唤起"
        match = re.match(r'^(\d{1,3})\s+([a-z/]+(?:\s*[,;]\s*[a-z/]+)*)\s+(.+)$', line)
        if match and current_list:
            seq = int(match.group(1))
            pos = match.group(2).strip()
            chinese_def = match.group(3).strip()
            lists[current_list].append({
                'seq': seq,
                'pos': pos,
                'chinese_def': chinese_def
            })

    total = sum(len(v) for v in lists.values())
    print(f"\nIELTS 中译英: {len(lists)} lists, {total} def entries total")
    for ln in sorted(lists.keys()):
        print(f"  List {ln}: {len(lists[ln])} entries")

    return lists

def normalize_pos(pos):
    """Normalize part of speech for matching"""
    pos = pos.lower().strip()
    # Expand common abbreviations
    pos = pos.replace('adj', 'adjective')
    pos = pos.replace('adv', 'adverb')
    pos = pos.replace('n/', 'noun/')
    pos = pos.replace('v/', 'verb/')
    pos = pos.replace('prep', 'preposition')
    pos = pos.replace('conj', 'conjunction')
    # Get the primary POS (first one)
    parts = re.split(r'[,;/]', pos)
    return parts[0].strip()

def match_definitions_to_words(en_lists, cn_lists):
    """Match 中译英 definitions to 英译中 words within each list by POS.
    Returns {word: {chinese_def, pos}} for matched words.
    """
    matched = {}
    unmatched = []

    for list_no in sorted(cn_lists.keys()):
        if list_no not in en_lists:
            print(f"  WARNING: List {list_no} not found in 英译中!")
            continue

        en_words = en_lists[list_no]  # words in this list
        cn_entries = cn_lists[list_no]  # definitions in this list

        for entry in cn_entries:
            cn_pos = normalize_pos(entry['pos'])
            cn_def = entry['chinese_def']

            # Find candidates: words in same list with matching POS
            candidates = []
            for w in en_words:
                w_pos_parts = normalize_pos(w['pos'])
                # Match if primary POS overlaps
                if cn_pos in w_pos_parts or w_pos_parts in cn_pos or cn_pos == w_pos_parts:
                    candidates.append(w)

            if len(candidates) == 1:
                # Unique match by POS
                w = candidates[0]
                matched[w['word']] = {
                    'list_no': list_no,
                    'seq': w['seq'],
                    'pos': entry['pos'],
                    'chinese_def': cn_def
                }
            elif len(candidates) == 0:
                # No POS match - try broader matching
                unmatched.append({
                    'list_no': list_no,
                    'seq': entry['seq'],
                    'pos': entry['pos'],
                    'chinese_def': cn_def,
                    'candidates': [],
                    'reason': 'no_pos_match'
                })
            else:
                # Multiple candidates - disambiguate
                # For now, store all candidates; we'll resolve later
                unmatched.append({
                    'list_no': list_no,
                    'seq': entry['seq'],
                    'pos': entry['pos'],
                    'chinese_def': cn_def,
                    'candidates': [c['word'] for c in candidates],
                    'reason': 'ambiguous'
                })

    print(f"\nMatched: {len(matched)} words")
    print(f"Unmatched: {len(unmatched)} entries")
    print(f"  - No POS match: {sum(1 for u in unmatched if u['reason']=='no_pos_match')}")
    print(f"  - Ambiguous: {sum(1 for u in unmatched if u['reason']=='ambiguous')}")

    return matched, unmatched

if __name__ == '__main__':
    en_lists = parse_ielts_en_to_cn()
    cn_lists = parse_ielts_cn_to_en()

    matched, unmatched = match_definitions_to_words(en_lists, cn_lists)

    # Save intermediate results
    output = {
        'matched': matched,
        'unmatched': unmatched,
        'total_matched': len(matched),
        'total_unmatched': len(unmatched)
    }

    out_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'pdf_extracted_defs.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to {out_path}")

    # Print some unmatched for inspection
    print("\n=== Sample unmatched (first 15) ===")
    for u in unmatched[:15]:
        print(f"  List {u['list_no']}: {u['pos']} {u['chinese_def']} -> candidates: {u['candidates']} ({u['reason']})")
