// Progresi: statistics, per-unit mastery, mistakes by type, activity, settings and backup.
import { allStats, findUnit, STATUS_LABEL, streak, mistakeCategories, cardCounts, activityDays } from '../lib/progress.js';
import { CATEGORY_LABEL, isGrammarCategory } from '../lib/validate.js';
import { esc, pct, plural } from './dom.js';

export function render(el, ctx) {
  const { store, course } = ctx;
  const st = store.state, t = ctx.today();
  const stats = allStats(st, course).filter(s => s.exercises);
  const answered = Object.values(st.items).filter(i => i.n).length;
  const firstOk = Object.values(st.items).filter(i => i.n && i.f && !i.r).length;
  const cats = mistakeCategories(st);
  const vocab = cardCounts(st, t, 'v:');
  const x = cardCounts(st, t, 'x:');
  const act = activityDays(st, t, 14);
  const maxA = Math.max(1, ...act.map(d => d.a + d.r));
  const set = st.settings;
  el.innerHTML = `<header class="uhead"><div class="ukick">Progresi</div><div class="utitle"><h2>Progresi im</h2></div>
    <p class="usub">${store.persistent ? 'Ruhet vetëm në këtë shfletues, në këtë pajisje – nuk sinkronizohet me pajisje të tjera.' : '<b>Kujdes:</b> ky shfletues nuk lejon ruajtjen; progresi humbet kur mbyllni faqen.'}</p></header>
  <div class="mini-stats wide">
    <div><b>${streak(st.days, t)}</b><span>ditë rresht</span></div>
    <div><b>${stats.filter(s => s.completed).length}/${stats.length}</b><span>njësi të përfunduara</span></div>
    <div><b>${stats.filter(s => s.status === 'mastered').length}</b><span>të zotëruara</span></div>
    <div><b>${answered}</b><span>pyetje të provuara</span></div>
    <div><b>${pct(answered ? firstOk / answered : null)}</b><span>saktë në provën e parë</span></div>
    <div><b>${vocab.mastered}/${vocab.total}</b><span>fjalë të mësuara / në përsëritje</span></div>
  </div>
  <section class="card"><h3>Aktiviteti · 14 ditët e fundit</h3>
    <div class="spark" role="img" aria-label="Përgjigje dhe përsëritje në ditë">${act.map(d => `<span title="${d.day}: ${d.a + d.r}" style="--h:${Math.round(((d.a + d.r) / maxA) * 100)}%" class="${d.a + d.r >= set.goal ? 'met' : ''}"></span>`).join('')}</div>
    <p class="muted small">Shtyllat e plota: qëllimi ditor (${set.goal}) u arrit.</p></section>
  <section class="card"><h3>Njësitë</h3>
    <p class="muted small">«E zotëruar» kërkon që të gjitha ushtrimet të jenë kontrolluar dhe ${Math.round(set.mastery * 100)} % e pyetjeve të jenë zgjidhur saktë që në provën e parë (pa hapur zgjidhjen më parë).</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Njësia</th><th>Statusi</th><th>Ushtrime</th><th>Prova e parë</th><th>Tani</th></tr></thead><tbody>
    ${stats.map(s => { const u = findUnit(course, s.id); return `<tr><td><a href="#${u.id}">${esc(u.n ? `${u.n}. ${u.title}` : u.title)}</a></td><td><span class="st st-${s.status}">${STATUS_LABEL[s.status]}</span></td><td>${s.checked}/${s.exercises}</td><td>${pct(s.accuracy)}</td><td>${s.now}/${s.items}</td></tr>`; }).join('')}
    </tbody></table></div></section>
  <div class="dash-grid">
    <section class="card"><h3>Llojet e gabimeve</h3>
      ${cats.length ? `<ul class="bars">${cats.map(([c, n]) => `<li><span>${esc(CATEGORY_LABEL[c] || c)}${isGrammarCategory(c) ? '' : ' <span class="muted small">(drejtshkrim)</span>'}</span><span class="bar"><i style="width:${Math.round((n / cats[0][1]) * 100)}%"></i></span><b>${n}</b></li>`).join('')}</ul>
        <a class="btn" href="#praktike/gabimet">Përsërit gabimet</a>` : '<p class="muted">Ende pa gabime të regjistruara.</p>'}
      <p class="muted small">Gabimet ndahen sipas llojit që njeh kontrolli automatik; është një tregues, jo diagnozë e plotë.</p></section>
    <section class="card"><h3>Përsëritjet</h3>
      <p>Fjalë: <b>${vocab.due}</b> për sot · ${vocab.learning} në mësim · ${vocab.mastered} të mësuara (intervali ≥ 21 ditë)</p>
      <p>Pyetje të gabuara në përsëritje: <b>${x.due}</b> për sot · ${x.learning + x.mastered} gjithsej</p>
      <a class="btn primary" href="#praktike/ditore">Seanca ditore</a></section>
  </div>
  <section class="card"><h3>Cilësimet</h3>
    <form class="settings">
      <label>Qëllimi ditor (përgjigje + kartela) <input type="number" name="goal" min="5" max="200" step="5" value="${set.goal}"></label>
      <label>Fjalë të reja në ditë <input type="number" name="newPerDay" min="0" max="50" value="${set.newPerDay}"></label>
      <label>Pragu i zotërimit <select name="mastery">${[0.6, 0.7, 0.8, 0.9].map(v => `<option value="${v}" ${v === set.mastery ? 'selected' : ''}>${v * 100} %</option>`).join('')}</select></label>
    </form>
  </section>
  <section class="card"><h3>Kopje rezervë</h3>
    <p class="muted small">Shkarkoni progresin si skedar dhe ngarkojeni në një shfletues ose pajisje tjetër.</p>
    <div class="exbar"><button type="button" class="btn" data-export>Shkarko progresin</button>
      <label class="btn">Ngarko nga skedari<input type="file" accept="application/json,.json" hidden data-import></label>
      <button type="button" class="btn ghost danger" data-reset>Fshi gjithë progresin</button></div></section>`;
  el.querySelector('.settings').addEventListener('change', e => {
    const f = e.target;
    const v = f.name === 'mastery' ? parseFloat(f.value) : Math.max(+f.min, Math.min(+f.max, parseInt(f.value, 10) || 0));
    store.setSetting(f.name, v);
    ctx.toast('U ruajt.');
  });
  el.querySelector('[data-export]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    a.download = `progresi-holandisht-${t}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  el.querySelector('[data-import]').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { store.importJSON(await file.text()); ctx.toast('Progresi u ngarkua.'); render(el, ctx); }
    catch (err) { ctx.toast(err.message || 'Skedari nuk u lexua.'); }
  });
  el.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm('Të fshihet gjithë progresi në këtë shfletues? Kjo nuk kthehet mbrapsht.')) return;
    store.reset(); ctx.toast('Progresi u fshi.'); render(el, ctx);
  });
}

export { plural };
