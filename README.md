# CCAR-F Practice App

Practise for the **Claude Certified Architect – Foundations (CCAR-F)** exam and find out where you are weak.

The app has 150 exam-style, scenario-based questions. Every answer option comes with an explanation, and every wrong option is tagged with the *trap* it falls into. As you answer, it tracks your accuracy by exam domain and task statement, brings missed questions back on a spaced schedule, and produces a ranked "study these again" list.

It runs on your own machine with a SQLite file. It needs no account, no login and no network at runtime. Your progress stays in `data/ccaf.db` and is never part of the repo, so each person who clones it starts fresh.

> **Unofficial.** The questions were written by Claude from public study material and are not checked against the real exam. The score shown is an estimate. If an explanation looks wrong, flag it in the app.

## Features
- **Practice sessions** by scenario, domain or task statement, in study mode or test mode, with an optional exam-pace timer.
- **Per-option feedback:** why each option is right or wrong, the trap badge on wrong options, and the key concept being tested.
- **Confidence rating** (Sure / Unsure / Guess) on every answer. It feeds the spaced-repetition queue and the calibration analysis.
- **Review queue:** missed questions return on a Leitner schedule of 1, 3, 7, 14 and 30 days.
- **Weakness report:** mastery per task and domain, the traps you fall for most, blind spots, speed, and a readiness estimate against the 720 pass line.
- **Focus drills:** D1 Deep Drill, D3 Deep Drill, Weak Areas, Trap Buster and Blind Spots.
- **Flashcards:** 120 cards in two decks, *Concepts* and *Anti-patterns*.
- **Decision sheet:** a printable one-page cheat sheet of common decisions, the approaches that are always wrong, and key exam facts.
- **Question browser:** search and filter the whole bank, see your history per question, and flag questions that look wrong.
- **Backup and restore** of your progress as a JSON file.
- Light and dark theme, keyboard shortcuts, and a layout that works down to phone width.

## Quick start
You need **Node 20.9 or newer**.

```
git clone https://github.com/rumi123/claude-certificate-exam-practice.git
cd claude-certificate-exam-practice
npm install
npm run dev
```

Open <http://localhost:3000>. The first start creates `data/ccaf.db` and loads the questions into it. The dashboard shows "Low data" until you have answered about 60 questions.

To use the production build instead: `npm run build && npm start`.

For development you also need `npx playwright install chromium` once, but only to run the end-to-end tests.

## What each page is for
| Page | Use it to |
|---|---|
| **Dashboard** (`/`) | See your readiness estimate, domain bars, what is due today, the unfinished session to continue, and your top 3 topics to study again |
| **Practice** (`/practice`) | Set up a session: source, size, mode, timer, order and focus preset |
| **Review** (`/review`) | Clear the questions that are due for repeat, with a count for each Leitner box |
| **Report** (`/report`) | Find your weak areas: priority list, domains, all 30 task statements, trap profile, calibration, timing and scenarios |
| **Flashcards** (`/flashcards`) | Memorise concepts and anti-patterns with spaced repetition |
| **Decision sheet** (`/cheatsheet`) | Read or print the quick-reference sheet |
| **Questions** (`/questions`) | Browse, search and flag questions, and read any explanation |
| **Research** (`/research`) | Read the study notes that the report and explanations link to |
| **Settings** (`/settings`) | Set preferences, back up, restore or reset progress, review flagged questions, and check content versions |

## How to take practice sessions
Open **Practice** and choose:

| Setting | Options |
|---|---|
| Source | By scenario, domain or task statement, a focus preset, or everything |
| Size | 5, 10, 25 or 50 questions, or a custom size from 5 to 150 |
| Mode | **Study** or **Test** |
| Timer | Off, or 2 minutes per question (exam pace) |
| Order | Grouped by scenario (like the exam) or mixed |
| Prefer | Unseen first, weakest first, or random |
| Multiple-response | Include, only, or exclude |

**Study mode** shows the full explanation after each answer. Use it when you are learning a topic.

**Test mode** shows no feedback until the end, and has Previous and a question navigator. Use it to check yourself under exam conditions. With the timer on, the session ends when time runs out and unanswered questions count as wrong.

Some questions are *select 2*. You must pick exactly two options, and you only score if both are right. Getting one of two is shown as "1 of 2 correct" but still counts as wrong.

Always set your confidence honestly. "Sure but wrong" is the most useful signal in the report.

Keyboard: `1`–`5` select options, `S`/`U`/`G` set confidence, `Enter` submits and moves on, `M` marks a question.

### Ways to study
| Method | How |
|---|---|
| **Learn a topic** | Practice → by task statement → Study mode → read every explanation, including the ones for the options you got right |
| **Exam rehearsal** | Practice → by scenario or all → size 25 or 50 → Test mode with the timer on → read the summary afterwards |
| **Fix weak areas** | Report → "Drill this task" on a priority item, or the *Weak Areas* preset |
| **Stop repeat mistakes** | *Trap Buster* (questions containing your top 3 traps) or *Blind Spots* (Sure-but-wrong questions) |
| **Spend extra time on the hardest domains** | *D1 Deep Drill* and *D3 Deep Drill* |
| **Daily routine** | Clear **Review** and **Flashcards** first, then a practice session, then check **Report** once a week |

