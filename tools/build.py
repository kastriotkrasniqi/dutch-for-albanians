import re, html, json, sys, os

import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
ROOT = _os.path.dirname(HERE)
SRC = _os.path.join(ROOT, 'content')
SRCMETA = {
    1: ('Bazat: zijn, hebben, nyjat dhe koha e tashme', 'Foljet e para, fjalia e thjeshtë, de/het/een dhe zgjedhimi i rregullt'),
    2: ('Përshëndetjet: spreken dhe wonen', 'Si njihemi me dikë, çfarë gjuhësh flasim dhe ku banojmë'),
    3: ('Si bëjmë pyetje', 'Fjalët pyetëse, pyetjet me fjalë pyetëse dhe pyetjet po/jo'),
    25: ('Sa është ora?', 'Numrat, ora me gjysmë orën dhe ora zyrtare'),
    4: ('Foljet modale: moeten dhe leren', 'kunnen, willen, moeten, mogen – dhe folja leren'),
    5: ('Foljet e pozicionit: staan, liggen, zitten', 'Si themi ku ndodhet diçka – në këmbë, shtrirë apo ulur'),
    6: ('Staan dhe liggen me parafjalë', 'Parafjalët e vendit, rendi i fjalëve dhe pyetjet'),
    7: ('Përemrat pronorë', 'mijn, jouw, zijn, haar, ons/onze, jullie, hun'),
    15: ('Pronësia dhe përemrat dëftorë', 'het mijne, van mij, de vriend van de dokter – dhe dit, dat, deze, die'),
    8: ('Foljet lopen dhe zitten', 'Lëvizja dhe pozicioni, me përemrat pronorë'),
    9: ('Lopen dhe zitten me parafjalë', 'Parafjalët e lëvizjes, fjalia dhe pyetjet'),
    10: ('Drejtshkrimi: pesë rregulla të thjeshta', 'Rrokjet, zanoret e gjata e të shkurtra, f/s dhe v/z'),
    11: ('Nyjat dhe emrat', 'Gjinia, shumësi, zvogëluesit dhe emrat e formuar nga fjalë të tjera'),
    12: ('Rendi i fjalëve në fjali', 'Tri tipet: folja e dyta, e para dhe në fund'),
    23: ('Lidhëzat', 'en, maar, of, want – dhe lidhëzat që e çojnë foljen në fund'),
    13: ('Mohimi: niet dhe geen', 'Ku vendoset «niet» dhe kur përdoret «geen»'),
    14: ('Ndajfoljet', 'Krahasimi, «graag – liever – het liefst», ndajfoljet e kohës dhe rendi kohë–mënyrë–vend'),
    24: ('Parafjalët dhe er / daar / waar', 'Parafjalët më të shpeshta, lidhjet e ngurta dhe erop, daarvoor, waaraan'),
    16: ('Koha e tashme: përmbledhje, «po bëj» dhe urdhërorja', 'Forma me u, përjashtimet, zitten te lezen dhe urdhërorja e sjellshme'),
    17: ('Koha e shkuar', 'Foljet e dobëta (-te/-de), të forta dhe të parregullta'),
    18: ('Koha e kryer', 'Pjesorja, hebben apo zijn, rendi dhe përdorimi'),
    19: ('Më se e kryera, e ardhmja dhe kushtorja', 'ik had gewerkt · zullen dhe gaan · zou'),
    20: ('Forma pësore', 'worden + pjesore, men dhe er wordt…'),
    21: ('Foljet modale dhe laten: thellim', 'Modalet në të gjitha kohët, paskajorja e dyfishtë dhe laten'),
    22: ('Foljet me parashtesë, vetvetore dhe pavetore', 'opbellen, zich wassen, het regent'),
}
ORDER = [1, 2, 3, 25, 4, 5, 6, 7, 15, 8, 9, 10, 11, 12, 23, 13, 14, 24, 16, 17, 18, 19, 20, 21, 22]
SRC_OF = {i + 1: s_ for i, s_ in enumerate(ORDER)}
DISP_OF = {s_: i + 1 for i, s_ in enumerate(ORDER)}
UNITS = [(i + 1,) + SRCMETA[s_] for i, s_ in enumerate(ORDER)]
NU = len(UNITS)
# lesson numbering
LSTART = {}
_n = 1
for _s in ORDER:
    LSTART[_s] = _n
    _n += open(f'{SRC}/u{_s:02d}.txt').read().count('@lesson ')
