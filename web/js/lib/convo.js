// Rule-based evaluation of one learner turn in a guided conversation (content/scenarios.json).
// This is not AI: each turn lists what the answer must contain, what makes it polite, model answers,
// and typical mistakes of Albanian speakers. The result separates
//   content    – did the learner say what the situation asks for? (required groups)
//   grammar    – known mistakes found (verb forms, word order patterns, calques from Albanian)
//   politeness – a polite marker when the situation expects one
// so feedback can say "correct but abrupt" or "polite but the verb form is wrong".
//
// Turn shape:
//   { npc, npc_sq, task, hint, models: [..], need: [{ any: [..] | re, sq: '..' }], polite: true|false,
//     errors: [{ re, msg, fix, style }], tip }      style: true = a naturalness note, not a grammar error
import { norm, tokens, editDistance, stripMarks } from './text.js';

export const POLITE = ['alstublieft', 'alsjeblieft', 'graag', 'mag ik', 'zou ik', 'zou u', 'kunt u', 'kan ik', 'dank u', 'dank je', 'bedankt', 'merci', 'sorry', 'pardon', 'excuseer', 'goedemorgen', 'goeiemorgen', 'goedemiddag', 'goeiemiddag', 'goedenavond', 'goeienavond', 'dag', 'hallo', 'zou je', 'wilt u'];

// Mistakes that are wrong in any context. Patterns run on normalised text (lower case, no punctuation).
export const COMMON_ERRORS = [
  { re: /\bik heb (\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|elf|twaalf|[a-z]*tien|[a-z]*tig) jaar( oud)?( en\b|$)/, msg: 'Për moshën holandishtja përdor «zijn», jo «hebben» si shqipja («kam 30 vjet»).', fix: 'Ik ben … jaar (oud).' },
  { re: /\bik (heeft|hebt)\b/, msg: 'Me «ik» folja është «heb».', fix: 'ik heb' },
  { re: /\bik (is|bent)\b/, msg: 'Me «ik» folja është «ben».', fix: 'ik ben' },
  { re: /\b(hij|zij|ze) (ben|bent)\b(?! je)/, msg: 'Me «hij / zij» (njëjës) folja është «is».', fix: 'hij is / zij is' },
  { re: /\b(hij|het) (heb|hebben)\b/, msg: 'Me «hij / zij» (njëjës) folja është «heeft».', fix: 'hij heeft' },
  { re: /\b(wij|we|jullie) (is|ben|bent|heeft|heb)\b/, msg: 'Në shumës folja merr formën e paskajores: wij zijn, wij hebben.', fix: 'wij zijn / wij hebben' },
  { re: /\bik (woont|werkt|spreekt|komt|wilt|kunt|zoekt|betaalt|drinkt|neemt)\b/, msg: 'Me «ik» folja nuk merr -t: ik woon, ik werk, ik spreek, ik kom, ik wil, ik kan.', fix: 'ik woon / ik werk …' },
  { re: /\b(kan|kunt|wil|wilt|moet|mag) (ik|je|jij|u|hij|we|wij) (?!(even|alleen|misschien|meteen|binnen|boven|beneden|open|tien|zeven|negen)\b)[a-z]+en (een|de|het|graag|mij|me)\b/, msg: 'Me folje modale paskajorja shkon në fund të fjalisë: Mag ik een koffie bestellen? / Kunt u mij helpen?', fix: 'Folja modale … paskajorja në fund' },
  { re: /\bik (wil|kan|moet|mag) (te|om te) /, msg: 'Pas foljeve modale nuk vjen «te»: ik wil betalen (jo «ik wil te betalen»).', fix: 'ik wil + paskajore' },
  { re: /\bniet (een|geen)\b/, msg: '«niet een» bëhet «geen»: Ik heb geen tijd.', fix: 'geen' },
  { re: /\bik heb niet (een )?(tijd|geld|auto|kinderen|honger|dorst)\b/, msg: 'Para emrit pa nyje ose me «een» mohimi është «geen»: Ik heb geen tijd.', fix: 'Ik heb geen …' },
  { re: /\b(ik|jij|je|hij|zij|we|wij) (gisteren|vandaag|morgen) (ben|is|heb|heeft|ga|gaat)\b/, msg: 'Kujdes rendin: folja është në vendin e dytë. «Morgen ga ik…» ose «Ik ga morgen…».', fix: 'Ik ga morgen… / Morgen ga ik…' },
  { re: /^(gisteren|vandaag|morgen|nu|straks|dan) (ik|je|jij|hij|zij|we|wij|u) /, msg: 'Kur fjalia fillon me kohën, folja vjen menjëherë pas saj: «Morgen kom ik» (jo «Morgen ik kom»).', fix: 'Morgen kom ik …' },
  { re: /\bik ben (gewerkt|gegeten|gedaan|gezien|gekocht|gemaakt|gebeld|betaald)\b/, msg: 'Këto folje marrin «hebben» në kohën e kryer: ik heb gewerkt.', fix: 'ik heb …' },
  { re: /\bik heb (gegaan|gekomen|gebleven|geworden|vertrokken)\b/, msg: 'Foljet e lëvizjes drejt një vendi dhe «blijven, worden» marrin «zijn»: ik ben gegaan.', fix: 'ik ben …' }
];

