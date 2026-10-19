import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../web/js/lib/store.js';
import { unitStats, recommend, streak, courseOrder, weakUnits, itemsOfUnit } from '../web/js/lib/progress.js';
import { loadCourse } from './helpers.mjs';

const course = loadCourse();

function answerUnit(state, unit, fraction) {
  const sids = itemsOfUnit(course, unit);
  sids.forEach((sid, i) => { const good = i < Math.round(sids.length * fraction); state.items[sid] = { n: 1, f: good ? 1 : 0, ok: good, t: i }; });
  for (const e of course.units.find(u => u.id === unit).exercises) state.ex[e] = { ok: 1, total: 1, t: 1 };
}

test('course order starts with Hapi 0 and ends with the Flanders modules', () => {
  const o = courseOrder(course);
  assert.equal(o[0], 'shqiptimi');
  assert.equal(o[1], 'u1');
  assert.deepEqual(o.slice(-2), ['belgjika', 'situatat']);
});

test('completion is not mastery', () => {
  const s = emptyState('2026-10-19');
  answerUnit(s, 'u1', 0.5);
  const st = unitStats(s, course, 'u1');
  assert.equal(st.completed, true);
  assert.equal(st.status, 'review');
  answerUnit(s, 'u2', 0.9);
  assert.equal(unitStats(s, course, 'u2').status, 'mastered');
});

test('mastery threshold is configurable', () => {
  const s = emptyState();
  answerUnit(s, 'u1', 0.75);
  assert.equal(unitStats(s, course, 'u1').status, 'review');
  s.settings.mastery = 0.7;
  assert.equal(unitStats(s, course, 'u1').status, 'mastered');
});

test('revealed answers do not count as known', () => {
  const s = emptyState();
  answerUnit(s, 'u1', 1);
  Object.values(s.items).forEach(it => { it.r = 1; });
  assert.equal(unitStats(s, course, 'u1').accuracy, 0);
});

test('recommendation: new learner starts at Hapi 0, then continues where they stopped, and weak units are flagged', () => {
  const s = emptyState();
  assert.equal(recommend(s, course).next.id, 'shqiptimi');
  s.seen.u3 = 1; s.last = { at: 'u3-l9', t: 1 };
  const r = recommend(s, course);
  assert.equal(r.next.id, 'u3');
  assert.equal(r.next.at, 'u3-l9');
  answerUnit(s, 'u1', 0.4);
  assert.deepEqual(recommend(s, course).review.map(x => x.id), ['u1']);
  assert.deepEqual(weakUnits(s, course).map(x => x.id), ['u1']);
});

test('streak counts consecutive active days ending today or yesterday', () => {
  const days = { '2026-10-17': { a: 3, r: 0 }, '2026-10-18': { a: 0, r: 2 }, '2026-10-19': { a: 1, r: 0 } };
  assert.equal(streak(days, '2026-10-19'), 3);
  assert.equal(streak(days, '2026-10-20'), 3);
  assert.equal(streak(days, '2026-10-21'), 0);
});
