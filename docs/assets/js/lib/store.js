// Learner state: one versioned JSON document in localStorage (key "mh2:state").
//
// Storage is behind a small backend interface ({ get, set, del }) so the same model can later be
// synchronised to a server; today it lives only in this browser on this device.
//
// Shape (v2):
//   settings  { goal, mastery, newPerDay, rate, voice }
//   items     slotId → { n attempts, f first try correct (1/0), ok last correct, v last answer, c mistake category,
//                        t time, r solution seen before a correct answer }
//   ex        exerciseId → { ok, total, t, r }           result of the last "Kontrollo" in the lesson
//   seen      unit/module code → time first opened;  last { at: anchor, t }
//   cards     cardId → SRS card  (v:<word> vocabulary, x:<slotId> exercise items answered wrong)
//   fav       cardId → 1
//   days      YYYY-MM-DD → { a answers, c correct, r reviews, n new cards }
//   convo     scenarioId → { t, turns, good }
import { dayKey } from './dates.js';
import { review, newCard } from './srs.js';

export const VERSION = 2;
export const KEY = 'mh2:state';
export const DEFAULT_SETTINGS = { goal: 20, mastery: 0.8, newPerDay: 10, rate: 0.9, voice: '' };

export function localBackend(ls = globalThis.localStorage) {
  let ok = true;
  try { const k = 'mh2:probe'; ls.setItem(k, '1'); ls.removeItem(k); } catch (e) { ok = false; }
  return {
    persistent: ok,
    get(k) { try { return ls.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { ls.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { ls.removeItem(k); } catch (e) { /* ignore */ } },
    keys() { try { return Object.keys(ls); } catch (e) { return []; } }
  };
}

export function memoryBackend(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    persistent: false,
    get: k => (m.has(k) ? m.get(k) : null),
    set: (k, v) => { m.set(k, String(v)); return true; },
    del: k => { m.delete(k); },
    keys: () => [...m.keys()]
  };
}

export function emptyState(today = dayKey()) {
  return { v: VERSION, created: today, settings: { ...DEFAULT_SETTINGS }, items: {}, ex: {}, seen: {}, last: null, cards: {}, fav: {}, days: {}, convo: {} };
}

// Bring any stored document up to the current version; unknown fields are kept.
export function migrate(doc, backend) {
  let s = doc && typeof doc === 'object' ? doc : null;
  if (!s) {
    s = emptyState();
    // v1 (before 2026-10) only kept { exerciseId: [ok, total] } and the last unit
    try {
      const old = JSON.parse(backend.get('mh1:prog') || '{}');
      for (const [id, pair] of Object.entries(old)) {
        if (Array.isArray(pair)) s.ex[id] = { ok: pair[0], total: pair[1], t: 0, migrated: 1 };
      }
      const last = backend.get('mh1:last');
      if (last) s.last = { at: last, t: 0 };
    } catch (e) { /* corrupt v1 data: start fresh */ }
  }
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  for (const k of ['items', 'ex', 'seen', 'cards', 'fav', 'days', 'convo']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  s.v = VERSION;
  return s;
}

export function createStore(backend = localBackend(), { now = () => Date.now(), today = () => dayKey() } = {}) {
  let raw = null;
  try { raw = JSON.parse(backend.get(KEY) || 'null'); } catch (e) { raw = null; }
  let state = migrate(raw, backend);
  const subs = new Set();
  let timer = null;
  let saveOk = true;

  const flush = () => {
    timer = null;
    saveOk = backend.set(KEY, JSON.stringify(state));
  };
  const changed = () => {
    if (!timer) timer = setTimeout(flush, 120);
    subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  };
  const day = () => {
    const k = today();
    return (state.days[k] = state.days[k] || { a: 0, c: 0, r: 0 });
  };
  const gradeCard = (id, grade) => {
    state.cards[id] = review(state.cards[id] || newCard(), grade, today());
  };

  return {
    get state() { return state; },
    get persistent() { return backend.persistent && saveOk; },
    backend,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    flush() { if (timer) clearTimeout(timer); flush(); },

    // One answer to one exercise item. res is the result of validate(); src: lesson | practice.
    recordItem(sid, res, value, src = 'lesson') {
      if (res.verdict === 'empty') return;
      const good = res.verdict === 'ok' || res.verdict === 'near';
      const it = state.items[sid] || { n: 0 };
      if (it.n && it.v === value && src === 'lesson') return;   // pressing "Kontrollo" again without changes
      if (!it.n) it.f = good && !it.r ? 1 : 0;
      it.n += 1; it.ok = good; it.v = value; it.t = now();
      if (good) delete it.c; else it.c = res.cat || 'other';
      state.items[sid] = it;
      const d = day(); d.a += 1; if (good) d.c += 1;
      const cid = 'x:' + sid;
      // wrong answers become review cards; later correct answers move them forward
      if (!good) gradeCard(cid, 'again');
      else if (state.cards[cid] && src === 'practice') gradeCard(cid, res.verdict === 'near' ? 'hard' : 'good');
      else if (state.cards[cid] && state.cards[cid].due <= today()) gradeCard(cid, 'good');
      changed();
    },
    recordExercise(exId, ok, total) {
      state.ex[exId] = { ...(state.ex[exId] || {}), ok, total, t: now() };
      delete state.ex[exId].migrated;
      changed();
    },
    // The learner opened the solution: later correct answers in this exercise are not first-try successes.
    reveal(exId, sids) {
      state.ex[exId] = { ...(state.ex[exId] || { ok: 0, total: 0, t: 0 }), r: 1 };
      for (const sid of sids) {
        const it = state.items[sid] || { n: 0 };
        if (!it.ok) { it.r = 1; state.items[sid] = it; }
      }
      changed();
    },
    clearExercise(exId) {
      delete state.ex[exId];
      changed();
    },
    visit(code, anchor) {
      if (!state.seen[code]) state.seen[code] = now();
      state.last = { at: anchor || code, t: now() };
      changed();
    },
    grade(cardId, grade) {
      if (!state.cards[cardId]) day().n = (day().n || 0) + 1;   // new cards introduced today
      gradeCard(cardId, grade);
      day().r += 1;
      changed();
    },
    toggleFav(cardId) {
      if (state.fav[cardId]) delete state.fav[cardId]; else state.fav[cardId] = 1;
      changed();
    },
    setSetting(k, v) { state.settings[k] = v; changed(); },
    finishConversation(id, turns, good) {
      state.convo[id] = { t: now(), turns, good };
      day().a += turns;
      changed();
    },
    exportJSON() { return JSON.stringify({ app: 'mesojme-holandisht', ...state }, null, 1); },
    importJSON(text) {
      const doc = JSON.parse(text);
      if (!doc || doc.app !== 'mesojme-holandisht') throw new Error('Skedari nuk është një kopje e progresit të kësaj faqeje.');
      delete doc.app;
      state = migrate(doc, backend);
      changed(); flush();
    },
    reset() { state = emptyState(today()); changed(); flush(); }
  };
}
