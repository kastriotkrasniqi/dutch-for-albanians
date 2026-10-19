import sys, os, re, json, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *

def plain(t):
    return strip_md(t).strip()

# ------------------------------------------------------------ key parsing
def split_numbered(t):
    t = ' ' + t.replace(' ⏎ ', ' ') + ' '
    parts = re.split(r'(?<=\s)(\d{1,2})\.\s', t)
    res = {}
    for i in range(1, len(parts) - 1, 2):
        res[parts[i]] = parts[i + 1].strip()
    return res

def key_for(rows):
    k = {}
    for r in rows or []:
        letter = plain(r[0].split(' ⏎ ')[0])
        k[letter] = plain(r[1].replace(' ⏎ ', ' '))
    return k

# ------------------------------------------------------------ exercise rendering
class Ex:
    def __init__(self, uid, letter):
        self.uid = uid; self.letter = letter
        self.slots = []   # (slot_id, kind, ref)  kind: num|seq|pair
        self.texts = {}   # slot_id -> item text with ______ blanks
        self.seq = 0
    def sid(self):
        return f'{self.uid}-{self.letter}-{len(self.slots)}'

def blanks_to_inputs(text, ex, ref, kind):
    # text in md; replace ______ by inputs; returns html
    parts = re.split(r'_{3,}', text)
    if len(parts) == 1:
        return None
    sid = ex.sid()
    ex.slots.append((sid, kind, ref))
    ex.texts[sid] = text
    out = inline(parts[0])
    for k, p in enumerate(parts[1:]):
        out += f'<input class="bl" type="text" autocomplete="off" spellcheck="false" id="{sid}-{k}" data-slot="{sid}" aria-label="Përgjigjja {html.escape(str(ref))}">' + inline(p)
    return out

