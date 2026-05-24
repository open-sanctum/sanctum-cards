# sanctum-cards Data Pipeline (M0–M4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the repo, build a TypeScript extractor that turns `inputs/Sanctum18-04.zip` into a structured, validated card database (`data/`) and a normalized asset library (`assets/`), so that a downstream static site (M5+) or any external consumer can read clean JSON without touching the original game archive.

**Architecture:** Pure-function parsers in `tools/extract/src/input/*` consume zip entries and emit typed in-memory records. `enrich/*` modules add derived fields (cost breakdown, target, combat stats, keywords) from regex-mined rules text. A single `build.ts` orchestrator runs everything and the `output/*` modules write `data/` and `assets/` deterministically. Outputs are committed; CI verifies the extractor still reproduces them byte-for-byte.

**Tech Stack:** TypeScript (strict), Node 22+ (CI) / Node 25 (dev), pnpm, Vitest for tests, `adm-zip` for zip reading, `sharp` for image conversion, `ajv` + `ajv-formats` for JSON Schema validation, `json-schema-to-typescript` for type generation.

**Spec reference:** [`docs/superpowers/specs/2026-05-24-sanctum-cards-design.md`](../specs/2026-05-24-sanctum-cards-design.md)

---

## Before you start

Each milestone is implemented on its own short-lived feature branch and merged via PR. Before M0.1, ensure you're on a fresh feature branch from latest `main`:

```bash
git fetch origin
git switch main
git reset --keep origin/main
git switch -c feat/m0-bootstrap
```

The "Open PR" task at the end of each milestone instructs you to create the *next* milestone's branch after the merge completes, so you never spend a task starting from the wrong place.

---

## Reading guide

- All paths are repo-relative unless prefixed with `/`.
- Each task is intended to take 2–5 minutes. If it takes longer, the task was wrong — open an issue and split it.
- "Run" commands assume the working directory is the repo root unless otherwise specified.
- TDD pattern is used wherever logic is non-trivial: red → green → commit. Boilerplate tasks (config files, dependency adds) omit the red-green cycle.
- Commit per task or per small logical group. Conventional commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.

## Determinism principles (apply throughout)

1. **JSON output uses sorted object keys** so byte-identical regeneration is easy to verify. Use a small helper (`stableStringify`) defined once.
2. **PNG output pins `sharp`'s compression level** (level 9, no adaptive filtering) so identical input → identical bytes.
3. **No timestamps, hostnames, or random IDs** in any committed output.
4. **Card order in `cards.json` is by numeric `id` ascending.**
5. **The input zip is hash-pinned** in `inputs/INPUT.md`; the build fails if the on-disk zip's sha256 doesn't match.

---

## M0 — Bootstrap

Goal: clean repo skeleton with licenses, attribution, contribution guide, vendored input, and a placeholder CI workflow.

### Task M0.1: Add `.gitignore`

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
# Dependencies
node_modules/
.pnpm-store/

# Build artifacts
dist/
*.tsbuildinfo

# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/

# Logs
*.log

# Test coverage
coverage/
.nyc_output/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

### Task M0.2: Split LICENSE into LICENSE-CODE and add LICENSE-DATA

**Files:**
- Move: `LICENSE` → `LICENSE-CODE`
- Create: `LICENSE-DATA`

- [ ] **Step 1: Rename the existing MIT license**

```bash
git mv LICENSE LICENSE-CODE
```

- [ ] **Step 2: Create `LICENSE-DATA` with CC-BY 4.0 text**

Paste the standard CC-BY 4.0 license text into `LICENSE-DATA`. The canonical text is at https://creativecommons.org/licenses/by/4.0/legalcode.txt — copy the full plain-text version verbatim.

- [ ] **Step 3: Commit**

```bash
git add LICENSE-CODE LICENSE-DATA
git commit -m "docs: split licenses — MIT for code, CC-BY 4.0 for data"
```

### Task M0.3: Add NOTICE for original asset attribution

**Files:**
- Create: `NOTICE`

- [ ] **Step 1: Create `NOTICE`**

