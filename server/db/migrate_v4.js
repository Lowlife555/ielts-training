/**
 * v4.0 Migration: Add list_no + is_extra fields, fill IELTS word mappings,
 * insert missing words, update definitions from word_bank.json.
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');
const path = require('path');

function migrate() {
  const db = getDb();
  console.log('=== v4.0 Migration: List Mapping & Definition Enrichment ===\n');

  // Step 1: Add columns if not exist
  console.log('[1/5] Adding columns...');
  for (const col of ['list_no', 'is_extra']) {
    try {
      db.exec(`ALTER TABLE words ADD COLUMN ${col} INTEGER DEFAULT NULL`);
      console.log(`  Added column: ${col}`);
    } catch (e) {
      console.log(`  Column ${col} already exists`);
    }
  }
  // Ensure PET words have list_no=NULL (they may have gotten 0 from a previous partial run)
  db.exec("UPDATE words SET list_no=NULL WHERE level='pet'");
  db.exec("UPDATE words SET is_extra=0 WHERE is_extra IS NULL");

  // Step 2: Load word_bank.json
  console.log('\n[2/5] Loading word bank...');
  const wordBank = require('./word_bank.json');
  const bankWords = Object.entries(wordBank);
  console.log(`  Loaded ${bankWords.length} words from word_bank.json`);

  // Step 3: Mark Cambridge words as is_extra=1
  console.log('\n[3/5] Marking Cambridge words as is_extra=1...');
  const camResult = db.prepare(
    "UPDATE words SET is_extra=1, list_no=NULL WHERE source LIKE 'Cambridge IELTS%'"
  ).run();
  console.log(`  Marked ${camResult.changes} Cambridge words as is_extra=1`);

  // Step 4: Upsert IELTS words from word bank
  console.log('\n[4/5] Upserting IELTS words...');

  // Build map of ALL existing words (lowercase) to their data
  const existingWords = db.prepare(
    "SELECT id, word, chinese_definition, source, level FROM words"
  ).all();
  const existingMap = {};
  for (const w of existingWords) {
    const lower = w.word.toLowerCase();
    // For duplicates, prefer IELTS over PET, and longer definition
    if (!existingMap[lower] ||
        (w.level === 'ielts' && existingMap[lower].level !== 'ielts') ||
        (w.chinese_definition && w.chinese_definition.length > (existingMap[lower].chinese_definition || '').length)) {
      existingMap[lower] = w;
    }
  }

  const insertStmt = db.prepare(`
    INSERT INTO words (word, part_of_speech, chinese_definition, topic, level, difficulty_level, source, list_no, is_extra)
    VALUES (?, ?, ?, 'ielts_vocabulary', 'ielts', 1, 'extracted', ?, 0)
  `);

  const updateDefStmt = db.prepare(`
    UPDATE words SET chinese_definition = ?, list_no = ?, part_of_speech = ? WHERE id = ?
  `);

  const updateListNoStmt = db.prepare(`
    UPDATE words SET list_no = ?, part_of_speech = COALESCE(NULLIF(part_of_speech, ''), ?) WHERE id = ?
  `);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const insertAll = db.transaction(() => {
    for (const [word, data] of bankWords) {
      const lower = word.toLowerCase();
      const existing = existingMap[lower];

      if (existing) {
        const newDef = data.chinese_def || '';
        const oldDef = (existing.chinese_definition || '').trim();
        const isCambridge = (existing.source || '').startsWith('Cambridge IELTS');

        // If existing word is PET level, upgrade to ielts and add list_no
        if (existing.level === 'pet') {
          db.prepare(`UPDATE words SET level='ielts', topic='ielts_vocabulary', list_no=?, part_of_speech=?, chinese_definition=? WHERE id=?`)
            .run(data.list_no, data.pos, newDef || oldDef, existing.id);
          updated++;
          continue;
        }

        // Cambridge words that are also in IELTS lists: override is_extra=0, set list_no
        if (isCambridge) {
          db.prepare(`UPDATE words SET list_no=?, is_extra=0, part_of_speech=?, chinese_definition=? WHERE id=?`)
            .run(data.list_no, data.pos, newDef, existing.id);
          updated++;
          continue;
        }

        // Update if new definition is better (longer) or if list_no needs setting
        const needsDefUpdate = newDef.length > oldDef.length || oldDef.length < 3;
        if (needsDefUpdate || newDef) {
          updateDefStmt.run(newDef || oldDef, data.list_no, data.pos, existing.id);
          updated++;
        } else {
          updateListNoStmt.run(data.list_no, data.pos, existing.id);
          skipped++;
        }
      } else {
        // Word doesn't exist at all - insert as new IELTS word
        insertStmt.run(word, data.pos, data.chinese_def, data.list_no);
        inserted++;
      }
    }
  });

  insertAll();
  console.log(`  Inserted: ${inserted} new words`);
  console.log(`  Updated: ${updated} definitions`);
  console.log(`  Skipped: ${skipped} (already up-to-date)`);

  // Step 5: Verify and output statistics
  // Clean up: set list_no=NULL for multi-word expressions and other edge cases
  // that didn't get proper mapping (list_no=0 from default, or list_no=NULL is correct)
  const cleanupResult = db.prepare(
    "UPDATE words SET list_no=NULL WHERE is_extra=0 AND list_no=0"
  ).run();
  if (cleanupResult.changes > 0) {
    console.log(`  Cleaned up ${cleanupResult.changes} words with list_no=0 -> NULL`);
  }

  console.log('\n[5/5] Verifying...');

  // Count by list_no
  const listCounts = db.prepare(
    'SELECT list_no, COUNT(*) as cnt FROM words WHERE is_extra=0 AND list_no IS NOT NULL GROUP BY list_no ORDER BY list_no'
  ).all();

  console.log('\n--- Words per List (IELTS, is_extra=0) ---');
  let totalListWords = 0;
  for (const row of listCounts) {
    console.log(`  List ${String(row.list_no).padStart(2)}: ${String(row.cnt).padStart(3)} words`);
    totalListWords += row.cnt;
  }
  console.log(`  Total in lists: ${totalListWords}`);

  // Other counts
  const extraCount = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE is_extra=1').get();
  const nullListCount = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE list_no IS NULL AND is_extra=0').get();
  const levelCounts = db.prepare('SELECT level, COUNT(*) as cnt FROM words GROUP BY level').all();
  const totalWords = db.prepare('SELECT COUNT(*) as cnt FROM words').get();

  console.log(`\n--- Summary ---`);
  console.log(`  is_extra=1 (Cambridge): ${extraCount.cnt}`);
  console.log(`  list_no=NULL (non-extra): ${nullListCount.cnt}`);
  for (const row of levelCounts) {
    console.log(`  Level ${row.level}: ${row.cnt}`);
  }
  console.log(`  TOTAL words: ${totalWords.cnt}`);

  // Random sample definition quality check
  console.log('\n--- Random Definition Samples ---');
  const samples = db.prepare(
    "SELECT word, list_no, part_of_speech, chinese_definition FROM words WHERE is_extra=0 AND list_no IS NOT NULL ORDER BY RANDOM() LIMIT 10"
  ).all();
  for (const s of samples) {
    const def = (s.chinese_definition || '').substring(0, 60);
    console.log(`  [L${s.list_no}] ${s.word} (${s.part_of_speech}): ${def}`);
  }

  console.log('\n=== v4.0 Migration Complete ===');
  closeDb();
}

migrate();
