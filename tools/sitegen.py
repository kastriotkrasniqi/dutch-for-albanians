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
        self.items = {}   # slot_id -> data for out-of-lesson practice (course.json)
        self.stories = [] # (first slot index, list of text parts) for running texts with blanks
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
    ex.items[sid] = {'t': 'blank', 'p': inline(text)}
    out = inline(parts[0])
    for k, p in enumerate(parts[1:]):
        out += f'<input class="bl" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" id="{sid}-{k}" data-slot="{sid}" aria-label="Përgjigjja {html.escape(str(ref))}">' + inline(p)
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
                ex.items[sid] = {'t': 'choice', 'p': inline(left), 'o': uniq}
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
                    ex.items[sid] = {'t': 'text', 'p': inline(tx)}
                    h = f'<span class="itext">{inline(tx)}</span><input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="Përgjigjja {n}">'
                    out.append(f'<li class="it wide" data-item="{sid}"><span class="inum">{n}.</span><div class="ibody">{h}</div><span class="mark-i" aria-hidden="true"></span></li>')
                else:
                    out.append(f'<li class="it" data-item="{ex.slots[-1][0]}"><span class="inum">{n}.</span><div class="ibody">{h}</div><span class="mark-i" aria-hidden="true"></span></li>')
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
            ex.stories.append((len(ex.slots), parts))
            h = inline(parts[0])
            for p in parts[1:]:
                sid = ex.sid(); ex.slots.append((sid, 'seq', ex.seq)); ex.seq += 1
                ex.items[sid] = {'t': 'story'}
                h += f'<input class="bl" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="Boshllëku {ex.seq}">' + inline(p)
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
            words = [c.strip() for c in chips.split(' / ') if c.strip()]
            cs = ''.join(f'<button type="button" class="chip" data-chip>{inline(c)}</button>' for c in words)
            sid = ex.sid(); ex.slots.append((sid, 'num', n))
            ex.items[sid] = {'t': 'order', 'c': [plain(c) for c in words], 'p': inline(sq) if sq else ''}
            out.append(f'<li class="it wide" data-item="{sid}"><span class="inum">{n}.</span><div class="ibody"><div class="chips">{cs}</div>' + (f'<span class="osq">{inline(sq)}</span>' if sq else '') + f'<input class="full" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="Fjalia {n}"></div><span class="mark-i" aria-hidden="true"></span></li>')
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
                    ex.items[sid] = {'t': 'table', 'p': inline(r[ci - 1].replace(' ⏎ ', ' ')), 'h': plain(hdr[ci])}
                    cells.append(f'<td><input class="bl sm" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" id="{sid}-0" data-slot="{sid}" aria-label="{html.escape(label)}"></td>')
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
    """Return dict slot_id -> acceptable answers (raw string, alternatives separated by ' / ')."""
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
    # a blank inside a running text is practised with its own sentence; the other blanks are filled in
    for first, parts in ex.stories:
        sids = [ex.slots[first + j][0] for j in range(len(parts) - 1)]
        fills = [re.split(r'\s*/\s*', res.get(s, '…'))[0] for s in sids]
        for j, s in enumerate(sids):
            txt = parts[0]
            for k2, p in enumerate(parts[1:]):
                txt += ('______' if k2 == j else f'**{fills[k2]}**') + p
            sents = re.split(r'(?<=[.!?])\s+', txt)
            mine = next((x for x in sents if '______' in x), txt)
            ex.items[s]['p'] = inline(mine)
    return res

def exercise_prefix(code):
    return code if not code.isdigit() else f'u{code}'

