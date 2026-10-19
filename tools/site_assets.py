CSS = r'''
:root{
  /* Layout: sticky top bar + left unit rail (desktop) + one reading column ~70ch; units are pages switched by #hash */
  --bg:#F6F8FB; --paper:#FFFFFF; --ink:#1B2333; --muted:#5C6678; --line:#DCE3EC; --tint:#EEF3F9;
  --navy:#15305A; --navy-ink:#FFFFFF; --accent:#E2701A; --accent-ink:#FFFFFF; --accent-soft:#FCEBDD;
  --ok:#1F7A4A; --ok-soft:#E3F4EA; --bad:#C0392B; --bad-soft:#FBE7E4;
  --note:#2456A4; --note-soft:#E8F0FB; --tip:#B9560D; --tip-soft:#FDF1E6; --rule:#2E7D4F; --rule-soft:#EAF6EF; --al:#B3261E;
  --display:"Lora", Georgia, "Times New Roman", serif; --body:"Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#0F1724; --paper:#151F30; --ink:#E6EBF3; --muted:#9AA6BA; --line:#26344A; --tint:#1B283C;
  --navy:#9DB8E8; --navy-ink:#0F1724; --accent:#F08A3A; --accent-ink:#1A1206; --accent-soft:#3A2614;
  --ok:#5FCB8F; --ok-soft:#163626; --bad:#F07B6E; --bad-soft:#3D1E1B;
  --note:#8DB3F0; --note-soft:#18294A; --tip:#F3A35F; --tip-soft:#33240F; --rule:#6FCF97; --rule-soft:#14301F; --al:#F28B82; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#0F1724; --paper:#151F30; --ink:#E6EBF3; --muted:#9AA6BA; --line:#26344A; --tint:#1B283C;
  --navy:#9DB8E8; --navy-ink:#0F1724; --accent:#F08A3A; --accent-ink:#1A1206; --accent-soft:#3A2614;
  --ok:#5FCB8F; --ok-soft:#163626; --bad:#F07B6E; --bad-soft:#3D1E1B;
  --note:#8DB3F0; --note-soft:#18294A; --tip:#F3A35F; --tip-soft:#33240F; --rule:#6FCF97; --rule-soft:#14301F; --al:#F28B82; color-scheme:dark }
*{box-sizing:border-box}
html{scroll-padding-top:72px}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.6;margin:0}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--paper)}
a{color:inherit}
b{font-weight:650;color:var(--navy)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:9;background:var(--paper);border-bottom:1px solid var(--line);padding-block:10px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;align-items:center;gap:12px;overflow:clip}
.brand{font-family:var(--display);font-weight:700;font-size:19px;color:var(--navy);text-decoration:none;white-space:nowrap}
.brand small{font-family:var(--body);font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-left:8px}
.top select{margin-left:auto;min-width:0;flex:0 1 340px;width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:inherit;font-size:14px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}
.tbtn{flex:none;display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--navy);cursor:pointer}
.tbtn:hover{border-color:var(--accent)}
.tbtn svg{width:18px;height:18px}
.shell{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1240px;margin:0 auto}
.rail{position:sticky;top:calc(56px + env(safe-area-inset-top,0px));align-self:start;height:calc(100vh - 56px);overflow:auto;padding:18px 12px 40px max(16px,env(safe-area-inset-left,0px));border-right:1px solid var(--line)}
.rail h4{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:18px 8px 6px;display:flex;gap:6px;align-items:center}
.rail h4:first-child{margin-top:0}
.rail a{display:flex;gap:10px;align-items:baseline;text-decoration:none;padding:6px 8px;border-radius:8px;font-size:14px;line-height:1.35;color:var(--ink)}
.rail a .n{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700;width:20px;flex:none;font-size:12px}
.rail a .t{flex:1;min-width:0}
.rail a .p{flex:none;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.rail a.on{background:var(--tint);font-weight:600}
.rail a:hover{background:var(--tint)}
main{min-width:0;padding-block:28px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.unit{max-width:760px;margin:0 auto}
.lvl{display:inline-block;font:700 10px/1 var(--body);letter-spacing:.08em;background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:4px 8px;vertical-align:2px;text-transform:none}
.ukick{font-size:12px;font-weight:650;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.uhead{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:28px}
.utitle{display:flex;gap:16px;align-items:baseline;margin-top:8px}
.unum{font-family:var(--display);font-weight:700;font-size:56px;line-height:1;color:var(--navy);font-variant-numeric:tabular-nums}
.utitle h2,.hero h1{font-family:var(--display);font-size:30px;line-height:1.15;margin:0;color:var(--navy);text-wrap:balance}
.usub{color:var(--muted);margin:10px 0 0;max-width:62ch}
.utoc{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.utoc a{display:inline-flex;gap:8px;align-items:center;text-decoration:none;font-size:14px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;background:var(--paper)}
.utoc a span{font-weight:700;color:var(--accent);font-size:12px}
.utoc a:hover{border-color:var(--accent)}
.lesson,.practice,.gloss{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:28px clamp(16px,4vw,36px);margin-bottom:24px}
.lk{font-size:12px;font-weight:650;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.lt{font-family:var(--display);font-size:26px;line-height:1.2;margin:4px 0 18px;color:var(--navy);text-wrap:balance}
.sh{font-size:17px;color:var(--navy);margin:28px 0 10px;display:flex;gap:10px;align-items:center;text-wrap:balance}
.sh::before{content:"";width:4px;height:16px;background:var(--accent);border-radius:2px;flex:none}
.ssh{font-size:15px;color:var(--note);margin:18px 0 8px}
p{margin:0 0 12px}
.tw{overflow-x:auto;margin:6px 0 18px;border:1px solid var(--line);border-radius:10px}
.tbl{width:100%;border-collapse:collapse;font-size:15px}
.tbl th{background:var(--navy);color:var(--navy-ink);text-align:left;font-size:13px;font-weight:600;padding:9px 12px;white-space:nowrap}
.tbl th b{color:var(--navy-ink)}
.tbl td{padding:8px 12px;border-top:1px solid var(--line);vertical-align:top}
.tbl tbody tr:nth-child(even) td{background:var(--tint)}
.tbl.conj td:first-child{color:var(--muted)}
.tbl.conj td:nth-child(2){font-weight:650;color:var(--navy)}
.box{border-radius:10px;padding:14px 16px 6px;margin:12px 0 20px;border-left:4px solid}
.box .kicker{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px}
.box .btitle{font-weight:700;margin-bottom:4px}
.box p{margin:0 0 8px}
.box.note{background:var(--note-soft);border-color:var(--note)} .box.note .kicker{color:var(--note)}
.box.tip{background:var(--tip-soft);border-color:var(--tip)} .box.tip .kicker{color:var(--tip)}
.box.caution{background:var(--bad-soft);border-color:var(--bad)} .box.caution .kicker{color:var(--bad)}
.box.rule{background:var(--rule-soft);border-color:var(--rule)} .box.rule .kicker{color:var(--rule)}
.box.contrast{background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--al)} .box.contrast .kicker{color:var(--al)}
.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;margin:8px 0 20px}
.fnode{flex:1 1 120px;border:1px solid var(--line);border-radius:10px;padding:10px;text-align:center;background:var(--paper)}
.fnode .fl{font-weight:700;color:var(--navy)} .fnode .fs{font-size:13px;color:var(--muted)}
.fnode.hl{background:var(--navy);border-color:var(--navy)} .fnode.hl .fl,.fnode.hl .fs{color:var(--navy-ink)}
.arrow{align-self:center;color:var(--accent);font-weight:700}
ul.bul{padding-left:20px;margin:0 0 14px} ul.bul li{margin-bottom:6px} ul.bul li::marker{color:var(--accent)}
ol.items{list-style:none;padding:0;margin:0 0 6px}
.lesson ol.items li{display:flex;gap:10px;margin-bottom:8px}
.inum{flex:none;width:26px;color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums}
p.example{background:var(--tint);border-radius:8px;padding:8px 12px;display:inline-block}
/* exercises */
.ex{border-top:1px solid var(--line);padding-top:20px;margin-top:22px}
.exh{display:flex;gap:12px;align-items:center;font-size:17px;color:var(--navy);margin:0 0 10px}
.exl{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-size:14px}
p.instr{color:var(--muted);font-size:15px}
.it{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px dashed var(--line)}
.ibody{flex:1;min-width:0;line-height:2.1}
.it.wide .ibody{line-height:1.6}
.itext{display:block}
input.bl,input.full,.mrow select{font:inherit;font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:3px 8px}
input.bl{width:9.5em;max-width:100%;margin:0 4px}
input.bl.sm{width:5em}
input.full{display:block;width:100%;margin-top:6px;padding:7px 10px}
input:focus,select:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-soft)}
.ok input,.ok select,input.ok{border-color:var(--ok);background:var(--ok-soft)}
.bad input,.bad select,input.bad{border-color:var(--bad);background:var(--bad-soft)}
.mark-i{flex:none;width:22px;text-align:center;font-weight:700;padding-top:6px}
.ok>.mark-i::after{content:"✓";color:var(--ok)} .bad>.mark-i::after{content:"✗";color:var(--bad)}
.match{display:grid;gap:8px;margin:6px 0 10px}
.mrow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 22px;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:6px 10px;background:var(--paper)}
.mleft{font-weight:600;color:var(--navy)}
.mrow select{width:100%;padding:6px 8px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-block;border:1px solid var(--line);background:var(--tint);border-radius:999px;padding:2px 10px;font-weight:600;color:var(--navy);font-size:14px}
.osq{display:block;color:var(--muted);font-style:italic;font-size:14px;margin-top:4px}
.bank{display:flex;flex-wrap:wrap;gap:6px;padding:10px;border:1px dashed var(--line);border-radius:10px;margin:4px 0 10px}
p.story{line-height:2.3}
.exbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.btn{font:inherit;font-size:14px;font-weight:600;border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:999px;padding:7px 16px;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.ghost{border-color:transparent;color:var(--muted)}
.score{font-weight:700;font-size:14px;font-variant-numeric:tabular-nums}
.score.full{color:var(--ok)}
.sol{margin-top:10px;background:var(--tint);border-radius:10px;padding:10px 14px;font-size:15px}
.glist{columns:2 240px;column-gap:28px}
.gi,.fgi{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);break-inside:avoid;font-size:15px}
.gnl{flex:0 0 45%;font-weight:650;color:var(--navy);min-width:0}
.gsq{flex:1;min-width:0}
.gu{flex:none;font-size:12px;color:var(--muted);text-decoration:none;padding-top:2px}
.fg{columns:2 300px;column-gap:28px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 20px}
.search{display:flex;gap:10px;align-items:center;margin:0 0 16px}
.search span{font-weight:600}
.search input{flex:1;min-width:0;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}
.pnav{display:flex;justify-content:space-between;gap:12px;margin-top:8px}
.pn{text-decoration:none;font-weight:600;color:var(--navy);border:1px solid var(--line);border-radius:999px;padding:8px 16px;background:var(--paper)}
.pn.nx{margin-left:auto}
/* intro */
.hero{padding:12px 0 28px;border-bottom:1px solid var(--line);margin-bottom:28px}
.hero h1{font-size:clamp(38px,7vw,60px);margin-top:10px}
.hstats{display:flex;flex-wrap:wrap;gap:28px;margin:22px 0}
.hstats div{display:flex;flex-direction:column;border-left:3px solid var(--accent);padding-left:12px}
.hstats b{font-family:var(--display);font-size:28px;line-height:1;font-variant-numeric:tabular-nums}
.hstats span{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.hcta{display:flex;gap:10px;flex-wrap:wrap}
.how{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:6px 24px 16px;margin-bottom:28px}
.steps{padding-left:20px} .steps li{margin-bottom:8px} .steps li::marker{color:var(--accent);font-weight:700}
.note{color:var(--muted);font-size:14px}
.ipart h3{font-size:15px;color:var(--navy);display:flex;gap:10px;align-items:center;margin:26px 0 10px}
.ipart h3>span:first-child{color:var(--accent);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.ugrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.ucard{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;text-decoration:none;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.ucard:hover{border-color:var(--accent)}
.ucard .cn{font-family:var(--display);font-weight:700;font-size:22px;color:var(--navy);grid-row:span 2;font-variant-numeric:tabular-nums}
.ucard .ct{font-weight:600;line-height:1.3}
.ucard .cp{font-size:12px;color:var(--muted)}
@media (max-width:980px){ .shell{grid-template-columns:minmax(0,1fr)} .rail{display:none} }
@media (min-width:981px){ .top select{display:none} .tbtn{margin-left:auto} }
@media (max-width:520px){ .brand small{display:none} .brand{font-size:17px} .unum{font-size:40px} .utitle h2{font-size:24px} .lt{font-size:22px} .mrow{grid-template-columns:minmax(0,1fr) 22px} .mrow select{grid-column:1} .mrow .mark-i{grid-row:1;grid-column:2} .gnl{flex-basis:42%} }
@media (prefers-reduced-motion:no-preference){ html{scroll-behavior:smooth} }
'''

