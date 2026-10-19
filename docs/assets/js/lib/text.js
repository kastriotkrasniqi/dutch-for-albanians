// Text helpers shared by answer checking, search and the conversation simulator.
// Pure functions only: no DOM, no storage, so they run unchanged under `node --test`.

const PUNCT = /[«»"“”„.,!?¿¡;:()…–—]/g;

// Harmless differences never count: case, surrounding punctuation, curly apostrophes, spacing,
// leading zeros in times (09:00 = 9:00). Diacritics, hyphens and word breaks are kept so the
// checker can tell the learner about them instead of silently ignoring them.
export function norm(s) {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(PUNCT, ' ')
    .replace(/(^|\s)-+|-+(?=\s|$)/g, ' ')
    .replace(/\b0(\d)/g, '$1')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripMarks(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

// Looser key for search and for "only the accents differ" detection.
export function loose(s) {
  return stripMarks(norm(s)).replace(/-/g, '');
}

export function tokens(s) {
  const n = norm(s);
  return n ? n.split(' ') : [];
}

// Optimal string alignment distance (Levenshtein + adjacent transposition).
export function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

// Token-level alignment: returns the list of [inputToken|null, keyToken|null] pairs that differ.
export function tokenDiff(a, b) {
  const m = a.length, n = b.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0, delA = [], delB = [];
  const flush = () => {
    const k = Math.max(delA.length, delB.length);
    for (let t = 0; t < k; t++) out.push([delA[t] ?? null, delB[t] ?? null]);
    delA = []; delB = [];
  };
  while (i < m && j < n) {
    if (a[i] === b[j]) { flush(); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) delA.push(a[i++]);
    else delB.push(b[j++]);
  }
  while (i < m) delA.push(a[i++]);
  while (j < n) delB.push(b[j++]);
  flush();
  return out;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function shuffle(arr, rnd = Math.random) {
  const b = arr.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
