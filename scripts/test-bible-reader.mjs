import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  bibleVerseNumbers,
  canonicalBibleText,
  canonicalChapterLabel,
  contiguousVerseGroups,
  parseBibleReferenceParts,
} from '../data/bibleReferenceCore.ts';

const plan = JSON.parse(await readFile(new URL('../data/conflictPlan.json', import.meta.url), 'utf8'));
const kjv = JSON.parse(await readFile(new URL('../data/kjv.json', import.meta.url), 'utf8'));
const web = JSON.parse(await readFile(new URL('../data/web.json', import.meta.url), 'utf8'));
assert.equal(Object.keys(kjv).length, 1189);
assert.equal(Object.keys(web).length, 1189);
assert.equal(Object.values(kjv).reduce((total, verses) => total + verses.length, 0), 31102);
assert.equal(Object.values(web).reduce((total, verses) => total + verses.length, 0), 31103);
assert.equal(web['Genesis 1'][0].text, 'In the beginning, God created the heavens and the earth.');
assert.equal(canonicalChapterLabel('Psalm 23'), 'Psalms 23');
assert.deepEqual(parseBibleReferenceParts('Isaiah 52:13-53:12'), [
  { book: 'Isaiah', chapter: 52, verseSpec: '13-', displayReference: 'Isaiah 52:13-end' },
  { book: 'Isaiah', chapter: 53, verseSpec: '1-12', displayReference: 'Isaiah 53:1-12' },
]);
assert.deepEqual(contiguousVerseGroups([{ verse: 1 }, { verse: 3 }, { verse: 4 }]), [[{ verse: 1 }], [{ verse: 3 }, { verse: 4 }]]);
assert.deepEqual(bibleVerseNumbers('13-', 15), [13, 14, 15]);

for (const reading of plan.readings) {
  for (const task of reading.bibleTasks) {
    const parts = parseBibleReferenceParts(task.reference);
    assert.ok(parts.length, `${task.reference} must parse`);
    for (const part of parts) {
      const chapter = canonicalChapterLabel(`${part.book} ${part.chapter}`);
      for (const [translation, corpus] of [['KJV', kjv], ['WEB', web]]) {
        assert.ok(corpus[chapter]?.length, `${task.reference} must resolve in bundled ${translation}`);
        const requestedVerses = bibleVerseNumbers(part.verseSpec, corpus[chapter].at(-1).verse);
        const available = new Set(corpus[chapter].map((verse) => verse.verse));
        assert.ok(requestedVerses.every((verse) => available.has(verse)), `${task.reference} verses must exist in ${translation}`);
      }
    }
  }
}

for (const [translation, corpus] of [['KJV', kjv], ['WEB', web]]) {
  const text = canonicalBibleText(corpus['John 3']);
  assert.match(text, /For God so loved the world/u, `${translation} must include the fixture passage`);
  assert.ok(!text.startsWith('1 '), `${translation} offsets must exclude rendered verse numbers`);
}

const reader = await readFile(new URL('../app/bible-reader.tsx', import.meta.url), 'utf8');
const html = await readFile(new URL('../components/bibleReaderHtml.ts', import.meta.url), 'utf8');
assert.match(reader, /BIBLE_TRANSLATIONS\.map/u);
assert.match(reader, /javaScriptEnabled=\{false\}/u);
assert.match(reader, /textInteractionEnabled/u);
assert.doesNotMatch(`${reader}\n${html}`, /highlight|principle|note editor|postMessage|<mark/iu);
assert.match(html, /font-size:19px/u);
assert.match(html, /overflow-x:hidden/u);

console.log('Every Scripture task resolves in bundled KJV and WEB, and the read-only native reader passed.');
