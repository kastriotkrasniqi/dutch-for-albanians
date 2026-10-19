# Audit: Mësojmë holandisht (baseline 2026-10-19, commit a6a8d17)

## 0. What the project is

| Item | Finding |
|---|---|
| Stack | No JS framework. Python 3 generator (`tools/make_site.py` → `sitegen.py` → `build.py`) turns the marked-up text files `content/uNN.txt` into one static page `docs/index.html` (~860 KB). CSS/JS live as Python strings in `tools/site_assets.py`. PDFs are built from the same source with Playwright (`tools/make.py`). |
| Deploy | GitHub Pages, branch `main`, folder `/docs`. Hash routing (`#u7`, `#u7-l20`, `#fjalori`) → direct links and refreshes work under the repo subpath; no asset paths except Google Fonts. |
| Content | 5 parts, 25 units, 73 lessons, 178 exercises, 1067 auto-checkable answer slots, 390 glossary entries (Dutch–Albanian). Unit order is decoupled from source file numbers (`ORDER`), references resolved via `{U:n}` / `{L:n.m}`. |
| Storage | `localStorage` keys `mh1:v:<inputId>` (typed values), `mh1:prog` (`{exId:[ok,total]}`), `mh1:last`, `mh1:theme`. |
| Tests | None. Build is reproducible (rebuilding gives a byte-identical `docs/index.html`). |
| Browser check | No JS errors; no horizontal overflow at 390 px or 1280 px on intro, U1, U13, U25, glossary. |

## 1. What already works well

