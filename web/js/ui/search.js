// Kërko: results page for the header search box (#kerko/<query>).
import { buildIndex, search } from '../lib/search.js';
import { esc } from './dom.js';
import { setFilter } from './vocab.js';

let index = null;
const KIND = { unit: 'Njësi', lesson: 'Mësim', rule: 'Rregull', word: 'Fjalë', example: 'Shembull', verb: 'Folje', convo: 'Bisedë' };

export function render(el, ctx, args) {
  if (!index) index = buildIndex(ctx.course);
  const q = args.join('/') || '';
  const box = document.getElementById('q');
  if (box && document.activeElement !== box) box.value = q;
  el.innerHTML = `<header class="uhead"><div class="ukick">Kërko</div><div class="utitle"><h2>Kërko në kurs</h2></div></header>
    <form class="search big" role="search"><label for="q2" class="sr">Kërko</label><input id="q2" type="search" value="${esc(q)}" placeholder="p.sh. geen, shtëpi, perfekt, huis, apotheek…" autocomplete="off" enterkeyhint="search"></form>
    <p class="muted small" id="qcount" aria-live="polite"></p><ol class="results" id="qres"></ol>`;
  const inp = el.querySelector('#q2');
  const paint = () => {
    const res = search(index, inp.value);
    el.querySelector('#qcount').textContent = inp.value.trim().length < 2 ? 'Shkruani të paktën dy shkronja. Kërkimi gjen mësime, rregulla, fjalë, shembuj, folje dhe biseda – holandisht ose shqip.' : `${res.length}${res.length === 60 ? '+' : ''} rezultate`;
    el.querySelector('#qres').innerHTML = res.map(d => {
      const href = d.kind === 'word' ? `#fjalori` : '#' + d.at;
      return `<li><a href="${esc(href)}" ${d.kind === 'word' ? `data-word="${esc(d.q)}"` : ''}><span class="tag">${KIND[d.kind] || ''}</span> <b>${esc(d.title)}</b><span class="muted"> ${esc(d.sub || '')}</span></a></li>`;
    }).join('');
  };
  inp.addEventListener('input', () => { paint(); history.replaceState(null, '', '#kerko/' + encodeURIComponent(inp.value)); });
  el.querySelector('form').addEventListener('submit', e => { e.preventDefault(); el.querySelector('#qres a')?.click(); });
  // a word opens the vocabulary list already filtered to it
  el.querySelector('#qres').addEventListener('click', e => {
    const a = e.target.closest('[data-word]');
    if (a) setFilter(a.dataset.word);
  });
  paint();
  if (!q) inp.focus();
}