def render_practice(code, blocks, keyrows, data):
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
            ex = Ex(code, letter)
            body = []
            i += 1
            while i < len(blocks) and blocks[i][0] not in ('h2',):
                i = render_ex_items(blocks, i, ex, body)
            kt = keys.get(letter, '')
            ans = answers_for(ex, kt)
            answers.update(ans)
            checkable = len(ans) > 0
            exid = f'{code}-{letter}'
            instr = next((re.sub(r'<[^>]+>', '', x) for x in body if x.startswith('<p class="instr">')), '')
            data['exercises'][exid] = {'unit': code, 'letter': letter, 'title': plain(m.group(2)), 'instr': html.unescape(instr)}
            for sid, _, _ in ex.slots:
                if sid in ans:
                    it = dict(ex.items.get(sid, {'t': 'text', 'p': ''}))
                    it['a'] = ans[sid]; it['ex'] = exid
                    data['items'][sid] = it
            out.append(f'''<section class="ex" id="{exid}" data-ex="{exid}">
<h3 class="exh"><span class="exl">{letter}</span><span>{inline(m.group(2))}</span></h3>
{''.join(body)}
<div class="exbar">{'<button type="button" class="btn primary" data-act="check">Kontrollo</button>' if checkable else ''}<button type="button" class="btn" data-act="show">Shfaq zgjidhjen</button><button type="button" class="btn ghost" data-act="clear">Pastro</button><span class="score" aria-live="polite"></span></div>
<div class="sol" hidden><b>Zgjidhja:</b> {inline(kt) if kt else '—'}</div>
</section>''')
            continue
        i = render_ex_items(blocks, i, Ex(code, 'x'), out) if b[0] != 'practice' else i + 1
    return '\n'.join(out), answers

SENT_END = re.compile(r'[.?!…]\s*$')

def collect_sentences(rows, anchor, data):
    """Example tables whose last column is the Albanian translation feed dictation, listening and search."""
    hdr = [plain(h) for h in rows[0]]
    if len(hdr) < 2 or hdr[-1] != 'Shqip':
        return
    for r in rows[1:]:
        if len(r) < 2:
            continue
        nl = plain(r[-2].replace(' ⏎ ', ' ')); sq = plain(r[-1].replace(' ⏎ ', ' '))
        if len(nl.split()) >= 2 and SENT_END.search(nl) and sq and '…' not in nl and '___' not in nl:
            data['sentences'].append({'nl': nl, 'sq': sq, 'at': anchor})

def render_course_text(code, blocks, lnum_start, data, unit_label, lesson_label):
    """Shared by numbered units and the extra modules. Returns (lessons, practice_html, answers, glossary)."""
    lessons = []   # (n, title, html, anchor)
    cur = None
    lnum = lnum_start
    practice, keyrows, gloss = [], None, None
    mode = 'lesson'
    i = 0
    while i < len(blocks):
        b = blocks[i]; k = b[0]
        if k == 'lesson':
            anchor = f'{code}-l{lnum}'
            cur = [lnum, b[1], [], anchor]; lessons.append(cur); lnum += 1; i += 1
            data['search'].append({'k': 'lesson', 't': f'{lesson_label(cur[0])}: {plain(b[1])}', 's': unit_label, 'at': anchor})
            continue
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
                hid = f'{cur[3]}-{len(cur[2])}'
                cur[2].append(f'<h3 class="sh" id="{hid}">{inline(b[1])}</h3>')
                data['search'].append({'k': 'rule', 't': plain(b[1]), 's': f'{unit_label} · {plain(cur[1])}', 'at': hid}); i += 1; continue
            if k == 'h3':
                cur[2].append(f'<h4 class="ssh">{inline(b[1])}</h4>'); i += 1; continue
            if k == 'table':
                collect_sentences(b[1], cur[3], data)
                cur[2].append('<div class="tw">' + render_table(b[1], b[2]) + '</div>'); i += 1; continue
            if k == 'box':
                body = b[2]
                if body and re.fullmatch(r'\*\*[^*]+\*\*', body[0]):
                    data['search'].append({'k': 'rule', 't': plain(body[0]), 's': f'{unit_label} · {plain(cur[1])}', 'at': cur[3]})
            i = render_generic(blocks, i, cur[2], False)
            continue
        i += 1
    prac_html, answers = render_practice(code, practice, keyrows, data)
    return lessons, prac_html, answers, gloss

