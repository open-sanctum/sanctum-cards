# sanctum-cards — Design

- **Status:** Draft, awaiting review
- **Date:** 2026-05-24
- **Sub-project:** A of the Sanctum preservation effort (see "Scope decomposition" below)
- **Authors:** dmm (with brainstorming assistance)

## 1. Context

Sanctum was an online collectible card game published by Digital Addiction circa 1997. After DA folded, the IP passed to NIOGA; Jeff (community member) currently operates a Sanctum server out of his garage that keeps the original game playable for the ~350-player community. Jamey (ex-Digital Addiction) is independently developing **Sanctorum**, a commercial spiritual-successor using all-new assets — not a fork of the original.

The Sanctum 1.8 client (`Sanctum18-04.zip`) is the canonical artifact of the original game and contains all card art, rules text, structured metadata, sound effects, scenario maps, and the executable itself. The data is in clean enough formats that a preservation-quality structured database can be extracted without reverse-engineering any binary.

This document specifies sub-project A: an open, canonical, machine-readable database of every Sanctum 1.8 card, plus a browseable static site for human consumption.

## 2. Scope decomposition (context only)

The wider effort has four sub-projects, each gets its own spec/plan/implementation cycle. This document covers only **A**.

| Sub-project | What it is | Status |
|---|---|---|
| **A. Open card database** | This spec. JSON + assets + static browse site. | **drafting** |
| **B. Web draft tool** | Browser-based drafter; produces deck files. Depends on A. | future |
| **C. Play layer** | Either export decks into Sanctorum or build a rules engine. | future |
| **D. Outreach** | Conversations with Jamey, Jeff, community. Not code. | concurrent |

## 3. Goal

Publish an open, canonical, structured representation of every Sanctum 1.8 card — metadata, rules text, and art — usable by any downstream tool, paired with a browseable static site for humans.

## 4. Non-goals

- **Not a rules engine, simulator, or play layer.** No spell execution. No combat resolution.
- **Not the draft tool yet** (sub-project B).
- **No binary reverse-engineering.** All inputs are extractable data files: `Sanctum.ncd`, `CardText*.txt`, `.dck`, image files, audio files. The executable is not opened.
- **No new cards.** Sanctorum's cards, community expansions, balance adjustments — all out of scope.
- **No expansions beyond what ships in Sanctum 1.8.** If others want to publish later sets, that's a separate repo.

## 5. Success criteria

1. Every card from the 1.8 archive has a structured JSON record containing: `id, name, house, type, rarity, set, target, cost (parsed), combat stats (where applicable), keywords, raw rules text, art paths, audio path (where applicable), sources (provenance)`.
2. `data/cards.json` (bulk array) and `data/cards/<id>.json` (per-card) are both committed, consistent with each other, and validate against `data/schema.json` in CI.
3. Anyone can `git clone` and either consume the JSON directly, browse the static site, or rerun the extractor from a fresh 1.8 zip and reproduce the output byte-for-byte.
4. The static site is publicly searchable and filterable on GitHub Pages.

## 6. Architecture

```
┌──────────────────────────────┐
│  inputs/Sanctum18-04.zip     │   ← original 1.8 archive, hash-pinned
└──────────────┬───────────────┘
               │
   ┌───────────▼────────────┐
   │  tools/extract/        │   ← TypeScript/Node; runs locally + in CI
   │  ─────────────         │
   │  parse_ncd.ts          │     reads Cache/Sanctum.ncd       (tab-sep metadata)
   │  parse_card_text.ts    │     reads Cache/CardText*.txt     (rules text)
   │  decode_bm.ts          │     reads bin/bitmaps/cards/...   (.bm_ = JPEG, .bmp = BMP)
   │  parse_decks.ts        │     reads Decks/PRECONSTRUCTED/.dck
   │  parse_keywords.ts     │     corpus-mines + allowlist match
   │  build.ts              │     orchestrates above; writes data/ + assets/
   └───────────┬────────────┘
               │
   ┌───────────▼────────────────────────────────┐
   │  data/                                     │   ← committed to repo
   │    cards.json        (bulk array)          │
   │    cards/<id>.json   (per-card)            │
   │    decks/<name>.json (preconstructed)      │
   │    enums.json        (collected enums)     │
   │    schema.json       (JSON Schema 2020-12) │
   │  assets/                                   │
   │    art/big/<id>.png                        │
   │    art/small/<id>.png                      │
   │    sounds/<id>.wav                         │
   │    manifest.json     (sha256, dimensions)  │
   └───────────┬────────────────────────────────┘
               │
   ┌───────────▼────────────┐         ┌─────────────────────────┐
   │  site/  (11ty)         │ ──────► │  GitHub Pages           │
   │  list / search / filter│  build  │  open-sanctum.github.io │
   │  card detail pages     │         │  /sanctum-cards/        │
   │  reads data/, assets/  │         │  (custom domain: TBD)   │
   └────────────────────────┘         └─────────────────────────┘
```

