// Answer checking for every typed exercise (lessons, practice, dictation).
//
// A key is the raw text from the answer table in content/uNN.txt, e.g.
//   "Gisteren werkte ik veel. / Gisteren heb ik veel gewerkt."
//   "het mooist(e)"      → "het mooist" and "het mooiste"
//   "rij (rijd)"         → "rij" and "rijd"
//   "honden (nuk dyfishohet: dy bashkëtingëllore)" → "honden" + an explanation shown as feedback
//
// validate() returns a verdict:
//   ok    – correct
//   near  – counted as correct, with a note (missing ë/é, hyphen, reduced pronoun form)
//   wrong – not accepted; `cat` says what kind of mistake it most likely is
//   empty – nothing typed
import { norm, stripMarks, tokens, editDistance, tokenDiff } from './text.js';

// Unstressed forms that are equally correct in any sentence (je = jij, we = wij …).
const SAME = [['je', 'jij'], ['ze', 'zij'], ['we', 'wij'], ['me', 'mij']];
// Written reduced possessives: fine instead of the full form, but not the other way round,
// because the exercises that use them in the key are the ones that teach them.
const REDUCED = { "m'n": 'mijn', "z'n": 'zijn', "d'r": 'haar' };

const ARTICLES = new Set(['de', 'het', 'een', "'t"]);
const NEGATION = new Set(['niet', 'geen']);
const PRONOUNS = new Set(['ik', 'jij', 'je', 'u', 'hij', 'zij', 'ze', 'het', 'wij', 'we', 'jullie', 'mij', 'me', 'jou', 'hem', 'haar', 'ons', 'hen', 'hun',
  'mijn', 'jouw', 'uw', 'zijn', 'onze', "m'n", "z'n", "d'r", 'dit', 'dat', 'deze', 'die', 'zich', 'mezelf', 'jezelf', 'zichzelf']);
const PREPS = new Set(['op', 'in', 'aan', 'naast', 'onder', 'boven', 'achter', 'voor', 'tussen', 'bij', 'naar', 'met', 'van', 'uit', 'om', 'tegen',
  'over', 'door', 'tot', 'sinds', 'zonder', 'tijdens', 'na', 'langs', 'rond', 'binnen', 'buiten', 'vanaf', 'per']);
// Present-tense forms of irregular and modal verbs: a mix-up inside one group is a verb-form mistake.
const VERB_GROUPS = [['ben', 'bent', 'is', 'zijn'], ['heb', 'hebt', 'heeft', 'hebben'], ['kan', 'kunt', 'kun', 'kunnen'], ['wil', 'wilt', 'willen'],
  ['mag', 'mogen'], ['moet', 'moeten'], ['zal', 'zult', 'zullen'], ['ga', 'gaat', 'gaan'], ['doe', 'doet', 'doen'], ['sta', 'staat', 'staan'],
  ['zie', 'ziet', 'zien'], ['was', 'waren'], ['had', 'hadden'], ['kon', 'konden'], ['wilde', 'wilden'], ['zou', 'zouden'], ['werd', 'werden', 'word', 'wordt', 'worden']];
const VERB_OF = new Map(VERB_GROUPS.flatMap((g, i) => g.map(w => [w, i])));
const ENDINGS = new Set(['', 't', 'd', 'e', 'en', 'n', 's', 'te', 'de', 'ten', 'den', 'st', 'ste', 'er', 'ere', 'dt', 'je', 'tje', 'es']);

function sameTok(a, b) {
  return a === b || SAME.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function isExplanation(inner) {
  return /\s/.test(inner.trim());
}

// Expand a raw key into its acceptable alternatives: [{ raw, n }], plus explanation notes.
export function alternatives(raw) {
  const out = new Map();
  const notes = [];
  const add = s => {
    const t = s.replace(/\s+/g, ' ').trim();
    const n = norm(t);
    if (n && !out.has(n)) out.set(n, t);
  };
  const whole = raw.replace(/\(([^)]*)\)/g, (m, inner) => {
    if (isExplanation(inner)) { notes.push(inner.trim()); return ''; }
    return m;
  });
  const variants = whole.split(/\s*\/\s*/);
  // "Vraag? – Antwoord A. / Antwoord B." : the second variant only repeats the answer part
  const head = variants[0].match(/^(.*?\s[–—]\s)/);
  for (let a of variants) {
    a = a.trim();
    if (!a) continue;
    if (head && !/\s[–—]\s/.test(a)) a = head[1] + a;
    if (/\(e\)/.test(a)) { add(a.replace(/\(e\)/g, '')); add(a.replace(/\(e\)/g, 'e')); }
    const opt = a.match(/\(([^)\s]+)\)/);
    const noPar = a.replace(/\([^)]*\)/g, '');
    add(noPar);
    if (opt && !/\(e\)/.test(a)) {
      add(a.replace(/[()]/g, ''));                                     // "nga (brenda)" → "nga brenda"
      add(noPar.replace(/\S+\s*$/, opt[1]));                            // "rij (rijd)" → "rijd"
      if (noPar.trim().split(/\s+/).length === 1) add(opt[1]);
    }
    if (noPar.includes(',') && !/[.?!…]\s*$/.test(noPar)) noPar.split(',').forEach(add);
  }
  // keep the unsplit key too ("jouw / jullie" as a single matching option)
  if (raw.includes('/') && !raw.includes('(')) add(raw);
  return { alts: [...out].map(([n, r]) => ({ n, raw: r })), notes };
}

