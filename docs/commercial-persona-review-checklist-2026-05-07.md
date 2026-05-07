# Commercial Persona Review Checklist

Date: 2026-05-07

## Target

- Web URL: https://minougun.github.io/jijii-kobushi/
- Local repo: `/mnt/c/Users/minou/jii-kobushi`

## Purpose

Use this checklist when judging whether `爺コブシ` can honestly claim an average persona score of 95/100 or higher under small commercial indie game expectations.

## Scoring

Score each persona from 0 to 100:

- `95-100`: Commercially polished for scope. Only minor issues.
- `90-94`: Strong, but a visible polish or validation gap remains.
- `80-89`: Playable but not commercial-polished.
- `<80`: Significant UX, presentation, robustness, or accessibility concern.

Do not use `npm run review:persona` as the final score. It is a regression signal only.

## Personas

| Persona | Required Evidence | Pass Criteria |
|---|---|---|
| First-Time Mobile Player | Mobile portrait and landscape screenshots/video, first battle attempt. | Understands orientation, input target, TAP/HOLD/MASH without external explanation. |
| Desktop Rhythm Game Player | Keyboard playthrough of one battle. | Space/HOLD/MASH/Esc feel responsive; gold line and note timing are readable. |
| Older Casual Player | Title/help/settings and first stage dialogue. | Japanese is readable; controls are large; failure/retry guidance is clear. |
| Commercial Indie Game Reviewer | OP/title/battle/result/ED/Loop 2 screenshot set. | No obvious placeholder/prototype surface; art direction feels deliberate. |
| Accessibility / QA Reviewer | Keyboard-only, reduced motion, storage failure, language switch, smoke gates. | No page errors; focus is recoverable; core menus are readable by assistive tech. |
| Switch Port Readiness Reviewer | Web SHA, Switch manifests, local Switch gates. | Web original and Switch export/manifest lineage are traceable. |

## Minimum Evidence Set

Capture or verify:

- OP/title desktop.
- OP/title mobile portrait.
- OP/title mobile landscape.
- Battle desktop with TAP/HOLD/MASH visible.
- Battle mobile landscape with tap button visible.
- Pause menu with input offset/help/settings popout.
- Result screen.
- ED bonus.
- Loop 2 doodle battle with both HP bars visible.

## Release Evidence Commands

```bash
npm run check
npm run test:web-smoke:strict
npm run check:switch-local-complete
npm run test:web-smoke:pages
```

## 95+ Claim Rule

The average can be called 95+ only when:

- Average score is at least 95.0.
- No individual persona is below 90.0.
- Production `version.json` commit matches the reviewed Git commit.
- Mobile landscape and desktop battle have been visually checked.
- Result, ED bonus, and Loop 2 have been visually checked.
