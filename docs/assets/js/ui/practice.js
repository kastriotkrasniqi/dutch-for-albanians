// Praktikë: sessions separate from the lessons.
//   #praktike                    hub
//   #praktike/ditore             daily review: due mistakes + due/new words (spaced repetition)
//   #praktike/gabimet[/unit]     items whose last answer was wrong
//   #praktike/njesia/<unit>      one unit's items, shuffled
//   #praktike/perzier            mixed quiz over chosen units
//   #praktike/sfide              10 quick questions from the units opened so far
//   #praktike/dehet              de or het?
//   #praktike/niveli             short placement test
// A session never moves on by itself after the last answer: it ends on a summary with the choices.
import { isDue, cardStatus, dueOrder } from '../lib/srs.js';
import { isCorrect, CATEGORY_LABEL } from '../lib/validate.js';
import { shuffle } from '../lib/text.js';
import { itemsOfUnit, recentMistakes, findUnit, courseOrder, unitStats, cardCounts } from '../lib/progress.js';
import { esc, plural, pct, fillIcons } from './dom.js';
import { renderItem, itemLabel } from './item.js';
import { vocabList, vocabQueue, renderCard, dueVocabCount } from './vocab.js';

let session = null;

function unitName(ctx, code) {
  const u = findUnit(ctx.course, code);
  return u ? (u.n ? `Njësia ${u.n}` : u.title) : code;
}

function seenUnits(ctx) {
  return courseOrder(ctx.course).filter(id => ctx.store.state.seen[id] || unitStats(ctx.store.state, ctx.course, id).attempted);
}

function pickItems(ctx, units, n, { preferNew = true } = {}) {
  const st = ctx.store.state;
  const pool = units.flatMap(u => itemsOfUnit(ctx.course, u));
  // items not yet answered correctly first, then the rest
  const fresh = shuffle(pool.filter(s => !st.items[s]?.ok));
  const rest = shuffle(pool.filter(s => st.items[s]?.ok));
  return (preferNew ? [...fresh, ...rest] : shuffle(pool)).slice(0, n);
}

function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
  return out;
}

function build(ctx, mode, arg) {
  const st = ctx.store.state, t = ctx.today();
  switch (mode) {
    case 'ditore': {
      const x = Object.entries(st.cards).filter(([id, c]) => id.startsWith('x:') && isDue(c, t) && ctx.course.items[id.slice(2)])
        .map(([id, card]) => ({ id, card })).sort(dueOrder).slice(0, 12).map(o => ({ kind: 'item', sid: o.id.slice(2) }));
      const v = vocabQueue(ctx, { maxDue: 20 }).map(w => ({ kind: 'card', w, mode: Math.random() < 0.5 ? 'nl' : 'sq' }));
      let tasks = interleave(x, v);
      if (!tasks.length) {
        const units = seenUnits(ctx);
        tasks = pickItems(ctx, units.length ? units : courseOrder(ctx.course).slice(0, 3), 8).map(sid => ({ kind: 'item', sid }));
      }
      return { title: 'Seanca ditore', tasks };
    }
    case 'gabimet': {
      const list = recentMistakes(st, ctx.course, 999).filter(m => !arg || ctx.course.exercises[ctx.course.items[m.sid].ex].unit === arg);
      return { title: arg ? `Gabimet · ${unitName(ctx, arg)}` : 'Gabimet e mia', tasks: list.slice(0, 20).map(m => ({ kind: 'item', sid: m.sid })), empty: 'Nuk keni gabime të pakorrigjuara. Bravo!' };
    }
    case 'njesia':
      return { title: `Ushtrime · ${unitName(ctx, arg)}`, tasks: pickItems(ctx, [arg], 12).map(sid => ({ kind: 'item', sid })) };
    case 'sfide': {
      const units = seenUnits(ctx);
      const sids = pickItems(ctx, units.length ? units : courseOrder(ctx.course).slice(0, 4), 40, { preferNew: false })
        .filter(s => ['choice', 'blank', 'table'].includes(ctx.course.items[s].t)).slice(0, 10);
      return { title: 'Sfidë e shkurtër · 10 pyetje', tasks: sids.map(sid => ({ kind: 'item', sid })) };
    }
    case 'perzier':
      return { title: 'Kuiz i përzier', tasks: pickItems(ctx, arg.units, arg.n).map(sid => ({ kind: 'item', sid })) };
    case 'dehet': {
      const seen = new Set(seenUnits(ctx));
      let nouns = vocabList(ctx.course).filter(w => w.art && w.units.some(u => seen.has(u)));
      if (nouns.length < 12) nouns = vocabList(ctx.course).filter(w => w.art).sort((a, b) => a.order - b.order).slice(0, 40);
      return { title: 'de apo het?', tasks: shuffle(nouns).slice(0, 20).map(w => ({ kind: 'art', w })), record: true };
    }
    case 'niveli': {
      const marks = ['u1', 'u2', 'u3', 'u5', 'u6', 'u8', 'u12', 'u14', 'u16', 'u18', 'u20', 'u21', 'u23'];
      const tasks = [];
      for (const u of marks) {
        const pool = shuffle(itemsOfUnit(ctx.course, u).filter(s => ['choice', 'blank'].includes(ctx.course.items[s].t) && ctx.course.items[s].a.length < 30));
        pool.slice(0, 2).forEach(sid => tasks.push({ kind: 'item', sid, unit: u }));
      }
      return { title: 'Test i shkurtër i nivelit', tasks, test: true };
    }
  }
  return null;
}

