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
- **No new cards.** Sanctorum's cards, community expansions, balance adjustments — all out of scope.
- **No expansions beyond what ships in Sanctum 1.8.** If others want to publish later sets, that's a separate repo.

### What changed from the original non-goals

The initial spec listed "no binary reverse-engineering" as a non-goal, expecting that `Sanctum.ncd`, `CardText*.txt`, and the bitmap files would carry everything we needed. Empirical investigation (see ADR-0001) showed this was wrong: `Sanctum.ncd` carries only `id, name, type-letter, target-letter, effect-record-fk, related-card-fk` — **mana cost, rarity, and set are not in any extractable data file** and live as static tables inside `Sanctum-Debug-2008.exe`. Skipping RE would leave the schema incomplete, defeating the project's purpose, so light RE of the debug build (which has RTTI + source-path debug strings retained) is now in scope, narrowly: locate and extract the card-data static tables. We are not reading the executable's runtime logic, only its embedded data.

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
  "type": "summoning",
  "target": "group",
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
  "starter_decks": ["despair"],
  "effect_record_id": null,
  "related_card_id": null,
  "sources": {
    "ncd_row":           27,
    "card_text_file":    "CardTextA.txt",
    "card_text_line":    27,
    "cost_table_offset": "0x01b34c20"
  }
}
```

> **Why no `house` field on cards?** Investigation showed that house is a property of **decks**, not cards. Each of the 12 houses generates 2 specific mana types from its Sanctum; any card whose mana cost can be paid is castable, regardless of the deck's house. Cards that *flavor-belong* to a house surface that association via the `starter_decks` array (e.g., Nightmare appears in the Despair starter deck). See ADR-0001 and §7.5 below.

### 7.2 Field-by-field

| Field | Required? | Source | Notes |
|---|---|---|---|
| `id` | yes | `.ncd` col 1 | canonical identifier; matches `.dck` refs and art filenames |
| `name` | yes | `.ncd` col 8 | e.g. "Nightmare", "Wrack" |
| `type` | yes | enum | `.ncd` col 5 letter → `alteration, conjuration, manipulation, summoning, hero` (per ADR-0001) |
| `target` | yes | enum | `.ncd` col 6 letter → `recruit, recruit_group, square, globe, structure, minion, group, monster, monster_group` (per ADR-0001) |
| `cost.total` | yes | computed | sum of primary + secondary + tertiary amounts |
| `cost.{primary,secondary,tertiary}` | partial | **`Sanctum-Debug-2008.exe` static table** | mana types: `clarity / mystery / order / strife / will / world` — extracted via Ghidra from the `CSpellCost` table (see §8.3) |
| `stats.*` | optional (creatures only) | regex-parsed from rules text | `H:3 A:1 HP:10 L:2` → fields; `M:2` for missile units |
| `keywords` | yes (may be empty) | regex-parsed against allowlist | `Flight, Mountainwalk, Nomadic, Expansive, Concealed, Waterwalk, Withdraws, ...` |
| `rules_text` | yes | `CardText*.txt` | raw, unmodified |
| `art.big`, `art.small` | optional | converted from `.bm_`/`.bmp` | not every card has both |
| `audio` | optional | `bin/sounds/<id>.wav` | only some cards |
| `sources` | yes | extractor | provenance for audit |

### 7.3 Centralized enums

`data/enums.json` lists canonical values for `type`, `target`, `keywords`, `mana_type`, and `house` (the latter for deck-level use, see §7.6). Enums populated during extraction; the extractor **fails the build** if a previously-unseen value appears, forcing either an enum update or a parser fix.

Fixed enums (won't change without source-data change):
- `mana_type`: `clarity, mystery, order, strife, will, world`
- `house`: `abomination, body, death, despair, hope, justice, life, making, mind, nature, unmaking, war`
- `type`: `alteration, conjuration, manipulation, summoning, hero`
- `target`: `recruit, recruit_group, square, globe, structure, minion, group, monster, monster_group`

Discovered enums (extractor populates):
- `keywords` (~30-50 entries from the hand-curated allowlist)

### 7.6 Deck schema (added; see §7.1 note)

Decks are first-class records, separate from cards. House is a deck property — not a card property — per ADR-0001 findings.

```json
{
  "name": "PRECON_DESPAIR",
  "slug": "despair_starter",
  "house": "despair",
  "is_preconstructed": true,
  "cards": [1026, 1026, 1026, 1027, ...]
}
```

| Field | Required? | Notes |
|---|---|---|
| `name` | yes | the deck's internal name (from `.dck` binary header) |
| `slug` | yes | filename-safe slug used for `data/decks/<slug>.json` |
| `house` | yes for preconstructed | one of 12 houses; nullable for community decks if those are ever added |
| `is_preconstructed` | yes | `true` for the 12 starter decks shipped in 1.8 |
| `cards` | yes | array of card ids; multiplicities preserved (cards can appear ≥1 times) |

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
| `.ncd` | Tab-separated text, no header row. 8 columns confirmed (see ADR-0001): `id, id_dup, effect_record_fk, related_card_fk, type_letter, target_letter, id_dup, name`. Col 3/4 are nullable integer foreign keys, not bitfields | direct lookup tables per ADR-0001 |
| `.nmd` | Plain-text error/status strings file (not monster data despite the name) | not used by the extractor; documented for completeness |
| `CardText*.txt` (A, B, C, O, R, W) | Per-card rules text. **3 columns**, not 4: `id, type_letter, text`. Multiple rows per card id, one per type_letter (`s=spell, f=flavor, n=short-name, h=help, m=mobile`) | parse all six; filter to `type_letter == 's'` for `rules_text` |
| `.dck` | Small binary header (deck name length + name + flags) followed by tab-separated ASCII card IDs | parse header bytes (xxd-confirmed layout); ids are ASCII |
| `Sanctum-Debug-2008.exe` | PE32 (i386), MSVC 2008 build with RTTI symbols and source paths retained. `.rdata` section (~5.6 MB) contains static initializers for `CSpellCost` records — one per card id. **Cost / rarity / set / starter-deck affiliation data lives here.** | extracted via Ghidra (headless or GUI); see §8.6 |

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

### 8.6 Binary RE pipeline (one-shot, output committed)

The cost / rarity / set / starter-deck-affiliation data is extracted from `Sanctum-Debug-2008.exe` once and committed as `inputs/extracted-card-data.json` (or similar). The extractor consumes this JSON like any other input — it does not re-run Ghidra on every build.

Pipeline:
1. Human or subagent runs Ghidra (GUI or `analyzeHeadless`) against `Sanctum-Debug-2008.exe`.
2. A Ghidra script (Python or Java) follows cross-references from `CSpellCost::CSpellCost` constructor, walks the static initializer array, and emits one JSON record per card id with fields: `cost.primary{type,amount}`, `cost.secondary`, `cost.tertiary`, `rarity`, `set`, `starter_deck_affiliation`.
3. The script's output is committed as `inputs/cards-from-binary.json` along with the script itself (`tools/re/extract-cost-table.py`) and an ADR (ADR-0002) documenting the table layout discovered.
4. The TypeScript extractor reads `inputs/cards-from-binary.json` during merge.

Why this design:
- The Ghidra step is one-shot; nothing about the binary is changing under us.
- The output is a normal JSON file that's reviewable, diff-able, and reproducible — anyone with the binary + the script can verify it.
- The TS extractor stays simple (it reads JSON, not PE files).

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
| `/cards/` | Paginated list with filters: type (5), target (9), cost ≤ N, rarity, set, keyword, starter-deck affiliation |
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
| **M0** | Repo bootstrap | LICENSE-CODE/-DATA/NOTICE in place; .gitignore; basic README — **done** (PR #3) |
| **M1** | Extractor v0 | reads zip, emits `cards.json` with id+name+spell rules text — **done** (PR #5) |
| **M2** | Extractor v1 | full schema, parsed type/target/stats/keywords; per-card JSON, enums; cost/rarity/set from binary RE | **in progress** |
| **M2.5** | Binary RE | Ghidra extracts `CSpellCost` static table from `Sanctum-Debug-2008.exe` → `inputs/cards-from-binary.json` and ADR-0002 | new, blocks M2 finish |
| **M3** | Asset pipeline | `.bm_`/`.bmp` → PNG; `assets/art/big/*.png` exists for every card with art |  |
| **M4** | Decks + audio | `data/decks/*.json` includes `house` and `is_preconstructed`; `assets/sounds/*.wav` |  |
| **M5** | Site v0 | 11ty list + detail pages, deployed to GitHub Pages |  |
| **M6** | Site v1 | filter UI + Pagefind search working |  |
| **M7** | 1.0 release | README polish, Discord/FB announcement, CHANGELOG, tagged `v1.0.0` |  |

Estimated effort revised after ADR-0001 + binary-RE addition: single developer, evenings/weekends, 3–5 weeks for M0–M5; +~1 week for M6–M7. The binary RE adds 1–3 days depending on table layout complexity.

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
| Reading runtime logic from `Sanctum.exe` | the rules-engine project, sub-project C. M2.5 limits binary RE to data-table extraction only. |

## 16. Open decisions still TBD

- ~~**Exact `type` enum values:**~~ **Resolved by ADR-0001.** Five values: `alteration, conjuration, manipulation, summoning, hero`.
- ~~**Exact `target` enum values:**~~ **Resolved by ADR-0001.** Nine values from `.ncd` col 6, listed in §7.3.
- **Exact `rarity` enum and per-card rarity values:** **TBD via M2.5 binary RE** of the `CSpellCost` static table.
- **Exact `set` enum:** **TBD via M2.5.** Sanctum 1.8 likely has just `classic`, but the binary may distinguish base set + expansions.
- **Cost-table layout in the binary:** **TBD via M2.5.** Likely an array of `CSpellCost` records indexed by id; exact field order discovered during RE.
- **Per-card "starter-deck affiliation":** if the binary records which house's starter pool a card was designed for (separately from which decks it currently appears in), surface as `starter_deck_affiliation`. Otherwise, derive from `data/decks/*_starter.json` membership.
- **Keyword vocabulary:** final list curated during M2 keyword pass.
- **Custom domain for the site:** optional; decided at M7.
- **Whether to ship `assets/sounds/` in the main repo or as a Release tarball:** decided at M4 based on size.
