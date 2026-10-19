// Ballina: what to learn today, what has been learned, what needs practice again.
import { recommend, streak, todayCount, recentMistakes, weakUnits, mistakeCategories, cardCounts, findUnit, allStats, STATUS_LABEL } from '../lib/progress.js';
import { CATEGORY_LABEL } from '../lib/validate.js';
import { esc, pct, plural, fillIcons } from './dom.js';
import { dueVocabCount, newVocabAvailable } from './vocab.js';

function unitName(u) { return u.n ? `Njësia ${u.n}: ${u.title}` : u.title; }

export function levelGroups(course) {
  const parts = course.parts;
  const ids = p => parts.find(x => x.n === p)?.units || [];
  return [
    { id: 'a1', level: 'A1', title: 'Bazat', units: ['shqiptimi', ...ids('I'), ...ids('II'), ...ids('III')] },
    { id: 'a2a', level: 'A1–A2', title: 'Ndërtimi i fjalisë', units: ids('IV') },
    { id: 'a2', level: 'A2', title: 'Sistemi i foljeve', units: ids('V') },
    { id: 'be', level: 'A1–A2', title: 'Jeta në Flandër', units: ['belgjika', 'situatat'] },
    { id: 'b1', level: 'B1', title: 'Në plan', units: [], planned: ['Fjalitë lidhore – thellim (waarvan, wat, wiens)', 'Mbaresat e mbiemrave – thellim', 'Foljet me parafjalë të ngurta', 'Shkrimi i emaileve zyrtare'] }
  ];
}

