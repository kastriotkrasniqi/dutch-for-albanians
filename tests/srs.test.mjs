import test from 'node:test';
import assert from 'node:assert/strict';
import { review, newCard, isDue, cardStatus, preview, MIN_EF, MASTERED_DAYS } from '../web/js/lib/srs.js';
import { addDays, daysBetween, dayKey, parseDay } from '../web/js/lib/dates.js';

const T = '2026-10-19';

test('dates: local day keys, month/year boundaries and DST', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');   // across the March DST change in Europe
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');   // across the October change
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2026-10-26', '2026-10-24'), -2);
  assert.equal(dayKey(parseDay('2026-07-04')), '2026-07-04');
});

test('first reviews: again → today, hard/good → 1 day, easy → 4 days', () => {
  assert.equal(review(newCard(), 'again', T).due, T);
  assert.equal(review(newCard(), 'hard', T).due, addDays(T, 1));
  assert.equal(review(newCard(), 'good', T).due, addDays(T, 1));
  assert.equal(review(newCard(), 'easy', T).due, addDays(T, 4));
});

test('good, good, good grows 1 → 3 → round(3 × ef)', () => {
  let c = review(newCard(), 'good', T);
  c = review(c, 'good', c.due);
  assert.equal(c.ivl, 3);
  c = review(c, 'good', c.due);
  assert.equal(c.ivl, Math.round(3 * 2.5));
  assert.equal(c.reps, 3);
});

test('again after learning counts a lapse, resets and lowers ease; ease has a floor', () => {
  let c = newCard();
  for (const g of ['good', 'good', 'good']) c = review(c, g, c.due || T);
  const lapsed = review(c, 'again', c.due);
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.reps, 0);
  assert.equal(lapsed.ivl, 0);
  assert.ok(lapsed.ef < c.ef);
  let d = newCard();
  for (let i = 0; i < 20; i++) d = review(d, 'again', T);
  assert.equal(d.ef, MIN_EF);
});

test('hard grows slower than good, easy faster', () => {
  let base = newCard();
  for (const g of ['good', 'good']) base = review(base, g, base.due || T);
  const p = preview(base, base.due);
  assert.ok(p.hard < p.good && p.good < p.easy, JSON.stringify(p));
  assert.equal(p.again, 0);
});

test('reviewing late gives credit for the extra days', () => {
  let c = newCard();
  for (const g of ['good', 'good']) c = review(c, g, c.due || T);
  const onTime = review(c, 'good', c.due).ivl;
  const late = review(c, 'good', addDays(c.due, 10)).ivl;
  assert.ok(late > onTime);
});

test('due and status', () => {
  const c = review(newCard(), 'good', T);
  assert.ok(!isDue(c, T));
  assert.ok(isDue(c, addDays(T, 1)));
  assert.equal(cardStatus(undefined), 'new');
  assert.equal(cardStatus(c), 'learning');
  assert.equal(cardStatus({ ...c, ivl: MASTERED_DAYS }), 'mastered');
  assert.throws(() => review(c, 'perfect', T));
});

test('a mastered card is not shown again for weeks; a hard card returns soon', () => {
  let easy = newCard(), hard = newCard();
  let d1 = T, d2 = T;
  for (let i = 0; i < 4; i++) { easy = review(easy, 'easy', d1); d1 = easy.due; hard = review(hard, 'again', d2); hard = review(hard, 'hard', d2); d2 = hard.due; }
  assert.ok(daysBetween(T, easy.due) > 60, 'easy card scheduled far ahead');
  assert.ok(hard.ivl <= 3, 'hard card stays close');
});