**Component boundaries:**

| Component | Inputs | Outputs | Has no business with |
|---|---|---|---|
| Extractor | the 1.8 zip | `data/`, `assets/` | the website |
| JSON Schema | (humans) | machine-validatable spec | extraction logic |
| Validator (CI) | `data/`, `schema.json` | pass/fail | extraction logic |
| Site (11ty) | `data/`, `assets/` | `dist/` HTML | reading the zip directly |

Each component is independently understandable and testable.

**Monorepo, single repository.** Extractor, data, and site live together. Simpler than splitting; each component small enough that one repo isn't unwieldy.

**Reproducibility contract:** extractor + hash-pinned zip → bit-identical `data/` and `assets/`. Changes to the extractor regenerate; the diff in `data/` is reviewable in PR.

## 7. Data schema

Goal: structured enough to filter and reason about, raw enough to never lose information.

### 7.1 Per-card JSON

```json
{
  "id": 1026,
  "name": "Nightmare",
  "house": "despair",
  "type": "monster",
  "rarity": "uncommon",
  "set": "classic",
  "target": "globe",
  "cost": {
    "total": 5,
    "primary":   { "type": "strife", "amount": 3 },
    "secondary": { "type": "will",   "amount": 2 },
    "tertiary":  null
  },
  "stats": {
    "hand_damage":  3,
    "missile":      null,
    "hp_max":       10,
    "level":        2,
    "attack_rate":  1
  },
  "keywords": ["Nomadic"],
  "rules_text": "H:3 A:1 HP:10 L:2 Nomadic. At start of combat against recruits, Nightmare casts Despond on opposing group.",
  "art": {
    "big":   "assets/art/big/1026.png",
    "small": "assets/art/small/1026.png"
  },
  "audio":  "assets/sounds/1026.wav",
  "sources": {
    "ncd_row":           27,
    "card_text_file":    "CardTextA.txt",
    "card_text_line":    27
  }
}
```

### 7.2 Field-by-field

| Field | Required? | Source | Notes |
|---|---|---|---|
| `id` | yes | `.ncd` integer key | canonical identifier; matches `.dck` refs and art filenames |
| `name` | yes | `.ncd` column 8 | e.g. "Nightmare", "Wrack" |
| `house` | yes | enum | one of 12: `abomination, body, death, despair, hope, justice, life, making, mind, nature, unmaking, war` |
| `type` | yes | enum | derived from `.ncd` type-letter column; exact mapping TBD-in-impl |
| `rarity` | yes | enum | `common / uncommon / rare / promo` (TBD-in-impl from `.ncd` flags) |
| `set` | yes | enum | `classic` + later expansion names (TBD-in-impl from `.ncd` flag bits) |
| `target` | yes | enum | derived by parsing leading "Cast on X" in rules text: `globe, group, recruit, monster, square, structure, town, colony, archer, swordsman, minion, ...` |
| `cost.total` | yes | computed | sum of primary + secondary + tertiary amounts |
| `cost.{primary,secondary,tertiary}` | partial | `.ncd` | mana types: `clarity / mystery / order / strife / will / world` |
| `stats.*` | optional (creatures only) | regex-parsed from rules text | `H:3 A:1 HP:10 L:2` → fields; `M:2` for missile units |
| `keywords` | yes (may be empty) | regex-parsed against allowlist | `Flight, Mountainwalk, Nomadic, Expansive, Concealed, Waterwalk, Withdraws, ...` |
| `rules_text` | yes | `CardText*.txt` | raw, unmodified |
| `art.big`, `art.small` | optional | converted from `.bm_`/`.bmp` | not every card has both |
| `audio` | optional | `bin/sounds/<id>.wav` | only some cards |
| `sources` | yes | extractor | provenance for audit |

