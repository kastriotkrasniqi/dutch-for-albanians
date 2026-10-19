// Calendar days in the learner's local time zone, as "YYYY-MM-DD" strings.
// Review intervals are counted in whole days, so a card due "tomorrow" becomes due at local midnight,
// independent of the hour it was reviewed and of daylight-saving changes.

const pad = n => String(n).padStart(2, '0');

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseDay(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

// Whole days from a to b (b - a).
export function daysBetween(a, b) {
  const da = parseDay(a), db = parseDay(b);
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
}
