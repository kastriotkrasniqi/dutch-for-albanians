// Structural checks on the generated site: links, routes, asset paths, data integrity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCourse, readDoc, ROOT } from './helpers.mjs';

const html = readDoc('docs/index.html');
const course = loadCourse();
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const APP_ROUTES = /^(ballina|hyrje|praktike|fjalori|biseda|degjo|foljet|progresi|kerko)(\/|$)/;

test('every internal link in the page points to an element or an app route', () => {
  const broken = [];
  for (const [, h] of html.matchAll(/href="#([^"]*)"/g)) {
    if (!h || ids.has(h) || APP_ROUTES.test(h)) continue;
    broken.push(h);
  }
  assert.deepEqual([...new Set(broken)], []);
});

test('lesson anchors and exercise ids in course.json exist in the page', () => {
  for (const u of [...course.units, ...course.modules]) {
    assert.ok(ids.has(u.id), u.id);
    for (const l of u.lessons) assert.ok(ids.has(l.at), l.at);
    for (const e of u.exercises) assert.ok(ids.has(e), e);
  }
  for (const s of course.search) assert.ok(ids.has(s.at) || APP_ROUTES.test(s.at), s.at);
  for (const s of course.sentences) assert.ok(ids.has(s.at), s.at);
});

test('no unresolved cross-references or leftover markup in the content', () => {
  assert.doesNotMatch(html, /\{[UL]:\d/);
  assert.doesNotMatch(html, /<!-- unknown/);
  assert.doesNotMatch(html, /\*\*/);
});

test('every input slot has an answer key and vice versa', () => {
  const slots = new Set([...html.matchAll(/data-slot="([^"]+)"/g)].map(m => m[1]));
  for (const s of slots) assert.ok(course.items[s], `no key for ${s}`);
  for (const s of Object.keys(course.items)) assert.ok(slots.has(s), `key without input ${s}`);
  assert.ok(Object.keys(course.items).length > 1100);
});

test('asset URLs are relative (GitHub Pages serves the site under /<repo>/)', () => {
  const urls = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !u.startsWith('https://'));
  assert.ok(urls.length > 0);
  for (const u of urls) {
    assert.ok(!u.startsWith('/'), `absolute path ${u}`);
    assert.ok(existsSync(join(ROOT, 'docs', u.split('?')[0])), `missing file ${u}`);
  }
  const map = JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports;
  for (const [k, v] of Object.entries(map)) {
    assert.ok(k.startsWith('./assets/js/') && v.startsWith(k + '?v='), k);
    assert.ok(existsSync(join(ROOT, 'docs', k)), k);
  }
  assert.ok(existsSync(join(ROOT, 'docs/.nojekyll')));
});

test('vocabulary data: plurals only on nouns, verbs complete', () => {
  for (const v of course.vocab) if (v.pl) assert.match(v.nl, /^(de|het) /, v.nl);
  for (const v of course.verbs) {
    for (const k of ['inf', 'sq', 'ps', 'pp', 'pc', 'aux']) assert.ok(v[k], `${v.inf} ${k}`);
  }
});