function includesPhrase(text, phrase) {
  const t = ' ' + text + ' ', p = ' ' + norm(phrase) + ' ';
  return t.includes(p);
}

// a word typed with one or two letters wrong still counts, but is reported as a spelling note
function fuzzyHas(toks, word) {
  const w = norm(word);
  if (w.includes(' ')) return null;
  const lim = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
  if (!lim) return null;
  return toks.find(t => Math.abs(t.length - w.length) <= lim && editDistance(stripMarks(t), stripMarks(w)) <= lim) || null;
}

export function evaluateTurn(turn, input) {
  const text = norm(input);
  const toks = tokens(input);
  const out = { level: 'retry', missing: [], errors: [], style: [], spelling: [], polite: true, model: turn.models?.[0] || '', exact: false };
  if (!text) { out.level = 'empty'; return out; }
  if ((turn.models || []).some(m => norm(m) === text)) { out.exact = true; out.level = 'great'; return out; }
  for (const g of turn.need || []) {
    if ((g.any || []).some(p => includesPhrase(text, p)) || (g.re && new RegExp(g.re).test(text))) continue;
    const near = (g.any || []).map(p => [p, fuzzyHas(toks, p)]).find(([, t]) => t);
    if (near) { out.spelling.push({ typed: near[1], word: near[0] }); continue; }
    out.missing.push(g.sq);
  }
  const rules = [...(turn.errors || []).map(e => ({ ...e, re: new RegExp(e.re) })), ...COMMON_ERRORS];
  // style: correct but not the most natural choice – reported separately from grammar
  for (const e of rules) if (e.re.test(text)) (e.style ? out.style : out.errors).push({ msg: e.msg, fix: e.fix });
  if (turn.polite) out.polite = POLITE.some(p => includesPhrase(text, p));
  if (!out.missing.length && !out.errors.length) out.level = out.polite && !out.spelling.length ? 'good' : 'ok';
  else if (!out.missing.length) out.level = 'ok';
  return out;
}

// Short Albanian summary for the feedback box.
export function feedbackText(r) {
  const lines = [];
  if (r.level === 'great') lines.push('Shkëlqyeshëm – kjo është pikërisht një përgjigje e natyrshme.');
  else if (r.level === 'good') lines.push('Shumë mirë! Përgjigjja ka gjithçka që duhet.');
  else if (r.level === 'ok') lines.push(r.missing.length ? 'Kuptohet, por mungon diçka.' : 'Kuptohet. Disa vërejtje:');
  else if (r.level === 'retry') lines.push('Provoni sërish – përgjigjja nuk e bën ende atë që kërkon situata.');
  for (const m of r.missing) lines.push(`Mungon: ${m}.`);
  for (const s of r.spelling) lines.push(`Drejtshkrimi: «${s.typed}» → «${s.word}».`);
  for (const e of r.errors) lines.push(`Gramatika: ${e.msg}`);
  for (const e of r.style || []) lines.push(`Më natyrshëm: ${e.msg}`);
  if (!r.polite) lines.push('Mirësjellja: gramatikisht mund të jetë në rregull, por pa «alstublieft», «graag» ose «mag ik…» tingëllon e ashpër.');
  return lines;
}

// Provider interface: the static site uses the rule engine. An AI-backed provider could implement the
// same { evaluate(turn, input) → result } contract behind a server that holds the API key; the browser
// must never contain one.
export const ruleProvider = { name: 'rregulla', evaluate: evaluateTurn };
