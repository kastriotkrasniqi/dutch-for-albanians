"""Build the website into docs/ (GitHub Pages serves that folder).

  docs/index.html          every lesson and exercise, plus empty pages the app fills in (dashboard, practice …)
  docs/assets/app.css      from web/css/
  docs/assets/js/…         ES modules from web/js/ (copied as they are; no bundler)
  docs/assets/course.json  structured data: exercise items with keys, vocabulary, example sentences,
                           verbs, conversation scenarios, search index

All URLs are relative, so the site works under https://<user>.github.io/<repo>/ and on any static server.
Files get a content hash in the query string (through an import map for the modules) so a new
deployment is never mixed with cached old files.
"""
import sys, os, json, html, hashlib, shutil, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sitegen import *

DOCS = os.path.join(ROOT, 'docs')
WEB = os.path.join(ROOT, 'web')
ASSETS = os.path.join(DOCS, 'assets')

def digest(b):
    return hashlib.sha1(b).hexdigest()[:10]

def read_tsv(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        return []
    rows = []
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'):
            continue
        rows.append([c.strip() for c in line.split('\t')])
    return rows

def build_data():
    data = empty_data()
    units_html = [render_unit_site(u, data)[0] for u in range(1, NU + 1)]
    modules_html = [render_module(m, data) for m in MODULES]
    # verbs: infinitive, Albanian, past singular, past plural, participle, auxiliary, note
    data['verbs'] = [dict(zip(['inf', 'sq', 'ps', 'pp', 'pc', 'aux', 'note'], r + [''] * (7 - len(r)))) for r in read_tsv('verbs.tsv')]
    # extra vocabulary details: Dutch headword → plural, example, example translation, note
    extra = {r[0]: r for r in read_tsv('vocab_extra.tsv')}
    for v in data['vocab']:
        r = extra.get(v['nl'])
        if r:
            for k, val in zip(['pl', 'ex', 'exsq', 'note'], r[1:]):
                if val: v[k] = val
    sc = os.path.join(SRC, 'scenarios.json')
    data['scenarios'] = json.load(open(sc, encoding='utf-8')) if os.path.exists(sc) else []
    data['parts'] = [{'n': p, 'name': name, 'units': [f'u{u}' for u in us], 'level': lvl} for p, name, us, lvl in PARTS]
    return data, units_html, modules_html

NAV = [('ballina', 'Ballina', 'home'), ('hyrje', 'Kursi', 'map'), ('praktike', 'Praktikë', 'target'), ('fjalori', 'Fjalori', 'cards'),
       ('biseda', 'Bisedat', 'chat'), ('degjo', 'Dëgjo dhe shqipto', 'ear'), ('foljet', 'Foljet', 'table'), ('progresi', 'Progresi', 'chart')]
# app pages filled in by JS
PAGES = ['ballina', 'hyrje', 'praktike', 'fjalori', 'biseda', 'degjo', 'foljet', 'progresi', 'kerko']

def rail_html():
    o = ['<div class="railnav">']
    for pid, label, icon in NAV:
        o.append(f'<a href="#{pid}" data-icon="{icon}"><span class="ico" aria-hidden="true"></span><span class="t">{label}</span></a>')
    o.append('</div><h4>Fillimi dhe jeta në Flandër</h4>')
    for code, _, kicker, title, *_ in MODULES:
        o.append(f'<a href="#{code}"><span class="n">{"0" if code == "shqiptimi" else "★"}</span><span class="t">{esc(title)}</span><span class="p" data-prog="{code}"></span></a>')
    for pnum, pname, us, lvl in PARTS:
        o.append(f'<h4>Pjesa {pnum} · {esc(pname)}</h4>')
        for u in us:
            o.append(f'<a href="#u{u}"><span class="n">{u}</span><span class="t">{inline(UNITS[u-1][1])}</span><span class="p" data-prog="u{u}"></span></a>')
    return ''.join(o)

TABS = [('ballina', 'Ballina', 'home'), ('hyrje', 'Kursi', 'map'), ('praktike', 'Praktikë', 'target'), ('fjalori', 'Fjalori', 'cards'), ('biseda', 'Bisedat', 'chat')]

def main():
    data, units_html, modules_html = build_data()
    if os.path.isdir(ASSETS):
        shutil.rmtree(ASSETS)
    os.makedirs(os.path.join(ASSETS, 'js'))
    # copy modules and build the import map with content hashes
    imap = {}
    for dp, _, fs in os.walk(os.path.join(WEB, 'js')):
        for f in sorted(fs):
            if not f.endswith('.js'):
                continue
            src = os.path.join(dp, f)
            rel = os.path.relpath(src, os.path.join(WEB, 'js')).replace(os.sep, '/')
            dst = os.path.join(ASSETS, 'js', rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            b = open(src, 'rb').read()
            open(dst, 'wb').write(b)
            imap[f'./assets/js/{rel}'] = f'./assets/js/{rel}?v={digest(b)}'
    css = open(os.path.join(WEB, 'css', 'app.css'), 'rb').read()
    open(os.path.join(ASSETS, 'app.css'), 'wb').write(css)
    cj = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    open(os.path.join(ASSETS, 'course.json'), 'wb').write(cj)
    pages = ''.join(f'<article class="unit page" id="{p}" hidden><div class="loading" role="status">Duke u ngarkuar…</div></article>' for p in PAGES)
    tabs = ''.join(f'<a href="#{p}" data-icon="{ic}"><span class="ico" aria-hidden="true"></span><span>{l}</span></a>' for p, l, ic in TABS)
    page = f'''<!doctype html>
<html lang="sq">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mësojmë holandisht</title>
<meta name="description" content="Kurs holandishteje për shqipfolës në Belgjikë: gramatikë A1–A2 e shpjeguar në shqip, ushtrime, fjalor me përsëritje, biseda dhe shqiptim.">
<meta name="theme-color" content="#15305A">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600;700&display=swap">
<link rel="stylesheet" href="assets/app.css?v={digest(css)}">
<script>try{{const t=localStorage.getItem('mh1:theme');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<script type="importmap">{json.dumps({'imports': imap})}</script>
<a class="skip" href="#main">Kalo te përmbajtja</a>
<header class="top"><button type="button" id="menu" class="tbtn menu" aria-label="Hap menynë" aria-expanded="false" aria-controls="rail"></button>
<a class="brand" href="#ballina">Mësojmë holandisht<small>A1–A2 · Vlaanderen</small></a>
<form class="qsearch" role="search" id="qform"><label for="q" class="sr">Kërko</label><input id="q" type="search" placeholder="Kërko mësime, fjalë, rregulla…" autocomplete="off" enterkeyhint="search"></form>
<a href="#kerko" id="searchbtn" class="tbtn" aria-label="Kërko"></a>
<button type="button" id="theme" class="tbtn" aria-label="Ndrysho temën"></button></header>
<div class="shell"><nav class="rail" id="rail" aria-label="Navigimi">{rail_html()}</nav>
<main id="main" tabindex="-1" data-course="assets/course.json?v={digest(cj)}">{pages}{''.join(modules_html)}{''.join(units_html)}</main></div>
<nav class="tabs" aria-label="Navigimi kryesor">{tabs}</nav>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<noscript><p class="noscript">Kjo faqe ka nevojë për JavaScript për ushtrimet dhe progresin. Mësimet mund t'i lexoni edhe në PDF (dosja pdf/ në GitHub).</p></noscript>
<script type="module" src="{imap['./assets/js/app.js']}"></script>'''
    open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(DOCS, '.nojekyll'), 'w').write('')
    print(f'index.html {len(page.encode())} B · course.json {len(cj)} B · {len(data["items"])} items · {len(data["vocab"])} words · '
          f'{len(data["sentences"])} sentences · {len(data["verbs"])} verbs · {len(data["scenarios"])} scenarios')

if __name__ == '__main__':
    main()
