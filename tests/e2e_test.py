"""Browser tests (Playwright + Chromium, the same setup tools/make.py uses for the PDFs).

Serves the repository root on a free port and opens the site at /docs/, i.e. under a sub-path like
GitHub Pages does (https://<user>.github.io/<repo>/). Run: python3 tests/e2e_test.py
"""
import json, os, sys, threading, functools, http.server, socketserver, traceback
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSE = json.load(open(os.path.join(ROOT, 'docs/assets/course.json'), encoding='utf-8'))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    h = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.TCPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/docs/'

def first_alt(a):
    return a.split(' / ')[0].split(' (')[0].strip()

def fill_exercise(pg, exid, wrong_first=False):
    """Type the key into every input of an exercise (matching rows use their select)."""
    sids = [s for s, it in COURSE['items'].items() if it['ex'] == exid]
    for n, sid in enumerate(sids):
        it = COURSE['items'][sid]
        ans = first_alt(it['a'])
        inputs = pg.locator(f'[data-slot="{sid}"]')
        if it['t'] == 'choice':
            pg.evaluate("([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change', {bubbles: true})); }",
                        [f'{sid}-0', next(o for o in it['o'] if o == it['a'])])
            continue
        parts = [ans] if inputs.count() == 1 else ans.split(' ')
        if inputs.count() > 1 and len(parts) != inputs.count():
            parts = [ans] + [''] * (inputs.count() - 1)
        for k in range(inputs.count()):
            val = 'xxx' if (wrong_first and n == 0) else (parts[k] if k < len(parts) else '')
            inputs.nth(k).fill(val)

results = []
def case(name):
    def deco(fn):
        def run(*a):
            try:
                fn(*a); results.append((name, None)); print('ok  ', name)
            except Exception as e:
                results.append((name, e)); print('FAIL', name); traceback.print_exc()
        return run
    return deco

@case('dashboard loads under a sub-path with no console errors')
def t_dashboard(pg, base, errors):
    pg.goto(base)
    pg.wait_for_selector('#ballina:not([hidden]) .today')
    assert 'Hapi' in pg.inner_text('#ballina') or 'Shqiptimi' in pg.inner_text('#ballina')
    assert not errors, errors

@case('wrong answer gets a targeted explanation; the answer stays hidden until asked for')
def t_feedback(pg, base, errors):
    pg.goto(base + '#u1-B')
    pg.wait_for_selector('#u1:not([hidden])')
    pg.fill('#u1-B-0-0', 'het')            # ______ man → de
    pg.click('#u1-B [data-act="check"]')
    fb = pg.locator('#u1-B [data-item="u1-B-0"] .fb')
    assert 'Nyja' in fb.inner_text(), fb.inner_text()
    assert not fb.locator('.ans').is_visible()
    fb.locator('[data-act="reveal-item"]').click()
    assert 'de' in fb.locator('.ans').inner_text()
    st = pg.evaluate("JSON.parse(localStorage.getItem('mh2:state'))")
    assert st['items']['u1-B-0']['c'] == 'article'

@case('answers and results survive a reload')
def t_persist(pg, base, errors):
    pg.goto(base + '#u1-A')
    pg.fill('#u1-A-0-0', 'ben')
    pg.click('#u1-A [data-act="check"]')
    pg.wait_for_timeout(300)
    pg.reload()
    pg.wait_for_selector('#u1:not([hidden])')
    assert pg.input_value('#u1-A-0-0') == 'ben'
    assert pg.locator('#u1-A [data-item="u1-A-0"]').get_attribute('class').split().count('ok') == 1

@case('finishing a unit shows a summary and never moves on by itself')
def t_completion(pg, base, errors):
    unit = next(u for u in COURSE['units'] if u['id'] == 'u2')
    pg.goto(base + '#u2-ex')
    pg.wait_for_selector('#u2:not([hidden])')
    typed = next(e for e in unit['exercises'] if any(it['ex'] == e and it['t'] != 'choice' for it in COURSE['items'].values()))
    for ex in unit['exercises']:
        fill_exercise(pg, ex, wrong_first=(ex == typed))
        pg.click(f'#{ex} [data-act="check"]')
    done = pg.locator('[data-done="u2"]')
    done.wait_for(state='visible')
    text = done.inner_text()
    assert 'njësia u përfundua' in text.lower() and 'Përsërit gabimet' in text and 'Vazhdo' in text, text
    pg.wait_for_timeout(800)
    assert pg.evaluate('location.hash') == '#u2-ex'
    assert pg.locator('#u2').is_visible()