export function render(el, ctx) {
  const { course, store } = ctx;
  const st = store.state;
  const today = ctx.today();
  const rec = recommend(st, course);
  const done = todayCount(st, today);
  const goal = st.settings.goal;
  const days = streak(st.days, today);
  const due = dueVocabCount(ctx) + cardCounts(st, today, 'x:').due;
  const fresh = !Object.keys(st.items).length && !Object.keys(st.seen).length && !Object.keys(st.ex).length;
  const mistakes = recentMistakes(st, course, 4);
  const weak = weakUnits(st, course).slice(0, 3);
  const cats = mistakeCategories(st).slice(0, 3);
  const stats = allStats(st, course);
  const mastered = stats.filter(s => s.status === 'mastered').length;
  const completed = stats.filter(s => s.completed).length;
  const vocab = cardCounts(st, today, 'v:');
  const next = rec.next && findUnit(course, rec.next.id);
  const goalPct = Math.min(100, Math.round((done / goal) * 100));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Mirëmëngjes' : hour < 18 ? 'Mirëdita' : 'Mirëmbrëma';

  const nextCard = next ? `
    <div class="today-main">
      <div class="lk">${rec.next.why === 'continue' ? 'Vazhdoni ku e latë' : fresh ? 'Fillimi' : 'Hapi i radhës'}</div>
      <h2>${esc(unitName(next))}</h2>
      <p class="muted">${esc(next.sub || '')}</p>
      <div class="hcta"><a class="btn primary big" href="#${esc(rec.next.at)}">${rec.next.why === 'continue' ? 'Vazhdo mësimin' : 'Fillo'} →</a>
      ${fresh ? '<a class="btn big" href="#praktike/niveli">Bëj testin e nivelit</a>' : ''}</div>
    </div>` : `<div class="today-main"><h2>Kursi u përfundua 🎉</h2><p>Vazhdoni me përsëritjet ditore dhe bisedat.</p></div>`;

  el.innerHTML = `
  <header class="dash-head">
    <div class="ukick">${esc(hello)}${days ? ` · <span class="streak" title="Ditë rresht me praktikë">${plural(days, 'ditë', 'ditë')} rresht</span>` : ''}</div>
    <h1>Çfarë mësojmë sot?</h1>
  </header>
  <section class="today" aria-label="Sot">
    ${nextCard}
    <div class="today-side">
      <div class="goal" aria-label="Qëllimi ditor: ${done} nga ${goal}">
        <div class="ring" style="--p:${goalPct}"><span><b>${done}</b>/${goal}</span></div>
        <div><b>Qëllimi ditor</b><br><span class="muted">${done >= goal ? 'U arrit – bravo!' : `edhe ${goal - done} përgjigje ose kartela`}</span></div>
      </div>
      <a class="daily ${due ? 'has' : ''}" href="#praktike/ditore">
        <b>${due ? plural(due, 'përsëritje', 'përsëritje') + ' për sot' : 'Seanca ditore'}</b>
        <span class="muted">${due ? 'fjalë dhe gabime që po ju harrohen' : newVocabAvailable(ctx) ? 'fjalë të reja nga njësitë që keni hapur' : 'përzierje e shkurtër nga mësimet'}</span>
        <span class="go">Fillo →</span>
      </a>
    </div>
  </section>

  ${fresh ? `<section class="card intro-card">
    <h3>Si funksionon</h3>
    <ol class="steps">
      <li><b>Lexoni një mësim</b> – shpjegimi është në shqip, me shembuj holandisht dhe krahasime me shqipen.</li>
      <li><b>Bëni ushtrimet</b> – për çdo gabim shihni pse është gabim (nyja, mbaresa, rendi…).</li>
      <li><b>Përsëritni çdo ditë 10 minuta</b> – fjalët dhe gabimet kthehen pikërisht kur fillojnë t'ju harrohen.</li>
      <li><b>Praktikoni bisedat</b> – situata të vërteta nga Antwerpeni: kafeneja, dyqani, mjeku, komuna.</li>
    </ol>
    <p class="note">Progresi ruhet vetëm në këtë shfletues, në këtë pajisje. Te <a href="#progresi">Progresi</a> mund ta shkarkoni si kopje.</p>
  </section>` : ''}

  <div class="dash-grid">
    <section class="card">
      <h3>Për t'u përsëritur</h3>
      ${rec.review.length || weak.length || mistakes.length ? `
        ${rec.review.slice(0, 3).map(s => { const u = findUnit(course, s.id); return `<a class="row-link" href="#${u.id}"><span>${esc(unitName(u))}</span><span class="tag warn">${pct(s.accuracy)}</span></a>`; }).join('')}
        ${weak.filter(w => !rec.review.some(r => r.id === w.id)).map(s => { const u = findUnit(course, s.id); return `<a class="row-link" href="#praktike/njesia/${u.id}"><span>${esc(unitName(u))}</span><span class="tag warn">${pct(s.accuracy)}</span></a>`; }).join('')}
        ${cats.length ? `<p class="muted small">Gabimet më të shpeshta: ${cats.map(([c, n]) => `<span class="tag">${esc(CATEGORY_LABEL[c] || c)} · ${n}</span>`).join(' ')}</p>` : ''}
        ${mistakes.length ? `<a class="btn" href="#praktike/gabimet">Përsërit gabimet e fundit (${recentMistakes(st, course, 999).length})</a>` : ''}
      ` : '<p class="muted">Ende asgjë. Kur të gaboni në ushtrime, gabimet mblidhen këtu dhe kthehen në përsëritjet ditore.</p>'}
    </section>
    <section class="card">
      <h3>Çfarë keni mësuar</h3>
      <div class="mini-stats">
        <div><b>${completed}</b><span>njësi të përfunduara</span></div>
        <div><b>${mastered}</b><span>të zotëruara</span></div>
        <div><b>${vocab.learning + vocab.mastered}</b><span>fjalë në përsëritje</span></div>
        <div><b>${vocab.mastered}</b><span>fjalë të mësuara</span></div>
      </div>
      <a class="link" href="#progresi">Shiko progresin e plotë →</a>
    </section>
  </div>

  <section class="card roadmap-mini">
    <div class="rm-head"><h3>Rruga juaj: A1 → A2 → B1</h3><a class="link" href="#hyrje">Gjithë kursi →</a></div>
    <ol class="rm">
      ${levelGroups(course).map(g => {
        const ss = g.units.map(id => stats.find(s => s.id === id)).filter(Boolean);
        const n = ss.length, c = ss.filter(s => s.completed).length;
        const p = n ? Math.round((c / n) * 100) : 0;
        return `<li class="${g.planned ? 'planned' : ''}"><span class="lvl">${g.level}</span><span class="rm-t">${esc(g.title)}</span>
          ${g.planned ? '<span class="muted small">së shpejti</span>' : `<span class="bar" aria-label="${c} nga ${n}"><i style="width:${p}%"></i></span><span class="muted small">${c}/${n}</span>`}</li>`;
      }).join('')}
    </ol>
  </section>

  <section class="quick">
    <a class="qtile" href="#fjalori/kartela" data-icon="cards"><span class="ico"></span><b>Kartela</b><span>fjalë me përsëritje</span></a>
    <a class="qtile" href="#praktike/dehet" data-icon="target"><span class="ico"></span><b>de apo het?</b><span>trajnim i nyjave</span></a>
    <a class="qtile" href="#biseda" data-icon="chat"><span class="ico"></span><b>Biseda</b><span>në kafene, dyqan, te mjeku</span></a>
    <a class="qtile" href="#degjo" data-icon="ear"><span class="ico"></span><b>Dëgjo</b><span>diktim dhe shqiptim</span></a>
  </section>`;
  fillIcons(el);
}

export { STATUS_LABEL };
