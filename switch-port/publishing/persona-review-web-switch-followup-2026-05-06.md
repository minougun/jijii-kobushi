# Persona Review Follow-up: Web and Switch Port

Date: 2026-05-06

Web original: `https://minougun.github.io/jijii-kobushi/`
Local repo: `/mnt/c/Users/minou/jii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Applied To Web Original

| Review item | Action |
| --- | --- |
| OGP / description missing | Added description, Open Graph, and Twitter card metadata to `index.html`. |
| Favicon missing | Added browser icon and Apple touch icon references using the opening title artwork. |
| `<html lang>` fixed | Language switching now updates `document.documentElement.lang` through the existing settings sync. |
| Help guide shows both languages | CSS now shows only the selected language column. |
| Muted text contrast | Darkened the muted text token and strengthened the spirit label weight. |
| No noscript fallback | Added a visible noscript notice and Canvas fallback text. |
| Difficulty selection semantics | Difficulty selector now uses `radiogroup` / `radio` with `aria-checked`. |
| Pause / ED modal keyboard containment | Added focus trapping for pause and ending-video dialogs. |
| Canvas-only status | Added screen-reader live regions for overlay narration and battle judgment feedback. |
| Defeat settings discoverability | Added a defeat overlay button that opens the settings panel and focuses input offset. |
| Portrait first-load hint | Added CSS fallback styling so the portrait hint can render before JavaScript runs. |

## Reflected In Switch Port

Web-only metadata such as OGP, favicon, noscript, and HTML language attributes do not directly apply to the Unity/Switch runtime. The equivalent Switch work is tracked as publishing and hardware QA requirements:

- Store metadata and icon planning: `switch-port/publishing/media-asset-plan-2026-05-06.md`
- Hardware readability and input QA: `switch-port/publishing/switch-hardware-qa-matrix-2026-05-06.md`
- Web/Unity parity register: `switch-port/publishing/web-unity-port-diff-2026-05-06.md`

## Not Applied In This Pass

- Full Canvas text alternative mode: the live-region sync improves screen-reader feedback, but a complete non-Canvas story/play UI is a larger accessibility mode.
- PWA / Service Worker: useful for Web retention, but not required for the Switch port and would need a cache invalidation plan.
- Final portal dimensions for icon / screenshots / trailer: blocked until approved Nintendo portal specifications are available.

## Verification Targets

- `npm run check`
- `npm run check:switch-port`
- Manual browser smoke for OGP rendering, keyboard modal focus loop, portrait first-load hint, and defeat settings flow before production deployment.

Issue/PR: `not_applicable` until a GitHub issue or PR is created.
