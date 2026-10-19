// Fjalori: searchable word list built from the unit glossaries, flashcards with spaced repetition,
// typed recall, favourites and difficult words.
//   #fjalori               list with search and filters
//   #fjalori/kartela       flashcards Dutch → Albanian
//   #fjalori/kartela-sq    flashcards Albanian → Dutch
//   #fjalori/shkruaj       typed recall: read Albanian, write Dutch
import { review, isDue, cardStatus, preview, dueOrder, GRADES } from '../lib/srs.js';
import { validate, isCorrect } from '../lib/validate.js';
import { loose } from '../lib/text.js';
import { daysBetween } from '../lib/dates.js';
import { esc, plural, icon } from './dom.js';
import { speakButton, say } from './speech.js';

let words = null;

export function vocabList(course) {
  if (words) return words;
  const map = new Map();
  for (const v of course.vocab) {
    const key = v.nl.toLowerCase();
    if (!map.has(key)) map.set(key, { ...v, id: 'v:' + key, units: [v.u] });
    else {
      const w = map.get(key);
      if (!w.units.includes(v.u)) w.units.push(v.u);
      for (const part of v.sq.split(/[;,]\s*/)) if (part && !w.sq.includes(part)) w.sq += '; ' + part;
      for (const k of ['pl', 'ex', 'exsq', 'note']) if (v[k] && !w[k]) w[k] = v[k];
    }
  }
  const verbs = new Set((course.verbs || []).map(v => v.inf));
  // glossary entries that start with de/het but are not singular nouns
  const NOT_NOUN = new Set(['het mijne', 'de onze', 'het liefst', 'het regent', 'het spijt me', 'het kwart']);
  const PLURAL = new Set(['de kinderen', 'de bloemen', 'de frieten', 'de solden', 'de buren', 'de medicijnen']);
  words = [...map.values()].map(w => {
    const k = w.nl.toLowerCase();
    const m = !NOT_NOUN.has(k) && w.nl.match(/^(de|het)\s+(.+)/);
    w.art = m && !PLURAL.has(k) ? m[1] : '';
    w.head = m ? m[2] : w.nl;
    w.pos = PLURAL.has(k) ? 'shumës' : m ? 'emër' : verbs.has(w.nl) || (/^[a-z]+en$|^zijn$|^doen$|^gaan$|^staan$|^slaan$|^zien$/.test(w.nl) && /(j|m|em)\b/.test(w.sq.split(/[;,]/)[0])) ? 'folje' : '';
    w.order = Math.min(...w.units.map(u => unitIndex(course, u)));
    return w;
  });
  return words;
}

function unitIndex(course, code) {
  if (code === 'shqiptimi') return 0;
  const u = course.units.find(x => x.id === code);
  return u ? u.n : 30;
}

// Words become available for review once their unit (or module) has been opened;
// a learner who has opened nothing yet starts with the words of Hapi 0 and Unit 1.
function available(ctx) {
  const seen = ctx.store.state.seen;
  const opened = Object.keys(seen).length ? seen : { shqiptimi: 1, u1: 1 };
  return vocabList(ctx.course).filter(w => w.units.some(u => opened[u]));
}

export function dueVocabCount(ctx) {
  const t = ctx.today(), cards = ctx.store.state.cards;
  return vocabList(ctx.course).filter(w => isDue(cards[w.id], t)).length;
}

export function newVocabAvailable(ctx) {
  const cards = ctx.store.state.cards;
  return available(ctx).some(w => !cards[w.id]);
}

// Today's flashcard queue: due cards first (most overdue, most forgotten), then a limited number of new ones.
export function vocabQueue(ctx, { maxDue = 30, extraNew = 0 } = {}) {
  const st = ctx.store.state, t = ctx.today();
  const due = vocabList(ctx.course).filter(w => isDue(st.cards[w.id], t)).map(w => ({ w, card: st.cards[w.id] })).sort(dueOrder).slice(0, maxDue).map(x => x.w);
  const introduced = st.days[t]?.n || 0;
  const room = Math.max(0, st.settings.newPerDay - introduced) + extraNew;
  const fresh = available(ctx).filter(w => !st.cards[w.id]).sort((a, b) => a.order - b.order).slice(0, room);
  return [...due, ...fresh];
}

