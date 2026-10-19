import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend, KEY, migrate } from '../web/js/lib/store.js';

const ok = { verdict: 'ok', notes: [], alts: [] };
const wrong = { verdict: 'wrong', cat: 'article', notes: [], alts: [] };
let day = '2026-10-19';
const opts = { today: () => day, now: () => 1000 };

test('state persists through the backend and survives a reload', () => {
  const be = memoryBackend();
  const s = createStore(be, opts);
  s.recordItem('u1-A-0', ok, 'ben');
  s.recordExercise('u1-A', 1, 6);
  s.flush();
  const again = createStore(be, opts);
  assert.equal(again.state.items['u1-A-0'].ok, true);
  assert.equal(again.state.ex['u1-A'].total, 6);
  assert.equal(again.state.days[day].a, 1);
});

test('migrates v1 per-exercise progress and the last unit', () => {
  const be = memoryBackend({ 'mh1:prog': JSON.stringify({ 'u1-A': [5, 6], 'u2-B': [3, 4] }), 'mh1:last': 'u2' });
  const s = createStore(be, opts);
  assert.deepEqual(s.state.ex['u1-A'], { ok: 5, total: 6, t: 0, migrated: 1 });
  assert.equal(s.state.last.at, 'u2');
  assert.equal(s.state.v, 2);
});

test('corrupt storage starts fresh instead of crashing', () => {
  const be = memoryBackend({ [KEY]: '{not json', 'mh1:prog': 'also bad' });
  const s = createStore(be, opts);
  assert.deepEqual(s.state.items, {});
  assert.equal(migrate({ v: 2, items: null }, be).items.constructor, Object);
});

test('first try: wrong then right is not a first-try success; a wrong answer creates a review card', () => {
  const s = createStore(memoryBackend(), opts);
  s.recordItem('x', wrong, 'het man');
  s.recordItem('x', ok, 'de man');
  const it = s.state.items.x;
  assert.equal(it.n, 2);
  assert.equal(it.f, 0);
  assert.equal(it.ok, true);
  assert.ok(s.state.cards['x:x']);
  assert.equal(s.state.days[day].a, 2);
  assert.equal(s.state.days[day].c, 1);
});

test('pressing Kontrollo again without changes is not counted again', () => {
  const s = createStore(memoryBackend(), opts);
  s.recordItem('y', ok, 'ben');
  s.recordItem('y', ok, 'ben');
  assert.equal(s.state.items.y.n, 1);
  assert.equal(s.state.days[day].a, 1);
});

test('opening the solution before answering removes the first-try credit', () => {
  const s = createStore(memoryBackend(), opts);
  s.reveal('u1-A', ['z']);
  s.recordItem('z', ok, 'ben');
  assert.equal(s.state.items.z.f, 0);
  assert.equal(s.state.ex['u1-A'].r, 1);
});

test('correct answers in practice move a mistake card forward', () => {
  const s = createStore(memoryBackend(), opts);
  s.recordItem('m', wrong, 'het man');
  assert.equal(s.state.cards['x:m'].due, day);
  s.recordItem('m', ok, 'de man', 'practice');
  assert.equal(s.state.cards['x:m'].due, '2026-10-20');
});

test('grading vocabulary cards and counting new cards per day', () => {
  const s = createStore(memoryBackend(), opts);
  s.grade('v:de man', 'good');
  s.grade('v:het huis', 'again');
  s.grade('v:het huis', 'good');
  assert.equal(s.state.days[day].n, 2);
  assert.equal(s.state.days[day].r, 3);
});

test('export / import round trip and rejection of foreign files', () => {
  const s = createStore(memoryBackend(), opts);
  s.toggleFav('v:de man');
  const json = s.exportJSON();
  const t = createStore(memoryBackend(), opts);
  t.importJSON(json);
  assert.equal(t.state.fav['v:de man'], 1);
  assert.throws(() => t.importJSON('{"a":1}'));
  t.reset();
  assert.deepEqual(t.state.fav, {});
});

test('a backend that cannot write reports non-persistent', () => {
  const be = memoryBackend();
  be.set = () => false; be.persistent = true;
  const s = createStore(be, opts);
  s.recordItem('q', ok, 'x');
  s.flush();
  assert.equal(s.persistent, false);
});
