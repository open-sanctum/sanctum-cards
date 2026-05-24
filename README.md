# sanctum-cards

An open, structured database of every card from the
**Sanctum** collectible card game (Digital Addiction, ~1997).
Extracted from the Sanctum 1.8 client archive into clean,
machine-readable JSON, with the original art and sounds bundled
alongside.

> **Licenses:** code MIT, data CC-BY 4.0, original game content
> acknowledged but not relicensed. See `NOTICE` for full details.

## What's in this repo

- `data/cards.json` — all 614 cards as a single JSON array
- `data/cards/<id>.json` — one file per card for reviewable diffs
- `data/decks/<slug>.json` — the 12 preconstructed starter decks
- `data/schema.json` — JSON Schema (draft 2020-12) every card validates against
- `data/enums.json` — canonical enums (card types, targets, keywords, ...)
- `assets/art/big/<id>.png` — card art decoded from the source `.bm_`/`.jpg`/`.bmp` files; 620 PNGs total
- `assets/sounds/<name>.wav` — sound effects, copied through unchanged; 168 files (128 keyed by card id, 40 named UI sounds)
- `assets/manifest.json` — sha256 + dimensions/bytes per asset file
- `tools/extract/` — TypeScript extractor that produces all of the above
- `inputs/Sanctum18-04.zip` — the source archive (hash-pinned)

The archive carries no per-id small-card art (the original deck builder
rendered those on the fly), so `assets/art/small/` is currently empty
and every card has `art.small = null`.

## Quick start

```bash
# Just want the data? Clone and read.
git clone https://github.com/open-sanctum/sanctum-cards.git
cat sanctum-cards/data/cards.json | jq '.[] | select(.type == "summoning") | .name'

# Want to rerun the extractor from the source zip?
cd sanctum-cards
pnpm install
pnpm --filter @sanctum-cards/extract build
```

## Status

Data pipeline complete (milestones M0-M4): 614 cards, 12 starter
decks, 620 card-art PNGs, and 168 sounds. Output is byte-identical
across runs and CI verifies determinism on every PR.

Next: a browseable card-database site (M5+, plan not yet written).
See `docs/superpowers/specs/` for the design and
`docs/superpowers/plans/` for the implementation plans.

## Related projects

- **Sanctorum** ([@SanctorumLLC](https://github.com/SanctorumLLC)) — a
  commercial reconstruction using all-new assets. Independent of
  this project.
- The original **Sanctum** server (the 1.8 client + a Digital
  Addiction-era server binary) is run by the community.

## Contributing

See `CONTRIBUTING.md`. Issues and PRs welcome.