```markdown
# Sanctum Card Database — Attribution Notice

This repository contains two categories of content under different
licensing arrangements:

## 1. Original Sanctum content (Digital Addiction, Inc., ~1997–2003)

The following are reproduced here for the preservation of an
abandoned commercial work, and remain the copyright of their
original authors:

- Card names and rules text from the Sanctum 1.8 client
  (`Cache/CardText*.txt`, `Cache/Sanctum.ncd`)
- Card illustrations and art (`bin/bitmaps/cards/**`)
- Sound effects (`bin/sounds/*.wav`)
- Preconstructed deck lists (`Decks/PRECONSTRUCTED/*.dck`)
- Scenario maps (`bin/maps/*.map`)

These items are **not relicensed** by this repository. They are
included on the understanding that:

- The original publisher (Digital Addiction, Inc.) is defunct.
- The IP has passed through one or more successors (notably NIOGA).
- The current rights holder (if any) has not commercialized these
  assets in over a decade.

If you hold rights to any of the original Sanctum content and wish
items removed from this repository, please open an issue or contact
the maintainers. We will comply promptly and in good faith.

## 2. Original work in this repository (sanctum-cards contributors)

- Code (extractor, site, tooling): MIT, see `LICENSE-CODE`
- Derived JSON data, schema, and documentation: CC-BY 4.0, see `LICENSE-DATA`
- Attribution: "sanctum-cards contributors,
  https://github.com/open-sanctum/sanctum-cards"

## 3. Related preservation efforts

- **Sanctum** (the original game) is currently kept playable on a
  community-run server. The original 1.8 client binary is not
  redistributed by this repository; only data and assets in the
  archive are extracted into open formats.
- **Sanctorum** (https://github.com/SanctorumLLC) is a separate
  commercial reconstruction by an original Digital Addiction team
  member, using all-new assets. This repository is independent of
  Sanctorum and does not redistribute any Sanctorum content.
```

- [ ] **Step 2: Commit**

```bash
git add NOTICE
git commit -m "docs: add NOTICE clarifying attribution for original Sanctum content"
```

### Task M0.4: Add README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# sanctum-cards

An open, structured database of every card from the
**Sanctum** collectible card game (Digital Addiction, ~1997).
Extracted from the Sanctum 1.8 client archive into clean,
machine-readable JSON, with the original art and sounds bundled
alongside.

> **Licenses:** code MIT, data CC-BY 4.0, original game content
> acknowledged but not relicensed. See `NOTICE` for full details.

## What's in this repo

- `data/cards.json` — all ~1,100 cards as a single JSON array
- `data/cards/<id>.json` — one file per card for reviewable diffs
- `data/decks/<name>.json` — preconstructed starter decks
- `data/schema.json` — JSON Schema (draft 2020-12) every card validates against
- `data/enums.json` — canonical enums (houses, mana types, keywords, ...)
- `assets/art/big/<id>.png` — card art (extracted from `.bm_` JPEGs)
- `assets/art/small/<id>.png` — small art (used in the original deck builder)
- `assets/sounds/<id>.wav` — sound effects, copied through unchanged
- `assets/manifest.json` — sha256 + dimensions per asset file
- `tools/extract/` — TypeScript extractor that produces all of the above
- `inputs/Sanctum18-04.zip` — the source archive (hash-pinned)

## Quick start

```bash
# Just want the data? Clone and read.
git clone https://github.com/open-sanctum/sanctum-cards.git
cat sanctum-cards/data/cards.json | jq '.[] | select(.house == "despair")'

# Want to rerun the extractor from the source zip?
cd sanctum-cards
pnpm install
pnpm --filter @sanctum-cards/extract build
```

## Status

Work-in-progress. See `docs/superpowers/specs/` for the
sub-project A design and `docs/superpowers/plans/` for the
implementation plan being executed.

## Related projects

- **Sanctorum** ([@SanctorumLLC](https://github.com/SanctorumLLC)) — a
  commercial reconstruction using all-new assets. Independent of
  this project.
- The original **Sanctum** server (the 1.8 client + a Digital
  Addiction-era server binary) is run by the community.

## Contributing

See `CONTRIBUTING.md`. Issues and PRs welcome.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with project overview and quick start"
```

### Task M0.5: Add CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create `CONTRIBUTING.md`**

```markdown
# Contributing to sanctum-cards

Thanks for your interest. This is a preservation project for a
beloved late-90s card game; we welcome any help.

## What we're working on

The active plan is in
`docs/superpowers/plans/`. Look for "in progress" tasks and
open issues.

## Ground rules

1. **No new cards, no balance changes.** This repo represents the
   Sanctum 1.8 archive exactly as it was. Sanctorum or other
   community efforts can ship their own card sets in their own
   repos.
2. **Keep extraction reproducible.** If you change the extractor,
   regenerate `data/` and `assets/` and commit the diffs. CI will
   fail otherwise.
3. **One concern per PR.** Easier to review, easier to revert.
4. **Conventional commits** for messages: `feat:`, `fix:`,
   `docs:`, `chore:`, `test:`, `refactor:`.

## Local development

```bash
pnpm install
pnpm --filter @sanctum-cards/extract test     # unit tests
pnpm --filter @sanctum-cards/extract build    # regenerate data/ + assets/
git diff data/ assets/                         # see what changed
```

## Removal-on-request policy

If you hold copyright to any of the original Sanctum content
included in this repository (rules text, art, audio, etc.) and
would like items removed, please open an issue or contact the
maintainers. We will comply promptly and in good faith. See
`NOTICE` for full attribution context.

## Code of Conduct

See `CODE_OF_CONDUCT.md`.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING with ground rules and dev setup"
```

### Task M0.6: Add CODE_OF_CONDUCT.md

**Files:**
- Create: `CODE_OF_CONDUCT.md`

- [ ] **Step 1: Create `CODE_OF_CONDUCT.md` using the Contributor Covenant 2.1**

Paste the full text of Contributor Covenant 2.1 from
https://www.contributor-covenant.org/version/2/1/code_of_conduct/
into the file. Update the "Enforcement" section's contact email
to a maintainer-controlled address (or leave it as
`opensource@example.com` with a TODO comment if no address is
chosen yet).

- [ ] **Step 2: Commit**

```bash
git add CODE_OF_CONDUCT.md
git commit -m "docs: add Contributor Covenant 2.1 code of conduct"
```

### Task M0.7: Vendor the source zip

**Files:**
- Create: `inputs/Sanctum18-04.zip` (copy from `/home/dmm/src/sanctum/Sanctum18-04.zip`)
- Create: `inputs/INPUT.md`

- [ ] **Step 1: Copy the zip into the repo**

```bash
mkdir -p inputs
cp /home/dmm/src/sanctum/Sanctum18-04.zip inputs/Sanctum18-04.zip
```

- [ ] **Step 2: Compute and record the sha256**

```bash
sha256sum inputs/Sanctum18-04.zip
```

Note the output hash for use in the next step.

- [ ] **Step 3: Create `inputs/INPUT.md`**

```markdown
# Input archive

This directory contains the source archive the extractor reads.

## Sanctum18-04.zip

- **Origin:** Sanctum 1.8 client, build 18-04 (2014-01-24)
- **Size:** ~33 MB
- **SHA-256:** `<paste the hash from step 2 here>`
- **Acquired from:** community-maintained mirror; original
  distribution by Digital Addiction circa 2014 as a player-build
  refresh of the 1.x client.

## Why is the zip committed to the repository?

The extractor's reproducibility contract requires byte-identical
inputs. Hosting the zip externally (e.g. a GitHub Release asset)
would let the input drift silently. Committing it means:

- `git clone` gives a contributor everything they need to rerun
  the extractor and reproduce `data/` and `assets/`.
- A future bit-flip in any external mirror cannot break our build.
- The 33 MB size is well within GitHub's 50 MB single-file limit
  and 100 MB hard cap.

## What's in the zip?

- `Sanctum18/bin/Sanctum.exe` — the game client (not used by the
  extractor)
- `Sanctum18/bin/Sanctum-Debug-2008.exe` — debug build with RTTI
  class names retained (not used by the extractor; potential
  future reference)
- `Sanctum18/bin/bitmaps/cards/big_cards/*.bm_` — full card art
  (renamed JPEGs)
- `Sanctum18/bin/bitmaps/cards/small_cards/*.bm_` — small card art
  (renamed JPEGs)
- `Sanctum18/bin/sounds/*.wav` — sound effects
- `Sanctum18/bin/maps/*.map` — scenario maps (out of scope for M0–M4)
- `Sanctum18/Cache/Sanctum.ncd` — card metadata, tab-separated text
- `Sanctum18/Cache/CardText*.txt` — rules text per card, six files
- `Sanctum18/Decks/PRECONSTRUCTED/*.dck` — twelve starter decks
```

- [ ] **Step 4: Commit**

```bash
git add inputs/
git commit -m "chore: vendor Sanctum 1.8 source archive with provenance"
```

### Task M0.8: Add a placeholder CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        # pnpm version comes from `packageManager` in root package.json
        # (pnpm/action-setup@v4 rejects specifying it in both places).

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Verify input zip integrity
        run: |
          cd inputs
          expected=$(grep -oP 'SHA-256:.*\`\K[0-9a-f]+' INPUT.md)
          actual=$(sha256sum Sanctum18-04.zip | awk '{print $1}')
          if [ "$expected" != "$actual" ]; then
            echo "Zip sha256 mismatch: expected $expected, got $actual"
            exit 1
          fi
          echo "Zip sha256 verified: $actual"

      # Subsequent steps (install, build, test, verify-extractor-reproducibility)
      # are added by the M1+ tasks.
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow with input archive sha256 verification"
```

### Task M0.9: Open M0 PR and merge

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/data-pipeline
```

- [ ] **Step 2: Open the M0 PR (asks the human first per autonomy rules)**

The agent confirms with the human, then runs:

```bash
gh pr create --base main --head feat/data-pipeline \
  --title "M0: bootstrap repo (licenses, NOTICE, README, vendored zip, CI skeleton)" \
  --body "Implements milestone M0 of the data-pipeline plan.

- Split LICENSE into LICENSE-CODE (MIT) and LICENSE-DATA (CC-BY 4.0)
- Add NOTICE explaining attribution for original Sanctum content
- README, CONTRIBUTING, CODE_OF_CONDUCT
- Vendor Sanctum18-04.zip under inputs/ with provenance
- Skeleton CI workflow with zip integrity check

Closes M0 of docs/superpowers/plans/2026-05-24-sanctum-cards-data.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: After human OK, merge, sync local, prepare next milestone branch**

```bash
gh pr merge --squash --delete-branch
git switch main
git fetch origin
git reset --keep origin/main
# The next milestone's tasks expect to be on a fresh feature branch.
# Pick the appropriate name for the milestone you're about to start:
git switch -c feat/<next-milestone-slug>     # e.g. feat/m1-extractor-v0
```

---

## M1 — Extractor v0 (id + name + raw rules text)

Goal: a runnable extractor that produces `data/cards.json` with `id`, `name`, and `rules_text` for every card.

### Task M1.1: Create the extractor package

**Files:**
- Create: `tools/extract/package.json`
- Create: `tools/extract/tsconfig.json`
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "sanctum-cards",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.30.1"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "tools/*"
```

- [ ] **Step 3: Create `tools/extract/package.json`**

```json
{
  "name": "@sanctum-cards/extract",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/build.js",
  "scripts": {
    "build": "tsc && node dist/build.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "adm-zip": "^0.5.16"
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.7",
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `tools/extract/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests"]
}
```

- [ ] **Step 5: Install dependencies**

```bash
pnpm install
```

Expected: pnpm creates `pnpm-lock.yaml` and `tools/extract/node_modules/` (symlinked into `.pnpm`). Output ends with "Done".

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tools/extract/package.json tools/extract/tsconfig.json
git commit -m "feat(extract): scaffold TypeScript workspace package"
```

### Task M1.2: Add `stableStringify` helper

**Files:**
- Create: `tools/extract/src/util/stableStringify.ts`
- Create: `tools/extract/tests/stableStringify.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/stableStringify.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { stableStringify } from "../src/util/stableStringify.js";

describe("stableStringify", () => {
  it("sorts object keys alphabetically", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys recursively in nested objects", () => {
    expect(stableStringify({ b: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}'
    );
  });

  it("preserves array order", () => {
    expect(stableStringify({ list: [3, 1, 2] })).toBe('{"list":[3,1,2]}');
  });

  it("formats with given indent when requested", () => {
    expect(stableStringify({ b: 1, a: 2 }, 2)).toBe(
      '{\n  "a": 2,\n  "b": 1\n}'
    );
  });

  it("handles null and primitives", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("hi")).toBe('"hi"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test stableStringify
```

Expected: FAIL with "Cannot find module '../src/util/stableStringify.js'".

- [ ] **Step 3: Write the implementation**

`tools/extract/src/util/stableStringify.ts`:

```typescript
export function stableStringify(value: unknown, indent?: number): string {
  return JSON.stringify(value, replacer, indent);
}

function replacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test stableStringify
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/util/stableStringify.ts tools/extract/tests/stableStringify.test.ts
git commit -m "feat(extract): add stableStringify for deterministic JSON output"
```

### Task M1.3: Add zip reader

**Files:**
- Create: `tools/extract/src/input/zip.ts`
- Create: `tools/extract/tests/zip.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/zip.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readZipEntry, openZip } from "../src/input/zip.js";
import { resolve } from "node:path";

const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");

describe("zip", () => {
  it("opens the input zip without error", () => {
    const zip = openZip(ZIP_PATH);
    expect(zip).toBeDefined();
  });

  it("reads Cache/Sanctum.ncd as a non-empty buffer", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/Cache/Sanctum.ncd");
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 4).toString("ascii")).toMatch(/^\s+\d/);
  });

  it("throws if the entry is missing", () => {
    const zip = openZip(ZIP_PATH);
    expect(() => readZipEntry(zip, "does/not/exist")).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test zip
```

Expected: FAIL with "Cannot find module '../src/input/zip.js'".

- [ ] **Step 3: Write the implementation**

`tools/extract/src/input/zip.ts`:

```typescript
import AdmZip from "adm-zip";

export type Zip = AdmZip;

export function openZip(path: string): Zip {
  return new AdmZip(path);
}

export function readZipEntry(zip: Zip, entryName: string): Buffer {
  const entry = zip.getEntry(entryName);
  if (!entry) {
    throw new Error(`Zip entry not found: ${entryName}`);
  }
  return entry.getData();
}

export function listZipEntries(zip: Zip, prefix?: string): string[] {
  return zip
    .getEntries()
    .map((e) => e.entryName)
    .filter((name) => (prefix ? name.startsWith(prefix) : true))
    .sort();
}
```

- [ ] **Step 4: Add a vitest.config.ts so __dirname works in ESM tests**

Create `tools/extract/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
```

Update `tools/extract/tests/zip.test.ts` top: change `__dirname` to:

```typescript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test zip
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add tools/extract/src/input/zip.ts tools/extract/tests/zip.test.ts tools/extract/vitest.config.ts
git commit -m "feat(extract): add zip reader over adm-zip"
```

### Task M1.4: Parse `Sanctum.ncd` for id and name

**Files:**
- Create: `tools/extract/src/input/ncd.ts`
- Create: `tools/extract/tests/ncd.test.ts`

- [ ] **Step 1: Write the failing test with a representative `.ncd` fixture**

`tools/extract/tests/ncd.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseNcd } from "../src/input/ncd.js";

const SAMPLE = `   4\t   4\t   0\t  0\ta\tm\t   4\tWrack
   5\t   5\t   0\t  0\tm\tR\t   5\tForced March
   9\t   9\t4100\t  0\tc\tg\t   9\tDeluge
`;

describe("parseNcd", () => {
  it("returns one record per non-empty line", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out).toHaveLength(3);
  });

  it("extracts id and name", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out[0]).toMatchObject({ id: 4, name: "Wrack" });
    expect(out[1]).toMatchObject({ id: 5, name: "Forced March" });
    expect(out[2]).toMatchObject({ id: 9, name: "Deluge" });
  });

  it("preserves raw columns for later analysis", () => {
    const out = parseNcd(Buffer.from(SAMPLE));
    expect(out[2].raw).toEqual(["9", "9", "4100", "0", "c", "g", "9", "Deluge"]);
  });

  it("ignores blank lines and trailing whitespace", () => {
    const out = parseNcd(Buffer.from(`\n${SAMPLE}\n\n`));
    expect(out).toHaveLength(3);
  });

  it("throws on malformed rows (fewer than 8 columns)", () => {
    expect(() => parseNcd(Buffer.from("   1\tonly two cols\n"))).toThrow(
      /malformed|columns/i
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test ncd
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/input/ncd.ts`:

```typescript
export interface NcdRecord {
  id: number;
  name: string;
  raw: string[]; // all 8 columns trimmed; preserved for later schema enrichment
}

const EXPECTED_COLUMNS = 8;

export function parseNcd(buf: Buffer): NcdRecord[] {
  const text = buf.toString("latin1"); // game-era encoding; ASCII-safe for our fields
  const records: NcdRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    const cols = line.split("\t").map((c) => c.trim());
    if (cols.length !== EXPECTED_COLUMNS) {
      throw new Error(
        `Malformed .ncd row: expected ${EXPECTED_COLUMNS} columns, got ${cols.length}: ${JSON.stringify(line)}`
      );
    }
    const idStr = cols[0]!;
    const name = cols[7]!;
    const id = parseInt(idStr, 10);
    if (!Number.isInteger(id)) {
      throw new Error(`Malformed .ncd row: id is not an integer: ${JSON.stringify(line)}`);
    }
    records.push({ id, name, raw: cols });
  }
  return records;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test ncd
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/input/ncd.ts tools/extract/tests/ncd.test.ts
git commit -m "feat(extract): parse Sanctum.ncd for id and name (raw columns preserved)"
```

### Task M1.5: Parse `CardText*.txt` for rules text

**Files:**
- Create: `tools/extract/src/input/cardtext.ts`
- Create: `tools/extract/tests/cardtext.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/cardtext.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseCardText } from "../src/input/cardtext.js";

const SAMPLE = `1000\ts\tCast on globe. Every non-friendly town and colony...
1001\ts\tCast on globe. After start of next turn, all Imps...
1002\ts\tCast on group. Group dies. The Pact Is Sealed...
`;

describe("parseCardText", () => {
  it("returns one record per line", () => {
    const out = parseCardText(Buffer.from(SAMPLE), "CardTextA.txt");
    expect(out).toHaveLength(3);
  });

  it("extracts id, type letter, and text", () => {
    const [first] = parseCardText(Buffer.from(SAMPLE), "CardTextA.txt");
    expect(first).toMatchObject({
      id: 1000,
      type_letter: "s",
      text: "Cast on globe. Every non-friendly town and colony...",
      source_file: "CardTextA.txt",
      source_line: 1,
    });
  });

  it("preserves embedded tabs, slashes, and punctuation in the text column", () => {
    const sample = `1\ts\tFoo\\tBar (parenthetical) - hyphen, "quoted", 'apostrophe'\n`;
    const [rec] = parseCardText(Buffer.from(sample), "CardTextA.txt");
    expect(rec.text).toBe("Foo\\tBar (parenthetical) - hyphen, \"quoted\", 'apostrophe'");
  });

  it("ignores blank lines and assigns source_line by file position", () => {
    const sample = `\n${SAMPLE}\n\n`;
    const out = parseCardText(Buffer.from(sample), "CardTextA.txt");
    expect(out).toHaveLength(3);
    // After the leading blank line, the first record is on file-line 2.
    expect(out[0].source_line).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test cardtext
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/input/cardtext.ts`:

```typescript
export interface CardTextRecord {
  id: number;
  type_letter: string;
  text: string;
  source_file: string;
  source_line: number; // 1-based line index within source_file
}

export function parseCardText(buf: Buffer, sourceFile: string): CardTextRecord[] {
  const text = buf.toString("latin1");
  const records: CardTextRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === "") continue;
    // Format: id\ttype_letter[\ttext]
    // The text column is optional — some entries have only id and type_letter (empty rules text).
    const t1 = raw.indexOf("\t");
    if (t1 < 0) {
      throw new Error(
        `Malformed ${sourceFile} line ${i + 1}: expected at least 2 tab-separated columns: ${JSON.stringify(raw)}`
      );
    }
    const t2 = raw.indexOf("\t", t1 + 1);
    const idCol = raw.slice(0, t1).trim();
    const typeLetter = (t2 < 0 ? raw.slice(t1 + 1) : raw.slice(t1 + 1, t2)).trim();
    const textCol = t2 < 0 ? "" : raw.slice(t2 + 1);
    const id = parseInt(idCol, 10);
    if (!Number.isInteger(id)) {
      throw new Error(
        `Malformed ${sourceFile} line ${i + 1}: id column "${idCol}" is not an integer`
      );
    }
    records.push({
      id,
      type_letter: typeLetter,
      text: textCol,
      source_file: sourceFile,
      source_line: i + 1,
    });
  }
  return records;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test cardtext
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/input/cardtext.ts tools/extract/tests/cardtext.test.ts
git commit -m "feat(extract): parse CardText*.txt for rules text per card id"
```

### Task M1.6: Join `.ncd` records with rules text

**Files:**
- Create: `tools/extract/src/enrich/mergeCard.ts`
- Create: `tools/extract/tests/mergeCard.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/mergeCard.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mergeCards } from "../src/enrich/mergeCard.js";
import type { NcdRecord } from "../src/input/ncd.js";
import type { CardTextRecord } from "../src/input/cardtext.js";

const ncd: NcdRecord[] = [
  { id: 4, name: "Wrack", raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"] },
  { id: 1000, name: "Mock Card", raw: ["1000", "1000", "0", "0", "s", "g", "1000", "Mock Card"] },
];

const cardText: CardTextRecord[] = [
  { id: 4, type_letter: "s", text: "Wrack spell text.", source_file: "CardTextC.txt", source_line: 1 },
  { id: 4, type_letter: "f", text: "Wrack flavor text.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1000, type_letter: "s", text: "Mock spell text.", source_file: "CardTextA.txt", source_line: 1 },
  { id: 1000, type_letter: "h", text: "Mock help text.", source_file: "CardTextA.txt", source_line: 2 },
];

describe("mergeCards", () => {
  it("joins by id using spell-text (type_letter === 's') entries", () => {
    const out = mergeCards(ncd, cardText);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: 4,
      name: "Wrack",
      rules_text: "Wrack spell text.",
      sources: { card_text_file: "CardTextC.txt", card_text_line: 1 },
    });
    expect(out[1]).toMatchObject({
      id: 1000,
      rules_text: "Mock spell text.",
      sources: { card_text_file: "CardTextA.txt", card_text_line: 1 },
    });
  });

  it("ignores non-spell type_letters (f/h/m/n)", () => {
    const out = mergeCards(ncd, cardText);
    for (const c of out) {
      expect(c.rules_text).not.toContain("flavor");
      expect(c.rules_text).not.toContain("help");
    }
  });

  it("sorts output by ascending id", () => {
    const out = mergeCards(ncd.slice().reverse(), cardText);
    expect(out.map((c) => c.id)).toEqual([4, 1000]);
  });

  it("warns and skips when an ncd id has no spell text", () => {
    const onlyText4: CardTextRecord[] = [
      { id: 4, type_letter: "s", text: "Wrack spell text.", source_file: "CardTextC.txt", source_line: 1 },
    ];
    const warnings: string[] = [];
    const out = mergeCards(ncd, onlyText4, { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(4);
    expect(warnings.some((w) => w.includes("1000") && /no spell text/i.test(w))).toBe(true);
  });

  it("warns (but does not throw) if a spell-text id is not in ncd", () => {
    const orphan: CardTextRecord = {
      id: 9999,
      type_letter: "s",
      text: "orphan spell",
      source_file: "CardTextA.txt",
      source_line: 99,
    };
    const warnings: string[] = [];
    const out = mergeCards(ncd, [...cardText, orphan], { onWarning: (w) => warnings.push(w) });
    expect(out).toHaveLength(2);
    expect(warnings.some((w) => w.includes("9999"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test mergeCard
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

> **Important:** CardText files have multiple lines per card id, one per `type_letter` (s=spell, f=flavor, n=short-name, h=help, m=mobile). mergeCards selects spell-text only — the other type_letters are tracked elsewhere in M2+.

`tools/extract/src/enrich/mergeCard.ts`:

```typescript
import type { NcdRecord } from "../input/ncd.js";
import type { CardTextRecord } from "../input/cardtext.js";

export interface CardV0 {
  id: number;
  name: string;
  rules_text: string;
  ncd_raw: string[];
  sources: {
    ncd_row: number;
    card_text_file: string;
    card_text_line: number;
  };
}

export interface MergeOptions {
  onWarning?: (msg: string) => void;
}

export function mergeCards(
  ncd: NcdRecord[],
  cardText: CardTextRecord[],
  opts: MergeOptions = {}
): CardV0[] {
  // Only spell-text entries (type_letter === "s") are used for rules_text.
  // The other type_letters (f=flavor, n=short-name, h=help, m=mobile) are
  // tracked elsewhere in later milestones; M1 outputs spell text only.
  const spellTexts = cardText.filter((t) => t.type_letter === "s");

  const textById = new Map<number, CardTextRecord>();
  for (const t of spellTexts) {
    if (textById.has(t.id)) {
      opts.onWarning?.(
        `Duplicate spell-text entry for id ${t.id} in ${t.source_file}:${t.source_line}; using first`
      );
      continue;
    }
    textById.set(t.id, t);
  }

  const ncdIds = new Set(ncd.map((r) => r.id));
  for (const t of spellTexts) {
    if (!ncdIds.has(t.id)) {
      opts.onWarning?.(
        `Spell-text id ${t.id} from ${t.source_file}:${t.source_line} has no .ncd entry; skipping`
      );
    }
  }

  const cards: CardV0[] = [];
  for (let i = 0; i < ncd.length; i++) {
    const rec = ncd[i]!;
    const text = textById.get(rec.id);
    if (!text) {
      opts.onWarning?.(
        `.ncd id ${rec.id} (${rec.name}) has no spell text; skipping`
      );
      continue;
    }
    cards.push({
      id: rec.id,
      name: rec.name,
      rules_text: text.text,
      ncd_raw: rec.raw,
      sources: {
        ncd_row: i + 1,
        card_text_file: text.source_file,
        card_text_line: text.source_line,
      },
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test mergeCard
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/mergeCard.ts tools/extract/tests/mergeCard.test.ts
git commit -m "feat(extract): join .ncd metadata with CardText*.txt rules text"
```

### Task M1.7: Write `data/cards.json`

**Files:**
- Create: `tools/extract/src/output/writeCards.ts`
- Create: `tools/extract/tests/writeCards.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/writeCards.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCardsBulk } from "../src/output/writeCards.js";
import type { CardV0 } from "../src/enrich/mergeCard.js";

const sample: CardV0[] = [
  {
    id: 4,
    name: "Wrack",
    rules_text: "Wrack text.",
    ncd_raw: ["4", "4", "0", "0", "a", "m", "4", "Wrack"],
    sources: { ncd_row: 1, card_text_file: "CardTextA.txt", card_text_line: 1 },
  },
];

describe("writeCardsBulk", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sanctum-cards-"));
  });

  it("writes cards.json with sorted keys and indentation", () => {
    writeCardsBulk(sample, dir);
    const content = readFileSync(join(dir, "cards.json"), "utf8");
    expect(content).toContain('"id": 4');
    expect(content).toContain('"name": "Wrack"');
    // Sorted keys: id before name before ncd_raw before rules_text before sources
    const idIndex = content.indexOf('"id"');
    const nameIndex = content.indexOf('"name"');
    expect(idIndex).toBeLessThan(nameIndex);
    rmSync(dir, { recursive: true, force: true });
  });

  it("output is byte-identical across runs", () => {
    writeCardsBulk(sample, dir);
    const first = readFileSync(join(dir, "cards.json"));
    writeCardsBulk(sample, dir);
    const second = readFileSync(join(dir, "cards.json"));
    expect(first.equals(second)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test writeCards
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/output/writeCards.ts`:

```typescript
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { CardV0 } from "../enrich/mergeCard.js";

export function writeCardsBulk(cards: CardV0[], dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, "cards.json");
  const content = stableStringify(cards, 2) + "\n";
  writeFileSync(path, content, "utf8");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test writeCards
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/output/writeCards.ts tools/extract/tests/writeCards.test.ts
git commit -m "feat(extract): write data/cards.json deterministically"
```

### Task M1.8: Build orchestrator

**Files:**
- Create: `tools/extract/src/build.ts`

- [ ] **Step 1: Write the orchestrator**

`tools/extract/src/build.ts`:

```typescript
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { openZip, readZipEntry } from "./input/zip.js";
import { parseNcd } from "./input/ncd.js";
import { parseCardText } from "./input/cardtext.js";
import { mergeCards } from "./enrich/mergeCard.js";
import { writeCardsBulk } from "./output/writeCards.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

const ZIP_PATH = resolve(REPO_ROOT, "inputs/Sanctum18-04.zip");
const DATA_DIR = resolve(REPO_ROOT, "data");

const CARD_TEXT_FILES = [
  "CardTextA.txt",
  "CardTextB.txt",
  "CardTextC.txt",
  "CardTextO.txt",
  "CardTextR.txt",
  "CardTextW.txt",
] as const;

function main(): void {
  console.log(`Opening ${ZIP_PATH}`);
  const zip = openZip(ZIP_PATH);

  console.log("Parsing Cache/Sanctum.ncd ...");
  const ncd = parseNcd(readZipEntry(zip, "Sanctum18/Cache/Sanctum.ncd"));
  console.log(`  ${ncd.length} records`);

  console.log("Parsing Cache/CardText*.txt ...");
  const cardText = CARD_TEXT_FILES.flatMap((file) =>
    parseCardText(readZipEntry(zip, `Sanctum18/Cache/${file}`), file)
  );
  console.log(`  ${cardText.length} records across ${CARD_TEXT_FILES.length} files`);

  console.log("Merging ...");
  const cards = mergeCards(ncd, cardText, {
    onWarning: (msg) => console.warn(`  WARN: ${msg}`),
  });
  console.log(`  ${cards.length} cards`);

  console.log(`Writing ${DATA_DIR}/cards.json ...`);
  writeCardsBulk(cards, DATA_DIR);
  console.log("Done.");
}

main();
```

- [ ] **Step 2: Build the TypeScript**

```bash
cd tools/extract && pnpm exec tsc
```

Expected: no errors, `dist/build.js` created.

- [ ] **Step 3: Run the orchestrator**

```bash
cd tools/extract && node dist/build.js
```

Expected: prints "N records" lines, no warnings (or only intentional skips for orphan text entries), ends with "Done.". A `data/cards.json` file (>500 KB) appears at the repo root.

- [ ] **Step 4: Sanity-check the output**

```bash
cd /home/dmm/src/sanctum-cards && jq 'length' data/cards.json
jq '.[0]' data/cards.json
jq '[.[] | select(.name == "Nightmare")][0]' data/cards.json
```

Expected: `length` ≈ 1,100; first card has the expected shape (id, name, rules_text, ncd_raw, sources); Nightmare lookup returns a card with `H:3 A:1 HP:10 L:2` in its rules_text.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/build.ts data/cards.json
git commit -m "feat(extract): orchestrator for v0 pipeline, emit data/cards.json"
```

### Task M1.9: Wire CI to run extractor and verify outputs unchanged

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add Node/pnpm setup and the extractor steps to the workflow**

Replace the placeholder comment block in `.github/workflows/ci.yml` (the "pnpm and Node setup are added in M1.1..." comment from the M0 CI fix) with the setup actions, then append the new extractor steps after the zip integrity check. The full `steps:` block in the workflow should look like:

```yaml
    steps:
      - uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        # pnpm version comes from `packageManager` in root package.json
        # (pnpm/action-setup@v4 rejects specifying it in both places).

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Verify input zip integrity
        run: |
          cd inputs
          expected=$(grep -oP 'SHA-256:.*\`\K[0-9a-f]+' INPUT.md)
          actual=$(sha256sum Sanctum18-04.zip | awk '{print $1}')
          if [ "$expected" != "$actual" ]; then
            echo "Zip sha256 mismatch: expected $expected, got $actual"
            exit 1
          fi
          echo "Zip sha256 verified: $actual"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm --filter @sanctum-cards/extract typecheck

      - name: Test
        run: pnpm --filter @sanctum-cards/extract test

      - name: Build extractor and regenerate data/
        run: pnpm --filter @sanctum-cards/extract build

      - name: Verify data/ is unchanged
        run: |
          if [ -n "$(git status --porcelain data/)" ]; then
            echo "Extractor produced output that differs from committed data/:"
            git diff --stat data/
            exit 1
          fi
          echo "Extractor output matches committed data/."
```

The `Set up pnpm` / `Set up Node` actions are added here (not in M0) because they require `pnpm-lock.yaml` to exist for the cache configuration; that lockfile is introduced by M1.1.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run extractor tests and verify data/ reproducibility on PR"
```

### Task M1.10: Open M1 PR and merge

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/data-pipeline
```

- [ ] **Step 2: Open PR (asks human first)**

```bash
gh pr create --base main --head feat/data-pipeline \
  --title "M1: extractor v0 — emit cards.json with id, name, rules_text" \
  --body "Implements milestone M1 of the data-pipeline plan.

- Scaffold pnpm + TypeScript workspace at tools/extract
- Parse Sanctum.ncd (id + name + raw columns)
- Parse all six CardText*.txt files
- Merge by id, sort by id, validate join
- Deterministic JSON output (stable key order)
- CI: typecheck, test, regenerate, verify-unchanged

Closes M1 of docs/superpowers/plans/2026-05-24-sanctum-cards-data.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: After human OK, merge and sync**

```bash
gh pr merge --squash --delete-branch
git switch main
git fetch origin
git reset --keep origin/main
```

---

## M2 — Extractor v1 (full schema + validation)

Goal: extractor emits structured `cost`, `target`, `stats`, `keywords`, plus `house`, `type`, `rarity`, `set`. JSON Schema is published and enforced; per-card files written alongside the bulk.

### Task M2.1: Define the canonical enums file

**Files:**
- Create: `tools/extract/src/enums.ts`

This file is the *parser-side* definition. The extractor emits `data/enums.json` from it at build time, and the JSON Schema references it.

- [ ] **Step 1: Create the enums module**

`tools/extract/src/enums.ts`:

```typescript
export const HOUSES = [
  "abomination",
  "body",
  "death",
  "despair",
  "hope",
  "justice",
  "life",
  "making",
  "mind",
  "nature",
  "unmaking",
  "war",
] as const;
export type House = (typeof HOUSES)[number];

export const MANA_TYPES = [
  "clarity",
  "mystery",
  "order",
  "strife",
  "will",
  "world",
] as const;
export type ManaType = (typeof MANA_TYPES)[number];

// Type, rarity, set, and target enums are discovered during extraction
// and populated into data/enums.json. We keep an open allowlist here that
// the extractor extends; unknown values fail the build.
export const KNOWN_RARITIES = ["common", "uncommon", "rare", "promo"] as const;
export const KNOWN_SETS = ["classic"] as const;
```

- [ ] **Step 2: Commit**

```bash
git add tools/extract/src/enums.ts
git commit -m "feat(extract): define canonical house/mana enums"
```

### Task M2.2: Investigate the `.ncd` type-letter and flags columns

This is an **investigation task**, not TDD. Goal: produce `docs/decisions/0001-ncd-column-meanings.md` documenting what we can determine about columns 3, 4, 5, and 6 of `.ncd`.

**Files:**
- Create: `docs/decisions/0001-ncd-column-meanings.md`

- [ ] **Step 1: Extract .ncd to a working file**

```bash
cd /home/dmm/src/sanctum-cards
mkdir -p /tmp/ncd-investigation
unzip -p inputs/Sanctum18-04.zip Sanctum18/Cache/Sanctum.ncd > /tmp/ncd-investigation/Sanctum.ncd
wc -l /tmp/ncd-investigation/Sanctum.ncd
```

- [ ] **Step 2: Compute distribution of column-3 values**

```bash
awk -F'\t' '{print $3}' /tmp/ncd-investigation/Sanctum.ncd | sort | uniq -c | sort -rn | head -20
```

Note the frequencies. The mostly-zero column with occasional 4100, 4108, 4118 etc. suggests a bitfield.

- [ ] **Step 3: Same for columns 4, 5, 6**

```bash
awk -F'\t' '{print $4}' /tmp/ncd-investigation/Sanctum.ncd | sort | uniq -c | sort -rn | head
awk -F'\t' '{print $5}' /tmp/ncd-investigation/Sanctum.ncd | sort | uniq -c | sort -rn
awk -F'\t' '{print $6}' /tmp/ncd-investigation/Sanctum.ncd | sort | uniq -c | sort -rn
```

Column 5 should show ~4-6 distinct letters (the *type* letter — `a/m/c/s/...`). Column 6 should show 6-12 distinct letters (likely *mana type* or *house*).

- [ ] **Step 4: Cross-reference column 5 with CardText*.txt suffix letters**

```bash
# For card id 4 (Wrack), find which CardText file it lives in.
for f in CardText*.txt; do
  unzip -p inputs/Sanctum18-04.zip "Sanctum18/Cache/$f" | awk -F'\t' '$2 == "4" {print FILENAME": "$0}' FILENAME="$f"
done
```

Build a mapping: `.ncd` column 5 letter (e.g. `a`) ↔ which `CardText*.txt` file the rules text lives in (e.g. `CardTextA.txt`). If the mapping is consistent, column 5 *is* the card-text file letter, which suggests it categorizes cards by some primary attribute.

- [ ] **Step 5: Look at columns 5/6 by known card identities**

Take 10 well-known cards (Wrack, Nightmare, Granite Guardian, Heartsong, ...). For each, note the columns 3/4/5/6 values *and* the rules text. Patterns should emerge: e.g., column 6 may be the *house* letter.

- [ ] **Step 6: Document findings**

Create `docs/decisions/0001-ncd-column-meanings.md`:

```markdown
# ADR-0001: `.ncd` column meanings

## Status

Accepted (initial investigation).

## Context

`Sanctum.ncd` is a tab-separated text file with 8 columns and no
header. Columns 1, 2, 7 are duplicate `id` values; column 8 is
the human-readable `name`. The middle four columns (3, 4, 5, 6)
needed investigation.

## Findings

### Column 3: flag bitfield

- Mostly zero (~80% of rows).
- Non-zero values observed: 4100, 4108, 4118, ... (insert
  observed list and frequencies).
- All non-zero values have bit 12 (value 4096) set.
- Interpretation: bit 12 likely indicates "promo" or "expansion"
  cards; lower bits TBD.

### Column 4: secondary flag

- Always 0 in the observed corpus.
- Interpretation: probably an unused or rarely-used field;
  parser preserves it as `raw[3]`.

### Column 5: type letter

Observed values and approximate frequencies: (paste from step 3).

Cross-referenced with `CardText*.txt` filename suffix:
- `a` cards live in `CardTextA.txt`
- `b` cards in `CardTextB.txt`
- ... (paste mapping)

Interpretation: column 5 is the card's *category*, which determines
which `CardText` file holds its rules text. Mapping to human-readable
type:
- `a` → alteration (TBD: verify against several alterations)
- `b` → ?
- ... (fill in)

### Column 6: mana / house letter

Observed values: (paste from step 3).

Interpretation: TBD. Hypothesis: card's primary mana type (one of
six: clarity/mystery/order/strife/will/world). Verification:
inspect rules text of cards with column 6 = `c` and confirm they
all have a Clarity-y feel.

## Decision

Map column 5 letter → `type` enum and column 6 letter → either
`mana.primary` or `house` (decide once we cross-reference with
card behavior).

Until column 6's meaning is certain, the parser emits both fields
under `ncd_raw[4]` and `ncd_raw[5]` and the merge step infers the
schema fields with explicit logic.
```

- [ ] **Step 7: Commit**

```bash
git add docs/decisions/0001-ncd-column-meanings.md
git commit -m "docs(adr): document .ncd column 5/6 investigation findings"
```

### Task M2.3: Define the JSON Schema

**Files:**
- Create: `data/schema.json`
- Create: `tools/extract/tests/schema.test.ts`

- [ ] **Step 1: Write a test that validates a sample card against the schema**

`tools/extract/tests/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../data/schema.json");

const validSample = {
  id: 1026,
  name: "Nightmare",
  house: "despair",
  type: "monster",
  rarity: "uncommon",
  set: "classic",
  target: "globe",
  cost: {
    total: 5,
    primary: { type: "strife", amount: 3 },
    secondary: { type: "will", amount: 2 },
    tertiary: null,
  },
  stats: { hand_damage: 3, missile: null, hp_max: 10, level: 2, attack_rate: 1 },
  keywords: ["Nomadic"],
  rules_text: "H:3 A:1 HP:10 L:2 Nomadic. ...",
  art: { big: "assets/art/big/1026.png", small: "assets/art/small/1026.png" },
  audio: null,
  sources: { ncd_row: 27, card_text_file: "CardTextA.txt", card_text_line: 27 },
};

describe("schema.json", () => {
  it("validates a well-formed card", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(validSample);
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });

  it("rejects an invalid house value", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate({ ...validSample, house: "not-a-house" });
    expect(ok).toBe(false);
    expect(validate.errors?.some((e) => e.instancePath === "/house")).toBe(true);
  });

  it("rejects negative card id", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate({ ...validSample, id: -1 });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Install ajv and ajv-formats**

```bash
cd tools/extract && pnpm add -D ajv ajv-formats
```

- [ ] **Step 3: Run the test (expected fail — schema.json doesn't exist yet)**

```bash
pnpm test schema
```

Expected: FAIL with ENOENT on schema.json.

- [ ] **Step 4: Create `data/schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://open-sanctum.github.io/sanctum-cards/schema.json",
  "title": "Sanctum Card",
  "type": "object",
  "required": [
    "id",
    "name",
    "house",
    "type",
    "rarity",
    "set",
    "target",
    "cost",
    "keywords",
    "rules_text",
    "sources"
  ],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "integer", "minimum": 0 },
    "name": { "type": "string", "minLength": 1 },
    "house": {
      "type": "string",
      "enum": [
        "abomination", "body", "death", "despair", "hope", "justice",
        "life", "making", "mind", "nature", "unmaking", "war"
      ]
    },
    "type": { "type": "string", "minLength": 1 },
    "rarity": {
      "type": "string",
      "enum": ["common", "uncommon", "rare", "promo"]
    },
    "set": { "type": "string", "minLength": 1 },
    "target": { "type": "string", "minLength": 1 },
    "cost": {
      "type": "object",
      "additionalProperties": false,
      "required": ["total", "primary", "secondary", "tertiary"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "primary": { "$ref": "#/$defs/manaCost" },
        "secondary": { "$ref": "#/$defs/manaCost" },
        "tertiary": { "$ref": "#/$defs/manaCost" }
      }
    },
    "stats": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["hand_damage", "missile", "hp_max", "level", "attack_rate"],
      "properties": {
        "hand_damage": { "type": ["integer", "null"] },
        "missile":     { "type": ["integer", "null"] },
        "hp_max":      { "type": ["integer", "null"] },
        "level":       { "type": ["integer", "null"] },
        "attack_rate": { "type": ["integer", "null"] }
      }
    },
    "keywords": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "uniqueItems": true
    },
    "rules_text": { "type": "string" },
    "art": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "properties": {
        "big":   { "type": ["string", "null"] },
        "small": { "type": ["string", "null"] }
      }
    },
    "audio": { "type": ["string", "null"] },
    "sources": {
      "type": "object",
      "additionalProperties": false,
      "required": ["ncd_row", "card_text_file", "card_text_line"],
      "properties": {
        "ncd_row": { "type": "integer", "minimum": 1 },
        "card_text_file": { "type": "string" },
        "card_text_line": { "type": "integer", "minimum": 1 }
      }
    }
  },
  "$defs": {
    "manaCost": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["type", "amount"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["clarity", "mystery", "order", "strife", "will", "world"]
        },
        "amount": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test schema
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add data/schema.json tools/extract/tests/schema.test.ts tools/extract/package.json pnpm-lock.yaml
git commit -m "feat(schema): define JSON Schema 2020-12 for cards with ajv tests"
```

### Task M2.4: Generate TypeScript types from the schema

**Files:**
- Modify: `tools/extract/package.json`
- Create: `tools/extract/scripts/generate-types.mjs`
- Create: `types/card.d.ts` (output — committed)

- [ ] **Step 1: Install the codegen tool**

```bash
cd tools/extract && pnpm add -D json-schema-to-typescript
```

- [ ] **Step 2: Create the codegen script**

`tools/extract/scripts/generate-types.mjs`:

```javascript
import { compile } from "json-schema-to-typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");

const schema = JSON.parse(readFileSync(resolve(REPO, "data/schema.json"), "utf8"));
const out = await compile(schema, "Card", {
  bannerComment:
    "// AUTO-GENERATED from data/schema.json — do not edit by hand.\n",
  style: { semi: true, singleQuote: false, tabWidth: 2 },
  additionalProperties: false,
});
writeFileSync(resolve(REPO, "types/card.d.ts"), out);
console.log("Wrote types/card.d.ts");
```

- [ ] **Step 3: Add the script to root `package.json`**

Add to root `package.json`:

```json
{
  "name": "sanctum-cards",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.30.1",
  "scripts": {
    "generate-types": "node tools/extract/scripts/generate-types.mjs"
  }
}
```

- [ ] **Step 4: Run it and verify the output**

```bash
cd /home/dmm/src/sanctum-cards && pnpm generate-types
cat types/card.d.ts | head -30
```

Expected: `types/card.d.ts` exists; contains an `interface Card` with all the schema fields typed.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/scripts/generate-types.mjs tools/extract/package.json pnpm-lock.yaml package.json types/card.d.ts
git commit -m "feat(types): generate TS types from JSON Schema"
```

### Task M2.5: Parse mana cost from `.ncd`

**Files:**
- Create: `tools/extract/src/enrich/parseCost.ts`
- Create: `tools/extract/tests/parseCost.test.ts`

The `.ncd` schema for cost is under investigation in M2.2. By that point we'll know which columns encode the mana cost. *Update this task with concrete columns once ADR-0001 is committed.* For the plan as-written, we assume column 6 is the *primary mana letter* and the total is encoded elsewhere (likely in the rules text or in a separate column we'll discover).

- [ ] **Step 1: Write a placeholder test for the parser**

Given the investigation may shift this, the test starts with a clear interface and one known case to drive it:

`tools/extract/tests/parseCost.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseCostFromNcd } from "../src/enrich/parseCost.js";

describe("parseCostFromNcd", () => {
  it("returns null for cards with no cost data in .ncd", () => {
    // .ncd row for Wrack: ["4", "4", "0", "0", "a", "m", "4", "Wrack"]
    // If column-5/6 don't encode amounts, we return null and rely on
    // rules text fallback. Update once ADR-0001 confirms.
    const cost = parseCostFromNcd(["4", "4", "0", "0", "a", "m", "4", "Wrack"]);
    expect(cost).toBeNull();
  });

  // The amount-encoding column is established by Task M2.11 once
  // ADR-0001 is resolved. Until then we leave this slot explicitly
  // skipped rather than asserting a placeholder.
  it.skip("returns a structured cost for a known well-formed row (filled in by M2.11)", () => {
    /* will be: expect(parseCostFromNcd([...real row...])).toEqual({ total: N, primary: { type, amount } ... }); */
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test parseCost
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the minimal implementation**

