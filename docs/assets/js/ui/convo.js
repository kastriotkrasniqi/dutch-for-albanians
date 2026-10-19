// Bisedat: guided conversations, one turn at a time (scenarios in content/scenarios.json).
// Evaluation is rule based (lib/convo.js) and the page says so; the model answer appears only after
// the learner has tried, and the conversation never ends by itself: the last turn leads to a report.
import { ruleProvider, feedbackText } from '../lib/convo.js';
import { esc, plural } from './dom.js';
import { speakButton, say, speech } from './speech.js';

const LEVEL = { great: ['Shkëlqyeshëm', 'ok'], good: ['Shumë mirë', 'ok'], ok: ['Kuptohet', 'near'], retry: ['Provoni sërish', 'bad'], skipped: ['E kaluar', 'bad'] };
let run = null;   // { id, turn, log: [{ input, result, tries }], listen }

function list(el, ctx) {
  const done = ctx.store.state.convo;
  el.innerHTML = `<header class="uhead"><div class="ukick">Bisedat</div><div class="utitle"><h2>Biseda në Antwerpen</h2></div>
    <p class="usub">Situata të përditshme në Flandër. Ju shkruani përgjigjen tuaj; faqja jep komente në shqip dhe një mënyrë të natyrshme për ta thënë.</p>
    <p class="note"><b>Si kontrollohet:</b> ky është një simulim me rregulla, jo inteligjencë artificiale. Kontrolli shikon nëse përgjigjja përmban informacionin e kërkuar, nëse është e sjellshme dhe nëse ka disa gabime tipike të shqipfolësve. Nuk i kap të gjitha gabimet – krahasojeni gjithmonë me modelin.</p></header>
    <div class="sgrid">${ctx.course.scenarios.map(s => `<a class="scard" href="#biseda/${s.id}">
      <span class="lvl">${esc(s.level)}</span><b>${esc(s.title)}</b><span class="muted small">${esc(s.place)}</span>
      <span class="small">${done[s.id] ? `✓ e bërë · ${done[s.id].good}/${done[s.id].turns} pa vërejtje` : plural(s.turns.length, 'hap', 'hapa')}</span></a>`).join('')}</div>`;
}

function bubble(who, nl, sq, opts = {}) {
  if (!nl) return '';
  return `<div class="bub ${who}">${who === 'npc' ? `${speakButton(nl)} ` : ''}<span class="bt ${opts.hide ? 'blurred' : ''}">${esc(nl)}</span>
    ${sq ? `<details class="tr"><summary>shqip</summary>${esc(sq)}</details>` : ''}</div>`;
}

function transcript(sc, upto) {
  return run.log.slice(0, upto).map((l, i) => bubble('npc', sc.turns[i].npc, sc.turns[i].npc_sq) + (l.input ? bubble('me', l.input) : '')).join('');
}

