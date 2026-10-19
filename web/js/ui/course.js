// Kursi: the roadmap of all units and modules with their status, grouped by level.
import { unitStats, findUnit, STATUS_LABEL } from '../lib/progress.js';
import { esc, pct } from './dom.js';
import { levelGroups } from './dashboard.js';

const CAN_DO = {
  A1: 'Prezantoheni, flisni për veten dhe familjen, bëni pyetje të thjeshta, tregoni ku ndodhet diçka, blini dhe porosisni me fjali të shkurtra.',
  'A1–A2': 'Lidhni fjalitë me lidhëza, mohoni saktë me niet/geen, krahasoni dhe flisni për kohën dhe vendin.',
  A2: 'Tregoni çfarë keni bërë dje, planet për nesër, jepni arsye, kuptoni udhëzime dhe mesazhe të zakonshme.',
  B1: 'Shpjegoni mendime dhe ngjarje me fjali të ndërlikuara, shkruani emaile zyrtare, merrni pjesë në biseda pune.'
};

function card(ctx, id) {
  const u = findUnit(ctx.course, id);
  if (!u) return '';
  const s = unitStats(ctx.store.state, ctx.course, id);
  const label = u.n ? String(u.n).padStart(2, '0') : id === 'shqiptimi' ? '0' : '★';
  return `<a class="ucard st-${s.status}" href="#${u.id}">
    <span class="cn">${label}</span><span class="ct">${esc(u.title)}</span>
    <span class="cp"><span class="st st-${s.status}">${STATUS_LABEL[s.status]}</span>${s.attempted ? ` · ${pct(s.accuracy)}` : ''}</span></a>`;
}

export function render(el, ctx) {
  el.innerHTML = `
  <header class="uhead"><div class="ukick">Kursi</div><div class="utitle"><h2>Rruga e kursit</h2></div>
  <p class="usub">${ctx.course.units.length} njësi gramatike, ${ctx.course.units.reduce((n, u) => n + u.lessons.length, 0)} mësime dhe ${ctx.course.modules.length} module praktike për jetën në Flandër. Mund të ktheheni në çdo mësim kurdo – asgjë nuk mbyllet.</p>
  <p class="legend"><span class="st st-new">pa filluar</span> <span class="st st-started">në vazhdim</span> <span class="st st-review">për përsëritje</span> <span class="st st-mastered">e zotëruar</span>
  <span class="muted small">«E zotëruar» = të gjitha ushtrimet e kontrolluara dhe të paktën ${Math.round(ctx.store.state.settings.mastery * 100)} % saktë në provën e parë.</span></p></header>
  ${levelGroups(ctx.course).map(g => `
    <section class="ipart">
      <h3><span class="lvl">${g.level}</span> ${esc(g.title)}</h3>
      <p class="muted small">${esc(CAN_DO[g.level] || '')}</p>
      ${g.planned ? `<ul class="planned-list">${g.planned.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="note">Këto tema nuk janë shkruar ende. Ato do të shtohen pas përfundimit të niveleve A1–A2.</p>`
        : `<div class="ugrid">${g.units.map(id => card(ctx, id)).join('')}</div>`}
    </section>`).join('')}`;
}
