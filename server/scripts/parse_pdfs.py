"""Parse IELTS + PET 中译英 PDFs to extract word definitions.
The 中译英 PDFs contain: word + part_of_speech + chinese_definition (English left blank).
These are the most reliable definition source since seed_extracted.js has garbled IELTS definitions.
"""
import sys
import json
import re
from pypdf import PdfReader

def clean_text(text):
    """Clean extracted text"""
    return text.strip().replace('\n', ' ')

def parse_ielts_cn_to_en(pdf_path):
    """Parse 雅思 List 1-24 中译英.pdf
    Format: Each entry = pos + chinese_definition (English blank, scrambled order)
    We need to extract the Chinese definitions per list.

    Since the PDF has no English word, we need to match by list_no + pos to the
    ielts_list_map.json entries. The 中译英 PDF selects 30 words per list from
    the corresponding 英译中 list.
    """
    reader = PdfReader(pdf_path)
    all_pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            all_pages_text.append(f"--- PAGE {i+1} ---\n{text}")

    full_text = '\n'.join(all_pages_text)
    print(f"Total pages: {len(reader.pages)}")
    print(f"Total extracted text length: {len(full_text)} chars")

    # Print first 2000 chars for inspection
    print("\n=== FIRST 2000 CHARS ===")
    print(full_text[:2000])
    print("\n=== LAST 1000 CHARS ===")
    print(full_text[-1000:])

    return full_text

def parse_ielts_en_to_cn(pdf_path):
    """Parse 雅思 List 1-24 英译中.pdf
    Format: global_seq + english_word + part_of_speech (chinese_definition column empty)
    This gives us the authoritative word list and list structure.
    """
    reader = PdfReader(pdf_path)
    all_pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            all_pages_text.append(f"--- PAGE {i+1} ---\n{text}")

    full_text = '\n'.join(all_pages_text)
    print(f"\n=== 英译中 Total pages: {len(reader.pages)} ===")
    print(f"Total extracted text length: {len(full_text)} chars")

    # Print first 2000 chars
    print("\n=== FIRST 2000 CHARS ===")
    print(full_text[:2000])
    print("\n=== LAST 1000 CHARS ===")
    print(full_text[-1000:])

    return full_text

if __name__ == '__main__':
    base = r"C:\Users\15782\Downloads\雅思训练词库"

    print("=" * 60)
    print("PARSING: 雅思 List 1-24 中译英.pdf")
    print("=" * 60)
    ielts_cn = parse_ielts_cn_to_en(f"{base}\\雅思 List 1-24 中译英.pdf")

    print("\n" + "=" * 60)
    print("PARSING: 雅思 List 1-24 英译中.pdf")
    print("=" * 60)
    ielts_en = parse_ielts_en_to_cn(f"{base}\\雅思 List 1-24 英译中.pdf")
