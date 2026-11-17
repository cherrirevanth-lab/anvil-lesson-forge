// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditLesson, forgeLesson, hashLesson, readLesson, writeLesson } from './index.mjs';

const spec = {
  slug: 'fizzbuzz',
  title: 'FizzBuzz',
  language: 'javascript',
  difficulty: 1,
  concept: 'Modulo arithmetic and ordered conditionals.',
  tests: "test('15', (m) => assert.equal(m.solve(15), 'FizzBuzz'));",
  hints: ['Check divisibility by 15 first.', 'Then by 3 and by 5.', 'Return the number as a string otherwise.'],
};

const forged = forgeLesson(spec);
const out = [];
out.push(`files: ${Object.keys(forged.files).sort().join(',')}`);
out.push(`hash: ${hashLesson(forged).slice(0, 16)}...`);
out.push(`deterministic: ${hashLesson(forgeLesson(spec)) === hashLesson(forged)}`);
out.push(`audit issues: ${auditLesson(forged.lesson).length}`);

const root = await mkdtemp(join(tmpdir(), 'lesson-forge-'));
const dir = join(root, 'fizzbuzz');
const written = await writeLesson(dir, forged);
out.push(`written: ${written.files.join(',')}`);
out.push(`read back: ${(await readLesson(dir)).slug}`);
await rm(root, { recursive: true, force: true });
out.push('FORGE ok=true');
process.stdout.write(out.join('\n') + '\n');

const pass =
  Object.keys(forged.files).length === 4 &&
  auditLesson(forged.lesson).length === 0 &&
  written.files.length === 4;
if (!pass) process.stderr.write('lesson-forge self-check failed\n');
process.exitCode = pass ? 0 : 1;
