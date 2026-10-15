# IELTS Training Platform (V7.4.5)

> An IELTS exam-prep platform targeting an **overall score of 6.5**, built on **React + Express + SQLite**
> Current version: **V7.4.5** · GitHub: `https://github.com/Lowlife555/ielts-training`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Feature Overview](#feature-overview)
3. [Daily Training Flow](#daily-training-flow)
4. [Smart Answer Grading System](#smart-answer-grading-system)
5. [Version History](#version-history)
6. [Quick Start](#quick-start)
7. [Project Structure](#project-structure)
8. [API Reference](#api-reference)
9. [Database Design](#database-design)
10. [User Memory KV Storage System](#user-memory-kv-storage-system)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Speech System (Multiple Sources)](#speech-system-multiple-sources)
13. [Spaced Repetition Algorithm](#spaced-repetition-algorithm)
14. [DeepSeek AI Grading](#deepseek-ai-grading)
15. [Deployment](#deployment)
16. [Data Scale and Tech Stack](#data-scale-and-tech-stack)
17. [Version Naming Convention](#version-naming-convention)

---

## Project Overview

A smart exam-prep platform aimed at **an IELTS target score of 6.5**, solving two core needs:

- **Vocabulary memorisation**: a 4,237-word graded vocabulary (PET foundation 2,014 + IELTS advanced 1,941 + real-exam selection 282; the committed data also carries DeepSeek-expanded multi-sense definitions for 2,318 of them), supporting List-by-List memorisation, 3D card flipping, Chinese dictation, meaning judgement, spaced repetition (Ebbinghaus), spot checks, a debt incentive mechanism, and resume-from-breakpoint
- **Writing practice**: 30 Cambridge past-paper questions, an editor that auto-saves drafts, and DeepSeek AI grading against the four IELTS criteria (falls back to heuristic scoring when no key is configured)

Highlights: smart grading (spelling tolerance + synonym library), Pomodoro batched memorisation, multi-source speech (local / Youdao / Baidu), training summaries and a history calendar, dual touch-screen and desktop modes, dark mode, cloud KV storage for user data, multi-user data isolation, and Admin management.

---

## Feature Overview

### 🗓️ Daily Training (Core Loop)
| Stage | Description |
|------|------|
| Today's briefing | Target duration (60 + debt, capped at 120 min), reasons, today's Lists, spot-check tasks, warm-up word count; **shows a completion banner + the to-be-relearned list when done** |
| Resume from breakpoint | Batch progress is preserved when exiting midway; the briefing offers "continue from breakpoint / re-learn this batch" |
| PET warm-up | 10 words: first 5 Chinese→English + last 5 English→Chinese, system-graded, untimed and unscored |
| Word list memorisation | Pomodoro batching (30/40/50/100 words per batch), 3D card flip: front = word + phonetic + full definition, click to flip and hide the definition, both sides can be read aloud, keys 1/2 mark known / unknown |
| Chinese dictation | Read the English and write the Chinese; **both correct and incorrect answers stay on screen showing right/wrong plus the full definition, advance manually with "Next"**; lenient grading via keywords + synonyms; wrong answers are automatically retested, and words already passed are removed from the next round |
| Spot check | **Read the English and type the Chinese, system-graded** (same format as dictation), pass at ≥80% accuracy, otherwise the List is marked for relearning |
| Spelling spot check | 30 random words studied today (read Chinese, spell English), pass at ≥80% |
| Acceptance test | Every remaining word must be spelled correctly to complete the day's task |
| Training summary | After finishing training, **a modal shows word-level detail** (how many times each word was missed + time taken + accuracy per stage), and it can be reopened after closing |

### 📖 Vocabulary Module
| Feature | Description |
|------|------|
| List memorisation | 24 Lists (about 100 words per List), full definitions for the whole List, single-card flipping to hide the definition |
| Chinese dictation test | Questions drawn by List, graded by keywords + synonyms, wrong words retested until all are correct |
| Meaning judgement | Read the word and choose the definition (4 options, full multiple senses shown = lenient grading), supports a meaning/spelling mixed mode |
| Spelling test | Read Chinese and spell English (spelling tolerance) |
| Spaced repetition | SM-2 algorithm, automatic reminders when due |
| Wrong-word book | Review every word answered incorrectly more than twice |
| Topic browsing | 8 topic cards (the original 282 real-exam word system) |

### ✍️ Writing Module
- Past-paper list (Task 1/2 filter)
- Editor: `Ctrl+S` saves a draft, `Tab` indents, auto-save every 30 seconds
- After submission: DeepSeek grading against the four criteria + a radar chart

### 👤 User System
- Register / log in (bcrypt encryption + Bearer Token 30-day session)
- Data isolation: every route is isolated per user
- Admin panel: user list / statistics / password reset / disable
- Test account `admin_test`: penalty-free mechanism + a test panel that can jump anywhere
- The first registered user automatically inherits the original data and becomes an administrator

### ⚙️ Settings (entered via the gear icon at the top)
| Setting | Options |
|--------|------|
| Speech source | Local speech (offline) / Youdao Dictionary (US/UK pronunciation) / Baidu Translate |
| Accent | US / UK |
| Phonetic display | On / Off |
| Pomodoro break length | 3 / 5 / 10 minutes |
| Daily target duration | 30 / 45 / 60 / 90 / 120 minutes (linked to the debt system) |
| Training history | **View each training summary in calendar style** (word-level detail) |
| Data management | Clear cache / export settings / restore defaults |

> All settings are stored in the server-side **user_kv** table, and sync as soon as you log in from any device.

### 📱 Dual Mode and Appearance
- Touch mode: bottom tab bar + swipe to flip cards + larger tap areas
- Desktop mode: top navigation + keyboard shortcuts
- Dark mode (sun/moon toggle), automatic interface-mode detection
- Environment badge: local laptop (light yellow) / server (light grey)

---

## Daily Training Flow

```
Today's briefing (target duration = 60 + debt, capped at 120 min; includes a resume-from-breakpoint entry)
  └─ PET warm-up (10 words: first 5 Chinese→English + last 5 English→Chinese, untimed and unscored)
  └─ Word list memorisation (Pomodoro batches of 30/40/50/100 words, 3D card flip + known/unknown marking)
  └─ Chinese dictation (keyword + synonym grading, right and wrong answers both stay on screen showing the full definition, manual advance, wrong words retested with passed words removed)
  └─ Break (3/5/10 minutes, skippable, not counted towards duration)
  └─ Spot check (read English and type Chinese, pass at ≥80%)
  └─ Spelling spot check (30 random words studied today, pass at ≥80%)
  └─ Acceptance test (all remaining words correct → the day is complete)
  └─ Training summary (modal: word-level detail + time taken + accuracy)
```

### Debt Rules (Time Box)
| Scenario | Penalty |
|------|------|
| No training on the day | Debt +30 minutes |
| Training duration < target - 15 min and acceptance not passed | Debt +30 minutes |
| Acceptance passed on the day | No extra penalty (old debt is retained) |
| Practising a full 2 hours | Everything cleared, back to the baseline target the next day |
| Test account | Always 60 minutes, never accrues debt |

### Spot Checks and Pending Relearning
- Lists completed for ≥3 days trigger a spot check (30 random words, pass at ≥80%)
- Spot check / spelling below standard → the List is marked `pending_review`, and re-learning is scheduled first in the next day's briefing
- Today's briefing lists **all Lists pending relearning** (`pendingReviewLists`)

### Resume from Breakpoint (V7.3.1)
- On an Esc exit midway, `completed_batches` is saved (completed batches)
- The next briefing shows "Last progress: List X has completed N batches", and you can choose **continue from breakpoint** or **re-learn this batch**

---

## Smart Answer Grading System

> Tools: `client/src/utils/answerCheck.js` (unified grading) + `server/scripts/enrichSynonyms.js` (synonym library)

### English Spelling Grading `checkEnglishAnswer`
| Level | Rule | Example |
|------|------|------|
| ① Exact match | Case-insensitive | `Silence` = `silence` ✓ |
| ② Word-form normalisation | Plurals / past tense / progressive | `studies`→`study`, `studied`→`study` ✓ |
| ③ Edit distance ≤1 | Insert / delete / substitute / transpose one character | `silense`→`silence` ✓ |
| Safety guard | Edit distance is disabled when the input is a common standalone word | `quite` ≠ `quiet` ✗ |

### Chinese Definition Grading `checkChineseAnswer`
| Level | Rule |
|------|------|
| ① Lenient keyword grading | Particle stripping + bidirectional containment (e.g. "位于..." → "位于") |
| ② Synonym library hit | `word_meanings.synonyms` (e.g. definition "寂静", answering "安静" is also accepted) |
| Single-character handling | Single-character keywords/synonyms match exactly (`糖` only accepts `糖`, not "糖水") |

### Grading by Scenario
| Scenario | Word-form variation | Edit distance | Synonyms |
|------|---------|---------|--------|
| Learning (dictation / warm-up / ListDictation / spelling practice) | ✅ | ✅ | ✅ |
| Assessment (acceptance test / spelling spot check) | ✅ | ❌ | ❌ |

### Synonym Library Data
- **IELTS words**: all 2,318 words expanded (batch-generated by DeepSeek, `enrichSynonyms.js`)
- **PET words**: enriched in the same batch run (keywords + synonyms + single-character core senses + fixes for empty definitions/dirty word names)
- The generation script is idempotent + resumable (checkpoint), independent of the deployment flow

---

## Version History

> Version numbers use **V major.minor.patch** (SemVer): major = significant rework, minor = new features, patch = fixes.
> Every version corresponds to a git tag (V2.0.0 ~ V7.4.5) and can be rolled back at any time.

| Version | Date | Development Agent | Core Content |
|------|------|-----------|---------|
| V1.0.0 | 2026-08-05 | Claude Code + DeepSeek V4 | Initial version: scaffold + database + 14 APIs + 282 real-exam words + 30 writing questions |
| V2.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | Post-acceptance fixes: dynamic user_id, speech, empty catch swallowing errors, grading button colours |
| V3.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | Daily word training system + 4,237-word vocabulary |
| V3.0.1 | 2026-08-06 | Claude Code + DeepSeek V4 | Speech pronunciation fix: switched to local Microsoft offline speech |
| V3.0.2 | 2026-08-06 | Claude Code + DeepSeek V4 | Pre-delivery fixes: vocabulary isolation, unified ports, feedback delay, auto-save, etc. |
| V4.0.0 | 2026-08-07 | Claude Code + DeepSeek V4 | Vocabulary tidy-up: List 1-24 numbering, three-level definition completion, list_no/is_extra fields |
| V4.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Today's briefing + daily flow rework + time box and debt system |
| V4.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Spot-check mechanism: 30 random words 3-4 days after memorising, pass at ≥80% |
| V4.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Definition depth expansion: DeepSeek batch of 756 words, all IELTS words with 2+ senses |
| V5.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | User system: register/login/data isolation/Admin management/environment badge |
| V5.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Test account admin_test + dark mode |
| V5.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Study mode selection: sequential/custom List (queue-jumping without losing progress) |
| V5.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Touch adaptation: swipe card flipping/bottom tab bar/My page |
| V5.3.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Touch interaction fixes + front-end directory reorganised by functional domain |
| V5.4.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Touch-to-desktop switch entry + new-version announcement system |
| V6.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Meaning judgement test (lenient grading) + meaning/spelling mixed mode + full Youdao definition crawl (2,318 words) |
| V7.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | List memorisation (full List definitions + show/hide toggle) + Chinese dictation test, removed the old word-card entry |
| V7.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Pomodoro batched memorisation + spelling spot check (30 random words ≥80%) + on-the-spot word-count selection |
| V7.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 3D card-flip memorisation + warm-up input grading + multi-source speech + settings page + lenient grading + retests removing words already passed |
| V7.2.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | Warm-up fix: automatic word skipping/could not enter the next stage |
| V7.2.2 | 2026-08-12 | opencode (deepseek-v4-flash-free) | Fixed warm-up feedback dwell/single-card flip + settings gear entry + KV user memory storage system |
| V7.2.3 | 2026-08-12 | opencode (deepseek-v4-flash-free) | Fixed card-back scrollbar + reading aloud on both card faces + version naming convention established |
| V7.2.4 | 2026-08-12 | opencode (deepseek-v4-flash-free) | Grading optimisation: spelling tolerance (word form + edit distance ≤1) + synonym library (IELTS 2,318/PET 1,720 full) + PET vocabulary fixes + grading by scenario |
| V7.3.1 | 2026-08-14 | opencode (deepseek-v4-flash-free) | Dictation manual advance on right/wrong + full definition on correct answers + spot check changed to input grading + fixed the acceptance page crash (spelling could not be submitted) + training summary modal/history calendar page + resume from breakpoint + briefing completion state/pending relearning list |
| V7.4.0 | 2026-08-18 | DeepSeek Harness | Study logging + study report (study_events table) + card-flip interaction improvement (clicking "unknown" flips back to the definition side) + self-test in the memorisation screen (test unknown words/wrong-word loop/can go back) |
| V7.4.1 | 2026-08-18 | DeepSeek Harness | Spelling self-memorisation + self-test (known/unknown marking across the whole List flip cards) + all test stages changed to manual advance + Apple-style page polish + fixed the spelling spot check hanging |
| V7.4.2 | 2026-08-19 | DeepSeek Harness | Memory progress system: word-level progress snapshot dual-write (localStorage + server DB), coverage of every stage, precise resume after interruption/manual exit returns to the stage start |
| V7.4.3 | 2026-08-19 | opencode (deepseek-v4-flash-free) | Fixed the spot check jumping to the next word on Enter + the double-Enter hazard in the warm-up + independent spelling/meaning judgement changed to manual advance (the answer is shown even when correct) |
| V7.4.4 | 2026-08-21 | — | Fixed the break countdown drifting in the background (per-second `setInterval` replaced by a timestamp difference on a 250 ms tick, so it no longer slows down when the tab is backgrounded or the screen is locked) |
| V7.4.5 | 2026-08-21 | — | Chinese→English dictation word selection reworked: real-exam spelling words (2,255) take priority, Oxford 5000 (4,054) fallback, remaining words filled at random, guaranteeing >=20 words per day |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18 (v26.5.0 used in development)
- npm

### Install and Run

```bash
# 1. Install dependencies
cd client && npm install
cd ../server && npm install

# 2. Initialise the database (create tables + import 4,237 words + 30 writing questions + all migrations)
cd server && npm run setup

# 3. Start the backend (port 3001)
cd server && npm run dev

# 4. Start the frontend (port 5174)
cd client && npm run dev
```

Open `http://localhost:5174` in your browser.

> For production deployment, see the [Deployment](#deployment) section.

### Database Scripts
| Command | Description |
|------|------|
| `npm run setup` | Full initialisation (create tables + seeds + all migrations) |
| `npm run migrate:all` | Run all migrations only (idempotent, repeatable) |
| `npm run migrate` | Basic table creation |
| `npm run seed` | Seed data (vocabulary + writing questions) |

---

## Project Structure

```
ielts-training/
├── client/                          # React frontend (Vite + Tailwind CSS 4)
│   └── src/
│       ├── App.jsx                  # Routing + Provider hierarchy
│       ├── index.css                # Tailwind + card-flip 3D animation
│       ├── components/
│       │   ├── layout/              # Navbar / MobileTabBar / FloatingActions
│       │   ├── training/            # TrainingTimer / FirstVisitHint / SummaryModal (summary modal)
│       │   └── ui/                  # FlipCard (3D flip) / Toast / KeyboardHelp / VersionNotice / Loading / ErrorBoundary
│       ├── context/                 # Auth / Settings / Theme / Touch / App / UserKV (memory storage)
│       ├── hooks/                   # useKeyboard / useSwipe / useTimer
│       ├── pages/
│       │   ├── daily/               # TodayBriefing / PetWarmup / MainStudy / SpotCheck / SpellingPractice / SpellCheck / AcceptanceTest / DailyReport
│       │   ├── words/               # Lists / ListStudy / ListDictation / MeaningTest / SpellingTest / ReviewWords / WrongWords / Topics / WordList / WordStudy
│       │   ├── writing/             # WritingQuestions / WritingEditor / WritingResult / History
│       │   ├── user/                # Login / Register / Admin / Me / Settings
│       │   └── misc/                # Home / SpeechDiagnostic / TrainingHistory (history calendar)
│       └── utils/                   # api / speech (multi-source) / answerCheck (smart grading) / checkAnswer
│
├── server/                          # Express backend
│   ├── index.js                     # Entry point (route mounting)
│   ├── auth.js                      # Auth middleware (requireAuth / requireAdmin)
│   ├── routes/                      # 20 route files (see the API docs)
│   ├── db/
│   │   ├── database.js              # SQLite connection (better-sqlite3)
│   │   ├── migrate.js               # Basic table creation
│   │   ├── migrate_v4..v19.js       # Versioned migrations (idempotent)
│   │   ├── seed.js                  # Seed data
│   │   ├── word_bank.json           # Full definitions for 2,319 IELTS words
│   │   └── v6_meanings.json         # Full Youdao definitions for 2,318 words
│   ├── scripts/                     # enrichSynonyms (synonym library) / fixPetDefs / fixSingleCharDefs / DeepSeek expansion, etc.
│   └── .env                         # DEEPSEEK_API_KEY
│
├── deploy.ps1                       # One-click deployment script (Tencent Cloud)
├── start.bat                        # One-click local start
├── RELEASE-REPORT.md                # Full release report
├── KV-STORAGE.md                    # KV storage system design document
└── AGENTS.md / CLAUDE.md            # AI collaboration conventions
```

---

## API Reference

> Authentication: everything except `/api/auth/*` requires `Authorization: Bearer <token>` (returned at login).

### Auth and Users
| Method | Path | Description |
|------|------|------|
| POST | `/api/auth/register` | Register (the first user automatically becomes an administrator and inherits the old data) |
| POST | `/api/auth/login` | Log in (returns token + user info) |
| POST | `/api/auth/logout` | Log out (invalidates the token) |
| GET | `/api/auth/me` | Current user info |

### Administration
| Method | Path | Description |
|------|------|------|
| GET | `/api/admin/users` | User list + per-user statistics (Admin required) |
| POST | `/api/admin/users/:id/reset-password` | Reset password (kicks out all sessions) |
| POST | `/api/admin/users/:id/toggle-status` | Enable/disable an account |

### Vocabulary and Learning
| Method | Path | Description |
|------|------|------|
| GET | `/api/topics` | Topic list and statistics |
| GET | `/api/words?topic=&page=&limit=&search=` | Paginated/searchable words |
| GET | `/api/words/:id` | Word details |
| GET | `/api/lists` | 24 List metadata entries + mastery progress |
| GET | `/api/lists/:listNo/words` | All words in a List (with definitions + keywords + synonyms + mastery status) |
| POST | `/api/lists/:listNo/dictation` | Submit dictation results |
| GET | `/api/spelling-test?topic=&count=` | Generate spelling test questions |
| POST | `/api/spelling-test` | Submit spelling results |
| GET | `/api/meaning-test?mode=meaning\|mixed&count=` | Generate meaning judgement questions (lenient grading) |
| POST | `/api/meaning-test` | Submit meaning judgement results |
| GET | `/api/review-words` | Words due for review today (SM-2) |
| POST | `/api/review-result` | Submit review results |
| GET | `/api/wrong-words` | Wrong-word book |

### Daily Training
| Method | Path | Description |
|------|------|------|
| GET | `/api/daily-plan` | Today's briefing (target duration/debt/reasons/today's List/spot-check tasks/warm-up words/**full pending-relearning list/today's completion state**) |
| GET | `/api/daily-plan/status` | Today's training status (remaining duration) |
| GET | `/api/daily-plan/resume` | **Resume-from-breakpoint info (most recent unfinished session + batch progress)** |
| POST | `/api/daily-plan/settings` | Switch study mode (sequential/custom List) |
| POST | `/api/daily-plan/spot-check` | Submit spot-check results (pass at ≥80%) |
| GET | `/api/daily-plan/test-spot-check` | Simulated spot check for the test account |
| POST | `/api/daily-plan/complete` | Mark the day as complete |
| POST | `/api/training/start` | Start a training session (returns the word list/spelling words/batches) |
| POST | `/api/training/spell-check` | Submit the spelling spot check (≥80% passes / otherwise pending relearning) |
| POST | `/api/training/complete` | Complete training (records duration + accuracy + **writes the training summary**) |
| POST | `/api/training/abandon` | Wrap up (saves progress + **completed batches**, debt is still calculated normally) |

### Training Summaries (V7.3.1)
| Method | Path | Description |
|------|------|------|
| GET | `/api/training/summaries?limit=` | Training summary list (word-level detail + duration + accuracy) |
| GET | `/api/training/summaries/:id` | Single summary details |

### Writing
| Method | Path | Description |
|------|------|------|
| GET | `/api/writing-questions?task_type=` | Writing question list |
| GET | `/api/writing-questions/:id` | Single question details |
| POST | `/api/essays/submit` | Submit an essay + AI grading |
| GET | `/api/essays/:id/result` | Grading result (four criteria) |
| GET | `/api/essays/history` | History |
| GET | `/api/stats/overview` | Study overview statistics |

### Settings and KV Storage
| Method | Path | Description |
|------|------|------|
| GET | `/api/settings` | Read settings (with fallback to the legacy table) |
| PUT | `/api/settings` | Update settings (written to KV as well) |
| GET | `/api/user-kv?keys=k1,k2` | Read user KV (filterable) |
| GET | `/api/user-kv/:key` | Read a single key |
| PUT | `/api/user-kv` | Batch write KV (body: `{key: value}`) |
| DELETE | `/api/user-kv/:key` | Delete a key (idempotent) |

### Announcements
| Method | Path | Description |
|------|------|------|
| GET | `/api/announcements` | Unread announcement list |
| POST | `/api/announcements/:id/seen` | Mark as read |

### Other
| Method | Path | Description |
|------|------|------|
| GET | `/api/health` | Health check |

---

## Database Design

> SQLite (better-sqlite3), migration scripts are idempotent and repeatable (migrate_v4 ~ v19).

| Table | Purpose | Key Fields |
|----|------|----------|
| `users` | Users | username/password_hash/is_admin/status/is_test/study_mode/custom_list_no |
| `sessions` | Login sessions | token/expires_at |
| `words` | Vocabulary (4,237 words) | word/phonetic/chinese_definition/list_no/level/is_extra/topic/source |
| `word_meanings` | Full multiple-sense definitions | meanings(JSON)/keywords(JSON)/**synonyms(JSON synonyms)**/source |
| `user_word_progress` | Study progress (per word per user) | ease_factor/interval_days/repetitions/mastered/review dates |
| `list_completion` | List completion status | first_completed_date/spot_check_date/pending_review/reback_completed_date |
| `daily_sessions` | Daily training sessions | list_no/batch_size/**completed_batches (resume from breakpoint)**/duration_seconds/completed |
| `daily_session_words` | Per-word detail within a session | main_correct/spelling_correct/acceptance_correct |
| `training_summaries` | **Training summaries (V7.3.1)** | list_no/duration_seconds/accuracy per stage/**word_stats (word-level right/wrong JSON)** |
| `writing_questions` | Writing past papers | task_type/chart_type/model_essay |
| `essay_submissions` | Essay submissions | scores_json/feedback_json |
| `user_kv` | **KV user memory storage** | key/value(JSON)/updated_at |
| `user_settings` | Legacy settings table (kept for compatibility) | voice_source/rest_minutes etc. |
| `announcements` | Version announcements | version(unique)/title/content |
| `user_announcements` | Announcement read records | user_id+announcement_id |

---

## User Memory KV Storage System

> Design document: `KV-STORAGE.md`. Goal: **from now on, adding any new user data field no longer requires writing a database migration.**

### Architecture
```
Frontend useUserKV() hook
  ├── In-memory cache (React state, O(1) reads and writes)
  ├── localStorage cache (speeds up startup across sessions)
  └── Server-side user_kv table (persistence)
       ├── PUT /api/user-kv   → batch upsert
       ├── GET /api/user-kv   → read (supports keys filtering)
       └── DELETE /api/user-kv/:key → delete
```

### Key Naming Convention
`namespace.camelCaseKey`, e.g. `settings.voiceSource`, `training.pomodoro`, `ui.theme`

### Usage Example
```js
const { get, set, remove } = useUserKV();
set('settings.voiceSource', 'youdao');   // automatic optimistic update + server sync
get('settings.voiceSource');              // synchronous read from cache
remove('ui.legacyKey');                   // delete
```

### Design Principles
- Optimistic updates: write to the cache first for immediate effect, sync to the server asynchronously, roll back automatically on failure
- High-frequency structured data (study progress, SM-2, etc.) stays in relational tables; KV carries settings/preferences/metadata
- The legacy `user_settings` table is kept read-only for compatibility; all settings reads and writes have migrated to KV

---

## Keyboard Shortcuts

### Global
| Key | Behaviour |
|------|------|
| `?` | Show/hide the shortcut help panel |
| `/` | Focus the top search box |
| `Esc` | Close the modal / go back one level |

### Memorisation and Tests
| Key | Scenario | Behaviour |
|------|------|------|
| `Enter` | Word list/dictation/spelling | Submit the answer / next |
| `Space` | Word-related | Read the current word aloud |
| `← →` | Card flip/wrong-word book | Previous/next |
| `1` / `2` | Word list | Mark known / unknown |
| `1-6` | Spaced repetition | Quickly select the recall level |
| `1-4` | Meaning judgement | Select a definition option |

### Writing
| Key | Behaviour |
|------|------|
| `Ctrl+Enter` | Submit the essay (with confirmation) |
| `Tab` | Insert a 2-space indent |
| `Ctrl+S` | Save the draft |

---

## Speech System (Multiple Sources)

> Tool: `client/src/utils/speech.js`; the source can be switched on the settings page.

| Source | Characteristics | Dependency |
|------|------|------|
| Local speech | Web Speech API, works offline, most reliable | An English voice installed on the system |
| Youdao Dictionary | Real human pronunciation, US/UK selectable | Internet (no key required) |
| Baidu Translate | Clear and natural | Internet (no key required) |

- Network sources fall back to local speech automatically on failure
- Local speech must be called synchronously (a Chrome restriction); network sources play through `<audio>`
- Both card faces have a read-aloud button; the `Space` shortcut works globally

---

## Spaced Repetition Algorithm

A simplified SM-2 algorithm (`user_word_progress` table):
- Each review adjusts the interval based on the rating (0-5)
- `quality ≥ 3` (remembered): `interval = interval × ease_factor`
- `quality < 3` (not remembered): reset to 1 day
- Ease factor range: 1.3 - 2.5+
- 3 correct answers in a row → marked "mastered" (mastered=1)

---

## DeepSeek AI Grading

Writing grading is based on the **DeepSeek API**, scoring against the four IELTS criteria:
1. Task Achievement / Task Response
2. Coherence and Cohesion
3. Lexical Resource
4. Grammatical Range and Accuracy

```bash
# Edit server/.env
DEEPSEEK_API_KEY=sk-your-api-key-here
```

> 💡 When no API key is configured, local heuristic scoring is used (word count/complexity/structure) so the feature stays usable.

---

## Deployment

### One-Click Local Start
```bash
start.bat
```

### Tencent Cloud Deployment (deploy.ps1)
```powershell
# Prerequisite: passwordless ssh root@<your-server-ip> is configured
powershell -File deploy.ps1
```

Deployment flow (6 steps):
1. Local `git push` (including the deploy checkpoint empty commit)
2. Server `git pull --ff-only`
3. Server installs dependencies (server `--omit=dev` + client)
4. Server runs `npm run migrate:all`
5. Server builds the frontend (`npm run build`)
6. `pm2 restart ielts-server` + health check (API /api/health + frontend 200)

> Server environment: Ubuntu 24.04 · pm2 daemon · nginx reverse proxy (`/api/` → :3001, static → client/dist)
>
> Note: DeepSeek-expanded data such as the synonym library is generated independently on the server with `node scripts/enrichSynonyms.js` (and `--pet`), outside the deployment flow.

---

## Data Scale and Tech Stack

### Data Scale
| Item | Count |
|----|------|
| Vocabulary | 4,237 words (PET 2,014 + IELTS 1,941 + real-exam selection 282) |
| IELTS Lists | 24 (about 100 words per List, all with 2+ deep definitions + synonyms) |
| PET words | 2,014 words (all with keywords + synonyms + single-character core-sense fixes) |
| Writing questions | 30 Cambridge past papers (Task 1 × 15 + Task 2 × 15) |

### Tech Stack
| Layer | Technology |
|----|------|
| Frontend | React 18 · Vite 8 · Tailwind CSS 4 · React Router · Lucide React · Recharts |
| Backend | Node.js · Express 5 |
| Database | SQLite (better-sqlite3, WAL mode) |
| Authentication | bcryptjs + Bearer Token (30-day session) |
| AI | DeepSeek API (deepseek-chat) — writing grading + synonym library generation |
| Deployment | Tencent Cloud Lighthouse · pm2 · nginx |

---

## Version Naming Convention

Enforced uniformly since V7.2.3:

| Digit | Meaning | Trigger Condition |
|----|------|----------|
| Major | Significant rework/architectural refactor | Flow rework, data system rebuild, new core module |
| Minor | New features | New page, new interaction, new module |
| Patch | Bug fixes | Defect fixes, experience improvements, copy adjustments |

**Convention**:
1. Commit messages start with `V X.X.X:`
2. On every version update: update this README's version history + `RELEASE-REPORT.md` + create a version announcement (migrate_vN.js)
3. Tag the git release: `git tag V7.3.1`
4. All new user data goes through KV (`useUserKV().set()`), with no database migration needed

---

*Documentation maintained: updated continuously with each version · Last updated 2026-08-21 (V7.4.5)*

---

# 📚 IELTS 6.5 智能备考训练网站（V7.4.5）

> 基于 **React + Express + SQLite** 的雅思（IELTS）6.5 分目标备考平台
> 当前版本：**V7.4.5** · GitHub：`https://github.com/Lowlife555/ielts-training`

---

## 📑 目录

1. [项目简介](#项目简介)
2. [功能总览](#功能总览)
3. [每日训练流程](#每日训练流程)
4. [智能判分系统](#智能判分系统)
5. [版本记录](#版本记录)
6. [快速启动](#快速启动)
7. [项目结构](#项目结构)
8. [API 接口文档](#api-接口文档)
9. [数据库设计](#数据库设计)
10. [用户记忆 KV 存储系统](#用户记忆-kv-存储系统)
11. [键盘快捷键](#键盘快捷键)
12. [朗读系统（多音源）](#朗读系统多音源)
13. [间隔复习算法](#间隔复习算法)
14. [DeepSeek AI 批改](#deepseek-ai-批改)
15. [部署](#部署)
16. [数据规模与技术栈](#数据规模与技术栈)
17. [版本命名规范](#版本命名规范)

---

## 项目简介

面向 **IELTS 6.5 分目标**的智能备考平台，核心解决两大需求：

- **单词背诵**：4,237 词分级词库（PET 基础 2,014 + IELTS 进阶 1,941 + 真题精选 282），支持 List 分册背诵、3D 翻卡、中文默写、词义判定、间隔复习（艾宾浩斯）、抽查验收、欠债激励机制、断点续训
- **写作训练**：30 道剑桥真题，编辑器自动保存草稿，DeepSeek AI 按雅思四项标准批改（未配置 Key 时降级为启发式评分）

特色：智能判分（拼写容错 + 近义词库）、番茄钟分批背诵、多音源朗读（本地/有道/百度）、训练结算与历史日历、触屏与桌面双模式、暗黑模式、用户数据云端 KV 存储、多用户数据隔离与 Admin 管理。

---

## 功能总览

### 🗓️ 每日训练（核心闭环）
| 环节 | 说明 |
|------|------|
| 今日简报 | 目标时长（60+欠债，上限 120min）、原因、今日 List、抽查任务、热身词数；**完成后显示完成横幅 + 待重背清单** |
| 断点续训 | 中途退出保留批次进度，简报显示"从断点继续 / 本批重学" |
| PET 热身 | 10 词：前 5 中译英 + 后 5 英译中，系统判分，不计时不计分 |
| 单词表背诵 | 番茄钟分批（30/40/50/100 词/批），3D 翻卡：正面=单词+音标+完整释义，点击翻面隐藏释义，正反面均可朗读，1/2 键标记会/不会 |
| 中文默写 | 看英文默写中文，**答对答错都停留展示对/错与完整释义，点「下一个」手动前进**；关键词+近义词宽松判分；答错自动重测，下一轮剔除已通过词 |
| 抽查 | **看英文输入中文，系统判分**（与默写形式一致），正确率 ≥80% 通过，否则 List 标记待重背 |
| 拼写抽查 | 今日背过词随机 30 词（看中文拼英文），≥80% 通过 |
| 验收 | 漏网之鱼全拼对才算完成当日任务 |
| 训练结算 | 完成训练后**弹窗展示词级明细**（每个词错了几次 + 用时 + 各环节正确率），关闭后可重新打开 |

### 📖 背单词模块
| 功能 | 说明 |
|------|------|
| List 背诵 | 24 个 List（约 100 词/List），整 List 完整释义，单卡翻卡隐藏释义 |
| 中文默写测试 | 按 List 出题，关键词+近义词判分，错词重测直至全对 |
| 词义判定 | 看单词选释义（4 选项，展示完整多义项=宽松判），支持词义/拼写混合模式 |
| 拼写测试 | 看中文拼英文（拼写容错） |
| 间隔复习 | SM-2 算法，到期自动提醒 |
| 错词本 | 复习所有答错过 2 次以上的词 |
| 话题浏览 | 8 大话题卡片（原 282 真题词体系） |

### ✍️ 写作模块
- 真题列表（Task 1/2 筛选）
- 编辑器：`Ctrl+S` 存草稿、`Tab` 缩进、30 秒自动保存
- 提交后 DeepSeek 四项标准批改 + 雷达图

### 👤 用户系统
- 注册/登录（bcrypt 加密 + Bearer Token 30 天会话）
- 数据隔离：全路由按用户隔离
- Admin 面板：用户列表/统计/重置密码/禁用
- 测试账号 `admin_test`：免惩罚机制 + 测试面板任意跳转
- 首个注册用户自动继承原数据并成为管理员

### ⚙️ 设置（顶部齿轮进入）
| 设置项 | 选项 |
|--------|------|
| 读音音源 | 本地语音（离线）/ 有道词典（美/英音）/ 百度翻译 |
| 音色 | 美音 / 英音 |
| 音标显示 | 开 / 关 |
| 番茄钟休息时长 | 3 / 5 / 10 分钟 |
| 每日目标时长 | 30 / 45 / 60 / 90 / 120 分钟（联动欠债系统） |
| 训练历史 | **日历样式查看每次训练结算**（词级明细） |
| 数据管理 | 清缓存 / 导出设置 / 恢复默认 |

> 所有设置存储于服务端 **user_kv** 表，任何设备登录即同步。

### 📱 双模式与外观
- 触屏模式：底部标签栏 + 滑动翻卡 + 更大点击区域
- 桌面模式：顶部导航 + 键盘快捷键
- 暗黑模式（太阳/月亮切换）、界面模式自动检测
- 环境徽标：本地 laptop（浅黄）/ 服务器 server（浅灰）

---

## 每日训练流程

```
今日简报 (目标时长 = 60 + 欠债，上限 120min；含断点续训入口)
  └─ PET 热身 (10词：前5中译英 + 后5英译中，不计时不计分)
  └─ 单词表背诵 (番茄钟分批 30/40/50/100 词，3D 翻卡 + 会/不会标记)
  └─ 中文默写 (关键词+近义词判分，对错都停留展示完整释义，手动前进，错词重测剔除已通过词)
  └─ 休息 (3/5/10 分钟可跳过，不计入时长)
  └─ 抽查 (看英文输入中文，≥80% 通过)
  └─ 拼写抽查 (今日背过词随机 30 词，≥80% 通过)
  └─ 验收 (漏网之鱼全对 → 今日完成)
  └─ 训练结算 (弹窗：词级明细 + 用时 + 正确率)
```

### 欠债规则（时间盒）
| 场景 | 惩罚 |
|------|------|
| 当日未训练 | 欠债 +30 分钟 |
| 训练时长 < 目标 - 15min 且未验收通过 | 欠债 +30 分钟 |
| 验收通过当日 | 不加罚（旧债保留） |
| 练满 2 小时 | 全部结清，次日回到基准目标 |
| 测试账号 | 恒 60 分钟，永不欠债 |

### 抽查与待重背
- 完成背诵 ≥3 天的 List 触发抽查（随机 30 词，≥80% 通过）
- 抽查/拼写不达标 → List 标记 `pending_review`，次日简报优先安排重背
- 今日简报列出**全部待重背 List**（`pendingReviewLists`）

### 断点续训（V7.3.1）
- 中途 Esc 退出时保存 `completed_batches`（已完成批次）
- 下次简报显示"上次进度：List X 已完成 N 批"，可选择**从断点继续**或**本批重学**

---

## 智能判分系统

> 工具：`client/src/utils/answerCheck.js`（统一判分）+ `server/scripts/enrichSynonyms.js`（近义词库）

### 英文拼写判分 `checkEnglishAnswer`
| 层级 | 规则 | 例子 |
|------|------|------|
| ① 精确匹配 | 忽略大小写 | `Silence` = `silence` ✓ |
| ② 词形归一化 | 复数/过去式/进行时 | `studies`→`study`、`studied`→`study` ✓ |
| ③ 编辑距离 ≤1 | 增/删/改/换位一个字符 | `silense`→`silence` ✓ |
| 安全保护 | 输入是常见独立词时禁用编距 | `quite` ≠ `quiet` ✗ |

### 中文释义判分 `checkChineseAnswer`
| 层级 | 规则 |
|------|------|
| ① 关键词宽松判分 | 助词剥离 + 双向包含（如"位于..."→"位于"） |
| ② 近义词库命中 | `word_meanings.synonyms`（如释义"寂静"，写"安静"也判对） |
| 单字处理 | 单字关键词/近义词精确匹配（`糖` 只认 `糖`，不认"糖水"） |

### 场景分级
| 场景 | 词形变化 | 编辑距离 | 近义词 |
|------|---------|---------|--------|
| 学习（默写/热身/ListDictation/拼写练习） | ✅ | ✅ | ✅ |
| 考核（验收/拼写抽查） | ✅ | ❌ | ❌ |

### 近义词库数据
- **IELTS 词**：2,318 词全量扩充（DeepSeek 批量生成，`enrichSynonyms.js`）
- **PET 词**：与 IELTS 同批扩充分义（keywords + synonyms + 单字核心义 + 空释义/脏词名修复）
- 生成脚本幂等 + 断点续跑（checkpoint），独立于部署流程

---

## 版本记录

> 版本号采用 **V 主.次.补丁**（SemVer）：主版本=重大改版，次版本=新功能，补丁=修复。
> 每个版本对应 git tag（V2.0.0 ~ V7.4.5），可随时回滚。

| 版本 | 日期 | 开发 Agent | 核心内容 |
|------|------|-----------|---------|
| V1.0.0 | 2026-08-05 | Claude Code + DeepSeek V4 | 初始版本：脚手架 + 数据库 + 14 API + 282 真题词 + 30 写作题 |
| V2.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | 验收后修复：user_id 动态化、语音、空 catch 吞错、评分按钮颜色 |
| V3.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | 每日单词训练系统 + 4237 词词库 |
| V3.0.1 | 2026-08-06 | Claude Code + DeepSeek V4 | 修复语音发音：改用本地 Microsoft 离线语音 |
| V3.0.2 | 2026-08-06 | Claude Code + DeepSeek V4 | 交付前修复：词汇隔离、端口统一、反馈延时、自动保存等 |
| V4.0.0 | 2026-08-07 | Claude Code + DeepSeek V4 | 词库整理：List 1-24 编号、释义三级补齐、list_no/is_extra 字段 |
| V4.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 今日简报 + 每日流程重构 + 时间盒与欠债系统 |
| V4.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 抽查机制：背完 3-4 天后随机抽查 30 词 ≥80% 通过 |
| V4.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 释义深度扩充：DeepSeek 批量 756 词，全部 IELTS 词 2+ 义项 |
| V5.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 用户系统：注册/登录/数据隔离/Admin 管理/环境徽标 |
| V5.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 测试账号 admin_test + 暗黑模式 |
| V5.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 学习模式选择：顺序/自定义 List（插队不丢进度） |
| V5.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏适配：滑动翻卡/底部标签栏/我的页面 |
| V5.3.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏交互修复 + 前端目录按功能域重组 |
| V5.4.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏切回桌面入口 + 新版本公告系统 |
| V6.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 词义判定测试（宽松判）+ 词义/拼写混合模式 + 有道全量释义抓取(2318词) |
| V7.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | List 背诵（整 List 释义+显隐开关）+ 中文默写测试，移除旧单词卡入口 |
| V7.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 番茄钟分批背诵 + 拼写抽查（随机30词≥80%）+ 词数现选 |
| V7.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 3D 翻卡背诵 + 热身输入判分 + 多音源朗读 + 设置页 + 宽松判分 + 重测剔除已通过词 |
| V7.2.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 修复热身：自动跳词/无法进入下一环节 |
| V7.2.2 | 2026-08-12 | opencode (deepseek-v4-flash-free) | 修复热身反馈停留/单卡翻卡 + 设置齿轮入口 + KV 用户记忆存储系统 |
| V7.2.3 | 2026-08-12 | opencode (deepseek-v4-flash-free) | 修复翻卡背面滚动条 + 翻卡正反两面读音 + 版本命名规范确立 |
| V7.2.4 | 2026-08-12 | opencode (deepseek-v4-flash-free) | 判分优化：拼写容错（词形+编辑距离≤1）+ 近义词库（IELTS 2318/PET 1720 全量）+ PET 词库修复 + 场景分级 |
| V7.3.1 | 2026-08-14 | opencode (deepseek-v4-flash-free) | 默写对错手动前进+答对完整释义 + 抽查改输入判分 + 修复验收页崩溃(拼写无法提交) + 训练结算弹窗/历史日历页 + 断点续训 + 简报完成态/待重背清单 |
| V7.4.0 | 2026-08-18 | DeepSeek Harness | 学习留痕 + 学习报告（study_events 表）+ 翻卡交互优化（点不会翻回释义面）+ 背诵界面自测功能（测不会词/错词循环/可退回） |
| V7.4.1 | 2026-08-18 | DeepSeek Harness | 拼写自背+自测（全 List 翻卡会/不会标记）+ 全部测试环节改手动前进 + 苹果风页面美化 + 修复拼写抽查卡死 |
| V7.4.2 | 2026-08-19 | DeepSeek Harness | 记忆进度系统：单词级进度快照双写（localStorage+服务器 DB）、全环节覆盖、打断精确恢复/手动退出回环节起点 |
| V7.4.3 | 2026-08-19 | opencode (deepseek-v4-flash-free) | 修复抽查按 Enter 直接跳下一词 + 热身双 Enter 触发隐患 + 独立拼写/词义判定改手动前进（答对也展示答案） |
| V7.4.4 | 2026-08-21 | — | 修复休息倒计时后台漂移：逐秒 setInterval 改为时间戳差值（250 ms tick），切后台/锁屏不再变慢 |
| V7.4.5 | 2026-08-21 | — | 中译英选词优化：真题拼写词（2255）优先 + 牛津 5000（4054）兜底 + 剩余随机补足，保证每天至少 20 词 |

---

## 快速启动

### 前置要求
- Node.js ≥ 18（开发使用 v26.5.0）
- npm

### 安装与运行

```bash
# 1. 安装依赖
cd client && npm install
cd ../server && npm install

# 2. 初始化数据库（建表 + 导入 4237 词 + 30 写作题 + 全部迁移）
cd server && npm run setup

# 3. 启动后端 (端口 3001)
cd server && npm run dev

# 4. 启动前端 (端口 5174)
cd client && npm run dev
```

浏览器打开 `http://localhost:5174`

> 生产环境部署见 [部署](#部署) 章节。

### 数据库脚本
| 命令 | 说明 |
|------|------|
| `npm run setup` | 全量初始化（建表 + 种子 + 全部迁移） |
| `npm run migrate:all` | 仅执行全部迁移（幂等，可重复） |
| `npm run migrate` | 基础建表 |
| `npm run seed` | 种子数据（词库 + 写作题） |

---

## 项目结构

```
ielts-training/
├── client/                          # React 前端 (Vite + Tailwind CSS 4)
│   └── src/
│       ├── App.jsx                  # 路由 + Provider 层级
│       ├── index.css                # Tailwind + 翻卡 3D 动画
│       ├── components/
│       │   ├── layout/              # Navbar / MobileTabBar / FloatingActions
│       │   ├── training/            # TrainingTimer / FirstVisitHint / SummaryModal(结算弹窗)
│       │   └── ui/                  # FlipCard(3D翻卡) / Toast / KeyboardHelp / VersionNotice / Loading / ErrorBoundary
│       ├── context/                 # Auth / Settings / Theme / Touch / App / UserKV(记忆存储)
│       ├── hooks/                   # useKeyboard / useSwipe / useTimer
│       ├── pages/
│       │   ├── daily/               # TodayBriefing / PetWarmup / MainStudy / SpotCheck / SpellingPractice / SpellCheck / AcceptanceTest / DailyReport
│       │   ├── words/               # Lists / ListStudy / ListDictation / MeaningTest / SpellingTest / ReviewWords / WrongWords / Topics / WordList / WordStudy
│       │   ├── writing/             # WritingQuestions / WritingEditor / WritingResult / History
│       │   ├── user/                # Login / Register / Admin / Me / Settings
│       │   └── misc/                # Home / SpeechDiagnostic / TrainingHistory(历史日历)
│       └── utils/                   # api / speech(多音源) / answerCheck(智能判分) / checkAnswer
│
├── server/                          # Express 后端
│   ├── index.js                     # 入口（路由挂载）
│   ├── auth.js                      # 认证中间件（requireAuth / requireAdmin）
│   ├── routes/                      # 20 个路由文件（见 API 文档）
│   ├── db/
│   │   ├── database.js              # SQLite 连接 (better-sqlite3)
│   │   ├── migrate.js               # 基础建表
│   │   ├── migrate_v4..v19.js       # 版本化迁移（幂等）
│   │   ├── seed.js                  # 种子数据
│   │   ├── word_bank.json           # 2319 IELTS 词完整释义
│   │   └── v6_meanings.json         # 2318 词有道全量释义
│   ├── scripts/                     # enrichSynonyms(近义词库) / fixPetDefs / fixSingleCharDefs / DeepSeek 扩充等
│   └── .env                         # DEEPSEEK_API_KEY
│
├── deploy.ps1                       # 一键部署脚本（腾讯云）
├── start.bat                        # 本地一键启动
├── RELEASE-REPORT.md                # 完整更新报告
├── KV-STORAGE.md                    # KV 存储系统设计文档
└── AGENTS.md / CLAUDE.md            # AI 协作规范
```

---

## API 接口文档

> 认证：除 `/api/auth/*` 外均需 `Authorization: Bearer <token>`（登录返回）。

### 认证与用户
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（首个用户自动成为管理员并继承旧数据） |
| POST | `/api/auth/login` | 登录（返回 token + 用户信息） |
| POST | `/api/auth/logout` | 登出（作废 token） |
| GET | `/api/auth/me` | 当前用户信息 |

### 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表 + 每用户统计（需 Admin） |
| POST | `/api/admin/users/:id/reset-password` | 重置密码（踢出全部会话） |
| POST | `/api/admin/users/:id/toggle-status` | 启用/禁用账号 |

### 词库与学习
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/topics` | 话题列表及统计 |
| GET | `/api/words?topic=&page=&limit=&search=` | 分页/搜索单词 |
| GET | `/api/words/:id` | 单词详情 |
| GET | `/api/lists` | 24 个 List 元数据 + 掌握进度 |
| GET | `/api/lists/:listNo/words` | List 全部词（含释义+关键词+近义词+掌握状态） |
| POST | `/api/lists/:listNo/dictation` | 默写结果提交 |
| GET | `/api/spelling-test?topic=&count=` | 拼写测试出题 |
| POST | `/api/spelling-test` | 拼写结果提交 |
| GET | `/api/meaning-test?mode=meaning\|mixed&count=` | 词义判定出题（宽松判） |
| POST | `/api/meaning-test` | 词义判定结果提交 |
| GET | `/api/review-words` | 今日待复习单词（SM-2） |
| POST | `/api/review-result` | 复习结果提交 |
| GET | `/api/wrong-words` | 错词本 |

### 每日训练
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily-plan` | 今日简报（目标时长/欠债/原因/今日List/抽查任务/热身词/**全部待重背列表/今日完成态**） |
| GET | `/api/daily-plan/status` | 今日训练状态（剩余时长） |
| GET | `/api/daily-plan/resume` | **断点续训信息（最近未完成会话+批次进度）** |
| POST | `/api/daily-plan/settings` | 切换学习模式（顺序/自定义 List） |
| POST | `/api/daily-plan/spot-check` | 提交抽查结果（≥80% 通过） |
| GET | `/api/daily-plan/test-spot-check` | 测试账号抽查模拟 |
| POST | `/api/daily-plan/complete` | 标记当日完成 |
| POST | `/api/training/start` | 开始训练会话（返回词表/拼写词/批次） |
| POST | `/api/training/spell-check` | 拼写抽查提交（≥80% 判通过/待重背） |
| POST | `/api/training/complete` | 完成训练（记录时长+正确率+**写训练结算**） |
| POST | `/api/training/abandon` | 收工（保存进度+**已完成批次**，欠债照常计算） |

### 训练结算（V7.3.1）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/training/summaries?limit=` | 训练结算列表（词级明细+时长+正确率） |
| GET | `/api/training/summaries/:id` | 单条结算详情 |

### 写作
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/writing-questions?task_type=` | 写作题目列表 |
| GET | `/api/writing-questions/:id` | 单题详情 |
| POST | `/api/essays/submit` | 提交作文 + AI 批改 |
| GET | `/api/essays/:id/result` | 批改结果（四项评分） |
| GET | `/api/essays/history` | 历史记录 |
| GET | `/api/stats/overview` | 学习概览统计 |

### 设置与 KV 存储
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 读取设置（兼容旧表回退） |
| PUT | `/api/settings` | 更新设置（同步写入 KV） |
| GET | `/api/user-kv?keys=k1,k2` | 读取用户 KV（可过滤） |
| GET | `/api/user-kv/:key` | 读取单 key |
| PUT | `/api/user-kv` | 批量写入 KV（body: `{key: value}`） |
| DELETE | `/api/user-kv/:key` | 删除 key（幂等） |

### 公告
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/announcements` | 未读公告列表 |
| POST | `/api/announcements/:id/seen` | 标记已读 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

---

## 数据库设计

> SQLite（better-sqlite3），迁移脚本幂等可重复执行（migrate_v4 ~ v19）。

| 表 | 用途 | 关键字段 |
|----|------|----------|
| `users` | 用户 | username/password_hash/is_admin/status/is_test/study_mode/custom_list_no |
| `sessions` | 登录会话 | token/expires_at |
| `words` | 词库（4,237 词） | word/phonetic/chinese_definition/list_no/level/is_extra/topic/source |
| `word_meanings` | 完整多义项释义 | meanings(JSON)/keywords(JSON)/**synonyms(JSON 近义词)**/source |
| `user_word_progress` | 学习进度（每词每用户） | ease_factor/interval_days/repetitions/mastered/复习日期 |
| `list_completion` | List 完成状态 | first_completed_date/spot_check_date/pending_review/reback_completed_date |
| `daily_sessions` | 每日训练会话 | list_no/batch_size/**completed_batches(断点续训)**/duration_seconds/completed |
| `daily_session_words` | 会话内单词明细 | main_correct/spelling_correct/acceptance_correct |
| `training_summaries` | **训练结算（V7.3.1）** | list_no/duration_seconds/各环节正确率/**word_stats(词级对错 JSON)** |
| `writing_questions` | 写作真题 | task_type/chart_type/model_essay |
| `essay_submissions` | 作文提交 | scores_json/feedback_json |
| `user_kv` | **KV 用户记忆存储** | key/value(JSON)/updated_at |
| `user_settings` | 旧设置表（兼容保留） | voice_source/rest_minutes 等 |
| `announcements` | 版本公告 | version(唯一)/title/content |
| `user_announcements` | 公告已读记录 | user_id+announcement_id |

---

## 用户记忆 KV 存储系统

> 设计文档：`KV-STORAGE.md`。目标：**以后新增任何用户数据字段都不需要再写数据库迁移。**

### 架构
```
前端 useUserKV() hook
  ├── 内存缓存（React state，读写 O(1)）
  ├── localStorage 缓存（跨会话加速启动）
  └── 服务端 user_kv 表（持久化）
       ├── PUT /api/user-kv   → 批量 upsert
       ├── GET /api/user-kv   → 读取（支持 keys 过滤）
       └── DELETE /api/user-kv/:key → 删除
```

### Key 命名规范
`命名空间.camelCaseKey`，如 `settings.voiceSource`、`training.pomodoro`、`ui.theme`

### 使用示例
```js
const { get, set, remove } = useUserKV();
set('settings.voiceSource', 'youdao');   // 自动乐观更新 + 服务端同步
get('settings.voiceSource');              // 同步读取缓存
remove('ui.legacyKey');                   // 删除
```

### 设计原则
- 乐观更新：先写缓存立即生效，异步同步服务端，失败自动回滚
- 高频结构化数据（学习进度 SM-2 等）保留关系表，KV 承担设置/偏好/元数据
- 旧 `user_settings` 表保留只读兼容，设置读写已全部迁移至 KV

---

## 键盘快捷键

### 全局
| 按键 | 行为 |
|------|------|
| `?` | 显示/隐藏快捷键帮助面板 |
| `/` | 聚焦顶部搜索框 |
| `Esc` | 关闭弹窗 / 返回上一级 |

### 背诵与测试
| 按键 | 场景 | 行为 |
|------|------|------|
| `Enter` | 单词表/默写/拼写 | 提交答案 / 下一个 |
| `Space` | 单词相关 | 朗读当前单词 |
| `← →` | 翻卡/错词本 | 上一个/下一个 |
| `1` / `2` | 单词表 | 标记 会 / 不会 |
| `1-6` | 间隔复习 | 快速选择记忆程度 |
| `1-4` | 词义判定 | 选择释义选项 |

### 写作
| 按键 | 行为 |
|------|------|
| `Ctrl+Enter` | 提交作文（二次确认） |
| `Tab` | 插入 2 空格缩进 |
| `Ctrl+S` | 保存草稿 |

---

## 朗读系统（多音源）

> 工具：`client/src/utils/speech.js`，音源可在设置页切换。

| 音源 | 特性 | 依赖 |
|------|------|------|
| 本地语音 | Web Speech API，离线可用，最稳 | 系统安装英文语音 |
| 有道词典 | 真人发音，美音/英音可选 | 联网（免 key） |
| 百度翻译 | 清晰自然 | 联网（免 key） |

- 网络音源失败自动回退本地语音
- 本地语音必须同步调用（Chrome 限制），网络音源用 `<audio>` 播放
- 翻卡正反两面均有朗读按钮；`Space` 快捷键全局可用

---

## 间隔复习算法

采用简化 SM-2 算法（`user_word_progress` 表）：
- 每次复习根据评分（0-5）调整间隔
- `quality ≥ 3`（记得）：`interval = interval × ease_factor`
- `quality < 3`（不记得）：重置为 1 天
- 简易因子范围：1.3 - 2.5+
- 连对 3 次 → 标记"已掌握"（mastered=1）

---

## DeepSeek AI 批改

写作批改基于 **DeepSeek API**，按雅思四项标准评分：
1. Task Achievement / Task Response（任务完成度）
2. Coherence and Cohesion（连贯与衔接）
3. Lexical Resource（词汇资源）
4. Grammatical Range and Accuracy（语法范围与准确性）

```bash
# 编辑 server/.env
DEEPSEEK_API_KEY=sk-your-api-key-here
```

> 💡 未配置 API Key 时使用本地启发式评分（字数/复杂度/结构），保证功能可用。

---

## 部署

### 本地一键启动
```bash
start.bat
```

### 腾讯云部署（deploy.ps1）
```powershell
# 前提：已配置 ssh root@<your-server-ip> 免密
powershell -File deploy.ps1
```

部署流程（6 步）：
1. 本地 `git push`（含 deploy checkpoint 空提交）
2. 服务器 `git pull --ff-only`
3. 服务器安装依赖（server `--omit=dev` + client）
4. 服务器执行 `npm run migrate:all`
5. 服务器构建前端（`npm run build`）
6. `pm2 restart ielts-server` + 健康检查（API /api/health + 前端 200）

> 服务器环境：Ubuntu 24.04 · pm2 守护 · nginx 反向代理（`/api/` → :3001，静态 → client/dist）
>
> 注意：近义词库等 DeepSeek 扩充数据在服务器上用 `node scripts/enrichSynonyms.js`（及 `--pet`）独立生成，不在部署流程内。

---

## 数据规模与技术栈

### 数据规模
| 项 | 数量 |
|----|------|
| 词汇库 | 4,237 词（PET 2,014 + IELTS 1,941 + 真题精选 282） |
| IELTS List | 24 个（约 100 词/List，全部 2+ 义项深度释义 + 近义词） |
| PET 词 | 2,014 词（全部 keywords + 近义词 + 单字核心义修复） |
| 写作题 | 30 道剑桥真题（Task 1 × 15 + Task 2 × 15） |

### 技术栈
| 层 | 技术 |
|----|------|
| 前端 | React 18 · Vite 8 · Tailwind CSS 4 · React Router · Lucide React · Recharts |
| 后端 | Node.js · Express 5 |
| 数据库 | SQLite（better-sqlite3，WAL 模式） |
| 认证 | bcryptjs + Bearer Token（30 天会话） |
| AI | DeepSeek API（deepseek-chat）— 写作批改 + 近义词库生成 |
| 部署 | 腾讯云轻量服务器 · pm2 · nginx |

---

## 版本命名规范

自 V7.2.3 起统一执行：

| 位 | 含义 | 触发条件 |
|----|------|----------|
| 主版本 | 重大改版/架构重构 | 流程重构、数据体系重建、核心模块新增 |
| 次版本 | 新功能 | 新增页面、新交互、新模块 |
| 补丁版本 | Bug 修复 | 修复缺陷、优化体验、文案调整 |

**规范**：
1. commit message 以 `V X.X.X:` 开头
2. 每次版本更新：更新本 README 版本记录 + `RELEASE-REPORT.md` + 创建版本公告（migrate_vN.js）
3. 打 git tag：`git tag V7.3.1`
4. 新增用户数据一律走 KV（`useUserKV().set()`），无需数据库迁移

---

*文档维护：随版本持续更新 · 最近更新 2026-08-21 (V7.4.5)*