@case('practice session ends on a summary with choices')
def t_practice(pg, base, errors):
    pg.goto(base + '#praktike/gabimet')
    pg.wait_for_selector('#praktike .psession')
    for _ in range(25):
        if pg.locator('#praktike .done-card').count():
            break
        pg.locator('#praktike [data-qskip]').click()
        pg.locator('#praktike [data-qnext]').click()
    card = pg.locator('#praktike .done-card')
    assert card.is_visible()
    assert 'Seancë e re' in card.inner_text()
    assert pg.evaluate('location.hash') == '#praktike/gabimet'

@case('flashcards: grading schedules the card')
def t_cards(pg, base, errors):
    pg.goto(base + '#fjalori/kartela')
    pg.wait_for_selector('#fjalori .fc')
    pg.click('#fjalori [data-flip]')
    pg.click('#fjalori [data-g="good"]')
    pg.wait_for_timeout(300)
    st = pg.evaluate("JSON.parse(localStorage.getItem('mh2:state'))")
    cards = [c for k, c in st['cards'].items() if k.startswith('v:')]
    assert cards and cards[0]['ivl'] == 1 and cards[0]['due'], cards

@case('conversation: feedback after each turn, report at the end, no auto-advance')
def t_convo(pg, base, errors):
    sc = next(s for s in COURSE['scenarios'] if s['id'] == 'klas')
    pg.goto(base + '#biseda/klas')
    pg.click('#biseda [data-go]')
    for i, t in enumerate(sc['turns']):
        assert pg.locator('#biseda .cfb').inner_text().strip() == ''   # model answer not shown before trying
        pg.fill('#cin', t['models'][0])
        pg.click('#biseda [data-send]')
        assert 'Shkëlqyeshëm' in pg.inner_text('#biseda .cfb')
        pg.wait_for_timeout(200)
        if i < len(sc['turns']) - 1:
            pg.click('#biseda [data-next]')
    pg.wait_for_timeout(400)
    assert pg.locator('#biseda .done-card').count() == 0
    pg.click('#biseda [data-next]')
    assert 'raporti' in pg.inner_text('#biseda h2')

@case('deep link to a lesson works after refresh')
def t_deeplink(pg, base, errors):
    pg.goto(base + '#u7-l20')
    pg.wait_for_selector('#u7:not([hidden])')
    pg.reload()
    pg.wait_for_selector('#u7:not([hidden])')
    pg.wait_for_timeout(1200)   # smooth scrolling
    assert pg.evaluate("document.getElementById('u7-l20').getBoundingClientRect().top") < 400

@case('search finds Albanian words without diacritics')
def t_search(pg, base, errors):
    pg.goto(base + '#kerko/shtepi')
    pg.wait_for_selector('#qres li')
    assert 'huis' in pg.inner_text('#qres')

def mobile(b, base):
    pg = b.new_page(viewport={'width': 360, 'height': 740}, is_mobile=True, has_touch=True)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    @case('mobile (360 px): no horizontal scroll on main pages; tab bar and drawer work')
    def t_mobile(pg, base, errors):
        for h in ['#ballina', '#hyrje', '#u1', '#u13', '#u25', '#shqiptimi', '#belgjika', '#praktike', '#fjalori', '#biseda/koffie', '#degjo', '#foljet', '#progresi']:
            pg.goto(base + h)
            pg.wait_for_timeout(250)
            ov = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            assert ov <= 0, f'{h} overflows by {ov}px'
        assert pg.locator('.tabs').is_visible()
        pg.click('#menu')
        assert pg.locator('#rail').is_visible()
        pg.keyboard.press('Escape')
        assert not errors, errors
    t_mobile(pg, base, errors)

def main():
    srv, base = serve()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        for t in [t_dashboard, t_feedback, t_persist, t_completion, t_practice, t_cards, t_convo, t_deeplink, t_search]:
            t(pg, base, errors)
        mobile(b, base)
        b.close()
    srv.shutdown()
    failed = [n for n, e in results if e]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()
