# Production And Switch UI Review Fixes

Date: 2026-05-07

## Targets

- Web URL: https://minougun.github.io/jijii-kobushi/
- Local path: `/mnt/c/Users/minou/jii-kobushi`
- GitHub repo: https://github.com/minougun/jijii-kobushi

## Scope

Apply the Claude Code final UI review fixes to the Web original and propagate the applicable change to the Switch port.

Web fixes were committed in:

- `7b55142 Fix final UI review findings`

Switch-port application:

- Regenerated `switch-port/assets/runtime-assets.json` with `npm run export:switch-assets`.
- The only Switch runtime asset contract change is the updated Git object id for `assets/fonts/NotoSansJP-JiiKobushi-subset.woff2`.
- HTML-only accessibility changes (`helpGuide` ARIA, Web language radiogroup semantics) are not directly applicable to the Unity/Switch prototype, but the Web-original source of truth now carries them.

## Verification

Before production push:

- `npm run check`: pass
- `npm run test:web-smoke:strict`: pass
- `npm run review:persona`: Average 96.0 / 100
- `npm run export:switch-assets`: pass

Required after push/deploy:

- `npm run test:web-smoke:pages`
- `npm run check:switch-local-complete`

## External Tracking

- GitHub Issue: `not_applicable`, direct user-requested follow-up.
- PR: `not_applicable`, main branch direct deployment requested.