`tools/extract/src/enrich/parseCost.ts`:

```typescript
import type { House, ManaType } from "../enums.js";

export interface ManaCost {
  type: ManaType;
  amount: number;
}

export interface Cost {
  total: number;
  primary: ManaCost | null;
  secondary: ManaCost | null;
  tertiary: ManaCost | null;
}

const MANA_LETTER_MAP: Record<string, ManaType> = {
  c: "clarity",
  m: "mystery",
  o: "order",
  s: "strife",
  w: "will",
  // 'world' letter TBD post-investigation
};

/**
 * Best-effort cost parsing from the raw .ncd row. Returns null when
 * the row contains no cost encoding we recognize (in which case the
 * caller falls back to rules-text parsing). ADR-0001 will refine the
 * column choices used here.
 */
export function parseCostFromNcd(raw: string[]): Cost | null {
  if (raw.length !== 8) return null;
  // Conservative: until ADR-0001 confirms encoding, return null so the
  // rules-text fallback owns cost extraction. Replace this body once
  // the .ncd columns are decoded.
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test parseCost
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/parseCost.ts tools/extract/tests/parseCost.test.ts
git commit -m "feat(extract): scaffold cost parser (rules-text fallback owns extraction pending ADR-0001)"
```

### Task M2.6: Parse target from rules text

