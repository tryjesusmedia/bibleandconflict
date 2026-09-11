import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const bytes = await readFile(new URL('../data/conflictPlan.json', import.meta.url));
const plan = JSON.parse(bytes);
const parity = JSON.parse(await readFile(new URL('../data/siteParity.json', import.meta.url), 'utf8'));

assert.equal(createHash('sha256').update(bytes).digest('hex'), parity.sha256, 'The bundled plan must remain byte-identical to the canonical website snapshot');
assert.equal(plan.planId, parity.planId);
assert.equal(plan.readings.length, parity.readingCount);
assert.equal(plan.reviewQueue.length, 0);
assert.equal(new Set(plan.readings.map((reading) => reading.id)).size, plan.readings.length);
assert.deepEqual(plan.readings.map((reading) => reading.day), Array.from({ length: 264 }, (_, index) => index + 1));
assert.deepEqual(plan.books.map((book) => book.code), ['PP', 'PK', 'DA', 'AA', 'GC']);
assert.equal(plan.books.reduce((total, book) => total + book.readingCount, 0), plan.readings.length);
for (const book of plan.books) {
  assert.equal(plan.readings.filter((reading) => reading.code === book.code).length, book.readingCount, `${book.code} reading count must match`);
}

const tasks = plan.readings.flatMap((reading) => [...reading.bibleTasks, ...reading.commentaryTasks]);
const scriptureTasks = plan.readings.flatMap((reading) => reading.bibleTasks);
const companionTasks = plan.readings.flatMap((reading) => reading.commentaryTasks);
assert.equal(scriptureTasks.length, parity.scriptureTaskCount);
assert.equal(companionTasks.length, parity.companionTaskCount);
assert.equal(tasks.length, parity.totalTaskCount);

const reserved = new Set(tasks.map((task) => task.legacyProgressIndex).filter((index) => Number.isInteger(index) && index >= 0));
assert.equal(reserved.size, tasks.filter((task) => Number.isInteger(task.legacyProgressIndex) && task.legacyProgressIndex >= 0).length, 'Legacy progress indexes must be unique');
let nextIndex = 0;
const assigned = tasks.map((task) => {
  if (Number.isInteger(task.legacyProgressIndex) && task.legacyProgressIndex >= 0) return task.legacyProgressIndex;
  while (reserved.has(nextIndex)) nextIndex += 1;
  return nextIndex++;
}).sort((left, right) => left - right);
assert.deepEqual(assigned, Array.from({ length: parity.totalTaskCount }, (_, index) => index), 'Prepared task indexes must cover every value from 0 through 1695 exactly once');

for (const task of scriptureTasks) {
  const parsed = new URL(task.url);
  assert.match(parsed.hostname, /(^|\.)biblegateway\.com$/u);
  assert.equal(parsed.searchParams.get('version'), 'KJV');
  assert.ok(task.reference && task.book && Number.isInteger(task.chapter));
}
for (const task of companionTasks) {
  const parsed = new URL(task.url);
  assert.match(parsed.hostname, /(^|\.)(egwwritings|whiteestate)\.org$/u);
  assert.ok(task.title && Number.isInteger(task.paragraphId));
}

console.log('Canonical 264-reading, 1,696-item Conflict plan and legacy progress indexing passed.');