function artHint(w) {
  if (/je$/.test(w.head)) return 'Zvogëluesit me -je marrin gjithmonë het.';
  if (/(heid|ing|tie|teit|schap|ij)$/.test(w.head) && w.art === 'de') return 'Emrat me -heid, -ing, -tie, -teit, -schap janë zakonisht de.';
  if (/^(ge|be|ver|ont)/.test(w.head) && w.art === 'het') return 'Shumë emra me ge-, be-, ver-, ont- janë het (por ka përjashtime).';
  if (/(um|ment|isme)$/.test(w.head) && w.art === 'het') return 'Emrat me -um, -ment, -isme janë zakonisht het.';
  return w.art === 'het' ? 'Kjo fjalë duhet mësuar përmendësh si het-fjalë.' : 'Rreth 2 nga 3 emra janë de-fjalë.';
}

function renderArt(box, ctx, w, done) {
  box.innerHTML = `<div class="q art-q"><p class="instr">Cila nyje shkon me këtë emër?</p>
    <div class="fc-word">${esc(w.head)}</div><p class="muted">${esc(w.sq)}</p>
    <div class="choices two"><button type="button" class="choice big" data-a="de">de</button><button type="button" class="choice big" data-a="het">het</button></div>
    <div class="qfb" aria-live="polite"></div><div class="exbar"></div></div>`;
  box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const good = b.dataset.a === w.art;
    box.querySelectorAll('[data-a]').forEach(x => { x.disabled = true; if (x.dataset.a === w.art) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
    const fb = box.querySelector('.qfb');
    fb.className = 'qfb ' + (good ? 'ok' : 'bad');
    fb.innerHTML = `<b>${good ? 'Saktë!' : 'Jo:'}</b> <b>${esc(w.art)} ${esc(w.head)}</b>${w.pl ? ` · shumës: de ${esc(w.pl.replace(/^de\s+/, ''))}` : ''}<div class="muted small">${esc(artHint(w))}</div>`;
    const card = ctx.store.state.cards[w.id];
    if (!good) ctx.store.grade(w.id, 'again');
    else if (card && isDue(card, ctx.today())) ctx.store.grade(w.id, 'good');
    const bar = box.querySelector('.exbar');
    bar.innerHTML = '<button type="button" class="btn primary">Vazhdo →</button>';
    bar.firstChild.addEventListener('click', () => done(good));
    bar.firstChild.focus();
  }));
  box.querySelector('[data-a]').focus({ preventScroll: true });
}