def render_ex_items(blocks, i, ex, out):
    b = blocks[i]
    k = b[0]
    if k == 'p':
        t = b[1]
        if ' ⇥ ' in t:
            rows = []
            while i < len(blocks) and blocks[i][0] == 'p' and ' ⇥ ' in blocks[i][1]:
                ps = blocks[i][1].split(' ⇥ ')
                rows.append((ps[0], ps[-1])); i += 1
            opts = [plain(r[1]) for r in rows]
            uniq = []
            for o in opts:
                if o not in uniq: uniq.append(o)
            out.append('<div class="match">')
            for left, _ in rows:
                sid = ex.sid(); ex.slots.append((sid, 'pair', plain(left)))
                sel = '<option value="">— zgjidh —</option>' + ''.join(f'<option>{html.escape(o)}</option>' for o in uniq)
                out.append(f'<label class="mrow"><span class="mleft">{inline(left)}</span><select id="{sid}-0" data-slot="{sid}">{sel}</select><span class="mark-i" aria-hidden="true"></span></label>')
            out.append('</div>')
            return i
        if re.match(r'^\d+\. ', t):
            items = []
            while i < len(blocks) and blocks[i][0] == 'p' and re.match(r'^\d+\. ', blocks[i][1]):
                for p in re.split(r'\s(?=\d+\. ______)', blocks[i][1]):
                    mm = re.match(r'^(\d+)\. (.*)', p)
                    items.append((mm.group(1), mm.group(2)))
                i += 1
            out.append('<ol class="items">')
            for n, tx in items:
                h = blanks_to_inputs(tx, ex, n, 'num')
                if h is None:
                    sid = ex.sid(); ex.slots.append((sid, 'num', n))
                    h = f'<span class="itext">{inline(tx)}</span><input class="full" type="text" autocomplete="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="Përgjigjja {n}">'
                    out.append(f'<li class="it wide"><span class="inum">{n}.</span><div class="ibody">{h}</div><span class="mark-i" aria-hidden="true"></span></li>')
                else:
                    out.append(f'<li class="it"><span class="inum">{n}.</span><div class="ibody">{h}</div><span class="mark-i" aria-hidden="true"></span></li>')
            out.append('</ol>')
            return i
        if t.startswith('• '):
            items = []
            while i < len(blocks) and blocks[i][0] == 'p' and blocks[i][1].startswith('• '):
                items.append(blocks[i][1][2:]); i += 1
            out.append('<ul class="bul">' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>')
            return i
        if ' · ' in t and len(t) < 90:
            out.append('<div class="bank">' + ''.join(f'<span class="chip">{inline(w)}</span>' for w in t.split(' · ')) + '</div>')
            return i + 1
        if '___' in t:
            # running text with several blanks: sequential slots
            parts = re.split(r'_{3,}', t)
            h = inline(parts[0])
            for p in parts[1:]:
                sid = ex.sid(); ex.slots.append((sid, 'seq', ex.seq)); ex.seq += 1
                h += f'<input class="bl" type="text" autocomplete="off" spellcheck="false" id="{sid}-0" data-slot="{sid}">' + inline(p)
            out.append(f'<p class="story">{h}</p>')
            return i + 1
        out.append(f'<p class="instr">{inline(t)}</p>')
        return i + 1
    if k == 'order':
        out.append('<ol class="items orders">')
        while i < len(blocks) and blocks[i][0] == 'order':
            parts = [p.strip() for p in blocks[i][1].split(' | ')]
            parts += [''] * (3 - len(parts))
            n, chips, sq = parts[0], parts[1].strip().rstrip('|').strip(), parts[2].rstrip('|').strip()
            cs = ''.join(f'<span class="chip">{inline(c.strip())}</span>' for c in chips.split(' / ') if c.strip())
            sid = ex.sid(); ex.slots.append((sid, 'num', n))
            out.append(f'<li class="it wide"><span class="inum">{n}.</span><div class="ibody"><div class="chips">{cs}</div>' + (f'<span class="osq">{inline(sq)}</span>' if sq else '') + f'<input class="full" type="text" autocomplete="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="Fjalia {n}"></div><span class="mark-i" aria-hidden="true"></span></li>')
            i += 1
        out.append('</ol>')
        return i
    if k == 'table':
        rows, opts = b[1], b[2]
        hdr = rows[0]
        o = ['<div class="tw"><table class="tbl"><thead><tr>' + ''.join(f'<th>{inline(h)}</th>' for h in hdr) + '</tr></thead><tbody>']
        for r in rows[1:]:
            r = r + [''] * (len(hdr) - len(r))
            cells = []
            for ci, c in enumerate(r):
                if not c.strip() and ci > 0:
                    label = plain(r[ci - 1])
                    sid = ex.sid(); ex.slots.append((sid, 'pair', label))
                    cells.append(f'<td><input class="bl sm" type="text" autocomplete="off" id="{sid}-0" data-slot="{sid}" aria-label="{html.escape(label)}"></td>')
                else:
                    cells.append(f'<td>{inline(c.replace(" ⏎ ", " "))}</td>')
            o.append('<tr>' + ''.join(cells) + '</tr>')
        o.append('</tbody></table></div>')
        out.append(''.join(o))
        return i + 1
    if k == 'box':
        out.append(render_box(b[1], b[2])); return i + 1
    if k == 'h3':
        out.append(f'<h4 class="ssh">{inline(b[1])}</h4>'); return i + 1
    return i + 1

def _nrm(t):
    t = plain(t).lower().replace('’', "'")
    t = re.sub(r'[«»"“”.,!?;:()…–—]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def blank_part(text, ans):
    """Keys often repeat the whole item ("de man" for "______ man"); keep only what goes in the blanks."""
    if not text:
        return ans
    item = re.sub(r'\([^)]*\)', ' ', text)          # drop hints like (drinken)
    segs = [_nrm(x) for x in re.split(r'_{3,}', item)]
    out = []
    for alt in ans.split(' / '):
        pat = r'\s*(.+?)\s*'.join(re.escape(x) for x in segs)
        m = re.fullmatch(pat, _nrm(alt))
        out.append(' '.join(m.groups()) if m and all(g.strip() for g in m.groups()) else alt)
    return ' / '.join(out)

def answers_for(ex, keytext):
    """Return dict slot_id -> list of acceptable answers (raw strings)."""
    res = {}
    if not keytext:
        return res
    num = split_numbered(keytext)
    pairs = {}
    for part in keytext.split(' • '):
        if ' – ' in part:
            a, b_ = part.split(' – ', 1)
            pairs[plain(a).lower()] = b_.strip()
    seq = [x.strip() for x in keytext.split(' • ')]
    for sid, kind, ref in ex.slots:
        if kind == 'num' and str(ref) in num:
            res[sid] = blank_part(ex.texts.get(sid), num[str(ref)])
        elif kind == 'pair' and ref.lower() in pairs:
            res[sid] = pairs[ref.lower()]
        elif kind == 'pair' and '___' in ref:
            pat = re.escape(ref).replace(re.escape('___'), '(.+?)')
            pat = re.sub(r'(\\_)+', '', pat)
            for segm in seq:
                mm = re.fullmatch(pat, plain(segm))
                if mm:
                    res[sid] = mm.group(1); break
        elif kind == 'seq' and ref < len(seq):
            res[sid] = seq[ref]
    return res

def render_practice(u, blocks, keyrows):
    keys = key_for(keyrows)
    out = []
    answers = {}
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b[0] == 'h2':
            m = re.match(r'([A-I])\. (.*)', b[1])
            if not m:
                out.append(f'<h4 class="ssh">{inline(b[1])}</h4>'); i += 1; continue
            letter = m.group(1)
            ex = Ex(f'u{u}', letter)
            body = []
            i += 1
            while i < len(blocks) and blocks[i][0] not in ('h2',):
                i = render_ex_items(blocks, i, ex, body)
            kt = keys.get(letter, '')
            ans = answers_for(ex, kt)
            answers.update(ans)
            checkable = len(ans) > 0
            out.append(f'''<section class="ex" id="u{u}-{letter}" data-ex="u{u}-{letter}">
<h3 class="exh"><span class="exl">{letter}</span><span>{inline(m.group(2))}</span></h3>
{''.join(body)}
<div class="exbar">{'<button class="btn primary" data-act="check">Kontrollo</button>' if checkable else ''}<button class="btn" data-act="show">Shfaq zgjidhjen</button><button class="btn ghost" data-act="clear">Pastro</button><span class="score" aria-live="polite"></span></div>
<div class="sol" hidden><b>Zgjidhja:</b> {inline(kt) if kt else '—'}</div>
</section>''')
            continue
        i = render_ex_items(blocks, i, Ex(f'u{u}', 'x'), out) if b[0] != 'practice' else i + 1
    return '\n'.join(out), answers

def render_unit_site(u):
    blocks = parse_unit(u)
    unum, utitle, usub = UNITS[u - 1]
    pnum, pname = part_of(u)
    lvl = part_level(u)
    lessons = []   # (n, title, html)
    cur = None
    lnum = LSTART[SRC_OF[u]]
    practice, keyrows, gloss = [], None, None
    mode = 'lesson'
    i = 0
    while i < len(blocks):
        b = blocks[i]; k = b[0]
        if k == 'lesson':
            cur = [lnum, b[1], []]; lessons.append(cur); lnum += 1; i += 1; continue
        if k == 'practice':
            mode = 'practice'; i += 1; continue
        if k == 'key':
            i += 1
            if i < len(blocks) and blocks[i][0] == 'table':
                keyrows = blocks[i][1][1:]; i += 1
            mode = 'done'; continue
        if k == 'glossary':
            i += 1
            if i < len(blocks) and blocks[i][0] == 'table':
                gloss = blocks[i][1][1:]; i += 1
            continue
        if mode == 'practice':
            practice.append(b); i += 1; continue
        if mode == 'lesson' and cur is not None:
            if k == 'h2':
                cur[2].append(f'<h3 class="sh">{inline(b[1])}</h3>'); i += 1; continue
            if k == 'h3':
                cur[2].append(f'<h4 class="ssh">{inline(b[1])}</h4>'); i += 1; continue
            if k == 'table':
                cur[2].append('<div class="tw">' + render_table(b[1], b[2]) + '</div>'); i += 1; continue
            i = render_generic(blocks, i, cur[2], False)
            continue
        i += 1
    prac_html, answers = render_practice(u, practice, keyrows)
    toc = ''.join(f'<a href="#u{u}-l{n}"><span>{n}</span>{inline(t)}</a>' for n, t, _ in lessons)
    o = [f'''<article class="unit" id="u{u}" data-unit="{u}" hidden>
<header class="uhead"><div class="ukick">Pjesa {pnum} · {esc(pname)} <span class="lvl">{lvl}</span></div>
<div class="utitle"><span class="unum">{u:02d}</span><h2>{inline(utitle)}</h2></div><p class="usub">{inline(usub)}</p>
<nav class="utoc" aria-label="Mësimet e njësisë">{toc}<a href="#u{u}-ex"><span>✎</span>Ushtrime</a><a href="#u{u}-gl"><span>Aa</span>Fjalorth</a></nav></header>''']
    for n, t, h in lessons:
        o.append(f'<section class="lesson" id="u{u}-l{n}"><div class="lk">Mësimi {n}</div><h2 class="lt">{inline(t)}</h2>{"".join(h)}</section>')
    o.append(f'<section class="practice" id="u{u}-ex"><div class="lk">Praktikë · Njësia {u}</div><h2 class="lt">Ushtrime</h2><p class="instr">Shkruani përgjigjet në fushat bosh, pastaj shtypni <b>Kontrollo</b>. Përgjigjet tuaja ruhen në këtë shfletues.</p>{prac_html}</section>')
    if gloss:
        items = ''.join(f'<div class="gi"><span class="gnl">{esc(a)}</span><span class="gsq">{esc(b_)}</span></div>' for a, b_ in gloss_pairs(gloss))
        o.append(f'<section class="gloss" id="u{u}-gl"><div class="lk">Njësia {u}</div><h2 class="lt">Fjalorth</h2><div class="glist">{items}</div></section>')
    prev_ = f'<a class="pn" href="#u{u-1}">← Njësia {u-1}</a>' if u > 1 else '<a class="pn" href="#hyrje">← Hyrje</a>'
    next_ = f'<a class="pn nx" href="#u{u+1}">Njësia {u+1} →</a>' if u < NU else '<a class="pn nx" href="#fjalori">Fjalori →</a>'
    o.append(f'<nav class="pnav">{prev_}{next_}</nav></article>')
    return '\n'.join(o), answers, len([s for s in answers])

def full_gloss():
    seen = {}
    for u in range(1, NU + 1):
        blocks = parse_unit(u)
        for j, b in enumerate(blocks):
            if b[0] == 'glossary' and j + 1 < len(blocks) and blocks[j + 1][0] == 'table':
                for a, b_ in gloss_pairs(blocks[j + 1][1][1:]):
                    k = a.lower()
                    if k not in seen: seen[k] = [a, b_, u]
                    else:
                        have = [x.strip() for x in re.split(r'[;,]', seen[k][1])]
                        for x in re.split(r'[;,]', b_):
                            if x.strip() and x.strip() not in have:
                                seen[k][1] += '; ' + x.strip(); have.append(x.strip())
    items = sorted(seen.values(), key=lambda x: (sort_key(x[0]), x[0].lower()))
    rows = ''.join(f'<div class="fgi" data-s="{html.escape((a + " " + b_).lower())}"><span class="gnl">{esc(a)}</span><span class="gsq">{esc(b_)}</span><a class="gu" href="#u{u}">Nj. {u}</a></div>' for a, b_, u in items)
    return f'''<article class="unit" id="fjalori" hidden><header class="uhead"><div class="ukick">Shtojcë</div><div class="utitle"><span class="unum">Aa</span><h2>Fjalori i plotë holandisht–shqip</h2></div>
<p class="usub">{len(items)} fjalë nga të gjitha njësitë. Kërkoni në holandisht ose në shqip.</p></header>
<label class="search"><span>Kërko</span><input id="gsearch" type="search" placeholder="p.sh. huis, shtëpia, lopen…" autocomplete="off"></label>
<div class="fg" id="fglist">{rows}</div></article>'''

def intro(stats):
    parts = []
    for pnum, pname, us, lvl in PARTS:
        cards = ''.join(f'<a class="ucard" href="#u{u}" data-u="{u}"><span class="cn">{u:02d}</span><span class="ct">{inline(UNITS[u-1][1])}</span><span class="cp" data-prog="{u}"></span></a>' for u in us)
        parts.append(f'<section class="ipart"><h3><span>Pjesa {pnum}</span>{esc(pname)} <span class="lvl">{lvl}</span></h3><div class="ugrid">{cards}</div></section>')
    return f'''<article class="unit" id="hyrje" hidden>
<header class="hero"><div class="ukick">Gramatika e holandishtes për shqipfolës · A1–A2</div>
<h1>Mësojmë holandisht</h1>
<p class="usub">{NU} njësi dhe {NL} mësime me shpjegime në shqip, krahasime me shqipen dhe ushtrime që i plotësoni dhe i kontrolloni këtu.</p>
<div class="hstats"><div><b>{len(PARTS)}</b><span>pjesë</span></div><div><b>{NU}</b><span>njësi</span></div><div><b>{NL}</b><span>mësime</span></div><div><b>{stats}</b><span>fusha ushtrimesh</span></div></div>
<div class="hcta"><a class="btn primary" href="#u1">Fillo nga Njësia 1</a><a class="btn" id="resume" href="#u1" hidden>Vazhdo</a></div></header>
<section class="how"><h3 class="sh">Si funksionon</h3>
<ol class="steps"><li><b>Lexoni mësimin.</b> Çdo njësi ka 2–4 mësime të shkurtra me tabela, shembuj dhe kuti me rregulla.</li>
<li><b>Plotësoni ushtrimet.</b> Shkruani në fushat bosh ose zgjidhni nga lista.</li>
<li><b>Kontrolloni.</b> «Kontrollo» shënon të saktat me jeshile dhe gabimet me të kuqe. «Shfaq zgjidhjen» tregon përgjigjet.</li></ol>
<p class="note">Përgjigjet ruhen vetëm në këtë shfletues dhe në këtë pajisje. Te përkthimet mund të ketë më shumë se një përgjigje të saktë: nëse sistemi e shënon gabim, krahasojeni me zgjidhjen.</p></section>
{''.join(parts)}
</article>'''
