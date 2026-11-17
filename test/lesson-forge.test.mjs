// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditLesson,
  forgeLesson,
  hashLesson,
  readLesson,
  writeLesson,
} from '../src/index.mjs';

const hints = ['One step at a time.', 'A loop is enough.', 'Accumulate into a variable.'];
const base = {
  slug: 'count-vowels',
  title: 'Count vowels',
  language: 'javascript',
  difficulty: 2,
  concept: 'Iterate a string and count characters in a set.',
  tests: "test('counts', (m) => assert.equal(m.solve('aei'), 3));",
  hints,
};

test('a valid lesson forges four files', () => {
  const forged = forgeLesson(base);
  assert.deepEqual(Object.keys(forged.files).sort(), ['README.md', 'lesson.json', 'starter.js', 'tests.mjs']);
  assert.equal(forged.lesson.slug, 'count-vowels');
});

test('an invalid slug is refused', () => {
  assert.throws(() => forgeLesson({ ...base, slug: 'Count Vowels!' }), (e) => e.code === 'INVALID_SLUG');
});

test('two hints are refused', () => {
  assert.throws(() => forgeLesson({ ...base, hints: hints.slice(0, 2) }), (e) => e.code === 'INVALID_HINTS');
});

test('an unknown language is refused', () => {
  assert.throws(() => forgeLesson({ ...base, language: 'ruby' }), (e) => e.code === 'INVALID_LANGUAGE');
});

test('difficulty outside 1..5 is refused at both ends', () => {
  assert.throws(() => forgeLesson({ ...base, difficulty: 0 }), (e) => e.code === 'INVALID_DIFFICULTY');
  assert.throws(() => forgeLesson({ ...base, difficulty: 6 }), (e) => e.code === 'INVALID_DIFFICULTY');
});

test('the starter is a TODO, never a solution', () => {
  const forged = forgeLesson(base);
  assert.match(forged.files['starter.js'], /TODO/);
  assert.equal(forged.files['starter.js'].includes('countVowels'), false);
});

test('audit names each structural problem', () => {
  const forged = forgeLesson(base);
  const codes = (lesson) => auditLesson(lesson).map((i) => i.code);
  assert.deepEqual(codes(forged.lesson), []);
  assert.ok(codes({ ...forged.lesson, hints: [] }).includes('MISSING_HINTS'));
  assert.ok(codes({ ...forged.lesson, hints: [hints[0], 'x'.repeat(300), hints[2]] }).includes('HINT_TOO_LONG'));
  assert.ok(codes({ ...forged.lesson, checks: [] }).includes('MISSING_TESTS'));
  assert.ok(codes({ ...forged.lesson, starter: 'return 42;' }).includes('STARTER_LOOKS_SOLVED'));
  assert.ok(codes({ ...forged.lesson, title: 'x'.repeat(90) }).includes('TITLE_TOO_LONG'));
  assert.ok(codes({ ...forged.lesson, language: 'ruby' }).includes('BAD_LANGUAGE'));
  assert.ok(codes({ ...forged.lesson, concept: '' }).includes('NO_CONCEPT'));
});

test('the same input always has the same hash', () => {
  assert.equal(hashLesson(forgeLesson(base)), hashLesson(forgeLesson({ ...base })));
});

test('a different lesson has a different hash', () => {
  assert.notEqual(hashLesson(forgeLesson(base)), hashLesson(forgeLesson({ ...base, title: 'Count vowels carefully' })));
});

test('write then read returns the lesson', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-lesson-'));
  const dir = join(root, 'lesson');
  const forged = forgeLesson(base);
  const result = await writeLesson(dir, forged);
  assert.equal(result.files.length, 4);
  assert.deepEqual(await readLesson(dir), forged.lesson);
  assert.match(await readFile(join(dir, 'tests.mjs'), 'utf8'), /counts/);
  await rm(root, { recursive: true, force: true });
});

test('writing over a non-empty lesson directory refuses without force', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-lesson-'));
  const dir = join(root, 'lesson');
  const forged = forgeLesson(base);
  await writeLesson(dir, forged);
  await assert.rejects(() => writeLesson(dir, forged), (e) => e.code === 'EXISTS');
  const forced = await writeLesson(dir, forgeLesson({ ...base, title: 'Count vowels twice' }), { force: true });
  assert.equal(forced.files.length, 4);
  assert.equal((await readLesson(dir)).title, 'Count vowels twice');
  await rm(root, { recursive: true, force: true });
});

test('python uses starter.py and keeps tests in tests.mjs', () => {
  const forged = forgeLesson({ ...base, language: 'python' });
  assert.ok(forged.files['starter.py']);
  assert.equal(forged.files['starter.js'], undefined);
  assert.match(forged.files['starter.py'], /pass/);
});