function details(w) {
  return `${w.art ? `<span class="tag art-${w.art}">${w.art}</span>` : ''}${w.pos && !w.art ? `<span class="tag">${w.pos}</span>` : ''}
    ${w.pl ? `<div><span class="muted">shumësi:</span> <b>${esc(w.pl)}</b></div>` : ''}
    ${w.ex ? `<div class="vex">${speakButton(w.ex)} <i>${esc(w.ex)}</i>${w.exsq ? `<br><span class="muted">${esc(w.exsq)}</span>` : ''}</div>` : ''}
    ${w.note ? `<div class="muted small">${esc(w.note)}</div>` : ''}`;
}

const GRADE_LABEL = { again: 'Sërish', hard: 'Vështirë', good: 'Mirë', easy: 'Lehtë' };
const days = n => n === 0 ? 'sot' : n === 1 ? '1 ditë' : n < 31 ? `${n} ditë` : `${Math.round(n / 30)} muaj`;

// Renders one flashcard; calls done(grade) after the learner grades it.
// mode: nl (Dutch front) · sq (Albanian front) · type (write the Dutch word)
export function renderCard(box, ctx, w, mode, done) {
  const st = ctx.store.state;
  const card = st.cards[w.id];
  const pv = preview(card, ctx.today());
  const front = mode === 'nl'
    ? `<div class="fc-word">${esc(w.nl)} ${speakButton(w.nl)}</div>`
    : `<div class="fc-word sq">${esc(w.sq)}</div>`;
  box.innerHTML = `<div class="fc" data-status="${cardStatus(card)}">
    <div class="fc-meta"><span class="tag">${cardStatus(card) === 'new' ? 'fjalë e re' : cardStatus(card) === 'mastered' ? 'e mësuar' : 'në përsëritje'}</span>
      <button type="button" class="star ${st.fav[w.id] ? 'on' : ''}" aria-pressed="${!!st.fav[w.id]}" aria-label="Ruaje te të preferuarat">${icon('star')}</button></div>
    ${front}
    ${mode === 'type' ? `<input class="full fc-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Shkruani fjalën holandisht${w.art ? ' me nyjën (de/het)' : ''}" aria-label="Fjala holandisht">` : ''}
    <div class="fc-back" hidden></div>
    <div class="exbar fc-act"><button type="button" class="btn primary" data-flip>${mode === 'type' ? 'Kontrollo' : 'Shfaq përgjigjen'}</button></div>
  </div>`;
  const back = box.querySelector('.fc-back');
  const act = box.querySelector('.fc-act');
  box.querySelector('.star').addEventListener('click', e => {
    ctx.store.toggleFav(w.id);
    e.currentTarget.classList.toggle('on'); e.currentTarget.setAttribute('aria-pressed', String(!!ctx.store.state.fav[w.id]));
  });
  const flip = () => {
    let suggest = null, verdict = '';
    if (mode === 'type') {
      const inp = box.querySelector('.fc-in');
      const res = validate(inp.value, w.nl);
      if (res.verdict === 'empty') { inp.focus(); return; }
      inp.readOnly = true;
      const good = isCorrect(res);
      suggest = good ? (res.verdict === 'near' ? 'hard' : 'good') : 'again';
      verdict = `<div class="qfb ${good ? 'ok' : 'bad'}"><b>${good ? 'Saktë!' : 'Jo ende.'}</b> ${esc(good ? res.notes.join(' ') : res.msg)}</div>`;
    }
    back.hidden = false;
    back.innerHTML = `${verdict}<div class="fc-ans">${mode === 'nl' ? esc(w.sq) : `${esc(w.nl)} ${speakButton(w.nl)}`}</div>${details(w)}`;
    if (mode !== 'nl') say(ctx, w.nl);
    act.innerHTML = `<p class="muted small fc-q">Sa mirë e dinit?</p><div class="grades">${GRADES.map(g => `<button type="button" class="btn grade g-${g} ${suggest === g ? 'sug' : ''}" data-g="${g}"><b>${GRADE_LABEL[g]}</b><span>${days(pv[g])}</span></button>`).join('')}</div>`;
    act.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { ctx.store.grade(w.id, b.dataset.g); done(b.dataset.g); }));
    (act.querySelector('.sug') || act.querySelector('.g-good')).focus();
  };
  box.querySelector('[data-flip]').addEventListener('click', flip);
  box.querySelector('.fc-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); flip(); } });
  requestAnimationFrame(() => (box.querySelector('.fc-in') || box.querySelector('[data-flip]')).focus({ preventScroll: true }));
}