NL = _n - 1
PARTS = [
    ('I', 'Hapat e parë', [1, 2, 3, 4, 5], 'A1'),
    ('II', 'Ku ndodhet? Pozicioni dhe lëvizja', [6, 7, 8, 9, 10, 11], 'A1'),
    ('III', 'Drejtshkrimi dhe emrat', [12, 13], 'A1'),
    ('IV', 'Ndërtimi i fjalisë', [14, 15, 16, 17, 18], 'A1–A2'),
    ('V', 'Sistemi i foljeve', [19, 20, 21, 22, 23, 24, 25], 'A2'),
]
def part_of(u):
    for num, name, us, lvl in PARTS:
        if u in us: return num, name

def part_level(u):
    for num, name, us, lvl in PARTS:
        if u in us: return lvl

def resolve_refs(t):
    t = re.sub(r'\{U:(\d+)\}', lambda m: str(DISP_OF[int(m.group(1))]), t)
    t = re.sub(r'\{L:(\d+)\.(\d+)\}', lambda m: str(LSTART[int(m.group(1))] + int(m.group(2)) - 1), t)
    return t

def esc(t):
    return html.escape(t, quote=False)

def inline(t):
    t = esc(t)
    t = re.sub(r'\*\*\*(.+?)\*\*\*', r'<b><i>\1</i></b>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    t = t.replace('*', '')
    t = re.sub(r'_{3,}', '<span class="blank"></span>', t)
    return t

def strip_md(t):
    return re.sub(r'\*', '', t)

# ---------------------------------------------------------------- parsing
def parse_unit(u):
    return parse_text(open(f'{SRC}/u{SRC_OF[u]:02d}.txt').read())

def parse_text(text):
    lines = resolve_refs(text).split('\n')
    blocks = []
    i = 0
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1; continue
        if l.startswith('@table'):
            opts = l[6:].strip()
            rows = []
            i += 1
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            if i < len(lines) and lines[i].startswith('@end'): i += 1
            blocks.append(('table', rows, opts))
            continue
        if l.startswith('@box'):
            fill = l[4:].strip()
            body = []
            i += 1
            while i < len(lines) and not lines[i].startswith('@end'):
                if lines[i].strip(): body.append(lines[i].strip())
                i += 1
            i += 1
            blocks.append(('box', fill, body))
            continue
        m = re.match(r'@(\w+) ?(.*)', l)
        if m:
            blocks.append((m.group(1), m.group(2)))
            i += 1; continue
        blocks.append(('p', l))
        i += 1
    return blocks

# ---------------------------------------------------------------- render helpers
def cell_join(rows):
    # decide line breaks in multi-line cells
    ncol = max(len(r) for r in rows)
    maxlen = [0] * ncol
    for r in rows:
        for ci, c in enumerate(r):
            for seg in c.split(' ⏎ '):
                maxlen[ci] = max(maxlen[ci], len(strip_md(seg)))
    out = []
    for r in rows:
        nr = []
        for ci, c in enumerate(r):
            segs = c.split(' ⏎ ')
            res = inline(segs[0])
            for prev, nxt in zip(segs, segs[1:]):
                fw = strip_md(nxt).split(' ')[0]
                if len(strip_md(prev)) + 1 + len(fw) <= maxlen[ci] - 1:
                    res += '<br>' + inline(nxt)
                else:
                    res += ' ' + inline(nxt)
            nr.append(res)
        out.append(nr)
    return out

def render_table(rows, opts='', context=''):
    hdr = rows[0]
    body = cell_join(rows[1:]) if len(rows) > 1 else []
    cls = 'tbl'
    h0 = strip_md(hdr[0])
    if h0 in ('Përemri', 'Veta'):
        cls += ' conj'
    if 'blank' in opts:
        cls += ' fillin'
    ncol = len(hdr)
    o = [f'<table class="{cls} c{ncol}"><thead><tr>' + ''.join(f'<th>{inline(h)}</th>' for h in hdr) + '</tr></thead><tbody>']
    for r in body:
        r = r + [''] * (ncol - len(r))
        o.append('<tr>' + ''.join(f'<td>{c}</td>' for c in r[:ncol]) + '</tr>')
    o.append('</tbody></table>')
    return '\n'.join(o)

def box_kind(fill, title):
    f = tuple(float(x) for x in re.findall(r'[\d.]+', fill))
    t = (title or '').lower()
    if 'dallim' in t or 'krahasim me shqipen' in t:
        return 'contrast'
    if len(f) == 3:
        r, g, b = f
        if r > 0.98 and g < 0.95 and b < 0.94: return 'caution'
        if g - r > 0.04 and g - b > 0.02: return 'rule'
        if r > 0.98 and b < 0.93: return 'tip'
    return 'note'

KIND_LABEL = {'contrast': 'Shqip ↔ Holandisht', 'caution': 'Kujdes', 'rule': 'Rregull', 'tip': 'Këshillë', 'note': 'Shënim'}

def render_box(fill, body):
    title = None
    paras = list(body)
    if paras and re.fullmatch(r'\*\*[^*]+\*\*', paras[0]):
        title = paras[0][2:-2]
        paras = paras[1:]
    kind = box_kind(fill, title or (strip_md(paras[0]).split(':')[0] if paras else ''))
    o = [f'<div class="box {kind}"><div class="kicker">{KIND_LABEL[kind]}</div>']
    if title:
        o.append(f'<div class="btitle">{inline(title)}</div>')
    for p in paras:
        if p.startswith('• '):
            o.append(f'<p class="bl">{inline(p[2:])}</p>')
        else:
            o.append(f'<p>{inline(p)}</p>')
    o.append('</div>')
    return '\n'.join(o)

def render_flow(spec, sub):
    parts = [p.strip() for p in spec.split('|')]
    subs = [p.strip() for p in sub.split('|')] if sub is not None else [''] * len(parts)
    subs += [''] * (len(parts) - len(subs))
    o = ['<div class="flow">']
    for k, (p, s) in enumerate(zip(parts, subs)):
        hl = p.startswith('!')
        p = p.lstrip('!')
        if k: o.append('<div class="arrow">→</div>')
        o.append(f'<div class="fnode{" hl" if hl else ""}"><div class="fl">{inline(p)}</div>' + (f'<div class="fs">{inline(s)}</div>' if s else '') + '</div>')
    o.append('</div>')
    return '\n'.join(o)

def render_match(rows):
    o = ['<div class="match">']
    for a, b in rows:
        o.append(f'<div class="mrow"><div class="mcell l">{inline(a)}<span class="dot"></span></div><div class="mgap"></div><div class="mcell r"><span class="dot"></span>{inline(b)}</div></div>')
    o.append('</div>')
    return '\n'.join(o)

def render_orders(items):
    o = ['<div class="orders">']
    for n, chips, sq in items:
        cs = ''.join(f'<span class="chip">{inline(c.strip())}</span>' for c in chips.strip().strip('|').strip().split(' / ') if c.strip())
        o.append(f'<div class="order"><div class="otop"><span class="onum">{n}.</span><span class="ochips">{cs}</span>' + (f'<span class="osq">{inline(sq)}</span>' if sq.strip() else '') + '</div><div class="wline"></div></div>')
    o.append('</div>')
    return '\n'.join(o)

def render_items(items, in_practice):
    # items: list of (num, text)
    short = all(len(strip_md(t)) < 34 and '___' in t for n, t in items)
    o = [f'<ol class="items{" grid" if short else ""}">']
    for n, t in items:
        needs_line = in_practice and '___' not in t
        line = ''
        if needs_line:
            if t.rstrip().endswith('→'):
                pass
            line = '<div class="wline"></div>'
        o.append(f'<li><span class="inum">{n}.</span><div class="itext">{inline(t)}{line}</div></li>')
    o.append('</ol>')
    return '\n'.join(o)

# ---------------------------------------------------------------- unit render
def render_unit(u, lesson_start, book=True):
    blocks = parse_unit(u)
    unum, utitle, usub = UNITS[u - 1]
    pnum, pname = part_of(u)
    lessons = [b[1] for b in blocks if b[0] == 'lesson']
    lnum = lesson_start
    body = []
    key_rows = None
    glossary = None
    mode = 'lesson'
    practice_started = False
    i = 0
    # opener
    lis = ''.join(f'<li><span class="ln">Mësimi {lesson_start + k}</span><span class="lt">{inline(t)}</span></li>' for k, t in enumerate(lessons))
    body.append(f'''<section class="opener" id="unit{u}">
<div class="mark">§U{u}§</div>
<div class="op-part">Pjesa {pnum} · {esc(pname)} <em class="lvl">{part_level(u)}</em></div>
<div class="op-num">{u:02d}</div>
<div class="op-label">Njësia {u}</div>
<h1 class="op-title">{inline(utitle)}</h1>
<p class="op-sub">{inline(usub)}</p>
<div class="op-list"><div class="op-h">Në këtë njësi</div><ol>{lis}
<li class="x"><span class="ln">Ushtrime</span><span class="lt">Praktikë për të gjitha mësimet e njësisë</span></li>
<li class="x"><span class="ln">Fjalorth</span><span class="lt">Fjalët kryesore të njësisë</span></li></ol></div>
</section>''')
    while i < len(blocks):
        b = blocks[i]
        k = b[0]
        if k == 'lesson':
            if body and body[-1] != '</section>' and not body[-1].startswith('<section class="opener"'):
                body.append('</section>')
            body.append(f'<section class="lesson" id="l{lnum}"><div class="mark">§L{lnum}§</div><header class="lh"><div class="lk">Njësia {u} · Mësimi {lnum}</div><h2>{inline(b[1])}</h2></header>')
            lnum += 1; i += 1; continue
        if k == 'practice':
            if not practice_started:
                body.append('</section>')
                body.append(f'<section class="practice" id="p{u}"><div class="mark">§P{u}§</div><header class="lh pr"><div class="lk">Njësia {u} · Praktikë</div><h2>Ushtrime</h2></header>')
                practice_started = True
                mode = 'practice'
            i += 1; continue
        if k == 'key':
            mode = 'key'
            i += 1
            if i < len(blocks) and blocks[i][0] == 'table':
                key_rows = blocks[i][1][1:]
                i += 1
            continue
        if k == 'glossary':
            i += 1
            if i < len(blocks) and blocks[i][0] == 'table':
                glossary = blocks[i][1][1:]
                i += 1
            continue
        if k == 'h2':
            t = b[1]
            m = re.match(r'([A-I])\. (.*)', t)
            if mode == 'practice' and m:
                body.append(f'<div class="ex"><h3 class="exh"><span class="exl">{m.group(1)}</span>{inline(m.group(2))}</h3>')
                # collect until next h2 / practice / key
                i += 1
                while i < len(blocks) and blocks[i][0] not in ('h2', 'practice', 'key', 'glossary'):
                    i = render_generic(blocks, i, body, True)
                body.append('</div>')
                continue
            body.append(f'<h3 class="sh">{inline(t)}</h3>')
            i += 1; continue
        if k == 'h3':
            body.append(f'<h4 class="ssh">{inline(b[1])}</h4>')
            i += 1; continue
        i = render_generic(blocks, i, body, mode == 'practice')
    body.append('</section>')
    # glossary at end of unit
    if glossary:
        body.append(render_glossary_section(u, glossary))
    return '\n'.join(body), lnum, key_rows, glossary, lessons

def gloss_pairs(rows):
    pairs = []
    for r in rows:
        r = [strip_md(c).replace(' ⏎ ', ' ') for c in r]
        for k in range(0, len(r) - 1, 2):
            if r[k].strip():
                pairs.append((r[k].strip(), r[k + 1].strip()))
    return pairs

def render_glossary_section(u, rows):
    pairs = gloss_pairs(rows)
    items = ''.join(f'<div class="gi"><span class="gnl">{esc(a)}</span><span class="gsq">{esc(b)}</span></div>' for a, b in pairs)
    return f'<section class="gloss" id="g{u}"><header class="lh gl"><div class="lk">Njësia {u}</div><h2>Fjalorth</h2></header><div class="glist">{items}</div></section>'

def render_generic(blocks, i, body, in_practice):
    b = blocks[i]
    k = b[0]
    if k == 'table':
        body.append(render_table(b[1], b[2]))
        return i + 1
    if k == 'box':
        body.append(render_box(b[1], b[2]))
        return i + 1
    if k == 'flow':
        sub = None
        if i + 1 < len(blocks) and blocks[i + 1][0] == 'flowsub':
            sub = blocks[i + 1][1]
            body.append(render_flow(b[1], sub))
            return i + 2
        body.append(render_flow(b[1], None))
        return i + 1
    if k == 'order':
        items = []
        while i < len(blocks) and blocks[i][0] == 'order':
            parts = [p.strip() for p in blocks[i][1].split(' | ')]
            parts += [''] * (3 - len(parts))
            items.append((parts[0], parts[1].strip().rstrip('|').strip(), parts[2].rstrip('|').strip()))
            i += 1
        body.append(render_orders(items))
        return i
    if k == 'p':
        t = b[1]
        if ' ⇥ ' in t:
            rows = []
            while i < len(blocks) and blocks[i][0] == 'p' and ' ⇥ ' in blocks[i][1]:
                ps = blocks[i][1].split(' ⇥ ')
                rows.append((ps[0], ps[-1]))
                i += 1
            body.append(render_match(rows))
            return i
        if re.match(r'^\d+\. ', t):
            items = []
            while i < len(blocks) and blocks[i][0] == 'p' and re.match(r'^\d+\. ', blocks[i][1]):
                tt = blocks[i][1]
                # split multiple numbered items on one line
                parts = re.split(r'\s(?=\d+\. ______)', tt)
                for p in parts:
                    mm = re.match(r'^(\d+)\. (.*)', p)
                    items.append((mm.group(1), mm.group(2)))
                i += 1
            body.append(render_items(items, in_practice))
            return i
        if t.startswith('• '):
            items = []
            while i < len(blocks) and blocks[i][0] == 'p' and blocks[i][1].startswith('• '):
                items.append(blocks[i][1][2:]); i += 1
            body.append('<ul class="bul">' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>')
            return i
        if in_practice and ' · ' in t and len(t) < 90:
            body.append('<div class="bank">' + ''.join(f'<span class="chip">{inline(w)}</span>' for w in t.split(' · ')) + '</div>')
            return i + 1
        cls = ''
        if in_practice and (t.startswith('Lidhni') or t.startswith('Mos harroni') or t.startswith('Shembull') or t.startswith('Kujdes') or t.startswith('Shkruani')):
            cls = ' class="instr"'
        if t.startswith('Shembull:') and not in_practice:
            cls = ' class="example"'
        body.append(f'<p{cls}>{inline(t)}</p>')
        return i + 1
    if k in ('h2',):
        body.append(f'<h3 class="sh">{inline(b[1])}</h3>')
        return i + 1
    if k == 'h3':
        body.append(f'<h4 class="ssh">{inline(b[1])}</h4>')
        return i + 1
    if k == 'flowsub':
        return i + 1
    body.append(f'<!-- unknown {k} -->')
    return i + 1

def render_key(u, rows):
    unum, utitle, _ = UNITS[u - 1]
    o = [f'<div class="keyu"><h3 class="keyh"><span>Njësia {u}</span>{inline(utitle)}</h3><dl>']
    for r in rows:
        letter = strip_md(r[0]).split(' ⏎ ')[0].strip()
        ans = ' '.join(r[1].split(' ⏎ '))
        ans = inline(ans)
        ans = re.sub(r'(?<=[\s>])(\d{1,2})\. ', r'<span class="an">\1.</span> ', ' ' + ans).strip()
        o.append(f'<dt>{esc(letter)}</dt><dd>{ans}</dd>')
    o.append('</dl></div>')
    return '\n'.join(o)

CSS = open(_os.path.join(HERE, 'style.css')).read()

def page(body, title, footer="Mësojmë holandisht · Gramatika A1–A2"):
    css = CSS.replace('var(--footer, "Mësojmë holandisht · Niveli A1")', '"' + footer.replace('"', '') + '"')
    return f'''<!doctype html><html lang="sq"><head><meta charset="utf-8"><title>{esc(title)}</title><style>{css}</style></head><body>{body}</body></html>'''

def sort_key(word):
    w = word.lower()
    w = re.sub(r'^(de|het|een)\s+', '', w)
    w = w.replace("'", '')
    return w

def build(toc_pages=None):
    lesson_no = 1
    units_html = {}
    keys = {}
    glosses = {}
    lesson_titles = {}
    for u in range(1, NU + 1):
        h, nxt, key_rows, gl, lessons = render_unit(u, lesson_no)
        units_html[u] = h
        keys[u] = key_rows
        glosses[u] = gl
        lesson_titles[u] = [(lesson_no + k, t) for k, t in enumerate(lessons)]
        lesson_no = nxt
    return units_html, keys, glosses, lesson_titles

def cover(sub_line, unit=None):
    if unit:
        unum, utitle, usub = UNITS[unit - 1]
        pnum, pname = part_of(unit)
        return f'''<section class="cover unitcover"><div class="cv-top"><div class="cv-brand">Mësojmë holandisht</div><div class="cv-lvl">Niveli {part_level(unit)}</div></div>
<div class="cv-mid"><div class="cv-kick">Pjesa {pnum} · {esc(pname)}</div><div class="cv-unum">Njësia {unit}</div><h1 class="cv-title">{inline(utitle)}</h1><p class="cv-sub">{inline(usub)}</p></div>
<div class="cv-bot">Material mësimor për nxënës shqipfolës</div><div class="tiles"></div></section>'''
    return f'''<section class="cover"><div class="cv-top"><div class="cv-brand">Kurs gramatike · Niveli A1–A2</div><div class="cv-lvl">Nederlands voor Albanezen</div></div>
<div class="cv-mid"><div class="cv-kick">Gramatika · Niveli A1–A2</div><h1 class="cv-title big">Mësojmë<br>holandisht</h1><p class="cv-sub">{sub_line}</p>
<div class="cv-stats"><div><b>{len(PARTS)}</b><span>pjesë</span></div><div><b>{NU}</b><span>njësi</span></div><div><b>{NL}</b><span>mësime</span></div></div></div>
<div class="cv-bot">Material mësimor për nxënës shqipfolës</div><div class="tiles"></div></section>'''

def toc_html(lesson_titles, pages):
    pg = lambda key: str(pages.get(key, '')) if pages else ''
    o = ['<section class="toc"><div class="mark">§TOC§</div><header class="lh"><div class="lk">Përmbajtja</div><h2>Përmbajtja</h2></header>']
    for pnum, pname, us, lvl in PARTS:
        o.append(f'<div class="tpart"><span>Pjesa {pnum}</span>{esc(pname)}<em class="lvl">{lvl}</em></div>')
        for u in us:
            o.append(f'<div class="tunit"><span class="tun">{u}</span><span class="tut">{inline(UNITS[u-1][1])}</span><span class="tpg">{pg("U%d" % u)}</span></div>')
            for n, t in lesson_titles[u]:
                o.append(f'<div class="tles"><span class="tln">{n}</span><span class="tlt">{inline(t)}</span><span class="tdots"></span><span class="tpg">{pg("L%d" % n)}</span></div>')
            o.append(f'<div class="tles x"><span class="tln"></span><span class="tlt">Ushtrime · Fjalorth</span><span class="tdots"></span><span class="tpg">{pg("P%d" % u)}</span></div>')
    o.append(f'<div class="tpart"><span>Shtojca</span>Për t’u kontrolluar</div>')
    o.append(f'<div class="tunit"><span class="tun">A</span><span class="tut">Zgjidhjet e ushtrimeve</span><span class="tpg">{pg("KEY")}</span></div>')
    o.append(f'<div class="tunit"><span class="tun">B</span><span class="tut">Fjalori i plotë holandisht–shqip</span><span class="tpg">{pg("GLO")}</span></div>')
    o.append('</section>')
    return '\n'.join(o)

def howto():
    demo = [('rule', 'Rregull', 'Rregulli gramatikor që duhet mbajtur mend.'),
            ('contrast', 'Shqip ↔ Holandisht', 'Ku holandishtja ndryshon nga shqipja – burimi i gabimeve më të shpeshta.'),
            ('tip', 'Këshillë', 'Ndihmë për kujtesën dhe shpjegime të shkurtra.'),
            ('note', 'Shënim', 'Hollësi, drejtshkrim dhe vërejtje të vogla.'),
            ('caution', 'Kujdes', 'Gabime të zakonshme që duhen shmangur.')]
    boxes = ''.join(f'<div class="box {k} mini"><div class="kicker">{l}</div><p>{d}</p></div>' for k, l, d in demo)
    return f'''<section class="howto"><header class="lh"><div class="lk">Para se të fillojmë</div><h2>Si ta përdorni këtë libër</h2></header>
<p>Libri ka <b>{NU} njësi</b> të ndara në <b>{len(PARTS)} pjesë</b>. Çdo njësi ka 2–4 mësime të shkurtra, pastaj <b>ushtrime</b> për të gjitha mësimet dhe një <b>fjalorth</b> me fjalët kryesore. Mësimet janë të numëruara me radhë nga 1 deri në {NL}, që t’i gjeni lehtë kur një mësim i mëvonshëm i referohet një të mëparshmi.</p>
<p>Pjesët I–III mbulojnë nivelin <b>A1</b>. Pjesa IV kalon nga A1 në <b>A2</b>, ndërsa Pjesa V (sistemi i foljeve: koha e shkuar, koha e kryer, e ardhmja, kushtorja dhe pësorja) është e nivelit <b>A2</b>. Niveli i secilës pjesë shënohet në përmbajtje dhe në faqen hyrëse të çdo njësie.</p>
<p>Punoni me radhë: çdo njësi mbështetet te njësitë para saj. Pas ushtrimeve, kontrolloni përgjigjet te <b>Zgjidhjet</b> në fund të librit. Fjalët e reja nga të gjitha njësitë i gjeni të renditura sipas alfabetit te <b>Fjalori i plotë</b>.</p>
<h3 class="sh">Kutitë në mësime</h3><div class="legend">{boxes}</div>
<h3 class="sh">Shenjat në tekst</h3>
<table class="tbl c2"><thead><tr><th>Shembull</th><th>Kuptimi</th></tr></thead><tbody>
<tr><td><b>Ik woon</b> in Prishtina.</td><td>Me të zezë: forma që po mësojmë</td></tr>
<tr><td><i>shtëpia</i></td><td>Me të pjerrët: fjalë shqipe ose shembull brenda tekstit</td></tr>
<tr><td>Ik ______ student.</td><td>Vend bosh për t’u plotësuar</td></tr>
<tr><td>de / het</td><td>Mësojeni çdo emër bashkë me nyjën e tij</td></tr></tbody></table>
</section>'''

def full_glossary(glosses):
    seen = {}
    for u in range(1, NU + 1):
        if not glosses[u]: continue
        for a, b in gloss_pairs(glosses[u]):
            k = a.lower()
            if k not in seen:
                seen[k] = [a, b, u]
            else:
                have = [x.strip() for x in re.split(r'[;,]', seen[k][1])]
                for x in re.split(r'[;,]', b):
                    if x.strip() and x.strip() not in have:
                        seen[k][1] += '; ' + x.strip(); have.append(x.strip())
    items = sorted(seen.values(), key=lambda x: (sort_key(x[0]), x[0].lower()))
    o = ['<section class="fullgloss"><div class="mark">§GLO§</div><header class="lh gl"><div class="lk">Shtojca B</div><h2>Fjalori i plotë holandisht–shqip</h2></header>',
         '<p class="instr">Fjalët janë renditur sipas emrit, pa nyjën. Numri tregon njësinë ku fjala shfaqet për herë të parë.</p><div class="fg">']
    cur = None
    for a, b, u in items:
        L = sort_key(a)[:1].upper()
        if L != cur:
            o.append(f'<div class="fgL">{esc(L)}</div>'); cur = L
        o.append(f'<div class="fgi"><span class="gnl">{esc(a)}</span><span class="gsq">{esc(b)}</span><span class="gu">{u}</span></div>')
    o.append('</div></section>')
    return '\n'.join(o)
