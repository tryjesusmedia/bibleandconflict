import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const art = require('../lib/readingBadges.js');
const rawPlan = JSON.parse(await readFile(new URL('../data/conflictPlan.json', import.meta.url)));
// Exercise the production completion/indexing helpers, including companion-only readings.
const source = await readFile(new URL('../data/conflictPlan.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require: path => { assert.equal(path, '@/data/conflictPlan.json'); return rawPlan; } });
const { conflictPlan, conflictReadingComplete } = exports;
assert.equal(art.catalog.length, 264);
assert.equal(new Set(art.catalog.map(b => b.label)).size, 264, 'Every reading has its own label');
assert.equal(new Set(art.catalog.map(b => [b.motif,b.palette,b.style,b.detail].join(':'))).size, 264, 'Each illustration has a distinct design, independent of its number');
const svgs = new Set();
for (const reading of conflictPlan.readings) {
  const badge = art.getBadge(reading.id);
  assert.equal(badge.day, reading.day);
  assert.equal(badge.book, reading.code);
  assert.ok(badge.title && badge.reference);
  const tasks = [...reading.bibleTasks, ...reading.commentaryTasks];
  assert.equal(conflictReadingComplete(reading, new Set()), false);
  assert.equal(conflictReadingComplete(reading, new Set(tasks.slice(0,-1).map(t => t.progressIndex))), false, 'Partial progress earns nothing');
  const saved = new Set(tasks.map(t => t.progressIndex));
  assert.equal(conflictReadingComplete(reading, saved), true, 'Existing synced completions earn their badge without another save');
  saved.delete(tasks[0].progressIndex);
  assert.equal(conflictReadingComplete(reading, saved), false, 'Unchecking an item removes the completed-reading badge');
  const svg = art.badgeSvg(badge);
  assert.match(svg, /viewBox="0 0 256 256"/);
  assert.doesNotMatch(svg, /<script|onload=|<image|<foreignObject|undefined|NaN/);
  assert.equal(decodeURIComponent(art.badgeDataUri(badge).split(',')[1]), svg);
  svgs.add(svg);
}
assert.equal(svgs.size, 264);
assert.equal(art.catalog[4].motif, 'ark');
assert.equal(art.catalog[55].motif, 'sling');
assert.equal(art.catalog[108].motif, 'lion');
if (process.env.TJM_SITE_ROOT) {
  const web = await readFile(`${process.env.TJM_SITE_ROOT}/bibleandconflictoftheages/reading-badges.js`);
  assert.deepEqual(await readFile(new URL('../lib/readingBadges.js', import.meta.url)), web, 'App and website must award the identical artwork and label');
}
console.log('All 264 unique badges, full/partial/revoked completion states, and shared artwork passed.');
