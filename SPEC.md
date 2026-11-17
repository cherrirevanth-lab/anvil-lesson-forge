# SPEC — lesson-forge

## Purpose

Generate a complete, deterministic lesson scaffold from a small declarative input, and refuse inputs that would produce a dishonest starter.

## API

### `forgeLesson(input) → { lesson, files }`

Input fields and rules:

| Field | Default | Rule | Error code |
|---|---|---|---|
| `slug` | — | `/^[a-z0-9]+(-[a-z0-9]+)*$/` | `INVALID_SLUG` |
| `title` | — | trimmed length ≥ 3, length ≤ 80 | `INVALID_TITLE` |
| `language` | `javascript` | one of `LANGUAGES` | `INVALID_LANGUAGE` |
| `difficulty` | `2` | integer 1–5 | `INVALID_DIFFICULTY` |
| `concept` | — | non-empty string | `INVALID_CONCEPT` |
| `starter` | language default | optional override | — |
| `tests` | — | non-empty string | `INVALID_TESTS` |
| `hints` | — | exactly 3 non-empty strings | `INVALID_HINTS` |

`lesson` contains `{slug, title, language, difficulty, concept, starter, hints, checks}` where `checks` is fixed:

```
['reference-solution-passes', 'three-fallback-hints', 'deterministic-output']
```

`files` contains `lesson.json`, the starter file, `tests.mjs` and `README.md`.

Defaults:

```js
javascript: "// TODO: implement the function described above.\nexport function solve(input) {\n  // your code here\n}\n"
python:     "# TODO: implement the function described above.\ndef solve(input):\n    # your code here\n    pass\n"
```

### `hashLesson(forged) → hex string`

- Sort `Object.keys(forged.files)`.
- For each: `update(name)`, `update('\0')`, `update(String(content))`, `update('\0')`.
- Return `sha256` hex.

The hash is over the rendered files, not the input object, so it is a content address for exactly what ships.

### `auditLesson(lesson) → {code}[]`

| Code | Condition |
|---|---|
| `INVALID_LESSON` | not an object |
| `MISSING_HINTS` | hints not an array of length 3 |
| `HINT_TOO_LONG` | any hint not a string or longer than 280 |
| `MISSING_TESTS` | `checks` missing `reference-solution-passes` |
| `STARTER_LOOKS_SOLVED` | starter has a `return <value>` and no `TODO` |
| `TITLE_TOO_LONG` | title not a string or longer than 80 |
| `BAD_LANGUAGE` | language outside `LANGUAGES` |
| `NO_CONCEPT` | concept missing/empty |

All applicable codes are returned; the audit does not stop at the first.

### `writeLesson(dir, forged, { force = false }) → { dir, files }`

- Without `force`, a directory with any entry throws `EXISTS`.
- Missing parent directories are created.
- Writes all files with UTF-8.
- `files` is the sorted list of names.

### `readLesson(dir) → lesson`

Parses `lesson.json`. Any other file is ignored.

## Invariants

1. **Determinism:** the same input produces identical `files` and `hashLesson` output.
2. **Content addressing:** the hash changes if any file name or content changes.
3. **Starter honesty:** defaults always contain `TODO`; the audit flags a starter with a returned value and no TODO.
4. **No clobber:** `writeLesson` refuses a populated directory by default.
5. **Validation before write:** no partial output for invalid input.
6. **Complete skeletons:** every forged lesson has exactly four files.

## Known limits

- Hints longer than 280 are caught only by `auditLesson`.
- `tests` are not executed or parsed; syntax errors travel with the lesson.
- No schema version field inside `lesson.json` yet.
- Python is generated but not runnable by the JavaScript reference runner.

## Test map

`test/lesson-forge.test.mjs` — deterministic forge, hash stability and sensitivity, default starters per language, validation codes, audit findings, write/read round-trip, no-clobber, force overwrite, file set.