**Files:**
- Create: `tools/extract/src/enrich/parseTarget.ts`
- Create: `tools/extract/tests/parseTarget.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/parseTarget.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseTarget } from "../src/enrich/parseTarget.js";

describe("parseTarget", () => {
  it("extracts simple targets", () => {
    expect(parseTarget("Cast on globe. ...")).toBe("globe");
    expect(parseTarget("Cast on group. ...")).toBe("group");
    expect(parseTarget("Cast on recruit. ...")).toBe("recruit");
    expect(parseTarget("Cast on square. ...")).toBe("square");
  });

  it("extracts compound targets without losing precision", () => {
    expect(parseTarget("Cast on friendly recruit group. ...")).toBe(
      "friendly recruit group"
    );
    expect(parseTarget("Cast on town or colony. ...")).toBe("town or colony");
    expect(parseTarget("Cast on friendly minion. ...")).toBe("friendly minion");
  });

  it("returns null if 'Cast on ...' isn't present", () => {
    expect(parseTarget("H:2 A:1 HP:7 L:1 Nomadic. ...")).toBeNull();
    expect(parseTarget("When any player casts a spell, ...")).toBeNull();
  });

  it("stops at the period or end of clause", () => {
    expect(parseTarget("Cast on globe. Every non-friendly town ...")).toBe("globe");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test parseTarget
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/enrich/parseTarget.ts`:

```typescript
/**
 * Returns the target phrase from a card's rules text, or null if the
 * card has no "Cast on ..." prefix (e.g., persistent globe effects
 * cast by other means, or H:/A:/HP: stat-only entries).
 */
export function parseTarget(rulesText: string): string | null {
  const match = rulesText.match(/^Cast on ([^.]+?)\./);
  if (!match) return null;
  return match[1]!.trim().toLowerCase();
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test parseTarget
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/parseTarget.ts tools/extract/tests/parseTarget.test.ts
git commit -m "feat(extract): parse target from 'Cast on X.' prefix in rules text"
```

### Task M2.7: Parse combat stats from rules text

**Files:**
- Create: `tools/extract/src/enrich/parseStats.ts`
- Create: `tools/extract/tests/parseStats.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/parseStats.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseStats } from "../src/enrich/parseStats.js";

describe("parseStats", () => {
  it("extracts H/A/HP/L from a typical creature line", () => {
    expect(parseStats("H:3 A:1 HP:10 L:2 Nomadic. ...")).toEqual({
      hand_damage: 3,
      missile: null,
      hp_max: 10,
      level: 2,
      attack_rate: 1,
    });
  });

  it("extracts M (missile) instead of H for archers", () => {
    expect(parseStats("M:2 A:0 HP:7 L:1 Cast on globe. ...")).toEqual({
      hand_damage: null,
      missile: 2,
      hp_max: 7,
      level: 1,
      attack_rate: 0,
    });
  });

  it("returns null when the leading stat block is absent", () => {
    expect(parseStats("Cast on globe. ...")).toBeNull();
    expect(parseStats("")).toBeNull();
  });

  it("handles H:0(*) notation by extracting 0", () => {
    expect(parseStats("H:0(*) A:1 HP:15 L:1 Immobile. ...")).toMatchObject({
      hand_damage: 0,
      attack_rate: 1,
      hp_max: 15,
      level: 1,
    });
  });

  it("handles HP:7(x4) by extracting 7 (per-member HP)", () => {
    expect(parseStats("H:2 A:1 HP:7(x4) L:2 ...")).toMatchObject({
      hp_max: 7,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test parseStats
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/enrich/parseStats.ts`:

```typescript
export interface Stats {
  hand_damage: number | null;
  missile: number | null;
  hp_max: number | null;
  level: number | null;
  attack_rate: number | null;
}

const STAT_PATTERN = /^(?:H:(\d+)(?:\([^)]*\))?\s+|M:(\d+)\s+)?(?:A:(\d+)\s+)?(?:HP:(\d+)(?:\([^)]*\))?\s+)?(?:L:(\d+)\s*)?/;

export function parseStats(rulesText: string): Stats | null {
  const trimmed = rulesText.trimStart();
  // Require at least one of H:/M:/HP: to consider this a stat block.
  if (!/^[HML]P?:\d/.test(trimmed)) return null;

  const m = STAT_PATTERN.exec(trimmed);
  if (!m) return null;

  const [, h, missile, a, hp, l] = m;
  // Require at least HP and A or L to look like a real stat block.
  if (!hp && !l && !a) return null;

  return {
    hand_damage: h !== undefined ? parseInt(h, 10) : null,
    missile: missile !== undefined ? parseInt(missile, 10) : null,
    hp_max: hp !== undefined ? parseInt(hp, 10) : null,
    level: l !== undefined ? parseInt(l, 10) : null,
    attack_rate: a !== undefined ? parseInt(a, 10) : null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test parseStats
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/parseStats.ts tools/extract/tests/parseStats.test.ts
git commit -m "feat(extract): parse H/M/A/HP/L combat stats from rules text"
```

### Task M2.8: Build keyword candidate list (corpus pass)

This is an **investigation task**, output is a hand-curated `tools/extract/src/keywords.json`.

**Files:**
- Create: `tools/extract/scripts/keyword-candidates.mjs`
- Create: `tools/extract/keywords-candidates.txt` (working output, not committed)
- Create: `tools/extract/src/keywords.json` (curated allowlist)

- [ ] **Step 1: Create the candidate-finder script**

`tools/extract/scripts/keyword-candidates.mjs`:

```javascript
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");

const cards = JSON.parse(readFileSync(resolve(REPO, "data/cards.json"), "utf8"));
const counts = new Map();

// Heuristic: capitalized words/phrases of 1-3 words that appear in
// ≥3 cards. Parenthetical definitions and explicit "X gains Y"
// patterns get a bonus.

for (const card of cards) {
  const text = card.rules_text;
  // Find capitalized phrases (e.g., "Nomadic", "Mountainwalk",
  // "Granite Guardian"). Exclude sentence-initial capitalization.
  const matches = text.matchAll(/(?<=[\s,.()'"])([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g);
  const seen = new Set();
  for (const m of matches) {
    const phrase = m[1];
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
}

const sorted = [...counts.entries()]
  .filter(([, c]) => c >= 3)
  .sort((a, b) => b[1] - a[1]);

const out = sorted
  .map(([phrase, c]) => `${c.toString().padStart(4)} ${phrase}`)
  .join("\n");
writeFileSync(resolve(HERE, "../keywords-candidates.txt"), out);
console.log(`Wrote ${sorted.length} candidates to keywords-candidates.txt`);
```

- [ ] **Step 2: Run the candidate finder**

```bash
cd /home/dmm/src/sanctum-cards && node tools/extract/scripts/keyword-candidates.mjs
head -50 tools/extract/keywords-candidates.txt
```

Expected: a list of ~150-300 candidates, top by frequency. Examples expected at the top: "Cast", "Duration", "Friendly", followed by genuine keywords like "Mountainwalk", "Flight", "Expansive", "Nomadic", "Concealed", "Waterwalk", "Aura", "Veteran".

- [ ] **Step 3: Curate the allowlist manually**

Edit (or create) `tools/extract/src/keywords.json` listing only the real game keywords from the candidates. Discard generic words like "Cast", "Duration", "Friendly", "Group" etc. The result should be ~30-50 entries.

Format:

```json
{
  "keywords": [
    "Aura",
    "Concealed",
    "Desertwalk",
    "Expansive",
    "Field Armor",
    "Flight",
    "Mountainwalk",
    "Nomadic",
    "Veteran",
    "Waterwalk"
  ]
}
```

(Real list will be longer after curation.)

- [ ] **Step 4: Add `keywords-candidates.txt` to gitignore**

Append to `.gitignore`:

```
# Keyword extraction working files
tools/extract/keywords-candidates.txt
```

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/keywords.json tools/extract/scripts/keyword-candidates.mjs .gitignore
git commit -m "feat(extract): curate keyword allowlist from corpus scan"
```

### Task M2.9: Match keywords against rules text

**Files:**
- Create: `tools/extract/src/enrich/parseKeywords.ts`
- Create: `tools/extract/tests/parseKeywords.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/parseKeywords.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseKeywords } from "../src/enrich/parseKeywords.js";

