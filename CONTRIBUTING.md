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
