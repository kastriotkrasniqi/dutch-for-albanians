// Entry point: loads course.json, creates the learner store, routes between pages.
//
// Routes are URL hashes so that GitHub Pages (no server rewrites) can serve every deep link:
//   #ballina                dashboard (default)
//   #hyrje                  course roadmap
//   #u7, #u7-l20, #u7-ex    unit, lesson anchor, exercises     (#shqiptimi, #belgjika, #situatat: modules)
//   #praktike[/mode[/arg]]  practice hub and sessions
//   #fjalori[/mode]         vocabulary trainer
//   #biseda[/id]            conversation simulator
//   #degjo, #foljet, #progresi, #kerko[/query]
import { createStore, localBackend } from './lib/store.js';
import { dayKey } from './lib/dates.js';
import { $, $$, fillIcons, icon, toast } from './ui/dom.js';
import * as lesson from './ui/lesson.js';
import * as dashboard from './ui/dashboard.js';
import * as courseMap from './ui/course.js';
import * as practice from './ui/practice.js';
import * as vocab from './ui/vocab.js';
import * as convo from './ui/convo.js';
import * as listen from './ui/listen.js';
import * as verbs from './ui/verbs.js';
import * as progressPage from './ui/progress.js';
import * as search from './ui/search.js';
import { speech } from './ui/speech.js';

const PAGES = {
  ballina: dashboard, hyrje: courseMap, praktike: practice, fjalori: vocab, biseda: convo,
  degjo: listen, foljet: verbs, progresi: progressPage, kerko: search
};

const main = document.getElementById('main');
const store = createStore(localBackend());
const ctx = {
  course: null, store, speech,
  today: () => dayKey(),
  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  toast
};

async function loadCourse() {
  const res = await fetch(main.dataset.course);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function setActiveNav(page) {
  $$('.rail a, .tabs a').forEach(a => {
    const href = a.getAttribute('href').slice(1);
    const on = href === page;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

let lastPage = null;
function route() {
  if (!ctx.course) return;
  const h = decodeURIComponent(location.hash.slice(1)) || 'ballina';
  const [head, ...rest] = h.split('/');
  let page = head;
  if (!document.getElementById(page)?.classList.contains('unit')) page = head.split('-')[0];
  const art = document.getElementById(page);
  if (!art || !art.classList.contains('unit')) { ctx.go('#ballina'); return; }
  $$('article.unit').forEach(a => { a.hidden = a !== art; });
  setActiveNav(page);
  closeMenu();
  if (page !== lastPage) speech.stop();   // leaving a page silences it
  const mod = PAGES[page];
  if (mod) {
    try { mod.render(art, ctx, rest); }
    catch (e) { console.error(e); art.innerHTML = '<div class="empty bad">Diçka shkoi keq gjatë hapjes së kësaj faqeje. Rifreskoni faqen.</div>'; }
    document.title = (art.querySelector('h1,h2')?.textContent || 'Mësojmë holandisht') + ' · Mësojmë holandisht';
  } else {
    lesson.onShow(art, ctx, head);
    document.title = (art.querySelector('.utitle h2')?.textContent || '') + ' · Mësojmë holandisht';
  }
  const target = document.getElementById(head);
  if (target && target !== art) requestAnimationFrame(() => target.scrollIntoView());
  else if (page !== lastPage || !rest.length) window.scrollTo(0, 0);
  lastPage = page;
}

// ---- mobile menu (the rail becomes a drawer)
const menuBtn = document.getElementById('menu');
const rail = document.getElementById('rail');
function closeMenu() {
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = icon('menu');
}
menuBtn.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.innerHTML = icon(open ? 'close' : 'menu');
  if (open) rail.querySelector('a')?.focus();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); menuBtn.focus(); } });

// ---- header search
const qform = document.getElementById('qform');
qform.addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('q').value.trim();
  ctx.go('#kerko' + (q ? '/' + encodeURIComponent(q) : ''));
});
document.getElementById('searchbtn').innerHTML = icon('search');

// ---- theme
const tbtn = document.getElementById('theme');
const darkMq = matchMedia('(prefers-color-scheme: dark)');
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function isDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : darkMq.matches; }
function paintTheme() {
  const d = isDark(); const label = d ? 'Kalo në temën e çelët' : 'Kalo në temën e errët';
  tbtn.innerHTML = d ? SUN : MOON; tbtn.setAttribute('aria-label', label); tbtn.title = label;
}
tbtn.addEventListener('click', () => {
  const t = isDark() ? 'light' : 'dark';
  // a choice that matches the system setting clears the override, so the page follows the system again
  if ((t === 'dark') === darkMq.matches) { delete document.documentElement.dataset.theme; store.backend.del('mh1:theme'); }
  else { document.documentElement.dataset.theme = t; store.backend.set('mh1:theme', t); }
  paintTheme();
});
darkMq.addEventListener('change', paintTheme);

// keep rail progress badges current
function paintRail() {
  if (ctx.course) lesson.paintRail(ctx);
}
store.subscribe(() => { clearTimeout(paintRail.t); paintRail.t = setTimeout(paintRail, 200); });
addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.flush(); });

async function start() {
  fillIcons();
  closeMenu();
  paintTheme();
  try {
    ctx.course = await loadCourse();
  } catch (e) {
    console.error(e);
    main.insertAdjacentHTML('afterbegin', `<div class="empty bad" role="alert"><b>Të dhënat e kursit nuk u ngarkuan.</b> Kontrolloni lidhjen me internetin dhe rifreskoni faqen.
      ${location.protocol === 'file:' ? '<br>Faqja duhet hapur përmes një serveri (p.sh. <code>python3 -m http.server -d docs</code>), jo si skedar.' : ''}</div>`);
    return;
  }
  lesson.init(ctx);
  if (!store.persistent) toast('Ky shfletues nuk lejon ruajtjen: progresi do të humbasë kur të mbyllni faqen.');
  window.addEventListener('hashchange', route);
  route();
}
start();
