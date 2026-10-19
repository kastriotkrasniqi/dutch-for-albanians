// Global search over lessons, rules, vocabulary, example sentences, verbs and conversations.
// Matching ignores case and accents (shtepi finds shtëpi), and ranks title/headword matches first.
import { loose } from './text.js';

export function buildIndex(course) {
  const docs = [];
  for (const s of course.search) docs.push({ kind: s.k, title: s.t, sub: s.s, at: s.at });
  const seen = new Set();
  for (const v of course.vocab) {
    const k = v.nl.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    docs.push({ kind: 'word', title: v.nl, sub: v.sq, at: `fjalori` , q: v.nl });
  }
  for (const s of course.sentences) docs.push({ kind: 'example', title: s.nl, sub: s.sq, at: s.at });
  for (const v of course.verbs || []) docs.push({ kind: 'verb', title: `${v.inf} – ${v.ps} – ${v.pc}`, sub: v.sq, at: 'foljet', q: v.inf });
  for (const c of course.scenarios || []) docs.push({ kind: 'convo', title: c.title, sub: c.place, at: `biseda/${c.id}` });
  for (const d of docs) { d._t = loose(d.title); d._s = loose(d.sub || ''); }
  return docs;
}

const KIND_RANK = { unit: 0, lesson: 1, rule: 2, word: 3, verb: 3, convo: 4, example: 5 };

export function search(index, query, limit = 60) {
  const q = loose(query);
  if (q.length < 2) return [];
  const words = q.split(' ').filter(Boolean);
  const res = [];
  for (const d of index) {
    const hay = d._t + ' ' + d._s;
    if (!words.every(w => hay.includes(w))) continue;
    let score = KIND_RANK[d.kind] ?? 6;
    if (d._t === q || d._t.replace(/^(de|het) /, '') === q) score -= 10;
    else if (d._t.startsWith(q) || d._t.replace(/^(de|het) /, '').startsWith(q)) score -= 5;
    else if (!words.every(w => d._t.includes(w))) score += 3;
    res.push({ d, score });
  }
  return res.sort((a, b) => a.score - b.score || a.d.title.length - b.d.title.length).slice(0, limit).map(r => r.d);
}