function report(el, ctx, sc) {
  const good = run.log.filter(l => ['great', 'good'].includes(l.result?.level)).length;
  if (!run.saved) { ctx.store.finishConversation(sc.id, sc.turns.length, good); run.saved = true; }
  el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#biseda">Bisedat</a></div><div class="utitle"><h2>${esc(sc.title)} · raporti</h2></div></header>
    <div class="card done-card ${good === sc.turns.length ? 'is-good' : 'is-review'}" tabindex="-1">
      <h3>${good} nga ${sc.turns.length} hapa pa vërejtje</h3>
      <ol class="report">${sc.turns.map((t, i) => {
        const l = run.log[i] || {}; const r = l.result; const [lab, cls] = LEVEL[r?.level || 'skipped'];
        return `<li>${t.npc ? `<div class="muted small">${esc(t.npc)}</div>` : ''}<div><span class="tag ${cls}">${lab}</span> ${esc(l.input || '—')}</div>
          ${r && r.level !== 'great' ? `<div class="small">${feedbackText(r).slice(1).map(esc).join('<br>')}</div>` : ''}
          <div class="small">Mënyrë e natyrshme: <b>${esc(t.models[0])}</b></div></li>`;
      }).join('')}</ol>
      <h4>Fjali të dobishme</h4>
      <ul class="phrases">${sc.phrases.map(([nl, sq]) => `<li>${speakButton(nl)} <b>${esc(nl)}</b> – ${esc(sq)}</li>`).join('')}</ul>
      <div class="exbar"><button type="button" class="btn primary" data-redo>Përsërit bisedën</button><a class="btn" href="#biseda">Bisedat e tjera</a></div>
    </div>`;
  el.querySelector('[data-redo]').addEventListener('click', () => { run = { id: sc.id, turn: 0, log: [], listen: run.listen }; turn(el, ctx, sc); });
  el.querySelector('.done-card').focus();
}

function turn(el, ctx, sc) {
  const i = run.turn;
  const t = sc.turns[i];
  const entry = run.log[i] || (run.log[i] = { input: '', result: null, tries: 0 });
  el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#biseda">Bisedat</a> · ${esc(sc.place)}</div><div class="utitle"><h2>${esc(sc.title)}</h2></div>
    <div class="sbar"><span class="bar"><i style="width:${Math.round((i / sc.turns.length) * 100)}%"></i></span><span class="muted small">hapi ${i + 1} / ${sc.turns.length}</span>
    ${speech.supported ? `<label class="small"><input type="checkbox" data-listen ${run.listen ? 'checked' : ''}> vetëm dëgjim</label>` : ''}</div></header>
    <div class="chat">${transcript(sc, i)}${bubble('npc', t.npc, t.npc_sq, { hide: run.listen })}</div>
    <div class="card turn">
      <div class="task"><b>Detyra:</b> ${esc(t.task)}</div>
      <label class="sr" for="cin">Përgjigjja juaj holandisht</label>
      <textarea id="cin" rows="2" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Shkruani holandisht…">${esc(entry.result ? entry.input : '')}</textarea>
      <div class="exbar"><button type="button" class="btn primary" data-send>Dërgo</button><button type="button" class="btn ghost" data-hint>Ndihmë</button></div>
      <div class="hint" hidden>${esc(t.hint || '')}</div>
      <div class="cfb" aria-live="polite"></div>
    </div>`;
  const ta = el.querySelector('#cin');
  if (t.npc && run.listen) say(ctx, t.npc);
  el.querySelector('[data-listen]')?.addEventListener('change', e => {
    run.listen = e.target.checked;
    el.querySelectorAll('.chat .bub.npc:last-child .bt').forEach(b => b.classList.toggle('blurred', run.listen));
    if (run.listen && t.npc) say(ctx, t.npc);
  });
  el.querySelector('[data-hint]').addEventListener('click', e => { el.querySelector('.hint').hidden = false; e.currentTarget.remove(); entry.hint = true; });
  const send = () => {
    const input = ta.value.trim();
    const r = ruleProvider.evaluate(t, input);
    if (r.level === 'empty') { ta.focus(); return; }
    entry.input = input; entry.result = r; entry.tries++;
    const [lab, cls] = LEVEL[r.level];
    const others = t.models.filter(m => m.toLowerCase() !== input.toLowerCase());
    el.querySelector('.cfb').innerHTML = `<div class="qfb ${cls}"><b>${lab}.</b> ${feedbackText(r).slice(1).map(esc).join('<br>')}
      ${r.level !== 'great' || others.length ? `<div class="model">${r.level === 'great' ? 'Edhe kështu' : 'Mënyrë e natyrshme'}: ${others.slice(0, 2).map(m => `${speakButton(m)} <b>${esc(m)}</b>`).join(' · ')}</div>` : ''}
      ${t.tip ? `<div class="muted small">💡 ${esc(t.tip)}</div>` : ''}</div>
      <div class="exbar">${r.level === 'great' ? '' : '<button type="button" class="btn" data-retry>Provo sërish</button>'}
        <button type="button" class="btn primary" data-next>${i === sc.turns.length - 1 ? 'Mbaro dhe shiko raportin' : 'Vazhdo bisedën →'}</button></div>`;
    el.querySelector('.bub.me.pending')?.remove();
    el.querySelector('.chat').insertAdjacentHTML('beforeend', bubble('me', input).replace('bub me', 'bub me pending'));
    el.querySelector('[data-retry]')?.addEventListener('click', () => { ta.focus(); ta.select(); });
    el.querySelector('[data-next]').addEventListener('click', () => {
      run.turn++;
      if (run.turn >= sc.turns.length) report(el, ctx, sc); else turn(el, ctx, sc);
    });
    el.querySelector('[data-next]').focus();
  };
  el.querySelector('[data-send]').addEventListener('click', send);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  ta.focus({ preventScroll: true });
  el.querySelector('.turn').scrollIntoView({ block: 'nearest' });
}

function intro(el, ctx, sc) {
  el.innerHTML = `<header class="uhead"><div class="ukick"><a href="#biseda">Bisedat</a></div><div class="utitle"><h2>${esc(sc.title)}</h2></div></header>
    <div class="card"><dl class="situ"><dt>Ku</dt><dd>${esc(sc.place)}</dd><dt>Roli juaj</dt><dd>${esc(sc.role)}</dd><dt>Qëllimi</dt><dd>${esc(sc.goal)}</dd><dt>Niveli</dt><dd>${esc(sc.level)}</dd></dl>
    <p class="muted small">Në çdo hap lexoni (ose dëgjoni) çfarë thotë bashkëbiseduesi dhe shkruani përgjigjen tuaj. Mund ta provoni sa herë të doni para se të vazhdoni.</p>
    <div class="exbar"><button type="button" class="btn primary" data-go>Fillo bisedën</button></div></div>`;
  el.querySelector('[data-go]').addEventListener('click', () => { run = { id: sc.id, turn: 0, log: [], listen: false }; turn(el, ctx, sc); });
}

export function render(el, ctx, args) {
  const sc = ctx.course.scenarios.find(s => s.id === args[0]);
  if (!sc) { list(el, ctx); return; }
  if (run && run.id === sc.id && run.turn < sc.turns.length) turn(el, ctx, sc);
  else if (run && run.id === sc.id && run.turn >= sc.turns.length) report(el, ctx, sc);
  else intro(el, ctx, sc);
}
