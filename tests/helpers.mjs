import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let course = null;
// course.json is produced by tools/make_site.py (npm test runs the build first)
export function loadCourse() {
  if (!course) course = JSON.parse(readFileSync(join(ROOT, 'docs/assets/course.json'), 'utf8'));
  return course;
}
export function readDoc(rel) { return readFileSync(join(ROOT, rel), 'utf8'); }
