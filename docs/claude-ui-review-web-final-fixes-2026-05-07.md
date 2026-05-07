# Claude UI Review Final Fixes

Date: 2026-05-07

## Targets

- Web URL: https://minougun.github.io/jijii-kobushi/
- Local path: `/mnt/c/Users/minou/jii-kobushi`
- Source review: `/mnt/c/Users/minou/jii-kobushi/docs/claude-ui-review-web-final-2026-05-07-result.md`

## Goal

Fix every item from the Claude Code final UI review:

- M1: `NotoSansJP-JiiKobushi-subset.woff2` missing UI glyphs.
- L1: `helpGuide` missing `aria-label`.
- L2: Hard difficulty subtitle clipping risk on small landscape viewports.
- L3: Language selector semantics should match an exclusive selection control.

## Fixes

- Regenerated `assets/fonts/NotoSansJP-JiiKobushi-subset.woff2` from current `index.html`, `README.md`, `src/**/*.js`, and `src/**/*.css` text plus ASCII punctuation.
- Verified the regenerated WOFF2 has zero missing non-ASCII glyphs for the scanned Web UI source set.
- Updated `assets/fonts/README.md` with the new 2026-05-07 generation scope.
- Added `aria-label="操作ガイド"` to `#helpGuide`.
- Changed the language selector container to `role="radiogroup"` and the language buttons to `role="radio"` with `aria-checked`.
- Updated `syncSettings()` to keep `aria-checked` in sync for Japanese/English selection.
- Increased small-landscape title difficulty button min-width from `116px` to `128px`.

## Verification

- `uvx --from fonttools --with brotli python ...`: pass, `missing_count 0`
- `node --check src/main.js`: pass
- `node --check scripts/smoke-web-ui.mjs`: pass
- `git diff --check`: pass
- `npm run check`: pass
- `npm run test:web-smoke:strict`: pass
- `npm run review:persona`: Average 96.0 / 100

## External Tracking

- GitHub Issue: `not_applicable`, direct user-requested follow-up.
- Commit: created locally after verification.
- PR: `not_applicable`, no branch/PR requested.
- Deploy: `not_performed`, production deploy was not explicitly requested for this turn.