// Politeness words that don't change the grammar being tested: "…, alstublieft" may be added or left out.
const OPTIONAL = new Set(['alstublieft', 'alsjeblieft']);

function tokensEqual(a, b, notes) {
  const oa = a.filter(t => !OPTIONAL.has(t)), ob = b.filter(t => !OPTIONAL.has(t));
  if ((oa.length !== a.length || ob.length !== b.length) && (oa.length || ob.length)) {
    if (!tokensEqual(oa, ob, notes)) return false;
    if (ob.length < b.length && oa.length === a.length) notes.add('Mos harroni «alstublieft» kur kërkoni diçka me mirësjellje.');
    return true;
  }
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (sameTok(a[i], b[i])) continue;
    if (REDUCED[a[i]] === b[i]) { notes.add(`«${a[i]}» është forma e shkurtuar e «${b[i]}»: e saktë në gjuhën e folur dhe në mesazhe.`); continue; }
    return false;
  }
  return true;
}

function classifyPair(x, y) {
  if (x == null) return { cat: 'missing', word: y };
  if (y == null) return { cat: 'extra', word: x };
  if (REDUCED[x] === y) return { cat: 'ok' };                 // input m'n, key mijn
  if (REDUCED[y] === x) return { cat: 'reduced', word: x };    // input mijn, key m'n
  if (ARTICLES.has(x) && ARTICLES.has(y)) return { cat: 'article', word: x };
  if (NEGATION.has(x) && NEGATION.has(y)) return { cat: 'negation', word: x };
  if (stripMarks(x) === stripMarks(y)) return { cat: 'marks', word: x };
  if (VERB_OF.has(x) && VERB_OF.get(x) === VERB_OF.get(y)) return { cat: 'verbform', word: x };
  if (x.replace(/^ge/, '') === y.replace(/^ge/, '') && x !== y) return { cat: 'participle', word: x };
  const p = commonPrefix(x, y);
  if (p >= 3 && ENDINGS.has(x.slice(p)) && ENDINGS.has(y.slice(p))) return { cat: 'ending', word: x };
  if (sameStem(x, y)) return { cat: 'ending', word: x };
  if (PRONOUNS.has(x) && PRONOUNS.has(y)) return { cat: 'pronoun', word: x };
  if (PREPS.has(x) && PREPS.has(y)) return { cat: 'preposition', word: x };
  if (editDistance(x, y) <= (y.length <= 4 ? 1 : 2)) return { cat: 'spelling', word: x };
  return { cat: 'word', word: x };
}

// groot/grote, dik/dikke, lief/lieve, huis/huizen: the same word with an ending and its spelling change
function sameStem(a, b) {
  const base = w => w.replace(/(en|e)$/, '').replace(/([a-z])\1/g, '$1').replace(/v$/, 'f').replace(/z$/, 's');
  const end = w => (w.match(/(en|e)$/) || [''])[0];
  // same ending (dike / dikke) is a spelling slip, a different ending is a grammar point
  return a !== b && end(a) !== end(b) && base(a) === base(b) && base(a).length >= 2;
}

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export const MESSAGES = {
  article: w => `Nyja «${w}» nuk është e saktë. Kujtoni: shumësi merr gjithmonë «de», zvogëluesit (-je) gjithmonë «het».`,
  negation: w => `«${w}»: zgjedhje e gabuar mes «niet» dhe «geen». «Geen» vjen para emrit me «een» ose pa nyje; në raste të tjera «niet».`,
  verbform: w => `Folja është e duhura, por forma «${w}» nuk përshtatet me kryefjalën ose me kohën (ik ben / jij bent / hij is …).`,
  ending: w => `Fjala është e duhura, por mbaresa te «${w}» jo. Kontrolloni vetën (ik / jij / hij / wij), numrin ose kohën.`,
  participle: w => `Kujdes me parashtesën «ge-» te «${w}».`,
  pronoun: w => `Përemri «${w}» nuk është i duhuri këtu.`,
  preposition: w => `Parafjala «${w}» nuk është e duhura këtu.`,
  spelling: w => `Gabim drejtshkrimi te «${w}». Fjala është pothuajse e saktë.`,
  marks: w => `Te «${w}» mungon ose është tepër një shenjë (ë, é, ï…).`,
  reduced: w => `Këtu kërkohet forma e plotë, jo «${w}».`,
  word: w => `Fjala «${w}» nuk është ajo që pritej.`,
  missing: () => 'Mungon një fjalë.',
  missingMany: n => `Mungojnë ${n} fjalë.`,
  extra: w => `Fjala «${w}» është e tepërt.`,
  order: () => 'Fjalët janë të sakta, por rendi jo. Kujtoni: në fjalinë kryesore folja e zgjedhur është në vendin e dytë; në fjalinë e varur – në fund.',
  spacing: () => 'Fjalët janë të sakta, por ndarja jo: kontrolloni ku shkruhen bashkë e ku veç.',
  other: () => 'Përgjigjja ndryshon shumë nga ajo e pritura.'
};