JS = r'''
const ANS = __ANS__;
const STORE = 'mh1:';
const ls = {
  get(k){ try{ return localStorage.getItem(STORE+k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(STORE+k,v); }catch(e){} },
  del(k){ try{ localStorage.removeItem(STORE+k); }catch(e){} }
};
function norm(s){
  return (s||'').toLowerCase().replace(/[’‘`´]/g,"'").replace(/[«»"“”.,!?;:()…–—]/g,' ').replace(/\s*\/\s*/g,'/').replace(/\s+/g,' ').trim();
}
function alts(raw){
  const out = new Set([raw]);
  raw.split(' / ').forEach(a=>{
    a = a.trim();
    if(/\(e\)/.test(a)){ out.add(a.replace(/\(e\)/g,'')); out.add(a.replace(/\(e\)/g,'e')); }
    const noPar = a.replace(/\([^)]*\)/g,'');
    out.add(noPar);
    const m = a.match(/\(([^)\s]+)\)/);
    if(m){ out.add(a.replace(/\([^)]*\)/g,'').replace(/\S+\s*$/, m[1]).trim()); out.add(m[1]); }
    out.add(a);
  });
  return [...out].map(norm).filter(Boolean);
}
function slotValue(ex, sid){
  return [...ex.querySelectorAll('[data-slot="'+sid+'"]')].map(e=>e.value.trim()).filter(Boolean).join(' ');
}
function slotHost(el){ return el.closest('.it,.mrow') || el; }
function checkEx(ex){
  const sids = [...new Set([...ex.querySelectorAll('[data-slot]')].map(e=>e.dataset.slot))].filter(s=>ANS[s]!==undefined);
  let ok=0;
  sids.forEach(sid=>{
    const v = norm(slotValue(ex,sid));
    const good = v && alts(ANS[sid]).includes(v);
    if(good) ok++;
    const els=[...ex.querySelectorAll('[data-slot="'+sid+'"]')];
    const hosts=new Set(els.map(slotHost));
    hosts.forEach(h=>{ h.classList.remove('ok','bad'); if(v) h.classList.add(good?'ok':'bad'); });
  });
  const sc = ex.querySelector('.score');
  sc.textContent = ok+' / '+sids.length+' të sakta';
  sc.classList.toggle('full', ok===sids.length);
  const prog = JSON.parse(ls.get('prog')||'{}');
  prog[ex.dataset.ex]=[ok,sids.length]; ls.set('prog',JSON.stringify(prog));
  paintProgress();
}
function clearEx(ex){
  ex.querySelectorAll('[data-slot]').forEach(e=>{ e.value=''; ls.del('v:'+e.id); });
  ex.querySelectorAll('.ok,.bad').forEach(e=>e.classList.remove('ok','bad'));
  ex.querySelector('.score').textContent='';
  ex.querySelector('.sol').hidden=true;
  const prog = JSON.parse(ls.get('prog')||'{}'); delete prog[ex.dataset.ex]; ls.set('prog',JSON.stringify(prog));
  paintProgress();
}
function paintProgress(){
  const prog = JSON.parse(ls.get('prog')||'{}');
  const per = {};
  Object.entries(prog).forEach(([k,[a,b]])=>{ const u=k.split('-')[0].slice(1); per[u]=per[u]||[0,0]; per[u][0]+=a; per[u][1]+=b; });
  document.querySelectorAll('[data-prog]').forEach(el=>{
    const p=per[el.dataset.prog]; el.textContent = p ? p[0]+'/'+p[1] : '';
  });
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return;
  const ex=b.closest('.ex');
  if(b.dataset.act==='check') checkEx(ex);
  if(b.dataset.act==='show'){ const s=ex.querySelector('.sol'); s.hidden=!s.hidden; b.textContent = s.hidden?'Shfaq zgjidhjen':'Fshih zgjidhjen'; }
  if(b.dataset.act==='clear') clearEx(ex);
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset && el.dataset.slot){ ls.set('v:'+el.id, el.value); const h=slotHost(el); h.classList.remove('ok','bad'); }
  if(el.id==='gsearch'){
    const q=norm(el.value);
    document.querySelectorAll('#fglist .fgi').forEach(r=>{ r.hidden = q && !norm(r.dataset.s).includes(q); });
  }
});
document.addEventListener('change',e=>{
  const el=e.target; if(el.tagName==='SELECT' && el.dataset.slot){ ls.set('v:'+el.id, el.value); slotHost(el).classList.remove('ok','bad'); }
});
function restore(){
  document.querySelectorAll('[data-slot]').forEach(el=>{ const v=ls.get('v:'+el.id); if(v!==null) el.value=v; });
}
const jump = document.getElementById('jump');
function route(){
  let h = location.hash.slice(1) || 'hyrje';
  let m = h.match(/^u(\d+)/);
  let page = m ? 'u'+m[1] : (document.getElementById(h) && document.getElementById(h).classList.contains('unit') ? h : 'hyrje');
  document.querySelectorAll('article.unit').forEach(a=>{ a.hidden = a.id!==page; });
  document.querySelectorAll('.rail a').forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#'+page));
  if(jump) jump.value = '#'+page;
  if(m){ ls.set('last', page); }
  const target = document.getElementById(h);
  if(target && !target.classList.contains('unit')) { requestAnimationFrame(()=>target.scrollIntoView()); }
  else window.scrollTo(0,0);
  const last = ls.get('last'); const r=document.getElementById('resume');
  if(r && last && last!=='u1'){ r.hidden=false; r.href='#'+last; r.textContent='Vazhdo te Njësia '+last.slice(1); }
}
if(jump) jump.addEventListener('change',()=>{ location.hash = jump.value; });
window.addEventListener('hashchange',route);
const tbtn = document.getElementById('theme');
const darkMq = matchMedia('(prefers-color-scheme: dark)');
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function isDark(){ const t=document.documentElement.dataset.theme; return t ? t==='dark' : darkMq.matches; }
function paintTheme(){
  const d=isDark(); const label = d ? 'Kalo në temën e çelët' : 'Kalo në temën e errët';
  tbtn.innerHTML = d ? SUN : MOON; tbtn.setAttribute('aria-label', label); tbtn.title = label;
}
tbtn.addEventListener('click',()=>{
  const t = isDark() ? 'light' : 'dark';
  // a choice that matches the system setting clears the override, so the page follows the system again
  if((t==='dark')===darkMq.matches){ delete document.documentElement.dataset.theme; ls.del('theme'); }
  else { document.documentElement.dataset.theme=t; ls.set('theme',t); }
  paintTheme();
});
darkMq.addEventListener('change',paintTheme);
restore(); paintProgress(); route(); paintTheme();
'''
