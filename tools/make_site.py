import sys, os, json, html, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sitegen import *
from site_assets import CSS as SCSS, JS as SJS

units = []
ANS = {}
for u in range(1, NU + 1):
    h, a, n = render_unit_site(u)
    units.append(h); ANS.update(a)
rail = []
for pnum, pname, us, lvl in PARTS:
    rail.append(f'<h4>Pjesa {pnum} · {esc(pname)}</h4>')
    for u in us:
        rail.append(f'<a href="#u{u}"><span class="n">{u}</span><span class="t">{inline(UNITS[u-1][1])}</span><span class="p" data-prog="{u}"></span></a>')
rail.append('<h4>Shtojcë</h4><a href="#fjalori"><span class="n">Aa</span><span class="t">Fjalori i plotë</span></a>')
opts = '<option value="#hyrje">Hyrje</option>' + ''.join(f'<option value="#u{u}">{u}. {html.escape(strip_md(UNITS[u-1][1]))}</option>' for u in range(1, NU + 1)) + '<option value="#fjalori">Fjalori i plotë</option>'
page = f'''<title>Mësojmë holandisht</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600;700&display=swap">
<script>try{{const t=localStorage.getItem('mh1:theme');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>{SCSS}</style>
<header class="top"><a class="brand" href="#hyrje">Mësojmë holandisht<small>A1–A2</small></a>
<label for="jump" class="sr" hidden>Njësia</label><select id="jump" aria-label="Zgjidh njësinë">{opts}</select>
<button type="button" id="theme" class="tbtn" aria-label="Ndrysho temën"></button></header>
<div class="shell"><nav class="rail" aria-label="Njësitë"><a href="#hyrje"><span class="n">⌂</span><span class="t">Hyrje</span></a>{''.join(rail)}</nav>
<main>{intro(len(ANS))}{''.join(units)}{full_gloss()}</main></div>
<script>{SJS.replace('__ANS__', json.dumps(ANS, ensure_ascii=False))}</script>'''
open(os.path.join(ROOT, 'docs', 'index.html'), 'w').write(page)
print(len(page), 'bytes', len(ANS), 'checkable slots')