function placement(ctx, s) {
  const byUnit = {};
  s.tasks.forEach((tk, i) => { const r = s.results[i]; (byUnit[tk.unit] = byUnit[tk.unit] || []).push(r?.good ? 1 : 0); });
  const order = Object.keys(byUnit);
  let start = order.find(u => byUnit[u].reduce((a, b) => a + b, 0) < byUnit[u].length);
  const recs = start ? findUnit(ctx.course, start) : null;
  const ok = s.results.filter(r => r.good).length;
  const level = !start || order.indexOf(start) >= 9 ? 'A2' : order.indexOf(start) >= 5 ? 'A1+' : 'A1';
  const first = order.indexOf(start) <= 0;
  return `<p>Rezultati: <b>${ok} / ${s.tasks.length}</b>. Niveli i përafërt: <b>${level}</b>.</p>
    <p>${!start ? 'Iu përgjigjët saktë të gjitha pikave të kontrollit. Mund të filloni nga Pjesa V, ose të përsërisni ato njësi që doni.'
      : first ? 'Ju rekomandojmë të filloni nga e para: Hapi 0 (shqiptimi) dhe Njësia 1.'
      : `Ju rekomandojmë të filloni nga <b>Njësia ${recs.n}: ${esc(recs.title)}</b>. Njësitë para saj mund t'i shfletoni shpejt dhe të bëni vetëm ushtrimet.`}</p>
    <p class="note">Ky është një test i shkurtër me ${s.tasks.length} pyetje nga ushtrimet e kursit, jo një provim zyrtar. Përgjigjet e tij nuk ruhen te progresi.</p>
    <div class="exbar"><a class="btn primary" href="#${start && !first ? recs.id : 'shqiptimi'}">${start && !first ? `Hap Njësinë ${recs.n}` : 'Fillo nga Hapi 0'} →</a></div>`;
}

function summary(el, ctx, s) {
  const ok = s.results.filter(r => r.good).length;
  const wrong = s.results.map((r, i) => ({ r, tk: s.tasks[i] })).filter(o => o.r && !o.r.good);
  const wrongItems = wrong.filter(o => o.tk.kind === 'item');
  el.querySelector('.psession').innerHTML = `<div class="card done-card ${ok === s.results.length ? 'is-good' : 'is-review'}" tabindex="-1">
    <div class="lk">Seanca mbaroi</div><h3>${s.test ? 'Rezultati i testit' : `${ok} nga ${s.results.length} të sakta`}</h3>
    ${s.test ? placement(ctx, s) : `
    ${wrong.length ? `<h4>Gabimet</h4><ol class="wrong">${wrong.map(({ r, tk }) => tk.kind === 'item'
      ? `<li><div class="wq">${ctx.course.items[tk.sid].p || esc(itemLabel(ctx, tk.sid))}</div><div class="wa">Ju: <s>${esc(r.value || '—')}</s> → <b>${esc((r.res.alts || []).slice(0, 2).join(' · '))}</b></div>${r.res.msg ? `<div class="muted small">${esc(r.res.msg)}${r.res.cat ? ` <span class="tag">${esc(CATEGORY_LABEL[r.res.cat] || '')}</span>` : ''}</div>` : ''}</li>`
      : `<li><b>${esc(tk.w.art ? tk.w.art + ' ' + tk.w.head : tk.w.nl)}</b> – ${esc(tk.w.sq)}</li>`).join('')}</ol>
      <p class="muted">Gabimet kthehen automatikisht në seancën ditore pas një dite, pastaj pas 3 ditësh e më gjatë kur i dini.</p>` : '<p>Asnjë gabim. Shkëlqyeshëm!</p>'}
    <div class="exbar">
      ${wrongItems.length ? '<button type="button" class="btn primary" data-redo>Përsërit gabimet e kësaj seance</button>' : ''}
      <button type="button" class="btn" data-again>Seancë e re</button>
      <a class="btn ghost" href="#praktike">Te praktika</a></div>`}
  </div>`;
  const card = el.querySelector('.done-card'); card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'nearest' });
  el.querySelector('[data-redo]')?.addEventListener('click', () => {
    session = { ...s, title: 'Përsëritje e gabimeve', tasks: wrongItems.map(o => o.tk), i: 0, results: [] };
    run(el, ctx);
  });
  el.querySelector('[data-again]')?.addEventListener('click', () => {
    const fresh = build(ctx, s.mode, s.arg);
    session = { ...s, ...fresh, i: 0, results: [] };
    run(el, ctx);
  });
}

function run(el, ctx) {
  const s = session;
  el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#praktike">Praktikë</a></div><div class="utitle"><h2>${esc(s.title)}</h2></div>
    <div class="sbar"><span class="bar"><i></i></span><span class="muted small sct"></span><button type="button" class="link small" data-end>Mbaro seancën</button></div></header><div class="psession"></div>`;
  const box = el.querySelector('.psession');
  el.querySelector('[data-end]').addEventListener('click', () => { s.tasks = s.tasks.slice(0, s.i); summary(el, ctx, s); el.querySelector('.sbar').hidden = true; });
  if (!s.tasks.length) {
    box.innerHTML = `<div class="empty">${esc(s.empty || 'Asgjë për të praktikuar këtu tani. Hapni një njësi dhe bëni ushtrimet e saj.')}</div><div class="exbar"><a class="btn" href="#praktike">Te praktika</a></div>`;
    el.querySelector('.sbar').hidden = true;
    return;
  }
  const step = () => {
    if (s.i >= s.tasks.length) { el.querySelector('.sbar').hidden = true; summary(el, ctx, s); return; }
    el.querySelector('.bar i').style.width = Math.round((s.i / s.tasks.length) * 100) + '%';
    el.querySelector('.sct').textContent = `${s.i + 1} / ${s.tasks.length}`;
    const tk = s.tasks[s.i];
    const next = r => { s.results[s.i] = r; s.i++; step(); };
    if (tk.kind === 'item') {
      let last = null;
      renderItem(box, ctx, tk.sid, {
        last: s.i === s.tasks.length - 1,
        record: (sid, res, value) => { last = { res, value, good: isCorrect(res) }; if (!s.test) ctx.store.recordItem(sid, res, value, 'practice'); },
        done: () => next(last)
      });
    } else if (tk.kind === 'card') {
      renderCard(box, ctx, tk.w, tk.mode, g => next({ good: g !== 'again', grade: g }));
    } else if (tk.kind === 'art') {
      renderArt(box, ctx, tk.w, good => next({ good }));
    }
  };
  step();
}

