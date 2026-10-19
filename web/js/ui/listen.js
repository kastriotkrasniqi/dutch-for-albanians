// Dëgjo dhe shqipto: dictation, listening comprehension and record-and-compare.
// Audio is the browser's synthetic voice (labelled as such). Nothing here scores pronunciation:
// the recorder only lets learners hear themselves next to the model.
import { validate, isCorrect } from '../lib/validate.js';
import { shuffle } from '../lib/text.js';
import { esc, icon } from './dom.js';
import { speech, say, speakButton } from './speech.js';

let state = { mode: 'diktim', i: 0, pool: null };

function sentences(ctx) {
  const seen = ctx.store.state.seen;
  const all = ctx.course.sentences.filter(s => s.nl.length <= 70);
  const mine = all.filter(s => seen[s.at.split('-')[0]]);
  return mine.length >= 10 ? mine : all.filter(s => /^(u[1-5]|shqiptimi)-/.test(s.at));
}

function voicePanel(ctx) {
  const st = ctx.store.state.settings;
  if (!speech.supported) return '<div class="empty">Ky shfletues nuk ka sintezë zëri. Ushtrimet më poshtë punojnë me tekst: lexoni fjalinë në vend që ta dëgjoni.</div>';
  const vs = speech.voices;
  const cur = speech.pick(st.voice);
  return `<div class="voice"><span>${icon('speaker')} Zëri: <b>${esc(speech.label(cur))}</b></span>
    ${vs.length > 1 ? `<select data-voice aria-label="Zgjidh zërin">${vs.map(v => `<option value="${esc(v.name)}" ${cur && v.name === cur.name ? 'selected' : ''}>${esc(speech.label(v))}</option>`).join('')}</select>` : ''}
    <label class="small">Shpejtësia <input type="range" min="0.6" max="1.2" step="0.1" value="${st.rate}" data-rate> <span data-ratev>${st.rate}</span></label></div>
    <p class="muted small">${vs.length ? (vs.some(v => /BE/i.test(v.lang)) ? 'Ka zë belg (nl-BE).' : 'Nuk u gjet zë belg; përdoret zëri holandez (nl-NL). Shqiptimi në Flandër ndryshon pak – shih modulin e shqiptimit.') + ' Zëri është sintetik: tingëllon pak mekanik, por ritmi dhe theksi janë të dobishëm.'
      : 'Nuk u gjet asnjë zë holandez në këtë pajisje. Në Android/Chrome instaloni «Nederlands» te cilësimet e tekst-në-zë; në iPhone: Cilësimet → Qasshmëria → Përmbajtja e folur → Zërat.'}</p>`;
}

function dictation(box, ctx, autoplay = false) {
  const pool = state.pool;
  const s = pool[state.i % pool.length];
  const hasVoice = speech.supported && speech.voices.length;
  box.innerHTML = `<div class="q">
    ${hasVoice ? `<div class="exbar"><button type="button" class="btn primary" data-play>${icon('play')} Dëgjo</button><button type="button" class="btn" data-slow>${icon('slow')} Më ngadalë</button></div>
      <p class="instr">Shkruani atë që dëgjoni.</p>`
      : `<p class="instr">Pa zë: përktheni fjalinë në holandisht.</p><div class="qprompt">${esc(s.sq)}</div>`}
    <input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Fjalia që dëgjuat">
    <div class="qfb" aria-live="polite"></div>
    <div class="exbar"><button type="button" class="btn primary" data-dc>Kontrollo</button><button type="button" class="btn ghost" data-show>Shfaq tekstin</button></div></div>`;
  const inp = box.querySelector('input');
  const play = slow => say(ctx, s.nl, slow);
  box.querySelector('[data-play]')?.addEventListener('click', () => { play(false); inp.focus(); });
  box.querySelector('[data-slow]')?.addEventListener('click', () => { play(true); inp.focus(); });
  const reveal = res => {
    const good = res && isCorrect(res);
    const fb = box.querySelector('.qfb');
    fb.className = 'qfb ' + (res ? (good ? 'ok' : 'bad') : '');
    fb.innerHTML = `${res ? `<b>${good ? 'Saktë!' : 'Jo plotësisht.'}</b> ${esc(good ? res.notes.join(' ') : res.msg)}<br>` : ''}${speakButton(s.nl)} <b>${esc(s.nl)}</b><div class="muted">${esc(s.sq)}</div>
      <a class="small" href="#${esc(s.at)}">Te mësimi →</a>`;
    box.querySelector('.exbar:last-child').innerHTML = '<button type="button" class="btn primary" data-nx>Fjalia tjetër →</button>';
    box.querySelector('[data-nx]').addEventListener('click', () => { state.i++; dictation(box, ctx, true); });
    box.querySelector('[data-nx]').focus();
  };
  const check = () => { const res = validate(inp.value, s.nl); if (res.verdict === 'empty') { inp.focus(); return; } inp.readOnly = true; reveal(res); };
  box.querySelector('[data-dc]').addEventListener('click', check);
  box.querySelector('[data-show]').addEventListener('click', () => reveal(null));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (inp.readOnly) box.querySelector('[data-nx]')?.click(); else check(); } });
  // speak by itself only after the learner asked for the next sentence, never on opening or switching tabs
  if (hasVoice && autoplay) setTimeout(() => play(false), 250);
}

