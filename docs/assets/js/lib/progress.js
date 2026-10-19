// Everything the dashboard and the progress page show is derived here from the stored state and course.json.
//
// Completion and mastery are different things:
//   completed – every exercise of the unit has been checked at least once
//   mastered  – completed AND first-try accuracy ≥ settings.mastery (default 80 %)
//   review    – completed but below the threshold: the dashboard recommends going over it again
// First-try accuracy counts each item once, by the first answer given, and an item whose solution was
// opened before it was answered correctly counts as not known.
import { addDays } from './dates.js';
import { cardStatus, isDue } from './srs.js';

export const COURSE_ORDER_PREFIX = ['shqiptimi'];
export const COURSE_ORDER_SUFFIX = ['belgjika', 'situatat'];

export function courseOrder(course) {
  return [...COURSE_ORDER_PREFIX, ...course.units.map(u => u.id), ...COURSE_ORDER_SUFFIX].filter(id => findUnit(course, id));
}

export function findUnit(course, id) {
  return course.units.find(u => u.id === id) || (course.modules || []).find(m => m.id === id) || null;
}

export function itemsOfUnit(course, unitId) {
  if (!course._byUnit) {
    course._byUnit = {};
    for (const [sid, it] of Object.entries(course.items)) {
      const u = course.exercises[it.ex]?.unit;
      (course._byUnit[u] = course._byUnit[u] || []).push(sid);
    }
  }
  return course._byUnit[unitId] || [];
}

export function unitStats(state, course, unitId) {
  const unit = findUnit(course, unitId);
  const exIds = unit ? unit.exercises : [];
  const sids = itemsOfUnit(course, unitId);
  let attempted = 0, first = 0, now = 0;
  for (const sid of sids) {
    const it = state.items[sid];
    if (!it || !it.n) continue;
    attempted++;
    if (it.f && !it.r) first++;
    if (it.ok) now++;
  }
  const checked = exIds.filter(e => state.ex[e]).length;
  // progress migrated from the first version has only per-exercise scores
  let legacyOk = 0, legacyTotal = 0;
  for (const e of exIds) {
    const r = state.ex[e];
    if (r && r.migrated) { legacyOk += r.ok; legacyTotal += r.total; }
  }
  const accuracy = attempted ? first / attempted : legacyTotal ? legacyOk / legacyTotal : null;
  const threshold = state.settings.mastery;
  const completed = exIds.length > 0 && checked === exIds.length;
  let status = 'new';
  if (state.seen[unitId] || checked || attempted) status = 'started';
  if (completed) status = accuracy !== null && accuracy >= threshold ? 'mastered' : 'review';
  if (!exIds.length && state.seen[unitId]) status = 'read';
  return { id: unitId, exercises: exIds.length, checked, items: sids.length, attempted, first, now, accuracy, completed, status };
}

export const STATUS_LABEL = {
  new: 'pa filluar', started: 'në vazhdim', read: 'e lexuar', review: 'për përsëritje', mastered: 'e zotëruar'
};

export function allStats(state, course) {
  return courseOrder(course).map(id => unitStats(state, course, id));
}

// What to do next: continue an unfinished unit, else the first new one; units to review come separately.
export function recommend(state, course) {
  const stats = allStats(state, course);
  const lastCode = state.last?.at ? state.last.at.split('-')[0] : null;
  const lastStat = stats.find(s => s.id === lastCode);
  let next = null;
  if (lastStat && !lastStat.completed && lastStat.status !== 'read') next = { id: lastStat.id, at: state.last.at, why: 'continue' };
  if (!next) {
    const s = stats.find(x => x.status === 'started' && !x.completed) || stats.find(x => x.status === 'new');
    if (s) next = { id: s.id, at: s.id, why: s.status === 'new' ? 'new' : 'continue' };
  }
  const review = stats.filter(s => s.status === 'review').sort((a, b) => a.accuracy - b.accuracy);
  return { next, review, stats };
}

export function streak(days, today) {
  const active = k => days[k] && (days[k].a + days[k].r) > 0;
  let d = active(today) ? today : addDays(today, -1);
  let n = 0;
  while (active(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function todayCount(state, today) {
  const d = state.days[today];
  return d ? d.a + d.r : 0;
}

// Items whose last answer was wrong, most recent first.
export function recentMistakes(state, course, limit = 10) {
  return Object.entries(state.items)
    .filter(([sid, it]) => it.n && !it.ok && course.items[sid])
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, limit)
    .map(([sid, it]) => ({ sid, ...it }));
}

export function mistakeCategories(state) {
  const c = {};
  for (const it of Object.values(state.items)) if (it.n && !it.ok && it.c) c[it.c] = (c[it.c] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

// Units with at least `min` answered items whose first-try accuracy is below the threshold.
export function weakUnits(state, course, min = 4) {
  return allStats(state, course)
    .filter(s => s.attempted >= min && s.accuracy !== null && s.accuracy < state.settings.mastery)
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function cardCounts(state, today, prefix) {
  const out = { total: 0, due: 0, new: 0, learning: 0, mastered: 0 };
  for (const [id, c] of Object.entries(state.cards)) {
    if (!id.startsWith(prefix)) continue;
    out.total++;
    out[cardStatus(c)]++;
    if (isDue(c, today)) out.due++;
  }
  return out;
}

export function activityDays(state, today, n = 14) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    const d = state.days[k] || { a: 0, c: 0, r: 0 };
    out.push({ day: k, ...d });
  }
  return out;
}
