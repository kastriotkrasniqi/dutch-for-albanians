import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, alternatives, isCorrect } from '../web/js/lib/validate.js';
import { norm, editDistance, tokenDiff } from '../web/js/lib/text.js';
import { loadCourse } from './helpers.mjs';

const v = (input, key) => validate(input, key);

test('normalisation ignores case, punctuation, spacing and leading zeros', () => {
  assert.equal(norm('  Ik  BEN student. '), 'ik ben student');
  assert.equal(norm('«Wat?»'), 'wat');
  assert.equal(norm('09:00'), norm('9:00'));
  assert.equal(norm('piano’s'), "piano's");
  assert.equal(v('ik ben student', 'Ik ben student.').verdict, 'ok');
  assert.equal(v('Ik ben student!', 'Ik ben student.').verdict, 'ok');
});

test('alternatives: slash, optional letters, parenthetical words and explanations', () => {
  const a = alternatives('Gisteren werkte ik veel. / Gisteren heb ik veel gewerkt.').alts.map(x => x.n);
  assert.ok(a.includes('gisteren werkte ik veel') && a.includes('gisteren heb ik veel gewerkt'));
  const e = alternatives('het mooist(e)').alts.map(x => x.n);
  assert.deepEqual(e.sort(), ['het mooist', 'het mooiste']);
  assert.equal(v('rijd', 'rij (rijd)').verdict, 'ok');
  assert.equal(v('rij', 'rij (rijd)').verdict, 'ok');
  assert.equal(v('nga brenda', 'nga (brenda)').verdict, 'ok');
  const h = validate('honden', 'honden (nuk dyfishohet: dy bashkëtingëllore)');
  assert.equal(h.verdict, 'ok');
  assert.deepEqual(h.notes, ['nuk dyfishohet: dy bashkëtingëllore']);
  assert.equal(v('hondden', 'honden (nuk dyfishohet: dy bashkëtingëllore)').verdict, 'wrong');
});

test('question with two possible answers keeps the question part', () => {
  const key = 'Is dit boek van jou? – Nee, het is van haar. / Nee, het is het hare.';
  assert.equal(v('Is dit boek van jou? Nee, het is het hare.', key).verdict, 'ok');
  assert.equal(v('Nee, het is het hare.', key).verdict, 'wrong', 'half an answer is not the translation');
});

test('reduced pronouns: je = jij both ways, m\'n accepted for mijn but not the reverse', () => {
  assert.equal(v('Wat heb je?', 'Wat heb jij?').verdict, 'ok');
  assert.equal(v('Wat heb jij?', 'Wat heb je?').verdict, 'ok');
  assert.equal(v("m'n fiets", 'mijn fiets').verdict, 'near');
  const r = v('mijn fiets', "m'n fiets");
  assert.equal(r.verdict, 'wrong');
  assert.equal(r.cat, 'reduced');
});

test('diacritics and hyphens: accepted with a note, not silently', () => {
  const r = v('geeist', 'geëist');
  assert.equal(r.verdict, 'near');
  assert.match(r.notes.join(' '), /geëist/);
  assert.equal(v('shtepia', 'shtëpia').verdict, 'near');
});

test('merged words are a mistake, not a pass', () => {
  const r = v('eenhuis', 'een huis');
  assert.equal(r.verdict, 'wrong');
  assert.equal(r.cat, 'spacing');
});

test('optional alstublieft', () => {
  assert.equal(v('Een tafel voor twee, alstublieft.', 'Een tafel voor twee.').verdict, 'ok');
  const r = v('Een tafel voor twee.', 'Een tafel voor twee, alstublieft.');
  assert.equal(r.verdict, 'near');
  assert.equal(v('alstublieft', 'Een tafel voor twee, alstublieft.').verdict, 'wrong');
});

test('mistake categories', () => {
  const cat = (i, k) => validate(i, k).cat;
  assert.equal(cat('het man', 'de man'), 'article');
  assert.equal(cat('Ik heb niet geld.', 'Ik heb geen geld.'), 'negation');
  assert.equal(cat('hij werk', 'hij werkt'), 'ending');
  assert.equal(cat('Ik heeft een hond.', 'Ik heb een hond.'), 'verbform');
  assert.equal(cat('Wij is thuis.', 'Wij zijn thuis.'), 'verbform');
  assert.equal(cat('het groot huis', 'het grote huis'), 'ending');
  assert.equal(cat('de dike boeken', 'de dikke boeken'), 'spelling');
  assert.equal(cat('de dik boeken', 'de dikke boeken'), 'ending');
  assert.equal(cat('Ik zie het.', 'Ik zie hem.'), 'pronoun');
  assert.equal(cat('Ik heb gewerkd.', 'Ik heb gewerkt.'), 'ending');
  assert.equal(cat('Ik heb werkt.', 'Ik heb gewerkt.'), 'participle');
  assert.equal(cat('Ik ben student niet.', 'Ik ben niet student.'), 'order');
  assert.equal(cat('Hij heeft een boke.', 'Hij heeft een boek.'), 'spelling');
  assert.equal(cat('Het boek ligt in de tafel.', 'Het boek ligt op de tafel.'), 'preposition');
  assert.equal(cat('Hij heeft boek.', 'Hij heeft een boek.'), 'missing');
  assert.equal(cat('Ik ben ben student.', 'Ik ben student.'), 'extra');
  assert.equal(cat('Zij heeft een hond.', 'Wij hebben een kat.'), 'other');
});

test('grammar differences are never accepted', () => {
  for (const [i, k] of [['de huis', 'het huis'], ['ons huis', 'onze huis'], ['onze huis', 'ons huis'], ['Ik werkt.', 'Ik werk.'], ['een', 'één'],
    ['Ik heb gegaan.', 'Ik ben gegaan.'], ['half vijf', 'half vier'], ['dit', 'dat']]) {
    assert.ok(!isCorrect(validate(i, k)) || validate(i, k).verdict === 'near', `${i} vs ${k}`);
  }
  assert.ok(!isCorrect(validate('Ik heb gegaan.', 'Ik ben gegaan.')));
  assert.ok(!isCorrect(validate('ons huis', 'onze huis')));
});

test('edit distance and token diff', () => {
  assert.equal(editDistance('boek', 'boke'), 1);
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.deepEqual(tokenDiff(['a', 'b', 'c'], ['a', 'x', 'c']), [['b', 'x']]);
  assert.deepEqual(tokenDiff(['a', 'c'], ['a', 'b', 'c']), [[null, 'b']]);
});

test('every answer key in the course accepts its own answers', () => {
  const { items } = loadCourse();
  const failures = [];
  for (const [sid, it] of Object.entries(items)) {
    const { alts } = alternatives(it.a);
    assert.ok(alts.length, `${sid} has no alternatives: ${it.a}`);
    for (const alt of alts) {
      const r = validate(alt.raw, it.a);
      if (!isCorrect(r)) failures.push(`${sid}: «${alt.raw}» → ${r.verdict}/${r.cat}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('matching exercises: every row has exactly one correct option', () => {
  const { items } = loadCourse();
  const bad = [];
  for (const [sid, it] of Object.entries(items)) {
    if (it.t !== 'choice') continue;
    const ok = it.o.filter(o => isCorrect(validate(o, it.a)));
    if (ok.length !== 1) bad.push(`${sid} ${it.a}: ${ok.join(' | ')}`);
  }
  assert.deepEqual(bad, []);
});
