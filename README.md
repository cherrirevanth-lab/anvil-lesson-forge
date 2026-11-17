# lesson-forge

A lesson is a scaffold, not a blank page. Same input, same bytes — reviewable, diffable, rebuildable.

## Why

Authoring a lesson usually means inventing four things at once: the brief, the starter file, the tests, and the hints. The starter is where honesty slips: it quietly contains the answer, or it is an empty file with no shape. The forge fixes the shape, refuses a solved starter, and hashes the output so a lesson can be verified after it travels.

## Quickstart

```sh
node --test test/        # 12 tests, no dependencies
node src/cli.mjs         # forges a lesson into a temp dir
node verify.mjs          # tests + CLI smoke, writes evidence.json
```

```js
import { forgeLesson, hashLesson, auditLesson, writeLesson } from './src/index.mjs';

const forged = forgeLesson({
  slug: 'sum-a-list',
  title: 'Sum a list',
  concept: 'Accumulate values into a single result.',
  tests: "test('sum', (m) => assert.equal(m.solve([1,2,3]), 6));",
  hints: ['Start at zero.', 'Visit every item.', 'Check the empty list.'],
});

auditLesson(forged.lesson);  // [] — no issues
hashLesson(forged);          // stable sha256 over file names + contents
await writeLesson('./out/sum-a-list', forged);
```

Final CLI line: `FORGE ok=true`.

## Output

| File | Content |
|---|---|
| `lesson.json` | Slug, title, language, difficulty, concept, starter, hints, checks |
| `starter.js` / `starter.py` | Language-specific skeleton with a `TODO`, never a solution |
| `tests.mjs` | The supplied tests, newline-terminated |
| `README.md` | Title, concept, difficulty, language, numbered hints |

`hashLesson` sorts file names, then feeds `name NUL content NUL` into SHA-256. Two forges of the same input produce the same hash on any machine.

## Validation

| Field | Rule |
|---|---|
| `slug` | kebab-case |
| `title` | 3–80 chars |
| `language` | `javascript` or `python` |
| `difficulty` | integer 1–5 |
| `concept` | non-empty |
| `tests` | non-empty |
| `hints` | exactly 3 non-empty strings |

All failures are `ForgeError` with a `.code` such as `INVALID_SLUG`, `INVALID_HINTS`.

`auditLesson` is the post-hoc check: three hints under 280 chars, the `reference-solution-passes` check present, a starter that does not look solved, title length, language, concept.

## Writing safely

`writeLesson(dir, forged, { force: false })`:

- refuses a non-empty directory unless `force: true` (`EXISTS`);
- creates parents recursively;
- writes every file as UTF-8;
- returns `{dir, files}` sorted.

`readLesson(dir)` parses `lesson.json` and nothing else.

## Invariants (tested)

1. Deterministic bytes: identical input ⇒ identical files and hash.
2. Hash covers file names as well as contents; renaming changes it.
3. The default starter always contains `TODO` and never a `return` value.
4. `writeLesson` never overwrites a populated directory by accident.
5. `auditLesson` reports every missing structural piece, not just the first.
6. Invalid slugs/titles/languages/difficulties/hints are refused before any write.
7. Python and JavaScript starters are distinct.

## Limits

- The forge shapes content; it does not prove the tests are good or the concept is correct.
- `tests.mjs` is emitted verbatim; it is not executed here (`09-content-gate` does that).
- Hints are capped at 280 characters by the audit, not at creation.
- No i18n, no media, no versioning of forged lessons.

## Permissions

Filesystem writes only to the caller-supplied directory. No network, no dependencies, no secrets. CI requests `contents: read`. See `permission-manifest.json`.

## License

MIT © 2026 Revan