### 7.3 Centralized enums

`data/enums.json` lists canonical values for `house`, `type`, `target`, `rarity`, `set`, `keywords`, `mana_type`. Enums populated during extraction; the extractor **fails the build** if a previously-unseen value appears, forcing either an enum update or a parser fix.

### 7.4 JSON Schema

`data/schema.json` is a JSON Schema (draft 2020-12). CI runs `ajv` against `cards.json` and every `cards/<id>.json` on push. TypeScript types are auto-generated from this schema via `json-schema-to-typescript` into `types/card.d.ts`, shared by the extractor, the site, and (later) the draft tool.

### 7.5 Two JSON layouts for two consumers

Both files are extractor outputs derived from the same inputs — the real source of truth is the zip + extractor logic, not either JSON file.

- `data/cards.json` — single array of all cards, ~1-2 MB. Optimized for site builds and bulk consumers that want one fetch.
- `data/cards/<id>.json` — one file per card. Optimized for reviewable diffs when the extractor's output for a single card changes; a PR touching one card produces a one-file diff rather than a delta inside a 1 MB blob.

CI checks the two views are consistent (per-card files concatenated match `cards.json` modulo ordering).

## 8. Extractor

### 8.1 Module structure

```
tools/extract/
├── package.json
├── tsconfig.json
├── src/
│   ├── build.ts              # entrypoint: orchestrates all extractors
│   ├── input/
│   │   ├── zip.ts            # opens Sanctum18-04.zip, verifies sha256
│   │   ├── ncd.ts            # parses Cache/Sanctum.ncd → CardMeta[]
│   │   ├── cardtext.ts       # parses Cache/CardText*.txt → Map<id, string>
│   │   ├── decks.ts          # parses Decks/PRECONSTRUCTED/*.dck → DeckRecord[]
│   │   └── images.ts         # decodes .bm_ (JPEG) and .bmp files → PNG buffers
│   ├── enrich/
│   │   ├── parseRulesText.ts # regex-mines target/keywords/stats from text
│   │   └── mergeCard.ts      # joins meta + text + parsed → Card
│   ├── output/
│   │   ├── writeCards.ts     # data/cards.json + data/cards/*.json
│   │   ├── writeAssets.ts    # assets/art/*, manifest with sha256
│   │   ├── writeDecks.ts     # data/decks/*.json
│   │   └── writeEnums.ts     # data/enums.json (collected during extraction)
│   └── validate.ts           # runs ajv against schema; fails build on mismatch
└── tests/                    # unit tests on small fixtures of each parser
```

### 8.2 Design properties

- **Pure functions for parsers.** They take buffers/strings, return objects, no I/O. Easy to test.
- **Single side-effect boundary.** Only `build.ts` and the `output/` modules touch the filesystem.
- **Fail loudly on unexpected input.** If `parseRulesText` sees `H:99 A:0 HP:NaN`, throw with the card id and offending line.
- **Idempotent, no state.** Running `npm run build` twice from a clean checkout produces byte-identical output.

### 8.3 Input formats — established facts