def gloss_html(code, label, gloss, data, unit_index):
    items = ''.join(f'<div class="gi"><span class="gnl">{esc(a)}</span><span class="gsq">{esc(b_)}</span></div>' for a, b_ in gloss_pairs(gloss))
    for a, b_ in gloss_pairs(gloss):
        data['vocab'].append({'nl': a, 'sq': b_, 'u': code, 'ui': unit_index})
    return f'<section class="gloss" id="{code}-gl"><div class="lk">{label}</div><h2 class="lt">Fjalorth</h2><div class="glist">{items}</div></section>'

def render_unit_site(u, data):
    blocks = parse_unit(u)
    unum, utitle, usub = UNITS[u - 1]
    pnum, pname = part_of(u)
    lvl = part_level(u)
    code = f'u{u}'
    lessons, prac_html, answers, gloss = render_course_text(code, blocks, LSTART[SRC_OF[u]], data, f'Njësia {u}', lambda n: f'Mësimi {n}')
    data['units'].append({'id': code, 'n': u, 'title': plain(utitle), 'sub': plain(usub), 'part': pnum, 'partName': pname, 'level': lvl,
                          'lessons': [{'n': n, 'title': plain(t), 'at': a} for n, t, _, a in lessons],
                          'exercises': [e for e in data['exercises'] if data['exercises'][e]['unit'] == code]})
    data['search'].append({'k': 'unit', 't': f'Njësia {u}: {plain(utitle)}', 's': plain(usub), 'at': code})
    toc = ''.join(f'<a href="#{a}"><span>{n}</span>{inline(t)}</a>' for n, t, _, a in lessons)
    o = [f'''<article class="unit" id="{code}" data-unit="{code}" hidden>
<header class="uhead"><div class="ukick">Pjesa {pnum} · {esc(pname)} <span class="lvl">{lvl}</span></div>
<div class="utitle"><span class="unum">{u:02d}</span><h2>{inline(utitle)}</h2></div><p class="usub">{inline(usub)}</p>
<div class="ustatus" data-status="{code}"></div>
<nav class="utoc" aria-label="Mësimet e njësisë">{toc}<a href="#{code}-ex"><span>✎</span>Ushtrime</a><a href="#{code}-gl"><span>Aa</span>Fjalorth</a></nav></header>''']
    for n, t, h, a in lessons:
        o.append(f'<section class="lesson" id="{a}"><div class="lk">Mësimi {n}</div><h2 class="lt">{inline(t)}</h2>{"".join(h)}</section>')
    o.append(f'<section class="practice" id="{code}-ex"><div class="lk">Praktikë · Njësia {u}</div><h2 class="lt">Ushtrime</h2><p class="instr">Shkruani përgjigjet, pastaj shtypni <b>Kontrollo</b>. Për çdo gabim shihni një shpjegim të shkurtër; zgjidhjen e hapni vetë kur të doni. Përgjigjet ruhen në këtë shfletues.</p>{prac_html}<div class="done" data-done="{code}" hidden></div></section>')
    if gloss:
        o.append(gloss_html(code, f'Njësia {u}', gloss, data, u))
    prev_ = f'<a class="pn" href="#u{u-1}">← Njësia {u-1}</a>' if u > 1 else '<a class="pn" href="#shqiptimi">← Shqiptimi</a>'
    next_ = f'<a class="pn nx" href="#u{u+1}">Njësia {u+1} →</a>' if u < NU else '<a class="pn nx" href="#belgjika">Holandishtja në Belgjikë →</a>'
    o.append(f'<nav class="pnav">{prev_}{next_}</nav></article>')
    return '\n'.join(o), answers

