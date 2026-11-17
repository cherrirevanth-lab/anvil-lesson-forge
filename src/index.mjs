// SPDX-License-Identifier: MIT
/**
 * lesson-forge - a lesson is a scaffold, not a blank page.
 *
 * The same input always produces the same bytes, so a lesson can be reviewed,
 * diffed and rebuilt. The starter is deliberately incomplete: a TODO, never
 * the answer.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const LANGUAGES = Object.freeze(['javascript', 'python']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class ForgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ForgeError';
    this.code = code;
  }
}

const STARTERS = {
  javascript: '// TODO: implement the function described above.\nexport function solve(input) {\n  // your code here\n}\n',
  python: '# TODO: implement the function described above.\ndef solve(input):\n    # your code here\n    pass\n',
};

export function forgeLesson({
  slug,
  title,
  language = 'javascript',
  difficulty = 2,
  concept,
  starter,
  tests,
  hints,
} = {}) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) throw new ForgeError('INVALID_SLUG', 'slug must be kebab-case');
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 80) {
    throw new ForgeError('INVALID_TITLE', 'title must be 3..80 characters');
  }
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw new ForgeError('INVALID_DIFFICULTY', 'difficulty must be an integer 1..5');
  }
  if (!LANGUAGES.includes(language)) throw new ForgeError('INVALID_LANGUAGE', `language must be one of ${LANGUAGES.join(', ')}`);
  if (typeof concept !== 'string' || concept.trim().length === 0) throw new ForgeError('INVALID_CONCEPT', 'concept is required');
  if (typeof tests !== 'string' || tests.trim().length === 0) throw new ForgeError('INVALID_TESTS', 'tests are required');
  if (!Array.isArray(hints) || hints.length !== 3 || hints.some((h) => typeof h !== 'string' || h.trim().length === 0)) {
    throw new ForgeError('INVALID_HINTS', 'exactly three non-empty hints are required');
  }

  const lesson = {
    slug,
    title,
    language,
    difficulty,
    concept,
    starter: starter ?? STARTERS[language],
    hints: [...hints],
    checks: ['reference-solution-passes', 'three-fallback-hints', 'deterministic-output'],
  };
  const starterFile = language === 'python' ? 'starter.py' : 'starter.js';
  const files = {
    'lesson.json': JSON.stringify(lesson, null, 2) + '\n',
    [starterFile]: lesson.starter,
    'tests.mjs': tests.endsWith('\n') ? tests : tests + '\n',
    'README.md': `# ${title}\n\n${concept}\n\nDifficulty: ${difficulty}/5. Language: ${language}.\n\n## Hints\n\n${hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`,
  };
  return { lesson, files };
}

export function hashLesson(forged) {
  const names = Object.keys(forged.files).sort();
  const hash = createHash('sha256');
  for (const name of names) {
    hash.update(name);
    hash.update('\u0000');
    hash.update(String(forged.files[name]));
    hash.update('\u0000');
  }
  return hash.digest('hex');
}

export function auditLesson(lesson) {
  const issues = [];
  if (!lesson || typeof lesson !== 'object') return [{ code: 'INVALID_LESSON' }];
  if (!Array.isArray(lesson.hints) || lesson.hints.length !== 3) issues.push({ code: 'MISSING_HINTS' });
  else if (lesson.hints.some((h) => typeof h !== 'string' || h.length > 280)) issues.push({ code: 'HINT_TOO_LONG' });
  if (!Array.isArray(lesson.checks) || !lesson.checks.includes('reference-solution-passes')) issues.push({ code: 'MISSING_TESTS' });
  if (typeof lesson.starter === 'string' && /return\s+[^\s]/.test(lesson.starter) && !/TODO/.test(lesson.starter)) {
    issues.push({ code: 'STARTER_LOOKS_SOLVED' });
  }
  if (typeof lesson.title !== 'string' || lesson.title.length > 80) issues.push({ code: 'TITLE_TOO_LONG' });
  if (!LANGUAGES.includes(lesson.language)) issues.push({ code: 'BAD_LANGUAGE' });
  if (typeof lesson.concept !== 'string' || lesson.concept.trim().length === 0) issues.push({ code: 'NO_CONCEPT' });
  return issues;
}

export async function writeLesson(dir, forged, { force = false } = {}) {
  if (!forged || !forged.files) throw new ForgeError('INVALID_FORGE', 'forged lesson is required');
  if (!force) {
    const existing = await readdir(dir).catch(() => []);
    if (existing.length > 0) throw new ForgeError('EXISTS', `directory already has files: ${dir}`);
  }
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(forged.files)) {
    await writeFile(join(dir, name), content, 'utf8');
  }
  return { dir, files: Object.keys(forged.files).sort() };
}

export async function readLesson(dir) {
  const json = JSON.parse(await readFile(join(dir, 'lesson.json'), 'utf8'));
  return json;
}
