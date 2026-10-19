import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTurn, COMMON_ERRORS, feedbackText } from '../web/js/lib/convo.js';
import { norm } from '../web/js/lib/text.js';
import { loadCourse } from './helpers.mjs';

const { scenarios } = loadCourse();
const turn = (id, i) => scenarios.find(s => s.id === id).turns[i];

test('every model answer is accepted as great and triggers no grammar rule', () => {
  const bad = [];
  for (const s of scenarios) s.turns.forEach((t, i) => {
    for (const m of t.models) {
      const r = evaluateTurn({ ...t, models: [] }, m);   // judge by the rules, not by exact match
      if (r.missing.length || r.errors.length || !r.polite) bad.push(`${s.id}#${i}: «${m}» → ${feedbackText(r).join(' ')}`);
      assert.equal(evaluateTurn(t, m).level, 'great');
    }
  });
  assert.deepEqual(bad, []);
});

test('scenario data is complete', () => {
  assert.ok(scenarios.length >= 10);
  for (const s of scenarios) {
    for (const k of ['id', 'title', 'place', 'level', 'role', 'goal', 'phrases']) assert.ok(s[k], `${s.id} ${k}`);
    for (const t of s.turns) {
      assert.ok(t.task && t.models?.length && t.need?.length, `${s.id}: ${t.npc}`);
      for (const g of t.need) assert.ok(g.sq && (g.any?.length || g.re));
      for (const e of t.errors || []) new RegExp(e.re);
    }
  }
});

test('content check: missing information is reported, alternatives are accepted', () => {
  const t = turn('koffie', 0);
  assert.equal(evaluateTurn(t, 'Een thee, alstublieft.').level, 'retry');
  assert.match(evaluateTurn(t, 'Een thee, alstublieft.').missing[0], /koffie/);
  assert.equal(evaluateTurn(t, 'Mag ik een cappuccino?').level, 'good');
});

test('politeness is separate from grammar', () => {
  const r = evaluateTurn(turn('koffie', 0), 'Een koffie met melk.');
  assert.equal(r.polite, false);
  assert.equal(r.level, 'ok');
  assert.equal(r.errors.length, 0);
});

test('spelling slips in key words are noticed but understood', () => {
  const r = evaluateTurn(turn('dokter', 0), 'Goeiemorgen, ik zou graag een afsprak maken.');
  assert.equal(r.missing.length, 0);
  assert.equal(r.spelling[0].typed, 'afsprak');
  assert.equal(r.level, 'ok');
});

test('typical mistakes of Albanian speakers are explained', () => {
  const msgs = s => evaluateTurn(turn('sollicitatie', 0), s).errors.map(e => e.msg).join(' ');
  assert.match(msgs('Ik ben Arben. Ik heb 34 jaar en ik kom uit Kosovo.'), /zijn/);
  assert.doesNotMatch(msgs('Ik ben Arben. Ik ben 34 jaar en ik kom uit Kosovo.'), /zijn/);
  const omdat = evaluateTurn(turn('sollicitatie', 3), 'Omdat ik werk graag met mensen.');
  assert.ok(omdat.errors.length);
  assert.equal(evaluateTurn(turn('sollicitatie', 3), 'Want ik werk graag met mensen.').errors.length, 0);
});

test('common error rules do not fire on correct sentences', () => {
  const correct = ['Ik heet Arben.', 'Ik moet niet werken.', 'Mag ik even een vraag stellen?', 'Kunt u mij helpen?', 'Ik heb drie jaar in Gent gewoond.',
    'Ik ben 30 jaar.', 'Morgen ga ik naar de dokter.', 'Ik heb geen tijd.', 'Wij zijn moe.', 'Hij heeft een auto.', 'Ik ben gisteren thuis gebleven.', 'Ik wil betalen.'];
  for (const s of correct) {
    const hits = COMMON_ERRORS.filter(e => e.re.test(norm(s)));
    assert.equal(hits.length, 0, `${s} → ${hits.map(h => h.msg).join(' ')}`);
  }
  const wrong = ['Ik heb 30 jaar.', 'Ik heeft een kat.', 'Hij ben moe.', 'Ik woont hier.', 'Morgen ik ga werken.', 'Ik heb niet tijd.', 'Ik ben gewerkt.', 'Ik heb gegaan.', 'Ik wil te betalen.'];
  for (const s of wrong) assert.ok(COMMON_ERRORS.some(e => e.re.test(norm(s))), s);
});