// keyboard: 1–4 grade a flipped card, space flips
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  const fc = document.querySelector('article.unit:not([hidden]) .fc');
  if (!fc) return;
  if (e.key === ' ' && fc.querySelector('[data-flip]')) { e.preventDefault(); fc.querySelector('[data-flip]').click(); }
  const g = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }[e.key];
  if (g) fc.querySelector(`[data-g="${g}"]`)?.click();
});

let session = null;

function runCards(el, ctx, mode) {
  if (!session || session.mode !== mode) {
    const q = vocabQueue(ctx);
    session = { mode, queue: q, i: 0, results: [], again: [] };
  }
  const s = session;
  const title = mode === 'nl' ? 'Kartela: holandisht → shqip' : mode === 'sq' ? 'Kartela: shqip → holandisht' : 'Shkruani fjalën holandisht';
  const finish = () => {
    const counts = GRADES.map(g => [g, s.results.filter(r => r === g).length]);
    el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#fjalori">Fjalori</a></div><div class="utitle"><h2>${title}</h2></div></header>
      <div class="card done-card is-good"><h3>${s.results.length ? 'Seanca mbaroi' : 'Asnjë kartelë për sot'}</h3>
      ${s.results.length ? `<p>${plural(s.results.length, 'kartelë', 'kartela')}: ${counts.map(([g, n]) => `${GRADE_LABEL[g]} ${n}`).join(' · ')}</p>
        <p class="muted">Kartelat «Sërish» kthehen nesër ose sot më vonë; të tjerat pas intervalit të treguar.</p>`
        : `<p class="muted">${available(ctx).length ? 'Të gjitha fjalët e njësive që keni hapur janë përsëritur. Kthehuni nesër, ose shtoni fjalë të reja.' : 'Fjalët shtohen këtu sapo hapni një njësi. Filloni nga një mësim.'}</p>`}
      <div class="exbar">${available(ctx).some(w => !ctx.store.state.cards[w.id]) ? '<button type="button" class="btn primary" data-more>Edhe 10 fjalë të reja</button>' : ''}<a class="btn" href="#fjalori">Te fjalori</a><a class="btn ghost" href="#ballina">Ballina</a></div></div>`;
    el.querySelector('[data-more]')?.addEventListener('click', () => {
      session = { mode, queue: vocabQueue(ctx, { maxDue: 0, extraNew: 10 }).slice(0, 10), i: 0, results: [], again: [] };
      runCards(el, ctx, mode);
    });
  };
  const step = () => {
    // cards graded "again" come back at the end of the session
    if (s.i >= s.queue.length && s.again.length) { s.queue.push(...s.again); s.again = []; }
    if (s.i >= s.queue.length) { session = null; finish(); return; }
    const w = s.queue[s.i];
    el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#fjalori">Fjalori</a></div><div class="utitle"><h2>${title}</h2></div>
      <div class="sbar"><span class="bar"><i style="width:${Math.round((s.i / s.queue.length) * 100)}%"></i></span><span class="muted small">${s.i + 1} / ${s.queue.length}</span></div></header><div class="cardbox"></div>`;
    renderCard(el.querySelector('.cardbox'), ctx, w, mode === 'type' ? 'type' : mode, g => {
      s.results.push(g);
      if (g === 'again' && s.again.length < 15) s.again.push(w);
      s.i++; step();
    });
  };
  if (!s.queue.length) { finish(); return; }
  step();
}

let filters = { q: '', unit: '', kind: '' };
export function setFilter(q) { filters = { q, unit: '', kind: '' }; }