const allowlist = ["Flight", "Mountainwalk", "Nomadic", "Concealed", "Veteran"];

describe("parseKeywords", () => {
  it("extracts keywords from the allowlist as whole words", () => {
    expect(parseKeywords("H:3 A:1 HP:10 L:2 Nomadic. ...", allowlist)).toEqual([
      "Nomadic",
    ]);
  });

  it("matches multiple keywords", () => {
    const text = "Group gains Flight. ... Mountainwalk... ";
    expect(parseKeywords(text, allowlist).sort()).toEqual(
      ["Flight", "Mountainwalk"].sort()
    );
  });

  it("deduplicates", () => {
    const text = "Flight ... Flight ...";
    expect(parseKeywords(text, allowlist)).toEqual(["Flight"]);
  });

  it("respects word boundaries (no partial matches)", () => {
    // Flight should not match "Mountainwalker"; Mountainwalk should.
    expect(parseKeywords("Mountainwalker test", allowlist)).toEqual([]);
    expect(parseKeywords("Mountainwalk test", allowlist)).toEqual(["Mountainwalk"]);
  });

  it("returns an empty array for cards with no keywords", () => {
    expect(parseKeywords("Cast on globe. Some effect.", allowlist)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test parseKeywords
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/enrich/parseKeywords.ts`:

```typescript
export function parseKeywords(rulesText: string, allowlist: string[]): string[] {
  const found = new Set<string>();
  for (const kw of allowlist) {
    // Whole-word match, case-sensitive (game uses Title Case for keywords).
    const re = new RegExp(`\\b${escapeRegex(kw)}\\b`);
    if (re.test(rulesText)) {
      found.add(kw);
    }
  }
  return [...found].sort();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test parseKeywords
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/parseKeywords.ts tools/extract/tests/parseKeywords.test.ts
git commit -m "feat(extract): match keywords against curated allowlist"
```

### Task M2.10: Extend mergeCard to produce full Card v1

**Files:**
- Modify: `tools/extract/src/enrich/mergeCard.ts`
- Modify: `tools/extract/tests/mergeCard.test.ts`

- [ ] **Step 1: Update `mergeCards` to call the enrich modules**

Replace `tools/extract/src/enrich/mergeCard.ts` with a version that produces full `Card` records:

```typescript
import type { NcdRecord } from "../input/ncd.js";
import type { CardTextRecord } from "../input/cardtext.js";
import { parseCostFromNcd, type Cost } from "./parseCost.js";
import { parseTarget } from "./parseTarget.js";
import { parseStats, type Stats } from "./parseStats.js";
import { parseKeywords } from "./parseKeywords.js";
import keywordsData from "../keywords.json" with { type: "json" };

export interface Card {
  id: number;
  name: string;
  house: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "promo";
  set: string;
  target: string;
  cost: Cost;
  stats: Stats | null;
  keywords: string[];
  rules_text: string;
  art: { big: string | null; small: string | null } | null;
  audio: string | null;
  sources: {
    ncd_row: number;
    card_text_file: string;
    card_text_line: number;
  };
}

export interface MergeOptions {
  onWarning?: (msg: string) => void;
}

const ALLOWLIST = keywordsData.keywords;

export function mergeCards(
  ncd: NcdRecord[],
  cardText: CardTextRecord[],
  opts: MergeOptions = {}
): Card[] {
  const textById = new Map<number, CardTextRecord>();
  for (const t of cardText) textById.set(t.id, t);

  const ncdIds = new Set(ncd.map((r) => r.id));
  for (const t of cardText) {
    if (!ncdIds.has(t.id)) {
      opts.onWarning?.(
        `Card text id ${t.id} from ${t.source_file}:${t.source_line} has no .ncd entry; skipping`
      );
    }
  }

  const cards: Card[] = [];
  for (let i = 0; i < ncd.length; i++) {
    const rec = ncd[i]!;
    const text = textById.get(rec.id);
    if (!text) {
      throw new Error(`.ncd id ${rec.id} (${rec.name}) has no rules text`);
    }

    const cost = parseCostFromNcd(rec.raw) ?? {
      total: 0,
      primary: null,
      secondary: null,
      tertiary: null,
    };
    const target = parseTarget(text.text) ?? "n/a";
    const stats = parseStats(text.text);
    const keywords = parseKeywords(text.text, ALLOWLIST);

    cards.push({
      id: rec.id,
      name: rec.name,
      // The next four come from .ncd column investigation (ADR-0001).
      // For now, fill in placeholders that the schema enums accept;
      // they will be tightened during M2.11.
      house: deriveHouse(rec.raw, opts),
      type: deriveType(rec.raw, text.type_letter, opts),
      rarity: deriveRarity(rec.raw, opts),
      set: deriveSet(rec.raw, opts),
      target,
      cost,
      stats,
      keywords,
      rules_text: text.text,
      art: { big: `assets/art/big/${rec.id}.png`, small: `assets/art/small/${rec.id}.png` },
      audio: null,
      sources: {
        ncd_row: i + 1,
        card_text_file: text.source_file,
        card_text_line: text.source_line,
      },
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

// --- Provisional derivations; refined in Task M2.11 ---

function deriveHouse(raw: string[], opts: MergeOptions): string {
  // Hypothesis from ADR-0001: column 6 (raw[5]) is house letter.
  // Until verified, default to first valid house and warn.
  const letter = raw[5];
  const map: Record<string, string> = {
    // Fill in from ADR-0001 once confirmed.
  };
  const h = letter ? map[letter] : undefined;
  if (!h) {
    opts.onWarning?.(`Unmapped house letter "${letter}" for raw row ${JSON.stringify(raw)}`);
    return "life";
  }
  return h;
}

function deriveType(raw: string[], textTypeLetter: string, opts: MergeOptions): string {
  // .ncd col 5 letter (raw[4]) and CardText type_letter should agree.
  const letter = raw[4] ?? textTypeLetter;
  const map: Record<string, string> = {
    a: "alteration",
    s: "spell",
    c: "conjuration",
    m: "monster",
    r: "recruit",
    // fill in from ADR-0001
  };
  return map[letter] ?? letter;
}

function deriveRarity(raw: string[], opts: MergeOptions): "common" | "uncommon" | "rare" | "promo" {
  // Hypothesis: bits in raw[2] encode rarity.
  // Default to "common" until ADR-0001 confirms.
  return "common";
}

function deriveSet(raw: string[], opts: MergeOptions): string {
  // Hypothesis: bits in raw[2] encode set.
  return "classic";
}
```

- [ ] **Step 2: Update the mergeCard test to expect the new shape**

Replace `tools/extract/tests/mergeCard.test.ts` with assertions tolerant of provisional house/rarity/set defaults but strict on target/stats/keywords:

```typescript
import { describe, it, expect } from "vitest";
import { mergeCards } from "../src/enrich/mergeCard.js";
import type { NcdRecord } from "../src/input/ncd.js";
import type { CardTextRecord } from "../src/input/cardtext.js";

const ncd: NcdRecord[] = [
  { id: 1026, name: "Nightmare", raw: ["1026", "1026", "0", "0", "s", "d", "1026", "Nightmare"] },
];
const text: CardTextRecord[] = [
  {
    id: 1026,
    type_letter: "s",
    text: "H:3 A:1 HP:10 L:2 Nomadic. At start of combat against recruits, Nightmare casts Despond.",
    source_file: "CardTextA.txt",
    source_line: 27,
  },
];

describe("mergeCards (full)", () => {
  it("parses stats from rules text", () => {
    const [c] = mergeCards(ncd, text);
    expect(c.stats).toEqual({
      hand_damage: 3,
      missile: null,
      hp_max: 10,
      level: 2,
      attack_rate: 1,
    });
  });

  it("parses keywords against the allowlist", () => {
    const [c] = mergeCards(ncd, text);
    expect(c.keywords).toContain("Nomadic");
  });

  it("includes art paths derived from id", () => {
    const [c] = mergeCards(ncd, text);
    expect(c.art).toEqual({
      big: "assets/art/big/1026.png",
      small: "assets/art/small/1026.png",
    });
  });

  it("sources field references the card text origin", () => {
    const [c] = mergeCards(ncd, text);
    expect(c.sources).toEqual({
      ncd_row: 1,
      card_text_file: "CardTextA.txt",
      card_text_line: 27,
    });
  });
});
```

- [ ] **Step 3: Run all tests**

```bash
cd tools/extract && pnpm test
```

Expected: PASS for stats/keywords/art assertions; other modules unaffected.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/enrich/mergeCard.ts tools/extract/tests/mergeCard.test.ts
git commit -m "feat(extract): produce full Card v1 with target/stats/keywords"
```

### Task M2.11: Refine derivations using ADR-0001 findings

**Files:**
- Modify: `tools/extract/src/enrich/mergeCard.ts` (the four `derive*` helpers)
- Modify: `docs/decisions/0001-ncd-column-meanings.md` (add a "Resolution" section)

- [ ] **Step 1: Open ADR-0001 and locate the column-meaning conclusions**

Read `docs/decisions/0001-ncd-column-meanings.md` carefully. The conclusions you wrote in Task M2.2 are the source of truth for this step. If any column's meaning is still uncertain, run additional spot-checks before changing code.

- [ ] **Step 2: Replace the `derive*` functions with concrete mappings**

In `tools/extract/src/enrich/mergeCard.ts`, replace each `derive*` function with the mapping from ADR-0001. Example shape (real letter-to-value mapping comes from the ADR):

```typescript
function deriveHouse(raw: string[], opts: MergeOptions): string {
  const letter = raw[5];
  const map: Record<string, string> = {
    // populate from ADR-0001
    l: "life",
    h: "hope",
    j: "justice",
    w: "war",
    d: "death",
    p: "despair",
    b: "body",
    m: "mind",
    n: "nature",
    M: "making",
    u: "unmaking",
    a: "abomination",
  };
  const h = letter ? map[letter] : undefined;
  if (!h) {
    opts.onWarning?.(`Unmapped house letter "${letter}"`);
    return "life";
  }
  return h;
}
```

(Replace the map with the *actual* mapping from your investigation; the above is illustrative only.)

Similar for `deriveType`, `deriveRarity`, `deriveSet`.

- [ ] **Step 3: Add the resolution to ADR-0001**

Append a section to `docs/decisions/0001-ncd-column-meanings.md`:

```markdown
## Resolution

After empirical verification across the full corpus, the following
mappings are used by `mergeCard.ts`:

- Column 5 (`raw[4]`) → `type` enum: `{a: alteration, s: spell, ...}`
- Column 6 (`raw[5]`) → `house` enum: `{l: life, h: hope, ...}`
- Column 3 (`raw[2]`) bit 12 → `rarity == "promo"` when set, otherwise `common`
- Set always `classic` for 1.8 (no expansion bits observed)

Any unmapped letter triggers an extractor warning rather than a
schema violation; the warning is treated as a CI failure in
`.github/workflows/ci.yml`.
```

- [ ] **Step 4: Run the extractor and verify outputs**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
jq '[.[].house] | unique' data/cards.json
jq '[.[].type]  | unique' data/cards.json
```

Expected: house enum contains exactly 12 values; type enum is a small set; no warnings printed for unmapped letters.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/enrich/mergeCard.ts docs/decisions/0001-ncd-column-meanings.md data/cards.json
git commit -m "feat(extract): map .ncd letter columns to house/type per ADR-0001"
```

### Task M2.12: Emit `data/enums.json` collected during extraction

**Files:**
- Create: `tools/extract/src/output/writeEnums.ts`
- Modify: `tools/extract/src/build.ts`

- [ ] **Step 1: Write `writeEnums.ts`**

```typescript
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { Card } from "../enrich/mergeCard.js";

export function writeEnums(cards: Card[], dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const collect = <K extends keyof Card>(key: K): string[] =>
    [...new Set(cards.map((c) => c[key] as unknown as string))].filter(Boolean).sort();

  const keywords = [...new Set(cards.flatMap((c) => c.keywords))].sort();

  const enums = {
    house: collect("house"),
    type: collect("type"),
    rarity: collect("rarity"),
    set: collect("set"),
    target: collect("target"),
    keyword: keywords,
  };
  writeFileSync(join(dataDir, "enums.json"), stableStringify(enums, 2) + "\n", "utf8");
}
```

- [ ] **Step 2: Wire it into the orchestrator**

In `tools/extract/src/build.ts`, after `writeCardsBulk`, add:

```typescript
import { writeEnums } from "./output/writeEnums.js";
// ...
writeEnums(cards, DATA_DIR);
console.log(`Wrote ${DATA_DIR}/enums.json`);
```

- [ ] **Step 3: Rebuild and inspect**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
cat data/enums.json | jq '.house, .type, .rarity, .set' | head -30
```

Expected: `enums.json` exists with sorted arrays for each enum.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/output/writeEnums.ts tools/extract/src/build.ts data/enums.json
git commit -m "feat(extract): collect and emit data/enums.json from extracted cards"
```

### Task M2.13: Write per-card JSON files

**Files:**
- Modify: `tools/extract/src/output/writeCards.ts`
- Create: `tools/extract/tests/writeCardsPerCard.test.ts`

- [ ] **Step 1: Write the failing test for per-card output**

`tools/extract/tests/writeCardsPerCard.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCardsPerCard } from "../src/output/writeCards.js";

const sample = [
  {
    id: 4,
    name: "Wrack",
    house: "life",
    type: "alteration",
    rarity: "common",
    set: "classic",
    target: "n/a",
    cost: { total: 0, primary: null, secondary: null, tertiary: null },
    stats: null,
    keywords: [],
    rules_text: "Wrack text.",
    art: { big: "assets/art/big/4.png", small: "assets/art/small/4.png" },
    audio: null,
    sources: { ncd_row: 1, card_text_file: "CardTextA.txt", card_text_line: 1 },
  },
];

describe("writeCardsPerCard", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sanctum-cards-"));
  });

  it("writes one file per card under data/cards/", () => {
    writeCardsPerCard(sample, dir);
    const files = readdirSync(join(dir, "cards"));
    expect(files).toContain("4.json");
    const c = JSON.parse(readFileSync(join(dir, "cards", "4.json"), "utf8"));
    expect(c.id).toBe(4);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test writeCardsPerCard
```

Expected: FAIL — `writeCardsPerCard` doesn't exist.

- [ ] **Step 3: Add `writeCardsPerCard` to `writeCards.ts`**

Add to `tools/extract/src/output/writeCards.ts`:

```typescript
export function writeCardsPerCard(cards: Card[], dataDir: string): void {
  const dir = join(dataDir, "cards");
  mkdirSync(dir, { recursive: true });
  for (const card of cards) {
    writeFileSync(
      join(dir, `${card.id}.json`),
      stableStringify(card, 2) + "\n",
      "utf8"
    );
  }
}
```

(`Card` import needed at the top: `import type { Card } from "../enrich/mergeCard.js";`)

- [ ] **Step 4: Wire into orchestrator**

In `build.ts` after `writeCardsBulk`:

```typescript
import { writeCardsBulk, writeCardsPerCard } from "./output/writeCards.js";
// ...
writeCardsPerCard(cards, DATA_DIR);
console.log(`Wrote ${cards.length} per-card files`);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test writeCardsPerCard
```

Expected: PASS.

- [ ] **Step 6: Rebuild and commit outputs**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
ls data/cards/ | head
ls data/cards/ | wc -l
git add tools/extract/src/output/writeCards.ts tools/extract/tests/writeCardsPerCard.test.ts tools/extract/src/build.ts data/cards/
git commit -m "feat(extract): emit per-card data/cards/<id>.json files"
```

### Task M2.14: Validate `cards.json` against schema in the extractor

**Files:**
- Create: `tools/extract/src/validate.ts`
- Modify: `tools/extract/src/build.ts`

- [ ] **Step 1: Write `validate.ts`**

```typescript
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import type { Card } from "./enrich/mergeCard.js";

export function validateCards(cards: Card[], schemaPath: string): void {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const failures: string[] = [];
  for (const card of cards) {
    if (!validate(card)) {
      failures.push(
        `Card ${card.id} (${card.name}) failed validation:\n  ${
          validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join("\n  ") ?? "unknown"
        }`
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `${failures.length} card(s) failed schema validation:\n${failures.join("\n\n")}`
    );
  }
}
```

- [ ] **Step 2: Call it from the orchestrator (before writing outputs)**

In `tools/extract/src/build.ts`, after `mergeCards` and before `writeCardsBulk`:

```typescript
import { validateCards } from "./validate.js";
// ...
const SCHEMA_PATH = resolve(REPO_ROOT, "data/schema.json");
console.log("Validating against schema ...");
validateCards(cards, SCHEMA_PATH);
console.log("  all cards valid");
```

- [ ] **Step 3: Rebuild and confirm**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
```

Expected: prints "all cards valid", continues to write outputs. If validation fails, fix the offending card derivation or schema constraint before continuing.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/validate.ts tools/extract/src/build.ts
git commit -m "feat(extract): validate emitted cards against data/schema.json"
```

### Task M2.15: Add CI step to validate per-card files

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add an extra step after the build, before the unchanged-data check**

```yaml
      - name: Validate per-card JSON files
        run: |
          # Use the same ajv we have in node_modules.
          node --input-type=module -e "
            import Ajv2020 from 'ajv/dist/2020.js';
            import addFormats from 'ajv-formats';
            import { readFileSync, readdirSync } from 'node:fs';
            import { join } from 'node:path';
            const schema = JSON.parse(readFileSync('data/schema.json', 'utf8'));
            const ajv = new Ajv2020({ allErrors: true, strict: true });
            addFormats.default(ajv);
            const validate = ajv.compile(schema);
            let bad = 0;
            for (const f of readdirSync('data/cards')) {
              const c = JSON.parse(readFileSync(join('data/cards', f), 'utf8'));
              if (!validate(c)) {
                bad++;
                console.error('FAIL', f, JSON.stringify(validate.errors));
              }
            }
            if (bad > 0) { console.error(bad, 'files failed'); process.exit(1); }
            console.log('All per-card files valid.');
          "
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: validate every per-card JSON file against the schema"
```

### Task M2.16: Open M2 PR and merge

- [ ] **Step 1: Push the branch (or current branch if M0/M1 were already merged)**

```bash
git push -u origin feat/data-pipeline
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base main --head feat/data-pipeline \
  --title "M2: extractor v1 — full schema, validation, per-card files" \
  --body "Implements milestone M2.

- JSON Schema (draft 2020-12) at data/schema.json with ajv tests
- Auto-generated TS types at types/card.d.ts
- Investigation of .ncd column meanings → ADR-0001
- Enrichment: parseCost, parseTarget, parseStats, parseKeywords
- Curated keyword allowlist tools/extract/src/keywords.json
- mergeCard produces full Card v1 records
- Per-card JSON files at data/cards/<id>.json
- data/enums.json collected from extracted cards
- Build-time schema validation; CI validates every per-card file

Closes M2 of docs/superpowers/plans/2026-05-24-sanctum-cards-data.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: Confirm with human, merge, sync**

```bash
gh pr merge --squash --delete-branch
git switch main
git fetch origin
git reset --keep origin/main
```

---

## M3 — Asset pipeline (`.bm_`/`.bmp` → PNG, manifest)

Goal: emit `assets/art/big/<id>.png`, `assets/art/small/<id>.png`, and `assets/manifest.json` (sha256 + dimensions per file).

### Task M3.1: Install sharp

**Files:**
- Modify: `tools/extract/package.json`

- [ ] **Step 1: Install**

```bash
cd tools/extract && pnpm add sharp
```

- [ ] **Step 2: Verify it works**

```bash
cd tools/extract && node -e "import('sharp').then(s => console.log('sharp', s.default.versions.sharp))"
```

Expected: prints sharp version (e.g., `sharp 0.34.x`).

- [ ] **Step 3: Commit**

```bash
git add tools/extract/package.json pnpm-lock.yaml
git commit -m "chore(extract): add sharp for image conversion"
```

### Task M3.2: Decode an image buffer to PNG

**Files:**
- Create: `tools/extract/src/input/images.ts`
- Create: `tools/extract/tests/images.test.ts`

- [ ] **Step 1: Write the failing test**

`tools/extract/tests/images.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { decodeImageToPng } from "../src/input/images.js";
import { openZip, readZipEntry } from "../src/input/zip.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");

describe("decodeImageToPng", () => {
  it("converts a renamed-JPEG .bm_ to PNG", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1026.bm_");
    const png = await decodeImageToPng(buf);
    expect(png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  it("converts a real BMP .bmp to PNG", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1039.bmp");
    const png = await decodeImageToPng(buf);
    expect(png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  it("produces byte-identical output for the same input", async () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/bin/bitmaps/cards/big_cards/1026.bm_");
    const a = await decodeImageToPng(buf);
    const b = await decodeImageToPng(buf);
    expect(a.equals(b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test images
```

Expected: FAIL with module not found.

- [ ] **Step 3: Write the implementation**

`tools/extract/src/input/images.ts`:

```typescript
import sharp from "sharp";

export interface DecodedImage {
  png: Buffer;
  width: number;
  height: number;
}

export async function decodeImageToPng(input: Buffer): Promise<Buffer> {
  const out = await sharp(input, { failOn: "none" })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      effort: 10,
    })
    .toBuffer();
  return out;
}

export async function decodeImage(input: Buffer): Promise<DecodedImage> {
  const pipeline = sharp(input, { failOn: "none" });
  const meta = await pipeline.metadata();
  const png = await pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: false, effort: 10 })
    .toBuffer();
  return { png, width: meta.width ?? 0, height: meta.height ?? 0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test images
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/input/images.ts tools/extract/tests/images.test.ts
git commit -m "feat(extract): decode renamed-JPEG and BMP card art to deterministic PNG"
```

### Task M3.3: Write all card art and the manifest

**Files:**
- Create: `tools/extract/src/output/writeAssets.ts`
- Modify: `tools/extract/src/build.ts`

- [ ] **Step 1: Implement the writer**

`tools/extract/src/output/writeAssets.ts`:

```typescript
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import { decodeImage } from "../input/images.js";
import { readZipEntry, listZipEntries, type Zip } from "../input/zip.js";

export interface AssetManifestEntry {
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
}

export interface AssetManifest {
  art: {
    big: Record<string, AssetManifestEntry>;
    small: Record<string, AssetManifestEntry>;
  };
}

const BIG_PREFIX = "Sanctum18/bin/bitmaps/cards/big_cards/";
const SMALL_PREFIX = "Sanctum18/bin/bitmaps/cards/small_cards/";

function idFromEntry(name: string, prefix: string): number | null {
  const tail = name.slice(prefix.length);
  const m = tail.match(/^(\d+)\.(?:bm_|bmp|BMP)$/);
  if (!m) return null;
  return parseInt(m[1]!, 10);
}

async function processSizeBucket(
  zip: Zip,
  prefix: string,
  outDir: string
): Promise<Record<string, AssetManifestEntry>> {
  mkdirSync(outDir, { recursive: true });
  const entries = listZipEntries(zip, prefix).filter(
    (n) => idFromEntry(n, prefix) !== null
  );
  const out: Record<string, AssetManifestEntry> = {};
  for (const entry of entries) {
    const id = idFromEntry(entry, prefix);
    if (id === null) continue;
    const buf = readZipEntry(zip, entry);
    const { png, width, height } = await decodeImage(buf);
    const outPath = join(outDir, `${id}.png`);
    writeFileSync(outPath, png);
    out[id.toString()] = {
      path: outPath
        .replace(/^.+?\/(assets\/)/, "$1")
        .replace(/\\/g, "/"),
      sha256: createHash("sha256").update(png).digest("hex"),
      width,
      height,
      bytes: png.length,
    };
  }
  return out;
}

export async function writeArtAssets(zip: Zip, assetsDir: string): Promise<void> {
  const big = await processSizeBucket(zip, BIG_PREFIX, join(assetsDir, "art", "big"));
  const small = await processSizeBucket(zip, SMALL_PREFIX, join(assetsDir, "art", "small"));
  const manifest: AssetManifest = { art: { big, small } };
  writeFileSync(
    join(assetsDir, "manifest.json"),
    stableStringify(manifest, 2) + "\n",
    "utf8"
  );
}
```

- [ ] **Step 2: Wire into orchestrator**

In `tools/extract/src/build.ts`:

```typescript
import { writeArtAssets } from "./output/writeAssets.js";
// ...
const ASSETS_DIR = resolve(REPO_ROOT, "assets");
console.log(`Writing card art to ${ASSETS_DIR} ...`);
await writeArtAssets(zip, ASSETS_DIR);
console.log("Done with art.");
```

Make `main()` async:

```typescript
async function main(): Promise<void> {
  // ... existing body, now with await ...
}
main();
```

- [ ] **Step 3: Run the build**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
ls assets/art/big/ | wc -l
ls assets/art/small/ | wc -l
jq '.art.big | length' assets/manifest.json
file assets/art/big/1026.png
```

Expected: ~1,100 PNGs in big/, similar count in small/; manifest counts match. `file` reports PNG image data with valid dimensions.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/output/writeAssets.ts tools/extract/src/build.ts assets/
git commit -m "feat(extract): decode and write card art PNGs + asset manifest"
```

### Task M3.4: Update card records to reference only assets that exist

**Files:**
- Modify: `tools/extract/src/enrich/mergeCard.ts`

Currently `mergeCard` always emits `art.big`/`art.small` paths. Some cards don't have art. Use the asset manifest to set paths to `null` where the asset is missing.

- [ ] **Step 1: Update the orchestrator to pass asset paths into merge**

In `tools/extract/src/build.ts`, build a set of available art ids from the manifest after writing assets:

```typescript
import { readFileSync } from "node:fs";
// ...
// After writeArtAssets:
const manifest = JSON.parse(
  readFileSync(join(ASSETS_DIR, "manifest.json"), "utf8")
);
const bigArtIds = new Set(Object.keys(manifest.art.big));
const smallArtIds = new Set(Object.keys(manifest.art.small));

const cards = mergeCards(ncd, cardText, {
  onWarning: (msg) => console.warn(`  WARN: ${msg}`),
  bigArtIds,
  smallArtIds,
});
```

- [ ] **Step 2: Update `mergeCards` to take art-ids and emit null when missing**

In `tools/extract/src/enrich/mergeCard.ts`:

```typescript
export interface MergeOptions {
  onWarning?: (msg: string) => void;
  bigArtIds?: Set<string>;
  smallArtIds?: Set<string>;
}

// ... within the card construction loop:
const big = opts.bigArtIds?.has(rec.id.toString())
  ? `assets/art/big/${rec.id}.png`
  : null;
const small = opts.smallArtIds?.has(rec.id.toString())
  ? `assets/art/small/${rec.id}.png`
  : null;
const art = big || small ? { big, small } : null;
```

- [ ] **Step 3: Rebuild and confirm**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
jq '[.[] | select(.art == null)] | length' data/cards.json
jq '[.[] | select(.art != null and .art.big == null)] | length' data/cards.json
```

Expected: numbers reflect the actual gaps in the archive (likely a small number).

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/enrich/mergeCard.ts tools/extract/src/build.ts data/cards.json data/cards/
git commit -m "feat(extract): set card.art paths to null when image is missing"
```

### Task M3.5: Open M3 PR and merge

- [ ] **Step 1: Push, open PR, merge after confirmation**

(Same flow as M0.9 / M1.10 / M2.16: push branch, open PR with milestone description, confirm with human, squash-merge, sync local.)

PR title: `M3: asset pipeline — decode card art PNGs and emit manifest`.

---

## M4 — Decks + audio

Goal: emit `data/decks/<name>.json` from the 12 preconstructed `.dck` files and copy through `assets/sounds/<id>.wav` files referenced by cards.

### Task M4.1: Parse a `.dck` deck file

**Files:**
- Create: `tools/extract/src/input/decks.ts`
- Create: `tools/extract/tests/decks.test.ts`

`.dck` binary layout (observed in the archive):
- 4 bytes little-endian: deck-name length
- N bytes: deck name (ASCII)
- 4 bytes: some flag (`ffffffff` observed)
- 4 bytes little-endian: card count
- 4 bytes little-endian: card-data size (in bytes including separators)
- ASCII payload: `<id>\t<id>\t...` (tab-separated card ids; trailing tab)
- Some trailing bytes (deck attribute flags)

- [ ] **Step 1: Write the failing test using a real deck fixture**

`tools/extract/tests/decks.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseDeck } from "../src/input/decks.js";
import { openZip, readZipEntry } from "../src/input/zip.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");

describe("parseDeck", () => {
  it("extracts name and card ids from ABOM_Starter.dck", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, "Sanctum18/Decks/PRECONSTRUCTED/ABOM_Starter.dck");
    const deck = parseDeck(buf);
    expect(deck.name).toBe("PRECON_ABOM");
    expect(deck.cards.length).toBeGreaterThanOrEqual(40);
    expect(deck.cards.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd tools/extract && pnpm test decks
```

- [ ] **Step 3: Write the implementation**

`tools/extract/src/input/decks.ts`:

```typescript
export interface Deck {
  name: string;
  cards: number[];
}

export function parseDeck(buf: Buffer): Deck {
  let offset = 0;
  const nameLen = buf.readInt32LE(offset);
  offset += 4;
  const name = buf.slice(offset, offset + nameLen).toString("latin1");
  offset += nameLen;
  // Skip 4-byte flag
  offset += 4;
  // Card count
  const cardCount = buf.readInt32LE(offset);
  offset += 4;
  // Payload size
  const payloadSize = buf.readInt32LE(offset);
  offset += 4;
  const payload = buf.slice(offset, offset + payloadSize).toString("latin1");
  // The payload typically starts with a non-ASCII byte (size marker
  // like 0xbe for 0x1e=30); the parser tolerates anything up to the
  // first digit.
  const idStart = payload.search(/\d/);
  if (idStart < 0) {
    throw new Error(`Deck ${name}: no card ids in payload`);
  }
  const idsText = payload.slice(idStart).replace(/[^\d\t]/g, "");
  const cards = idsText
    .split(/\t+/)
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n));
  if (cards.length !== cardCount) {
    // Some decks include card-count discrepancies between header and
    // payload due to extra trailing bytes; trust the payload.
  }
  return { name, cards };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd tools/extract && pnpm test decks
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/extract/src/input/decks.ts tools/extract/tests/decks.test.ts
git commit -m "feat(extract): parse .dck preconstructed deck files"
```

### Task M4.2: Write deck JSON

**Files:**
- Create: `tools/extract/src/output/writeDecks.ts`
- Modify: `tools/extract/src/build.ts`

- [ ] **Step 1: Write the deck writer**

```typescript
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { Deck } from "../input/decks.js";

export function writeDeck(deck: Deck, slug: string, dataDir: string): void {
  const dir = join(dataDir, "decks");
  mkdirSync(dir, { recursive: true });
  const out = {
    name: deck.name,
    slug,
    cards: deck.cards.slice().sort((a, b) => a - b),
  };
  writeFileSync(
    join(dir, `${slug}.json`),
    stableStringify(out, 2) + "\n",
    "utf8"
  );
}
```

- [ ] **Step 2: Wire it into the orchestrator**

In `build.ts`, after the cards are written:

```typescript
import { parseDeck } from "./input/decks.js";
import { writeDeck } from "./output/writeDecks.js";

const DECKS_PREFIX = "Sanctum18/Decks/PRECONSTRUCTED/";
const deckEntries = listZipEntries(zip, DECKS_PREFIX).filter((n) =>
  n.toLowerCase().endsWith(".dck")
);
for (const entry of deckEntries) {
  const slug = entry.slice(DECKS_PREFIX.length).replace(/\.dck$/i, "").toLowerCase();
  const deck = parseDeck(readZipEntry(zip, entry));
  writeDeck(deck, slug, DATA_DIR);
}
console.log(`Wrote ${deckEntries.length} decks.`);
```

- [ ] **Step 3: Build and inspect**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
ls data/decks/
jq '.cards | length' data/decks/abom_starter.json
```

Expected: 12 decks; each has the expected count.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/output/writeDecks.ts tools/extract/src/build.ts data/decks/
git commit -m "feat(extract): emit data/decks/*.json from preconstructed .dck files"
```

### Task M4.3: Copy through sound files

**Files:**
- Modify: `tools/extract/src/output/writeAssets.ts`
- Modify: `tools/extract/src/build.ts`

- [ ] **Step 1: Add a `writeSounds` function**

In `writeAssets.ts`:

```typescript
const SOUNDS_PREFIX = "Sanctum18/bin/sounds/";

export function writeSounds(zip: Zip, assetsDir: string): Record<string, AssetManifestEntry> {
  const outDir = join(assetsDir, "sounds");
  mkdirSync(outDir, { recursive: true });
  const entries = listZipEntries(zip, SOUNDS_PREFIX);
  const out: Record<string, AssetManifestEntry> = {};
  for (const entry of entries) {
    const filename = entry.slice(SOUNDS_PREFIX.length);
    if (!/\.wav$/i.test(filename)) continue;
    const buf = readZipEntry(zip, entry);
    const outPath = join(outDir, filename.toLowerCase());
    writeFileSync(outPath, buf);
    out[filename.replace(/\.wav$/i, "").toLowerCase()] = {
      path: `assets/sounds/${filename.toLowerCase()}`,
      sha256: createHash("sha256").update(buf).digest("hex"),
      width: 0,
      height: 0,
      bytes: buf.length,
    };
  }
  return out;
}
```

(Adjust the `AssetManifest` interface to include `sounds`, and add it to `writeArtAssets`'s manifest emission, or split into a separate manifest update.)

- [ ] **Step 2: Wire into orchestrator**

In `build.ts`:

```typescript
import { writeArtAssets, writeSounds } from "./output/writeAssets.js";
// ...
const sounds = writeSounds(zip, ASSETS_DIR);
console.log(`Wrote ${Object.keys(sounds).length} sound files.`);
```

Extend the manifest to include `sounds`; rebuild manifest after both art and sound writes complete.

- [ ] **Step 3: Build and inspect**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
ls assets/sounds/ | head
jq '.sounds | length' assets/manifest.json
```

Expected: hundreds of `.wav` files copied; manifest includes them.

- [ ] **Step 4: Commit**

```bash
git add tools/extract/src/output/writeAssets.ts tools/extract/src/build.ts assets/sounds/ assets/manifest.json
git commit -m "feat(extract): copy through .wav sound files and add them to manifest"
```

### Task M4.4: Link audio paths into card records

**Files:**
- Modify: `tools/extract/src/build.ts`
- Modify: `tools/extract/src/enrich/mergeCard.ts`

- [ ] **Step 1: Pass sound ids into merge**

In `build.ts`:

```typescript
const audioIds = new Set(Object.keys(sounds));
const cards = mergeCards(ncd, cardText, {
  onWarning: ...,
  bigArtIds,
  smallArtIds,
  audioIds,
});
```

- [ ] **Step 2: Update `mergeCards` to set `audio` when present**

In `mergeCard.ts`:

```typescript
export interface MergeOptions {
  // ...
  audioIds?: Set<string>;
}

// In the construction loop:
const audio = opts.audioIds?.has(rec.id.toString())
  ? `assets/sounds/${rec.id}.wav`
  : null;
```

- [ ] **Step 3: Rebuild, confirm, commit**

```bash
cd /home/dmm/src/sanctum-cards && pnpm --filter @sanctum-cards/extract build
jq '[.[] | select(.audio != null)] | length' data/cards.json
git add tools/extract/src/build.ts tools/extract/src/enrich/mergeCard.ts data/cards.json data/cards/
git commit -m "feat(extract): link card.audio paths for cards with .wav files"
```

### Task M4.5: Open M4 PR and merge

(Same flow. Title: `M4: preconstructed decks + audio passthrough`.)

---

## Self-review and wrap-up

After M4 lands:

- [ ] Verify `data/cards.json` has all expected fields populated; spot-check 10 random cards against `jq` queries
- [ ] Verify `data/decks/*.json` has all 12 preconstructed decks
- [ ] Verify `assets/manifest.json` matches actual files on disk via a small script (sha256 check)
- [ ] Update the project `README.md` Status section to reflect "data complete; site upcoming (M5+)"
- [ ] Open a GitHub Issue titled "M5–M7 plan needed" referencing the next plan file

**At this point, the M5–M7 plan can be written, since the actual schema and data shape will be concrete.**
