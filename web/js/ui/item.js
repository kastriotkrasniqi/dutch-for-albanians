// One exercise item outside its lesson (practice sessions, mistake review, placement test).
// Item types come from tools/sitegen.py: blank · text · order · choice · table · story.
import { validate, isCorrect, CATEGORY_LABEL } from '../lib/validate.js';
import { shuffle } from '../lib/text.js';
import { esc, el, $$ } from './dom.js';

function promptHtml(it) {
  // blanks in the prompt are rendered by inline() as <span class="blank"></span>
  let k = 0;
  return (it.p || '').replace(/<span class="blank"><\/span>/g, () => `<input class="bl" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" data-k="${k++}" aria-label="Boshllëku ${k}">`);
}

// Lesson instructions that only make sense on the lesson page are replaced outside it.
function instruction(it, exm) {
  if (it.t === 'choice') return `<p class="instr">${esc(exm.title)}: zgjidhni përgjigjen e duhur.</p>`;
  if (it.t === 'order') return '<p class="instr">Prekni fjalët sipas radhës së duhur, ose shkruani fjalinë.</p>';
  return exm.instr ? `<p class="instr">${esc(exm.instr)}</p>` : '';
}

// opts.record(sid, res, value) is called once per answer; opts.done(res) when the learner moves on.
export function renderItem(box, ctx, sid, opts = {}) {
  const it = ctx.course.items[sid];
  const exm = ctx.course.exercises[it.ex];
  const unit = ctx.course.units.find(u => u.id === exm.unit) || ctx.course.modules.find(m => m.id === exm.unit);
  const where = unit ? (unit.n ? `Njësia ${unit.n}` : unit.title) : '';
  let body = '';
  if (it.t === 'choice') {
    body = `<div class="qprompt">${it.p}</div><div class="choices" role="group" aria-label="Zgjidhni përgjigjen">${shuffle(it.o).map(o => `<button type="button" class="choice" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (it.t === 'order') {
    body = `${it.p ? `<div class="osq">${it.p}</div>` : ''}<div class="chips">${shuffle(it.c).map(c => `<button type="button" class="chip" data-pchip>${esc(c)}</button>`).join('')}</div>
      <div class="chipctl"><button type="button" class="link" data-pundo>↶ Hiq të fundit</button><button type="button" class="link" data-preset>Fillo nga e para</button></div>
      <input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Fjalia">`;
  } else if (it.t === 'table') {
    body = `<div class="qprompt">${it.h ? `<span class="muted">${esc(it.h)}:</span> ` : ''}${it.p}</div><input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Përgjigjja">`;
  } else if ((it.p || '').includes('class="blank"')) {
    body = `<div class="qprompt blanks">${promptHtml(it)}</div>`;
  } else {
    body = `<div class="qprompt">${it.p}</div><input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Përgjigjja">`;
  }
  box.innerHTML = `<div class="q">
    <div class="qhead"><span class="tag">${esc(where)}</span> <a class="muted small" href="#${esc(it.ex)}">${esc(exm.letter)}. ${esc(exm.title)}</a></div>
    ${instruction(it, exm)}
    ${body}
    <div class="qfb" aria-live="polite"></div>
    <div class="exbar"><button type="button" class="btn primary" data-qcheck>Kontrollo</button><button type="button" class="btn ghost" data-qskip>Nuk e di</button></div>
  </div>`;
  const inputs = $$('input', box);
  let answered = false, chosen = '';
  const value = () => it.t === 'choice' ? chosen : inputs.map(i => i.value.trim()).filter(Boolean).join(' ');
  const finish = res => {
    answered = true;
    const good = isCorrect(res);
    const fb = box.querySelector('.qfb');
    fb.className = 'qfb ' + (good ? (res.verdict === 'near' ? 'near' : 'ok') : 'bad');
    fb.innerHTML = good
      ? `<b>${res.verdict === 'near' ? 'Pranohet' : 'Saktë!'}</b> ${esc(res.notes.join(' '))}${res.alts.length > 1 ? `<div class="muted small">Edhe e saktë: ${esc(res.alts.filter(a => a !== res.expected).slice(0, 2).join(' · '))}</div>` : ''}`
      : `<b>${res.verdict === 'empty' ? 'Përgjigjja e saktë' : 'Jo ende.'}</b> ${esc(res.msg || '')}
         ${res.cat ? `<span class="tag">${esc(CATEGORY_LABEL[res.cat] || '')}</span>` : ''}
         <div>Përgjigjja: <b>${esc(res.alts.slice(0, 3).join(' · '))}</b></div>${res.notes.length ? `<div class="muted small">${esc(res.notes.join(' '))}</div>` : ''}`;
    inputs.forEach(i => { i.readOnly = true; i.classList.add(good ? 'ok' : 'bad'); });
    $$('.choice', box).forEach(b => {
      b.disabled = true;
      if (isCorrect(validate(b.dataset.v, it.a))) b.classList.add('ok');
      else if (b.dataset.v === chosen) b.classList.add('bad');
    });
    const bar = box.querySelector('.exbar');
    bar.innerHTML = `<button type="button" class="btn primary" data-qnext>${opts.last ? 'Shiko rezultatin' : 'Vazhdo'} →</button>`;
    bar.querySelector('[data-qnext]').focus();
    bar.querySelector('[data-qnext]').addEventListener('click', () => opts.done?.(res));
  };
  const check = () => {
    if (answered) return;
    const v = value();
    const res = validate(v, it.a);
    if (res.verdict === 'empty') { (inputs[0] || box.querySelector('.choice'))?.focus(); return; }
    opts.record?.(sid, res, v);
    finish(res);
  };
  box.querySelector('[data-qcheck]').addEventListener('click', check);
  box.querySelector('[data-qskip]').addEventListener('click', () => {
    if (answered) return;
    const res = { ...validate('', it.a), verdict: 'empty' };
    opts.record?.(sid, { verdict: 'wrong', cat: 'other', msg: '', alts: res.alts, notes: [] }, '');
    finish(res);
  });
  $$('.choice', box).forEach(b => b.addEventListener('click', () => { chosen = b.dataset.v; check(); }));
  const full = box.querySelector('input.full');
  $$('[data-pchip]', box).forEach(c => c.addEventListener('click', () => {
    if (c.classList.contains('used') || answered) return;
    full.value = (full.value.trim() + ' ' + c.textContent).trim(); c.classList.add('used');
  }));
  box.querySelector('[data-pundo]')?.addEventListener('click', () => {
    const used = $$('.chip.used', box); const last = used.find(c => full.value.trim().endsWith(c.textContent)) || used[used.length - 1];
    if (!last) return;
    full.value = full.value.trim().slice(0, -last.textContent.length).trim(); last.classList.remove('used');
  });
  box.querySelector('[data-preset]')?.addEventListener('click', () => { full.value = ''; $$('.chip.used', box).forEach(c => c.classList.remove('used')); });
  inputs.forEach((inp, i) => inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (answered) box.querySelector('[data-qnext]')?.click();
    else if (i < inputs.length - 1) inputs[i + 1].focus();
    else check();
  }));
  // focus the first field; choices are not pre-focused, so nothing looks selected before the learner acts
  requestAnimationFrame(() => inputs[0]?.focus({ preventScroll: true }));
  return { check };
}

export function itemLabel(ctx, sid) {
  const it = ctx.course.items[sid];
  const d = document.createElement('div');
  d.innerHTML = it.p || '';
  return d.textContent.trim() || ctx.course.exercises[it.ex].title;
}

export { el };