function renderList(el, ctx) {
  const st = ctx.store.state, t = ctx.today();
  const all = vocabList(ctx.course);
  const due = dueVocabCount(ctx);
  const units = [...new Set(all.flatMap(w => w.units))].sort((a, b) => unitIndex(ctx.course, a) - unitIndex(ctx.course, b));
  const uname = code => { const u = ctx.course.units.find(x => x.id === code); return u ? `Njësia ${u.n}` : (ctx.course.modules.find(m => m.id === code)?.title || code); };
  el.innerHTML = `<header class="uhead"><div class="ukick">Fjalori</div><div class="utitle"><h2>Fjalori holandisht–shqip</h2></div>
    <p class="usub">${all.length} fjalë nga të gjitha njësitë. Fjalët e njësive që keni hapur hyjnë në kartelat me përsëritje.</p>
    <div class="hcta">
      <a class="btn primary" href="#fjalori/kartela">Kartela${due ? ` · ${due} për sot` : ''}</a>
      <a class="btn" href="#fjalori/kartela-sq">Shqip → holandisht</a>
      <a class="btn" href="#fjalori/shkruaj">Shkruaj fjalën</a>
      <a class="btn" href="#praktike/dehet">de apo het?</a>
    </div></header>
    <div class="filters">
      <label class="search"><span class="sr">Kërko</span><input id="vq" type="search" placeholder="Kërko holandisht ose shqip…" value="${esc(filters.q)}" autocomplete="off"></label>
      <select id="vu" aria-label="Njësia"><option value="">Të gjitha njësitë</option>${units.map(u => `<option value="${u}" ${filters.unit === u ? 'selected' : ''}>${esc(uname(u))}</option>`).join('')}</select>
      <select id="vk" aria-label="Lloji">${[['', 'Të gjitha'], ['de', 'Emra me de'], ['het', 'Emra me het'], ['folje', 'Folje'], ['fav', '★ Të preferuarat'], ['hard', 'Të vështirat'], ['due', 'Për sot'], ['new', 'Të reja'], ['mastered', 'Të mësuarat']]
        .map(([v, l]) => `<option value="${v}" ${filters.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <p class="muted small" id="vcount" aria-live="polite"></p>
    <div class="vlist" id="vlist"></div>`;
  const paint = () => {
    const q = loose(filters.q);
    const rows = all.filter(w => {
      if (q && !loose(w.nl + ' ' + w.sq).includes(q)) return false;
      if (filters.unit && !w.units.includes(filters.unit)) return false;
      const c = st.cards[w.id];
      switch (filters.kind) {
        case 'de': case 'het': return w.art === filters.kind;
        case 'folje': return w.pos === 'folje';
        case 'fav': return !!st.fav[w.id];
        case 'hard': return c && (c.lapses >= 2 || c.ef < 2.0);
        case 'due': return isDue(c, t);
        case 'new': return cardStatus(c) === 'new';
        case 'mastered': return cardStatus(c) === 'mastered';
        default: return true;
      }
    }).sort((a, b) => a.head.localeCompare(b.head, 'nl'));
    el.querySelector('#vcount').textContent = plural(rows.length, 'fjalë', 'fjalë');
    el.querySelector('#vlist').innerHTML = rows.length ? rows.slice(0, 400).map(w => {
      const c = st.cards[w.id], s = cardStatus(c);
      return `<details class="vrow" data-id="${esc(w.id)}"><summary>
        <span class="vnl">${w.art ? `<span class="art art-${w.art}">${w.art}</span> ` : ''}${esc(w.head)}</span>
        <span class="vsq">${esc(w.sq)}</span>
        <span class="vst st-${s === 'new' ? 'new' : s === 'mastered' ? 'mastered' : 'started'}" title="${s}">${s === 'new' ? '' : s === 'mastered' ? '✓' : c && isDue(c, t) ? 'sot' : 'pas ' + days(Math.max(0, daysBetween(t, c.due)))}</span>
        ${st.fav[w.id] ? '<span class="vfav" aria-label="e preferuar">★</span>' : ''}</summary>
        <div class="vdet">${speakButton(w.nl)} ${details(w)}
          <div class="muted small">${w.units.map(u => `<a href="#${u}-gl">${esc(uname(u))}</a>`).join(' · ')}${c ? ` · parë ${plural(c.seen, 'herë', 'herë')}, harruar ${c.lapses}` : ''}</div>
          <button type="button" class="btn small" data-fav="${esc(w.id)}">${st.fav[w.id] ? 'Hiqe nga të preferuarat' : '★ Ruaje te të preferuarat'}</button></div></details>`;
    }).join('') + (rows.length > 400 ? '<p class="muted">Ngushtoni kërkimin për të parë më shumë.</p>' : '')
      : '<div class="empty">Asnjë fjalë nuk përputhet me këtë kërkim.</div>';
  };
  el.querySelector('#vq').addEventListener('input', e => { filters.q = e.target.value; paint(); });
  el.querySelector('#vu').addEventListener('change', e => { filters.unit = e.target.value; paint(); });
  el.querySelector('#vk').addEventListener('change', e => { filters.kind = e.target.value; paint(); });
  el.querySelector('#vlist').addEventListener('click', e => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    ctx.store.toggleFav(b.dataset.fav); paint();
  });
  paint();
}

export function render(el, ctx, args) {
  const mode = { kartela: 'nl', 'kartela-sq': 'sq', shkruaj: 'type' }[args[0]];
  if (mode) runCards(el, ctx, mode);
  else { session = null; renderList(el, ctx); }
}

export { review };
