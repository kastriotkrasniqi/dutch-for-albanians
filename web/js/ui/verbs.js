// Foljet: reference of strong and irregular verbs (content/verbs.tsv) with a small drill.
import { validate, isCorrect } from '../lib/validate.js';
import { loose, shuffle } from '../lib/text.js';
import { esc } from './dom.js';
import { speakButton } from './speech.js';

let drill = null;

function renderDrill(el, ctx) {
  const verbs = ctx.course.verbs.filter(v => v.pc !== '—');
  if (!drill || drill.i >= drill.list.length) drill = { list: shuffle(verbs).slice(0, 10), i: 0, ok: 0 };
  const v = drill.list[drill.i];
  const box = el.querySelector('#vdrill');
  box.innerHTML = `<div class="q"><div class="qhead"><span class="tag">${drill.i + 1} / ${drill.list.length}</span></div>
    <div class="fc-word">${esc(v.inf)} ${speakButton(v.inf)}</div><p class="muted">${esc(v.sq)}</p>
    <div class="vgrid"><label>Koha e shkuar (ik / hij)<input data-k="ps" class="full" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label>Pjesorja (ik heb / ben …)<input data-k="pc" class="full" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>
    <div class="qfb" aria-live="polite"></div>
    <div class="exbar"><button type="button" class="btn primary" data-vc>Kontrollo</button></div></div>`;
  const ins = [...box.querySelectorAll('input')];
  const check = () => {
    const r = ins.map(i => ({ i, res: validate(i.value, v[i.dataset.k]) }));
    if (r.some(x => x.res.verdict === 'empty')) { r.find(x => x.res.verdict === 'empty').i.focus(); return; }
    const good = r.every(x => isCorrect(x.res));
    if (good) drill.ok++;
    r.forEach(x => { x.i.readOnly = true; x.i.classList.add(isCorrect(x.res) ? 'ok' : 'bad'); });
    const fb = box.querySelector('.qfb');
    fb.className = 'qfb ' + (good ? 'ok' : 'bad');
    fb.innerHTML = `<b>${good ? 'Saktë!' : 'Jo plotësisht.'}</b> ${esc(v.inf)} – <b>${esc(v.ps)}</b> (${esc(v.pp)}) – <b>${esc(v.pc)}</b> · ndihmëse: ${esc(v.aux)}${v.note ? `<div class="muted small">${esc(v.note)}</div>` : ''}`;
    const bar = box.querySelector('.exbar');
    const last = drill.i === drill.list.length - 1;
    bar.innerHTML = `<button type="button" class="btn primary">${last ? 'Rezultati' : 'Vazhdo →'}</button>`;
    bar.firstChild.focus();
    bar.firstChild.addEventListener('click', () => {
      drill.i++;
      if (drill.i >= drill.list.length) {
        box.innerHTML = `<div class="card done-card is-good"><h3>${drill.ok} nga ${drill.list.length} folje plotësisht saktë</h3><div class="exbar"><button type="button" class="btn primary" data-again>Edhe 10 folje</button></div></div>`;
        box.querySelector('[data-again]').addEventListener('click', () => { drill = null; renderDrill(el, ctx); });
      } else renderDrill(el, ctx);
    });
  };
  box.querySelector('[data-vc]').addEventListener('click', check);
  ins.forEach((i, k) => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (k < ins.length - 1 && !i.readOnly) ins[k + 1].focus(); else if (!i.readOnly) check(); else box.querySelector('.exbar button')?.click(); } }));
  ins[0].focus({ preventScroll: true });
}

export function render(el, ctx) {
  const verbs = ctx.course.verbs;
  el.innerHTML = `<header class="uhead"><div class="ukick">Referencë</div><div class="utitle"><h2>Foljet e forta dhe të parregullta</h2></div>
    <p class="usub">${verbs.length} folje të shpeshta me kohën e shkuar, pjesoren dhe foljen ndihmëse. Rregullat janë te <a href="#u20">Njësia 20</a> (koha e shkuar) dhe <a href="#u21">Njësia 21</a> (koha e kryer).</p></header>
    <section class="card"><h3>Ushtrim: 10 folje</h3><div id="vdrill"></div></section>
    <label class="search"><span class="sr">Kërko folje</span><input id="vfq" type="search" placeholder="Kërko: gaan, shkoj, gegaan…" autocomplete="off"></label>
    <div class="tw"><table class="tbl verbs"><thead><tr><th>Paskajorja</th><th>Shqip</th><th>E shkuara</th><th>Pjesorja</th><th>Ndihmëse</th></tr></thead><tbody id="vtb"></tbody></table></div>
    <p class="muted small">«hebben / zijn»: hebben për veprimin, zijn kur tregohet drejtimi ose ndryshimi i gjendjes (shih Njësinë 21).</p>`;
  const paint = q => {
    const n = loose(q || '');
    el.querySelector('#vtb').innerHTML = verbs.filter(v => !n || loose(Object.values(v).join(' ')).includes(n)).map(v =>
      `<tr><td>${speakButton(v.inf)} <b>${esc(v.inf)}</b></td><td>${esc(v.sq)}</td><td>${esc(v.ps)}<span class="muted"> / ${esc(v.pp)}</span></td><td>${esc(v.pc)}</td><td>${esc(v.aux)}${v.note ? `<div class="muted small">${esc(v.note)}</div>` : ''}</td></tr>`).join('');
  };
  el.querySelector('#vfq').addEventListener('input', e => paint(e.target.value));
  paint('');
  renderDrill(el, ctx);
}
