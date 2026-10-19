// Text-to-speech through the browser (Web Speech API). Which Dutch voices exist depends on the device:
// many have only a Netherlands voice (nl-NL), some a Belgian one (nl-BE), some none at all.
// Prefer nl-BE, then nl-NL, then any "nl" voice; without one every feature falls back to text.
import { $$, icon, toast } from './dom.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
const listeners = new Set();

function load() {
  if (!synth) return;
  voices = synth.getVoices().filter(v => /^nl([-_]|$)/i.test(v.lang));
  listeners.forEach(fn => fn(voices));
}
if (synth) {
  load();
  synth.addEventListener?.('voiceschanged', load);
}

export const speech = {
  get supported() { return !!synth; },
  get voices() { return voices; },
  onVoices(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  pick(preferred) {
    if (!voices.length) return null;
    return voices.find(v => v.name === preferred)
      || voices.find(v => /nl[-_]BE/i.test(v.lang))
      || voices.find(v => /nl[-_]NL/i.test(v.lang))
      || voices[0];
  },
  label(v) {
    if (!v) return 'asnjë zë holandez';
    const where = /BE/i.test(v.lang) ? 'Belgjikë' : /NL/i.test(v.lang) ? 'Holandë' : v.lang;
    return `${v.name} (${where})`;
  },
  speak(text, { rate = 0.9, voice = '' } = {}) {
    return new Promise(resolve => {
      if (!synth) { resolve(false); return; }
      const v = this.pick(voice);
      if (!v) { resolve(false); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = rate;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      synth.speak(u);
    });
  },
  stop() { synth?.cancel(); }
};

export async function say(ctx, text, slow = false) {
  const st = ctx.store.state.settings;
  const ok = await speech.speak(text, { rate: slow ? Math.max(0.5, st.rate - 0.3) : st.rate, voice: st.voice });
  if (!ok && !speech.voices.length) toast('Ky shfletues nuk ka zë holandez. Lexoni tekstin, ose provoni Chrome/Edge/Safari.');
  return ok;
}

export function speakButton(text, label = 'Dëgjo') {
  return `<button type="button" class="say" data-say="${text.replace(/"/g, '&quot;')}" aria-label="${label}: ${text.replace(/"/g, '&quot;')}" title="${label}">${icon('speaker')}</button>`;
}

// Only the Dutch part of a cell is spoken: "goed (mirë), groot (i madh)" → "goed, groot".
// Bracketed glosses and a trailing "– translation" are dropped; line breaks separate items.
export function dutchOf(cell) {
  const c = cell.cloneNode(true);
  c.querySelectorAll('br').forEach(br => br.replaceWith(', '));
  c.querySelectorAll('.say').forEach(b => b.remove());
  return c.textContent.replace(/\s*\([^)]*\)/g, '').replace(/\s+[–—]\s+.*$/, '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
}

// Table columns whose cells are Dutch (every one of them gets speaker buttons, not just the first).
const DUTCH_COLUMNS = /^(Holandisht|Fjalia|Fjalia pohore|Fjalia mohore|Pyetja|Përgjigja|Shembull|Shembuj|Paskajorja|Pjesorja|Koha e tashme|Njëjës|Shumës|Rendori|Krahasore|Sipërore|Mbiemri|Me -e|Zvogëluesi|Emri|Fjala|Folja|Shprehja|Lidhëza|Parafjala|Pa folje modale|Me folje modale|Në Belgjikë|Në Holandë|Gjuha standarde|Do të dëgjoni \(tussentaal\))$/;

let wired = false;
// Speaker buttons next to the Dutch column of example tables in the lessons.
export function addSpeakButtons(root, ctx) {
  if (!speech.supported) return;
  if (!wired) {
    wired = true;
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-say]');
      if (b) { e.preventDefault(); say(ctx, b.dataset.say, b.dataset.slow === '1'); }
    });
  }
  $$('.lesson table.tbl', root).forEach(t => {
    const heads = $$('thead th', t).map(th => th.textContent.trim());
    const cols = heads.map((h, i) => (DUTCH_COLUMNS.test(h) ? i : -1)).filter(i => i >= 0);
    $$('tbody tr', t).forEach(tr => cols.forEach(col => {
      const td = tr.children[col];
      if (!td || td.querySelector('.say')) return;
      const txt = dutchOf(td);
      // nothing to say for empty cells, dashes, numbers or single letters
      if (!txt || txt.length < 2 || !/[a-zà-ÿ]{2}/i.test(txt)) return;
      td.insertAdjacentHTML('afterbegin', speakButton(txt));
    }));
  });
}