# Extra modules: same markup as the units, outside the numbered grammar course (no renumbering of units,
# so stored progress keeps working). code → (file, kicker, title, subtitle, level, prev, next)
MODULES = [
    ('shqiptimi', 'm_shqiptimi.txt', 'Hapi 0 · Para Njësisë 1', 'Shqiptimi, alfabeti dhe fjalët e para', 'Tingujt e vështirë për shqipfolësit, theksi, numrat, ditët, muajt dhe fjalitë për klasën', 'A1', ('#ballina', 'Ballina'), ('#u1', 'Njësia 1')),
    ('belgjika', 'm_belgjika.txt', 'Moduli · Flandra', 'Holandishtja në Belgjikë', 'Si flitet në Antwerpen dhe në Flandër: shprehje, dallime me Holandën, mirësjellja dhe zyrat', 'A1–A2', ('#u25', 'Njësia 25'), ('#situatat', 'Situatat')),
    ('situatat', 'm_situatat.txt', 'Moduli · Jeta e përditshme', 'Situatat e përditshme', 'Dyqani, kafeneja, mjeku, banesa, komuna dhe puna – fjalitë që ju duhen menjëherë', 'A1–A2', ('#belgjika', 'Holandishtja në Belgjikë'), ('#biseda', 'Bisedat')),
]

def render_module(spec, data):
    code, fname, kicker, title, sub, lvl, prev_, next_ = spec
    path = os.path.join(SRC, fname)
    if not os.path.exists(path):
        return ''
    blocks = parse_text(open(path).read())
    lessons, prac_html, answers, gloss = render_course_text(code, blocks, 1, data, title, lambda n: f'Mësimi {n}')
    data['modules'].append({'id': code, 'title': title, 'sub': sub, 'level': lvl,
                            'lessons': [{'n': n, 'title': plain(t), 'at': a} for n, t, _, a in lessons],
                            'exercises': [e for e in data['exercises'] if data['exercises'][e]['unit'] == code]})
    data['search'].append({'k': 'unit', 't': title, 's': sub, 'at': code})
    toc = ''.join(f'<a href="#{a}"><span>{n}</span>{inline(t)}</a>' for n, t, _, a in lessons)
    has_ex = bool(answers)
    o = [f'''<article class="unit" id="{code}" data-unit="{code}" hidden>
<header class="uhead"><div class="ukick">{esc(kicker)} <span class="lvl">{lvl}</span></div>
<div class="utitle"><h2>{esc(title)}</h2></div><p class="usub">{esc(sub)}</p>
<div class="ustatus" data-status="{code}"></div>
<nav class="utoc" aria-label="Mësimet e modulit">{toc}{f'<a href="#{code}-ex"><span>✎</span>Ushtrime</a>' if has_ex else ''}{f'<a href="#{code}-gl"><span>Aa</span>Fjalorth</a>' if gloss else ''}</nav></header>''']
    for n, t, h, a in lessons:
        o.append(f'<section class="lesson" id="{a}"><div class="lk">Mësimi {n}</div><h2 class="lt">{inline(t)}</h2>{"".join(h)}</section>')
    if has_ex:
        o.append(f'<section class="practice" id="{code}-ex"><div class="lk">Praktikë · {esc(title)}</div><h2 class="lt">Ushtrime</h2><p class="instr">Shkruani përgjigjet, pastaj shtypni <b>Kontrollo</b>.</p>{prac_html}<div class="done" data-done="{code}" hidden></div></section>')
    if gloss:
        o.append(gloss_html(code, title, gloss, data, 0 if code == 'shqiptimi' else 99))
    o.append(f'<nav class="pnav"><a class="pn" href="{prev_[0]}">← {esc(prev_[1])}</a><a class="pn nx" href="{next_[0]}">{esc(next_[1])} →</a></nav></article>')
    return '\n'.join(o)

def empty_data():
    return {'units': [], 'modules': [], 'exercises': {}, 'items': {}, 'vocab': [], 'sentences': [], 'search': []}
