# Mësojmë holandisht · A1–A2 · Vlaanderen

Kurs holandishteje për shqipfolës që jetojnë ose do të jetojnë në Belgjikë (Flandër): **25 njësi gramatike, 75 mësime**, plus tre module për fillimin dhe jetën e përditshme, me shpjegime në shqip, ushtrime që kontrollohen me shpjegim, fjalor me përsëritje me intervale, biseda të simuluara dhe dëgjim.

Faqja: <https://kastriotkrasniqi.github.io/dutch-for-albanians/>

## Çfarë ka faqja

| Seksioni | Çfarë bën |
|---|---|
| **Ballina** | çfarë të mësoni sot, qëllimi ditor, përsëritjet për sot, njësitë për t'u përsëritur, rruga A1 → A2 → B1 |
| **Kursi** | Hapi 0 (shqiptimi), 25 njësitë, *Holandishtja në Belgjikë*, *Situatat e përditshme* – me statusin e secilës |
| **Mësimet** | shpjegime, tabela, shembuj me zë; ushtrime me shpjegim për çdo gabim; përmbledhje në fund të njësisë |
| **Praktikë** | seanca ditore, gabimet e mia, kuiz sipas njësisë ose i përzier, sfidë 10 pyetjesh, *de apo het?*, test niveli |
| **Fjalori** | kërkim dhe filtra, kartela me përsëritje me intervale (Sërish / Vështirë / Mirë / Lehtë), të preferuarat |
| **Bisedat** | 11 situata nga Antwerpeni (kafeneja, mjeku, komuna, intervista…), një hap në një herë |
| **Dëgjo** | diktim, kuptim me dëgjim, incizim për krahasim (zë sintetik i shfletuesit) |
| **Foljet** | 69 folje të forta e të parregullta me ushtrim |
| **Progresi** | statistika, cilësime, kopje rezervë e progresit |

Progresi ruhet **vetëm në shfletuesin dhe pajisjen** ku mësoni (localStorage). Nuk ka llogari dhe nuk sinkronizohet; te *Progresi* mund ta shkarkoni dhe ta ngarkoni në një pajisje tjetër.

## Përmbajtja e repo-s

| Dosja | Çfarë ka |
|---|---|
| `content/` | **burimi i përmbajtjes**: njësitë `uNN.txt`, modulet `m_*.txt`, `scenarios.json` (bisedat), `verbs.tsv`, `vocab_extra.tsv` (shumësi, shënime) |
| `web/` | kodi i faqes: `css/app.css`, `js/app.js`, `js/lib/` (logjika pa DOM, e testuar), `js/ui/` (faqet) |
| `tools/` | gjeneratorët: `make_site.py` → `docs/`, `make.py` → PDF |
| `docs/` | faqja e gjeneruar (GitHub Pages). **Mos e ndryshoni me dorë.** |
| `tests/` | testet (Node për logjikën, Playwright për shfletuesin) |
| `planning/` | auditimi, matrica e kurrikulës, lista e progresit të projektit |
| `pdf/` | libri dhe PDF-të e njësive |

## Zhvillimi

Kërkesat: Python 3, Node ≥ 20 (vetëm për testet), Playwright për Python me Chromium (për testet e shfletuesit dhe PDF-të).

```bash
python3 tools/make_site.py            # ndërton docs/ (index.html, assets/, course.json)
python3 -m http.server 8000 -d docs   # hapni http://localhost:8000 (faqja nuk hapet si skedar file://)
npm test                              # ndërton dhe nis testet e logjikës
npm run test:e2e                      # testet në shfletues (nën-shteg /docs/ si në GitHub Pages)
python3 tools/make.py book units      # PDF-të (kërkon edhe pdfplumber dhe poppler)
```

### Si shkruhet përmbajtja

Njësitë dhe modulet përdorin të njëjtin format teksti: `@lesson`, `@h2`, `@table … @end`, `@box (r, g, b) … @end`, `@practice`, ushtrimet `@h2 A. …`, `@key` (zgjidhjet) dhe `@glossary`. Te zgjidhjet:

- `a / b` = disa përgjigje të sakta · `fjal(e)` = shkronjë fakultative · `rij (rijd)` = alternativë
- `honden (nuk dyfishohet …)` = shpjegim që i shfaqet nxënësit
- referencat `{U:7}` (njësia) dhe `{L:15.2}` (mësimi) zëvendësohen me numrat e duhur

Renditja e njësive është te `tools/build.py` (`ORDER`, `SRCMETA`, `PARTS`); modulet te `tools/sitegen.py` (`MODULES`).
**Kujdes:** identifikuesit e ushtrimeve (`u7-B-3`) ndërtohen nga numri i njësisë në faqe. Mos e ndryshoni renditjen e njësive ekzistuese dhe shtoni ushtrime të reja vetëm me shkronja të reja në fund të njësisë – përndryshe progresi i ruajtur i nxënësve nuk përputhet më.

### Arkitektura

- Faqe statike, pa server dhe pa varësi në kohën e ekzekutimit. Lidhjet janë me `#` (`#u7-l20`, `#praktike/ditore`), prandaj çdo lidhje dhe rifreskim punon në GitHub Pages.
- `course.json` mban të dhënat e strukturuara (pyetjet me zgjidhjet, fjalori, fjalitë shembull, foljet, bisedat, indeksi i kërkimit); `index.html` mban tekstin e mësimeve.
- Logjika e testuar është te `web/js/lib/`: `validate.js` (kontrolli i përgjigjeve), `srs.js` (SM-2 i thjeshtuar), `store.js` (progresi, me backend të ndërrueshëm për sinkronizim të ardhshëm), `progress.js`, `convo.js` (bisedat me rregulla), `search.js`.
- Bisedat kontrollohen me rregulla, jo me AI. `convo.js` ka një ndërfaqe `{ evaluate(turn, input) }`; një version me AI duhet të kalojë përmes një serveri që mban çelësin – asnjë çelës në faqe.

Detajet: `planning/AUDIT.md`, `planning/CURRICULUM.md`, `planning/PROGRESS.md`.

## GitHub Pages

Te **Settings → Pages**: *Deploy from a branch*, dega `main`, dosja `/docs`.
