# Mësojmë holandisht · Gramatika A1–A2

Kurs i gramatikës holandeze për nxënës shqipfolës: **5 pjesë, 25 njësi, 72 mësime**, me shpjegime në shqip, krahasime me shqipen, ushtrime, zgjidhje dhe fjalor.

## Përmbajtja e repo-s

| Dosja | Çfarë ka |
|---|---|
| `docs/` | Faqja interaktive (`index.html`): mësimet, ushtrimet që plotësohen dhe kontrollohen, fjalori me kërkim. Gati për GitHub Pages. |
| `pdf/` | Libri i plotë (`00_…_libri_i_plote.pdf`) dhe 25 PDF-të e njësive veç e veç. |
| `content/` | Teksti burimor i çdo njësie (`uNN.txt`) dhe drafti i përmbajtjes së re (Njësitë 15–25). |
| `tools/` | Skriptet që ndërtojnë PDF-të dhe faqen nga `content/`. |

## Struktura e kursit

| Pjesa | Niveli | Njësitë |
|---|---|---|
| I Hapat e parë | A1 | 1 Bazat · 2 Përshëndetjet · 3 Pyetjet · 4 Ora · 5 Modalet |
| II Pozicioni dhe lëvizja | A1 | 6–11: staan/liggen/zitten, parafjalët, pronorët, dëftorët, lopen |
| III Drejtshkrimi dhe emrat | A1 | 12 Drejtshkrimi · 13 Nyjat dhe emrat |
| IV Ndërtimi i fjalisë | A1–A2 | 14 Rendi i fjalëve · 15 Lidhëzat · 16 Mohimi · 17 Ndajfoljet · 18 Parafjalët |
| V Sistemi i foljeve | A2 | 19–25: koha e tashme, e shkuara, e kryera, e ardhmja, kushtorja, pësorja, modalet, parashtesat |

## Faqja në internet (GitHub Pages)

Te **Settings → Pages**, zgjidhni *Deploy from a branch*, degën `main` dhe dosjen `/docs`. Faqja hapet te `https://<emri-juaj>.github.io/<repo>/`.

Përgjigjet e ushtrimeve ruhen vetëm në shfletuesin e secilit nxënës.

## Si të rindërtohen skedarët

Kërkesat: Python 3, `playwright` (me Chromium), `pdfplumber`, `pdftotext` (poppler) dhe shkronjat Inter e Lora.

```bash
python3 tools/make_site.py        # → docs/index.html
python3 tools/make.py book units  # → build/book.pdf dhe build/unitNN.pdf
```

Renditja e njësive dhe titujt janë te `tools/build.py` (`ORDER`, `SRCMETA`, `PARTS`). Referencat si `{U:7}` (njësia) dhe `{L:15.2}` (mësimi) në `content/` zëvendësohen automatikisht me numrat e duhur.