## How to do the analysis
Everything on the report is calculated from your answers when you open the page.

1. **Start with "Study these again."** It ranks task statements by `gap × domain weight × blind-spot boost`, so a weak task in a heavily weighted domain comes first. Each item says why it is listed and links to *Read*, *Lesson* and *Drill this task*.
2. **Read the status of each task.** Mastery weights recent answers more.
   - **Strong:** 80% or more
   - **OK:** 65–79%
   - **Weak:** below 65%
   - **Untested:** fewer than 3 answers
3. **Check the trap profile.** It shows the traps you pick most often when they are offered. Each one has the principle behind it and an example you missed. Reading the principle matters more than re-reading the question.
4. **Check calibration.** *Blind spots* (Sure but wrong) are wrong beliefs that need fixing. *Lucky guesses* (Guess but right) are re-queued for review.
5. **Check timing.** The exam gives about 120 seconds per question. A domain is flagged slow when your median is over 150 seconds.
6. **Check scenarios.** Low accuracy in one scenario can mean a weak business context rather than a weak concept.
7. **Use the readiness estimate carefully.** It is on a 100–1000 scale against the 720 pass line, and it assumes 72% raw maps to 720 because the real cut-off is not published. Trust it only once the label reads "Good" (at least 150 answers, and 15 or more in every domain).

After each session the **summary** shows your score, time, accuracy per domain and task, the traps you picked and your calibration. "Review mistakes now" starts a session of only the questions you got wrong.

## Back up your progress
`Settings → Backup & restore` downloads `ccaf-backup-YYYYMMDD.json` with all your progress: sessions, answers, review state, flags, flashcard state and settings. Restore from the same tab, where a preview shows row counts before you confirm. Reset clears progress only, never the questions. You can also copy `data/ccaf.db` while the app is stopped.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Imports content, then starts the dev server |
| `npm run build` / `npm start` | Production build and serve (local) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright end-to-end tests against a temporary database |
| `npm run content:validate` | Schema and quality checks on `content/`, prints a coverage table |
| `npm run content:import` | Upserts content into SQLite |
| `npm run db:migrate` | Applies Drizzle migrations |
| `tsx scripts/seed-perf.ts` | Builds `/tmp/ccaf-perf.db` (450 questions, 5,000 answers) for the performance check |
| `tsx scripts/measure-pages.ts <url>` | Prints the median load time of each main page from a running server |

`npm run dev` and `npm run build` run `content:import` first. Set `CONTENT_DIR=tests/fixtures/content` for the small e2e content set.

## Environment
| Variable | Default | Use |
|---|---|---|
| `DATABASE_PATH` | `data/ccaf.db` | Location of the SQLite file |
| `CONTENT_DIR` | `content` | Folder the content files are read from |
| `RESEARCH_PATH` | `docs/ccaf-exam-research.md` | Markdown file shown at `/research` |
| `TEST_CLOCK` | (unset) | `1` lets e2e tests move the clock through a stored offset |
| `AI_FEATURES` | `off` | `on` turns on "Ask Claude" (phase 3) |
| `ANTHROPIC_API_KEY` | (unset) | Needed only when AI is on |
| `AI_MODEL` | `claude-sonnet-5-5` | Model for explanations |
| `SCALED_CUT_RAW` | `0.72` | Raw fraction that maps to 720 in the estimate |

## Roadmap
| Phase | What | Status |
|---|---|---|
| 1 | Question bank (150 questions, 6 scenarios), practice, review, report, flashcards, decision sheet, question browser, settings and backup | Done |
| 1b | UI redesign: design system, practice flow, mobile layout and empty states | Done |
| 2 | **Mock exams:** 5 papers of 60 new questions, 120-minute timer, no feedback until the end, estimated scaled score and pass/fail, first-attempt vs best-attempt history in the report | Planned |
| 3 | **Ask Claude:** explain a question differently, or say why your answer is wrong. The code exists behind a feature flag and is switched off. | Planned |

Out of scope: accounts, cloud sync, deployment and copying other sites' lesson text.

## Docs
- [`docs/specification.md`](docs/specification.md): every feature, the formulas and the flows
- [`docs/architecture.md`](docs/architecture.md): stack, folders, data model and content import
- [`docs/milestones.md`](docs/milestones.md): build history
- [`docs/question-authoring-guide.md`](docs/question-authoring-guide.md): how to write or add questions
- [`docs/plan.md`](docs/plan.md): goals and decisions
- [`docs/ccaf-exam-research.md`](docs/ccaf-exam-research.md): the study notes behind the questions

## Performance check
```
tsx scripts/seed-perf.ts
DATABASE_PATH=/tmp/ccaf-perf.db npm run build
DATABASE_PATH=/tmp/ccaf-perf.db npm start -- -p 3200 &
tsx scripts/measure-pages.ts http://localhost:3200
```
Every median should be under 300 ms.