| Format | What we verified | Implementation note |
|---|---|---|
| `.bm_` | **Renamed JPEG** (magic bytes `FF D8 FF E0 ... JFIF`) | use `sharp` directly; convert to PNG |
| `.bmp` | Genuine Windows BMP (magic bytes `BM`); minority of card art | `sharp` also handles; same path |
| `.ncd` | Tab-separated text, no header row. 8 columns: `id, id_dup, flags?, flags?, type_letter, mana_or_target_letter, id_dup, name`. Flag values like 0/4100/4108/4118 suggest a bitfield. | parse defensively; treat unknown bits as opaque; record what we observe |
| `.nmd` | Likely "monster data" companion to `.ncd`; same tab-sep convention assumed | inspect during impl; parse if it carries info not in `.ncd` |
| `CardText*.txt` (A, B, C, O, R, W) | Per-card rules text. Tab-separated columns: `line#, id, type_letter, text`. Six files — letter suffix likely indicates set or category | parse all six; cross-check ids against `.ncd` |
| `.dck` | Small binary header (deck name length + name + flags) followed by tab-separated ASCII card IDs | parse header bytes (xxd-confirmed layout); ids are ASCII |

### 8.4 Keyword extraction policy

Two-pass:

1. **Corpus-discovery pass:** scan all ~1,100 rules-text strings; surface candidate keywords by heuristics — capitalized noun phrases in ≥3 cards, parenthesized definitions, recurring patterns. Output: `tools/extract/keywords-candidates.txt`, sorted by frequency.
2. **Hand-curated allowlist:** a human reviews and produces `tools/extract/keywords.json`. Extractor matches against allowlist; unknown matches become warnings (not errors), surfaced in build log.

This produces a *clean* keyword vocabulary suitable for filtering in the site and the draft tool.

### 8.5 Asset pipeline

- `.bm_` (JPEG) and `.bmp` (BMP) decoded via `sharp`, written as `assets/art/big/<id>.png` and `assets/art/small/<id>.png`
- Optional WebP variant (decide in impl based on size deltas)
- `manifest.json` records sha256 + dimensions per file
- `.wav` audio passed through unchanged to `assets/sounds/<id>.wav`

## 9. Static site

### 9.1 Tech stack

- **11ty** for static generation
- **Pagefind** for client-side search (no server, no Lunr ceremony)
- **Vanilla HTML/CSS** for layout; small sprinkle of vanilla JS (or Alpine.js if it stays light) for filter interactivity
- **GitHub Pages** for hosting at `open-sanctum.github.io/sanctum-cards/` (custom domain TBD)

### 9.2 Page set

| Path | Purpose |
|---|---|
| `/` | Landing: what this is, who made Sanctum, link to GH repo, search box, "browse all 1,100 cards" CTA |
| `/cards/` | Paginated list with filters: house (12), type, rarity, cost ≤ N, set, keyword |
| `/cards/<id>/` | Per-card detail: big art, rules text, parsed stats, "appears in deck:" backlinks, link to JSON |
| `/decks/` | Preconstructed deck list; click → deck detail |
| `/about/` | Project rationale, license, credits (DA, Jeff, Jamey, community) |
| `/api/` | Not a runtime API — documents `data/cards.json` and the schema |

No SSR, no APIs, no DB queries. All pages statically generated at build time. Pagefind indexes the build output for search.

### 9.3 Site structure

```
site/
├── .eleventy.js
├── package.json
├── src/
│   ├── _data/cards.js         # loads ../data/cards.json
│   ├── _includes/{base,card-tile}.njk
│   ├── index.njk
│   ├── cards.njk              # /cards/ — list + filters
│   ├── card.njk               # /cards/<id>/ — paginated over data
│   ├── decks.njk
│   ├── about.njk
│   └── assets/{css,js}/...
├── public/                    # favicon, etc.
└── pagefind.yml
```

## 10. Build pipeline (CI)

GitHub Actions, on every push to `main` and PRs:

```
extract → validate (ajv) → site build (11ty) → pagefind index → upload artifact
                                                                    ↓
                                                    deploy to GitHub Pages (main only)
```

Cache `data/` and `assets/` between runs based on extractor source hash; rerun extraction only when extractor or input zip changes. The zip (~33 MB) is committed to `inputs/`; extraction takes seconds.

## 11. Repo layout (top-level)