function comprehension(box, ctx, autoplay = false) {
  const pool = state.pool;
  const s = pool[state.i % pool.length];
  const opts = shuffle([s, ...shuffle(pool.filter(x => x.sq !== s.sq)).slice(0, 2)]);
  const hasVoice = speech.supported && speech.voices.length;
  box.innerHTML = `<div class="q">
    ${hasVoice ? `<div class="exbar"><button type="button" class="btn primary" data-play>${icon('play')} Dëgjo</button><button type="button" class="btn" data-slow>${icon('slow')} Më ngadalë</button></div>` : `<div class="qprompt">${esc(s.nl)}</div>`}
    <p class="instr">Çfarë do të thotë?</p>
    <div class="choices">${opts.map((o, k) => `<button type="button" class="choice" data-k="${k}">${esc(o.sq)}</button>`).join('')}</div>
    <div class="qfb" aria-live="polite"></div><div class="exbar"></div></div>`;
  box.querySelector('[data-play]')?.addEventListener('click', () => say(ctx, s.nl));
  box.querySelector('[data-slow]')?.addEventListener('click', () => say(ctx, s.nl, true));
  box.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
    const good = opts[+b.dataset.k] === s;
    box.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (opts[+x.dataset.k] === s) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
    const fb = box.querySelector('.qfb');
    fb.className = 'qfb ' + (good ? 'ok' : 'bad');
    fb.innerHTML = `<b>${good ? 'Saktë!' : 'Jo.'}</b> ${speakButton(s.nl)} <b>${esc(s.nl)}</b>`;
    const bar = box.querySelector('.exbar:last-child');
    bar.innerHTML = '<button type="button" class="btn primary">Tjetra →</button>';
    bar.firstChild.addEventListener('click', () => { state.i++; comprehension(box, ctx, true); });
    bar.firstChild.focus();
  }));
  if (hasVoice && autoplay) setTimeout(() => say(ctx, s.nl), 250);
}

let rec = null;
function shadowing(box, ctx) {
  const pool = state.pool;
  const s = pool[state.i % pool.length];
  const canRec = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  box.innerHTML = `<div class="q">
    <div class="fc-word small-word">${esc(s.nl)}</div><p class="muted">${esc(s.sq)}</p>
    <ol class="steps small"><li>Dëgjoni modelin.</li><li>Incizoni veten duke e thënë fjalinë.</li><li>Dëgjoni të dyja dhe krahasoni ritmin, theksin dhe zanoret e gjata.</li></ol>
    <div class="exbar">${speech.supported && speech.voices.length ? `<button type="button" class="btn" data-play>${icon('play')} Modeli</button><button type="button" class="btn" data-slow>${icon('slow')} Ngadalë</button>` : '<span class="muted small">Pa zë model në këtë pajisje.</span>'}
      ${canRec ? `<button type="button" class="btn primary" data-rec>${icon('mic')} Incizo</button>` : ''}</div>
    <audio controls hidden></audio>
    <p class="note">${canRec ? 'Incizimi mbetet vetëm në këtë faqe dhe nuk dërgohet askund. Faqja nuk e vlerëson shqiptimin tuaj – vetëm ju ndihmon ta dëgjoni.' : 'Ky shfletues nuk lejon incizimin. Thojeni fjalinë me zë pas modelit.'}</p>
    <div class="exbar"><button type="button" class="btn ghost" data-nx>Fjalia tjetër →</button></div></div>`;
  box.querySelector('[data-play]')?.addEventListener('click', () => say(ctx, s.nl));
  box.querySelector('[data-slow]')?.addEventListener('click', () => say(ctx, s.nl, true));
  box.querySelector('[data-nx]').addEventListener('click', () => { state.i++; shadowing(box, ctx); });
  const audio = box.querySelector('audio');
  box.querySelector('[data-rec]')?.addEventListener('click', async e => {
    const b = e.currentTarget;
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = ev => chunks.push(ev.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (audio.src) URL.revokeObjectURL(audio.src);
        audio.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        audio.hidden = false;
        b.innerHTML = `${icon('mic')} Incizo sërish`;
      };
      rec.start();
      b.innerHTML = `${icon('stop')} Ndalo`;
      setTimeout(() => { if (rec?.state === 'recording') rec.stop(); }, 10000);
    } catch (err) {
      ctx.toast('Mikrofoni nuk u lejua ose nuk u gjet.');
    }
  });
}

const MODES = { diktim: ['Diktim', dictation], kupto: ['Dëgjo dhe kupto', comprehension], shqipto: ['Përsërit me zë', shadowing] };

export function render(el, ctx) {
  speech.stop();
  if (!state.pool) state.pool = shuffle(sentences(ctx));
  el.innerHTML = `<header class="uhead"><div class="ukick">Dëgjo dhe shqipto</div><div class="utitle"><h2>Dëgjim dhe shqiptim</h2></div>
    <p class="usub">Fjali nga mësimet që keni hapur. Për tingujt e vështirë (g, ui, eu, uu, ij) shihni <a href="#shqiptimi">Hapin 0: Shqiptimi</a>.</p></header>
    <section class="card">${voicePanel(ctx)}</section>
    <div class="seg" role="tablist">${Object.entries(MODES).map(([k, [l]]) => `<button type="button" role="tab" aria-selected="${state.mode === k}" data-mode="${k}" class="${state.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <section class="card" id="lbox"></section>`;
  const box = el.querySelector('#lbox');
  MODES[state.mode][1](box, ctx);
  el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { state.mode = b.dataset.mode; render(el, ctx); }));
  el.querySelector('[data-voice]')?.addEventListener('change', e => { ctx.store.setSetting('voice', e.target.value); say(ctx, 'Goeiedag, hoe gaat het?'); });
  el.querySelector('[data-rate]')?.addEventListener('input', e => { ctx.store.setSetting('rate', parseFloat(e.target.value)); el.querySelector('[data-ratev]').textContent = e.target.value; });
  if (speech.supported && !speech.voices.length) {
    const off = speech.onVoices(() => { off(); if (!el.hidden) render(el, ctx); });
  }
}