function start(el, ctx, mode, arg) {
  const b = build(ctx, mode, arg);
  if (!b) { renderHub(el, ctx); return; }
  session = { mode, arg, key: mode + '/' + JSON.stringify(arg), ...b, i: 0, results: [] };
  run(el, ctx);
}

function renderMixed(el, ctx) {
  const units = courseOrder(ctx.course);
  const seen = new Set(seenUnits(ctx));
  el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#praktike">Praktikë</a></div><div class="utitle"><h2>Kuiz i përzier</h2></div>
    <p class="usub">Zgjidhni njësitë. Pyetjet që nuk i keni zgjidhur ende saktë vijnë të parat.</p></header>
    <form class="card mixform">
      <fieldset><legend>Njësitë</legend><div class="checks">${units.map(id => `<label><input type="checkbox" name="u" value="${id}" ${seen.has(id) ? 'checked' : ''}> ${esc(unitName(ctx, id))}<span class="muted small"> ${esc(findUnit(ctx.course, id).title)}</span></label>`).join('')}</div>
      <p><button type="button" class="link" data-all>Të gjitha</button> · <button type="button" class="link" data-none>Asnjë</button></p></fieldset>
      <label>Numri i pyetjeve <select name="n"><option>10</option><option selected>20</option><option>30</option></select></label>
      <div class="exbar"><button class="btn primary">Fillo kuizin</button></div>
    </form>`;
  const f = el.querySelector('form');
  f.querySelector('[data-all]').addEventListener('click', () => f.querySelectorAll('[name=u]').forEach(c => { c.checked = true; }));
  f.querySelector('[data-none]').addEventListener('click', () => f.querySelectorAll('[name=u]').forEach(c => { c.checked = false; }));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const us = [...f.querySelectorAll('[name=u]:checked')].map(c => c.value);
    if (!us.length) { ctx.toast('Zgjidhni të paktën një njësi.'); return; }
    start(el, ctx, 'perzier', { units: us, n: +f.n.value });
  });
}

function renderHub(el, ctx) {
  const st = ctx.store.state, t = ctx.today();
  const dueX = cardCounts(st, t, 'x:').due;
  const dueV = dueVocabCount(ctx);
  const mistakes = recentMistakes(st, ctx.course, 999).length;
  const seen = seenUnits(ctx).filter(id => findUnit(ctx.course, id).exercises.length);
  el.innerHTML = `<header class="uhead"><div class="ukick">Praktikë</div><div class="utitle"><h2>Praktikë dhe përsëritje</h2></div>
    <p class="usub">Seanca të shkurtra, të ndara nga mësimet. Çdo përgjigje e gabuar kthehet më vonë, derisa ta dini.</p></header>
    <div class="pgrid">
      <a class="ptile hl" href="#praktike/ditore"><b>Seanca ditore</b><span>${dueX + dueV ? `${plural(dueX + dueV, 'përsëritje', 'përsëritje')} për sot` : 'fjalë të reja dhe pyetje nga njësitë tuaja'}</span></a>
      <a class="ptile" href="#praktike/gabimet"><b>Gabimet e mia</b><span>${mistakes ? plural(mistakes, 'pyetje', 'pyetje') + ' për t\'u korrigjuar' : 'asnjë gabim i hapur'}</span></a>
      <a class="ptile" href="#praktike/sfide"><b>Sfidë e shkurtër</b><span>10 pyetje të shpejta</span></a>
      <a class="ptile" href="#praktike/perzier"><b>Kuiz i përzier</b><span>zgjidhni vetë njësitë</span></a>
      <a class="ptile" href="#praktike/dehet"><b>de apo het?</b><span>trajnim i nyjave me emrat e kursit</span></a>
      <a class="ptile" href="#fjalori/kartela"><b>Kartela</b><span>fjalori me përsëritje me intervale</span></a>
      <a class="ptile" href="#biseda"><b>Biseda</b><span>situata nga Antwerpeni</span></a>
      <a class="ptile" href="#degjo"><b>Diktim</b><span>dëgjoni dhe shkruani</span></a>
      <a class="ptile" href="#praktike/niveli"><b>Test niveli</b><span>ku të filloj?</span></a>
    </div>
    <section class="card"><h3>Gramatikë sipas temës</h3>
      <p class="muted small">Ushtrime të përziera nga një njësi e vetme. ${seen.length ? 'Njësitë që keni hapur:' : 'Hapni një njësi dhe ajo shfaqet këtu; ose zgjidhni nga lista e plotë.'}</p>
      <div class="topic-list">${(seen.length ? seen : courseOrder(ctx.course).slice(0, 6)).map(id => {
        const s = unitStats(st, ctx.course, id);
        return `<a class="row-link" href="#praktike/njesia/${id}"><span>${esc(unitName(ctx, id))} · ${esc(findUnit(ctx.course, id).title)}</span><span class="tag ${s.accuracy !== null && s.accuracy < st.settings.mastery ? 'warn' : ''}">${pct(s.accuracy)}</span></a>`;
      }).join('')}</div>
      <details><summary>Të gjitha njësitë</summary><div class="topic-list">${courseOrder(ctx.course).filter(id => findUnit(ctx.course, id).exercises.length).map(id => `<a class="row-link" href="#praktike/njesia/${id}"><span>${esc(unitName(ctx, id))} · ${esc(findUnit(ctx.course, id).title)}</span></a>`).join('')}</div></details>
    </section>`;
  fillIcons(el);
}

export function render(el, ctx, args) {
  const [mode, arg] = args;
  if (!mode) { session = null; renderHub(el, ctx); return; }
  const key = mode + '/' + JSON.stringify(arg ?? null);
  const unfinished = session && session.i < session.tasks.length;
  // coming back to the page continues an unfinished session
  if (mode === 'perzier') { if (unfinished && session.mode === 'perzier') run(el, ctx); else renderMixed(el, ctx); return; }
  if (unfinished && session.key === key) { run(el, ctx); return; }
  start(el, ctx, mode, arg ?? null);
}
