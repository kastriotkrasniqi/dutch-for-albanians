import sys, re, os, pdfplumber
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *
from playwright.sync_api import sync_playwright
OUT = os.path.join(ROOT, 'build'); os.makedirs(OUT, exist_ok=True)

units_html, keys, glosses, lesson_titles = build()

def keys_section(us, label='Shtojca A', title='Zgjidhjet e ushtrimeve'):
    return f'<section class="keys"><div class="mark">§KEY§</div><header class="lh"><div class="lk">{label}</div><h2>{title}</h2></header>' + ''.join(render_key(u, keys[u]) for u in us if keys[u]) + '</section>'

def book_html(pages=None):
    parts = [cover('Gramatika bazë e holandishtes, e shpjeguar në shqip – me shembuj, krahasime me shqipen, ushtrime dhe zgjidhje.'), howto(), toc_html(lesson_titles, pages)]
    for u in range(1, NU + 1):
        parts.append(units_html[u])
    parts.append(keys_section(range(1, NU + 1)))
    parts.append(full_glossary(glosses))
    return page('\n'.join(parts), 'Mësojmë holandisht – Gramatika A1–A2')

def unit_html(u):
    t = UNITS[u-1][1]
    body = units_html[u] + keys_section([u], f'Njësia {u}', 'Zgjidhjet e ushtrimeve')
    return page(body, f'Mësojmë holandisht – Njësia {u}', f'Mësojmë holandisht · Njësia {u}: {strip_md(t)}')

def render(pw_page, htmlstr, path):
    tmp = path + '.html'
    open(tmp, 'w').write(htmlstr)
    pw_page.goto('file://' + tmp)
    pw_page.wait_for_timeout(200)
    pw_page.pdf(path=path, prefer_css_page_size=True, print_background=True)

def find_pages(path):
    pages = {}
    import subprocess
    txt = subprocess.run(['pdftotext', path, '-'], capture_output=True, text=True).stdout
    for n, pt in enumerate(txt.split('\f'), 1):
        for m in re.finditer(r'§([A-Z]+\d*)§', pt.replace(' ', '')):
            pages.setdefault(m.group(1), n)
    return pages

which = sys.argv[1:] or ['book', 'units']
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    if 'book' in which:
        bp = f'{OUT}/book.pdf'
        render(pg, book_html(), bp)
        pages = find_pages(bp)
        render(pg, book_html(pages), bp)
        print('book pages', pages)
    if 'units' in which:
        for u in range(1, NU + 1):
            render(pg, unit_html(u), f'{OUT}/unit{u:02d}.pdf')
        print('units done')
    b.close()
