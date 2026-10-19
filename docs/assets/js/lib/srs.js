// Spaced repetition: a simplified SM-2 (the algorithm behind SuperMemo 2 and early Anki).
//
// Every card keeps an ease factor (ef, starts at 2.5), the current interval in days (ivl),
// the number of successful reviews in a row (reps), the number of lapses and the due day.
//   Again – forgotten: back to the start, due again today (shown again later in the session), ef − 0.20
//   Hard  – remembered with effort: interval × 1.2 (at least 1 day), ef − 0.15
//   Good  – remembered: 1 day, then 3 days, then interval × ef
//   Easy  – effortless: 4 days, then interval × ef × 1.3, ef + 0.15
// ef never drops below 1.3, so hard cards still move forward slowly instead of getting stuck.
import { addDays, daysBetween } from './dates.js';

export const GRADES = ['again', 'hard', 'good', 'easy'];
export const MIN_EF = 1.3;
export const MASTERED_DAYS = 21;   // a card with an interval of 3 weeks or more counts as learned
export const MAX_IVL = 365;

export function newCard() {
  return { ef: 2.5, ivl: 0, reps: 0, lapses: 0, due: null, last: null, seen: 0 };
}

export function review(card, grade, today) {
  const c = { ...newCard(), ...card };
  c.seen = (c.seen || 0) + 1;
  c.last = today;
  if (grade === 'again') {
    if (c.reps > 0) c.lapses += 1;
    c.reps = 0;
    c.ivl = 0;
    c.ef = Math.max(MIN_EF, c.ef - 0.2);
    c.due = today;
    return c;
  }
  // a card reviewed late gets credit for the extra days it was remembered (as in SM-2 variants used by Anki)
  const late = c.due ? Math.max(0, daysBetween(c.due, today)) : 0;
  if (grade === 'hard') {
    c.ivl = c.reps === 0 ? 1 : Math.max(c.ivl + 1, Math.round((c.ivl + late / 4) * 1.2));
    c.ef = Math.max(MIN_EF, c.ef - 0.15);
  } else if (grade === 'good') {
    c.ivl = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.max(c.ivl + 1, Math.round((c.ivl + late / 2) * c.ef));
  } else if (grade === 'easy') {
    c.ivl = c.reps === 0 ? 4 : Math.max(c.ivl + 1, Math.round((c.ivl + late) * c.ef * 1.3));
    c.ef = c.ef + 0.15;
  } else {
    throw new Error('unknown grade ' + grade);
  }
  c.ivl = Math.min(MAX_IVL, c.ivl);
  c.reps += 1;
  c.due = addDays(today, c.ivl);
  return c;
}

export function isDue(card, today) {
  return !!card && !!card.due && card.due <= today;
}

// new · learning · mastered
export function cardStatus(card) {
  if (!card || !card.seen) return 'new';
  return card.ivl >= MASTERED_DAYS ? 'mastered' : 'learning';
}

// Preview of the next interval for each grade, shown on the buttons ("Good · 3 d").
export function preview(card, today) {
  const out = {};
  for (const g of GRADES) out[g] = review(card || newCard(), g, today).ivl;
  return out;
}

// Most overdue first, then the ones forgotten most often.
export function dueOrder(a, b) {
  return (a.card.due < b.card.due ? -1 : a.card.due > b.card.due ? 1 : 0) || (b.card.lapses - a.card.lapses);
}
