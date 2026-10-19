# Progress checklist

Last updated: 2026-10-19 · branch `platform-v2`

## Phase 1 – audit and plan
- [x] Inspect generator, content markup, deployed page, storage, exercises (`planning/AUDIT.md`)
- [x] Baseline: build reproducible, 0 JS errors, no overflow at 390/1280 px, 0 tests
- [x] Prioritised roadmap (P0–P3) and curriculum matrix (`planning/CURRICULUM.md`)

## Phase 2 – critical fixes
- [x] CSS/JS moved out of Python strings into `web/` (ES modules, no bundler, import map with content hashes)
- [x] `course.json`: every exercise item with prompt, type and key; vocabulary; example sentences; search index
- [x] New validator: verdicts ok / near / wrong, 15 mistake categories, Albanian explanations, no more silent acceptance of missing ë/é or merged words, reduced pronouns one-directional, optional *alstublieft*
- [x] Per-item feedback with "Shiko përgjigjen" (answer hidden until asked)
- [x] Solution reveal recorded (no first-try credit afterwards)
- [x] End-of-unit summary (mistakes, correct answers, explanations, Përsërit / Provo sërish / Vazhdo); never auto-advances
- [x] Tap-to-build word order (chips) in lessons and practice
- [x] Bug found by tests: `.fb .ans{display:block}` overrode `[hidden]` → global `[hidden]{display:none!important}`

## Phase 3 – learning experience
- [x] Progress model v2 (`lib/store.js`), migration of v1 data, export/import, reset
- [x] Completion vs mastery (80 % first-try, configurable 60–90 %)
- [x] Dashboard: continue, next step, daily goal ring, streak, due reviews, weak units, mistake types, roadmap A1→B1
- [x] Course roadmap page with status per unit and CEFR can-do statements
- [x] Navigation: rail with app sections + modules + units; mobile drawer + bottom tab bar; header search
- [x] Progress page: stats, per-unit table, mistake categories, 14-day activity, settings, backup

## Phase 4 – practice
- [x] SM-2-style scheduler (`lib/srs.js`) with Again/Hard/Good/Easy and interval preview
- [x] Flashcards nl→sq, sq→nl, typed recall; favourites; difficult words; new-words-per-day limit
- [x] Mistakes become review cards (`x:<slot>`) and come back in the daily session
- [x] Practice hub: daily session, my mistakes, unit quiz, mixed quiz, 10-question challenge, de/het trainer, placement test
- [x] Searchable vocabulary list with filters (unit, de/het, verbs, favourites, difficult, due, new, learned)

## Phase 5 – curriculum
- [x] Hapi 0: pronunciation for Albanian speakers, stress, numbers 70+, dates, classroom phrases (5 lessons, 6 exercises)
- [x] Holandishtja në Belgjikë (5 lessons, 5 exercises)
- [x] Situatat e përditshme (6 lessons, 4 exercises)
- [x] Plurals for 101 nouns, Belgian usage notes; 69-verb reference with drill
- [x] Object pronouns lesson → Unit 8, lesson 4 + exercises I, J
- [x] Adjective endings lesson → Unit 13, lesson 4 + exercises H, I (validator: *groot → grote* = ending, *dike → dikke* = spelling)
- [ ] PDFs in `pdf/` predate these two lessons and the modules: rebuild with `python3 tools/make.py book units` (needs `pdfplumber`)
- [ ] Indirect questions, relative clauses (P2)
- [ ] Localise Netherlands-only examples in U2–U25 (P3)

## Phase 6 – conversation and listening
- [x] Rule-based conversation engine (`lib/convo.js`), honest labelling, provider interface for a future server-side AI
- [x] 11 Antwerp scenarios (56 turns): café, neighbour, bakery, directions, landlord, GP, pharmacy, colleague, municipality, job interview, classroom
- [x] Listening: voice detection (nl-BE → nl-NL), speed, dictation, comprehension, record-and-compare (no scoring), text fallback
- [x] Speaker buttons in lesson example tables

## Phase 7 – verification
- [x] `npm test`: 49 unit tests (validator over all 1 165 keys, SRS, dates/DST, store, progress, conversation rules, site links/assets)
- [x] `npm run test:e2e`: 10 browser tests (sub-path, feedback, persistence, completion, practice, flashcards, conversation, deep link, search, 360 px mobile)
- [ ] Manual check on real iOS Safari / Android Chrome (voices differ per device)
- [ ] Screen-reader pass (VoiceOver / TalkBack)
- [ ] Merge `platform-v2` into `main` (GitHub Pages deploys from `main:/docs`)

## Next steps (in order)
1. Rebuild the PDFs.
2. Real-device test of speech voices; record a native Flemish speaker for Hapi 0 if possible.
3. Indirect questions and relative clauses (A2/B1).
4. Banking and family/hobby conversation scenarios.
