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
