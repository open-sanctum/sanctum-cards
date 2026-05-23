# Input archive

This directory contains the source archive the extractor reads.

## Sanctum18-04.zip

- **Origin:** Sanctum 1.8 client, build 18-04 (2014-01-24)
- **Size:** ~33 MB
- **SHA-256:** `35eab39052545c20e20eda904ad35f3196d894c874316092c0fedd0f07edf220`
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