```
sanctum-cards/
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE-CODE                 # MIT (rename from auto-generated LICENSE)
├── LICENSE-DATA                 # CC-BY 4.0
├── NOTICE                       # original asset attribution
├── .github/
│   └── workflows/
│       ├── extract-and-build.yml
│       └── deploy-pages.yml
├── inputs/
│   ├── Sanctum18-04.zip         # vendored (~33 MB, under GH 50 MB single-file limit)
│   └── INPUT.md                 # provenance, sha256, license note, why we commit it
├── tools/
│   └── extract/                 # see §8
├── data/                        # extractor output (committed)
├── assets/                      # extractor output (committed)
├── site/                        # see §9
└── docs/
    ├── schema.md                # human-readable schema explanation
    ├── extractor.md             # how to run the extractor locally
    └── decisions/               # ADRs for non-obvious choices
```

## 12. License posture

| Artifact | License | Reasoning |
|---|---|---|
| Code (extractor, site, scripts) | **MIT** | ours, permissive |
| Schema & JSON data | **CC-BY 4.0** | our compilation/derivation; attribution to "sanctum-cards contributors" |
| Original rules text | "fair use for preservation"; attribution in NOTICE | uncopyrightable game-rule expressions, conservative framing |
| Original art | "all rights reserved to original author; included for preservation of an abandoned commercial work" | not sublicensed |
| Original audio | same as art | not sublicensed |

`NOTICE` makes the mix explicit. `README` points to it on line one. Removal-on-request policy in `CONTRIBUTING.md` for the unlikely event of community pushback.

## 13. Milestones

Each is a discrete shippable artifact, not a phase boundary.

| M | Description | Done when |
|---|---|---|
| **M0** | Repo bootstrap | LICENSE-CODE/-DATA/NOTICE in place; .gitignore; basic README |
| **M1** | Extractor v0 | reads zip, emits `cards.json` with id+name+raw rules text only |
| **M2** | Extractor v1 | full schema, parsed cost/stats/keywords/target, per-card JSON, enums |
| **M3** | Asset pipeline | `.bm_`/`.bmp` → PNG; `assets/art/big/*.png` exists for every card with art |
| **M4** | Decks + audio | `data/decks/*.json` + `assets/sounds/*.wav` |
| **M5** | Site v0 | 11ty list + detail pages, deployed to GitHub Pages |
| **M6** | Site v1 | filter UI + Pagefind search working |
| **M7** | 1.0 release | README polish, Discord/FB announcement, CHANGELOG, tagged `v1.0.0` |

Estimated effort, single developer, evenings/weekends: 2–4 weeks for M0–M5; +~1 week for M6–M7.

## 14. Risks / open questions

| Risk | Mitigation |
|---|---|
| `sharp` rejects an exotic JPEG variant | spot-check first; fall back to `jpeg-js`; worst case re-encode via a CLI fallback |
| `.ncd` flag-bit semantics differ from what we observe | parse defensively; emit warnings for unknown bits; record observations in `docs/decisions/` |
| Some cards have no art (abstract spells) | tolerate; record `art: null`; render placeholder |
| Some rules text references mechanics whose keywords we don't recognize | keep keyword list a whitelist with warnings, not strict requirement |
| GitHub Pages bandwidth limits on assets | check `assets/` total size; consider Release tarball if CDN needed |
| Community pushback after publication | per dmm's read of the community, unlikely; removal-on-request policy ready |

## 15. Out of scope (explicit deferrals)

| Topic | Where it lives |
|---|---|
| Web draft tool | sub-project B |
| Card-rule execution engine | sub-project C |
| `.dck` ↔ Sanctorum format compatibility | sub-project C |
| Multiplayer lobby / server | sub-project C |
| Outreach to Jamey & Jeff | sub-project D (concurrent, not code) |
| Cards added by Sanctorum or community after 1.8 | future, separate repo |
| Binary reverse-engineering | only if rules engine ever happens |

## 16. Open decisions still TBD

- **Exact `type` enum values:** the single-letter type column in `.ncd` (`a/m/c/s/...`) needs cross-referencing with card behavior. Discovered during M2.
- **Exact `rarity` and `set` enums:** flag-bit semantics in `.ncd` columns 3-4. Discovered during M2.
- **Keyword vocabulary:** final list curated during M2 keyword pass.
- **Custom domain for the site:** optional; decided at M7.
- **Whether to ship `assets/sounds/` in the main repo or as a Release tarball:** decided at M4 based on size.