- **Content quality is high.** Explanations in clear Albanian, consistent "Shqip ↔ Holandisht" contrast boxes, *Kujdes* boxes with typical mistakes, summary tables. Spot checks of niet/geen (U16), perfect tense with hebben/zijn (U21), spelling rules (U12), diminutives (U13) found the rules correct and not oversimplified (e.g. *vergeten* with zijn vs hebben, *'t kofschip* with *leven → geleefd*).
- **One source of truth.** Lessons, keys and glossaries are authored once and feed both the PDF book and the website.
- **Every exercise is checkable** (0 of 178 exercises without a key; 0 partially keyed).
- **Validation already lenient in sensible ways:** case, punctuation, curly quotes, leading zeros, `(e)` optional letters, `a / b` alternatives, reduced pronouns (*je = jij*).
- Tap-to-match tiles, dark mode with system preference, safe-area insets, `prefers-reduced-motion`, visible focus ring, answers saved per input.

## 2. Broken or confusing

| ID | Problem | Effect |
|---|---|---|
| B1 | Validation strips **all diacritics** (`NFD` + remove marks) and **all spaces** (`v.replace(/ /g,'')`). | *geeist* passes for *geëist*; *eenhuis* passes for *een huis*; *ikben* passes. Diaeresis and word separation are taught in U12 and must at least be flagged. |
| B2 | Reduced-pronoun equivalence is symmetric and global, including *m'n = mijn*, *z'n = zijn*. | In exercises whose goal is the unstressed form (U9 A, B) the full form is silently accepted. |
| B3 | Feedback is only ✓ / ✗ and a count. | Learner cannot tell a typo from a grammar error, gets no explanation, must open the whole key. |
| B4 | "Shfaq zgjidhjen" shows the full key of the exercise at any time and is not recorded. | Scores after revealing count as genuine; nothing distinguishes "practised" from "copied". |
| B5 | Word-order exercises show chips but require retyping the whole sentence. | Slow on mobile; tests typing more than word order. |
| B6 | Progress = `[ok,total]` of the *last* check per exercise. | No attempt history, no first-try accuracy, no notion of completed vs mastered; resetting an exercise deletes its history. |
| B7 | No end-of-unit result. After the last exercise nothing happens (no summary, no list of mistakes, no next step). | Learner never sees what to review. (There is no auto-advance – good – but also no completion screen.) |
| B8 | "Vazhdo" only remembers the last unit opened, not the last lesson/position or what is unfinished. | Weak "continue where I left off". |
| B9 | Intro page is a table of contents, not a dashboard: no "today", no review, no weak topics. | Learner must decide alone what to do. |

## 3. Missing language-learning content

- **Belgium is absent.** 0 mentions of België/Vlaanderen/Antwerpen; examples use Utrecht, Leiden, Delft, Den Haag, Edam, "Ik woon al drie jaar in Nederland". The target learner lives in Flanders.
- **Pronunciation for Albanian speakers** only via spelling (U12). Nothing on g/ch, ui, eu, uu (≈ Albanian *y*), oe (≈ *u*), ij/ei, sch, w, final *-en*, stress; nothing on Flemish vs Netherlands pronunciation.
- **Alphabet, days, months, dates**; numbers only within U4 (time).
- **Adjective endings** (*een groot huis – het grote huis*) – no dedicated lesson (only adjectives used as nouns in U13).
- **Object pronouns** (*mij, jou, hem, haar, ons, hen/hun*) only appear in passing (U18 *met hem*).
- **Relative clauses** (*die/dat*, *de man die…*), **indirect questions** (*Weet u waar…?*), **zich** reflexives partly (U25).
- **Everyday communication** (shop, café, doctor, pharmacy, transport, gemeente, landlord, work) – not covered as practical paths.
- **Classroom / clarification phrases** (*Kunt u dat herhalen? Wat betekent…?*).
- Listening and speaking: no audio at all; writing only via short translations.

## 4. Missing interactive features

Dashboard; practice hub; spaced repetition; flashcards; de/het trainer; mistake notebook; mixed/topic quizzes; conversation simulation; listening/dictation; recording; global search; verb reference; placement test; tap-to-build word order; per-item explanations.

## 5. UX and accessibility

- Good: semantic headings, `aria-label` on inputs, `aria-live` score, focus ring, dark mode, reduced motion, 16 px body.
- Gaps: matching tiles have no keyboard hint and the correct/wrong state is only colour + symbol; score text is the only feedback; the mobile header has no search and no navigation besides the unit `<select>`; the rail lists only units (no practice/vocabulary/progress); empty states don't exist because nothing personalised exists.

## 6. Technical debt and architectural limits

- CSS and JS live inside Python raw strings → no linting, no unit tests, no syntax highlighting.
- All logic (validation, storage, routing, UI) in one ~200-line script with globals.
- Answer keys are injected as one JSON blob; there is no structured exercise/vocab data the browser can reuse outside the lesson page.
- Storage keys are tied to DOM input ids and display unit numbers (re-ordering units would orphan progress) – acceptable, but must stay stable now.
- One 860 KB HTML file (≈150 KB gzipped by Pages). Acceptable; JS/CSS/data should still move to cacheable files.

## 7. Prioritised roadmap

Decisions: keep the Python generator and the `content/` markup (it works and feeds the PDFs); move CSS/JS into real files under `web/` (ES modules copied to `docs/assets/`); emit structured data (`docs/assets/course.json`); keep hash routing; stay static (localStorage, modular store so sync can be added later); no new runtime dependencies; test pure logic with `node --test` and the UI with Playwright (already used for PDFs).

### P0 – learning-blocking
1. Move assets to `web/`, ES modules, tests infrastructure.
2. New validator: graded verdicts (correct / accepted-with-note / wrong), categories (typo, diacritic, spacing, word order, article de/het, missing or extra word, wrong form), per-item explanations; stop accepting merged words and silent diacritic loss; reduced pronouns accepted only in the full→reduced direction where the key is reduced.
3. Record attempts per item (first-try correctness, revealed solutions).
4. End-of-unit completion screen: score, wrong items with the learner's answer, correct answer and reason; buttons *Përsërit gabimet*, *Provo sërish*, *Vazhdo* – never automatic.

### P1 – essential learning experience
5. Progress model v2 (versioned, migrates `mh1:prog`): completion vs mastery (threshold 80 % first-try, configurable), per-unit accuracy, recent activity, daily goal, streak.
6. Dashboard: continue button, recommended next unit, daily goal, due reviews, weak topics, recent mistakes, roadmap A1 → A2 → B1.
7. Practice hub: daily session, mistakes, unit/topic quiz, mixed quiz, short challenge.
8. Vocabulary trainer: search/filter, flashcards with SM-2 (Again/Hard/Good/Easy), both directions, typed recall, de/het trainer, favourites, difficult words.
9. Tap-to-build word order.
10. Navigation: global nav (Ballina, Kursi, Praktikë, Fjalori, Biseda, Dëgjo, Progresi) + global search.

### P2 – content and interaction
11. Pronunciation & foundations module (alphabet, sounds for Albanian speakers, Flemish vs NL, days/months/dates, clarification phrases) – approximate Albanian spellings clearly labelled.
12. Belgian Dutch module (Antwerp everyday phrases, tussentaal *ge/gij*, BE vs NL vocabulary, polite vs informal, services vocabulary).
13. Guided conversation simulator (rule-based, honest labelling) with ~8 Antwerp scenarios.
14. Listening: speech synthesis (nl-BE preferred, nl-NL fallback, voice detection), slow replay, dictation, record-and-compare (no scoring claims), text fallback.
15. Strong/irregular verb reference with search and practice.
16. Adjective-ending lesson; object pronoun lesson (new A1 material).

### P3 – advanced
17. Placement test; printable unit summaries; localise remaining Netherlands-only examples to Belgium where it doesn't change the grammar point; relative clauses and indirect questions (A2/B1); optional AI conversation adapter (interface only, no keys in client); cloud sync.