// Short Albanian names for statistics and the mistake notebook.
export const CATEGORY_LABEL = {
  article: 'nyja de/het', negation: 'niet/geen', ending: 'mbaresa', verbform: 'forma e foljes', participle: 'pjesorja ge-', pronoun: 'përemri',
  preposition: 'parafjala', spelling: 'drejtshkrimi', marks: 'shenjat', reduced: 'forma e shkurtuar', word: 'fjala',
  missing: 'fjalë që mungon', extra: 'fjalë e tepërt', order: 'rendi i fjalëve', spacing: 'ndarja e fjalëve', other: 'tjetër'
};

const GRAMMAR = new Set(['verbform', 'article', 'negation', 'ending', 'participle', 'pronoun', 'preposition', 'order', 'reduced']);
export function isGrammarCategory(cat) { return GRAMMAR.has(cat); }

function analyse(inp, alt) {
  const a = inp.split(' '), b = alt.n.split(' ');
  if (a.join('') === b.join('')) return { cat: 'spacing', msg: MESSAGES.spacing(), score: 1 };
  if (a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')) return { cat: 'order', msg: MESSAGES.order(), score: 1 };
  const diff = tokenDiff(a, b);
  const pairs = diff.map(([x, y]) => classifyPair(x, y)).filter(p => p.cat !== 'ok');
  if (!pairs.length) return { cat: 'other', msg: MESSAGES.other(), score: 99 };
  const missing = pairs.filter(p => p.cat === 'missing');
  if (missing.length === pairs.length) {
    return { cat: 'missing', msg: missing.length > 1 ? MESSAGES.missingMany(missing.length) : MESSAGES.missing(), score: missing.length };
  }
  if (pairs.length > Math.max(2, Math.ceil(b.length / 2))) return { cat: 'other', msg: MESSAGES.other(), score: pairs.length + 10 };
  const main = pairs.find(p => p.cat !== 'missing' && p.cat !== 'extra') || pairs[0];
  const msgs = [...new Set(pairs.slice(0, 2).map(p => MESSAGES[p.cat](p.word)))];
  if (pairs.length > 2) msgs.push('Ka edhe gabime të tjera.');
  const weight = pairs.reduce((s, p) => s + (p.cat === 'spelling' || p.cat === 'marks' ? 0.5 : 1), 0);
  return { cat: main.cat, msg: msgs.join(' '), score: weight };
}

export function validate(input, rawKey) {
  const { alts, notes } = alternatives(rawKey || '');
  const inp = norm(input);
  const expected = alts[0]?.raw ?? rawKey;
  if (!inp) return { verdict: 'empty', expected, alts: alts.map(a => a.raw), notes };
  const extra = new Set();
  for (const alt of alts) {
    if (inp === alt.n || tokensEqual(inp.split(' '), alt.n.split(' '), extra)) {
      return { verdict: extra.size ? 'near' : 'ok', expected: alt.raw, alts: alts.map(a => a.raw), notes: [...notes, ...extra] };
    }
  }
  for (const alt of alts) {
    if (stripMarks(inp) === stripMarks(alt.n)) {
      return { verdict: 'near', cat: 'marks', expected: alt.raw, alts: alts.map(a => a.raw),
        notes: [...notes, `Saktë, por kujdes me shenjat: shkruhet «${alt.raw}».`] };
    }
    if (inp.replace(/-/g, '') === alt.n.replace(/-/g, '') || inp.replace(/-/g, ' ') === alt.n.replace(/-/g, ' ')) {
      return { verdict: 'near', cat: 'marks', expected: alt.raw, alts: alts.map(a => a.raw),
        notes: [...notes, `Saktë, por kujdes me vizën: shkruhet «${alt.raw}».`] };
    }
  }
  let best = null;
  for (const alt of alts) {
    const r = analyse(inp, alt);
    const tie = best && r.score === best.score && editDistance(inp, alt.n) < editDistance(inp, best.alt.n);
    if (!best || r.score < best.score || tie) best = { ...r, alt };
  }
  return { verdict: 'wrong', cat: best.cat, msg: best.msg, expected: best.alt.raw, alts: alts.map(a => a.raw), notes };
}

export function isCorrect(v) { return v.verdict === 'ok' || v.verdict === 'near'; }
