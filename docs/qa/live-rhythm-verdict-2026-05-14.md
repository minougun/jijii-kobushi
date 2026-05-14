# Live Rhythm Verdict 2026-05-14

Overall verdict: `ship`

Reference URL: https://minougun.github.io/jijii-kobushi/

## Device Matrix

| Device / Browser | Audio Output | Input | Offset | Result |
| --- | --- | --- | ---: | --- |
| GitHub Actions Ubuntu / Chromium | WebAudio runtime clock | Playwright diagnostics | 0ms | `ship`: battle clock and BGM media position stay locked |
| Local WSL / Chromium | WebAudio machine audit | Playwright diagnostics | 0ms | `ship`: live runtime state traces cover 7 stages * 3 difficulties |
| GitHub Actions macOS / iOS Simulator | WKWebView bundle artifact | Simulator launch smoke | 0ms | Covered by `iOS Artifact` workflow |

## Stage Verdicts

| Stage | Best Offset Result | Notes |
| --- | --- | --- |
| 1 `shotengai` | `0ms` | Subdivision support `100.0%`, chart/best subdivision offset `0ms` |
| 2 `warehouse` | `0ms` | Beat support `94.9%`, subdivision support `100.0%`, chart/best subdivision offset `0ms` |
| 3 `riverside` | `0ms` | Subdivision support `100.0%`, chart/best subdivision offset `0ms` |
| 4 `mountain` | `0ms` | Subdivision support `98.8%`, beat support `99.0%` |
| 5 `garage` | `0ms` | Subdivision support `99.3%`, beat support `96.4%` |
| 6 `redgate` | `0ms` | Beat support `96.1%`, subdivision support `100.0%`, chart/best subdivision offset `0ms` |
| 7 `finalhideout` | `0ms` | Subdivision support `98.6%`, beat support `93.4%` |

## Evidence

- `npm run check:audio-sync`: `timing warnings=0`
- `npm run check:runtime-clock`: WebAudio battle clock and BGM media position lock across all stages
- `npm run check:web-runtime-traces`: validates 21 live Web runtime state traces
- `switch-port/runtime-traces/web-runtime-state-traces.json`: stores runtime state observed from the actual Web app
- `scripts/check-live-rhythm-release.mjs`: requires `ship`, `timing warnings=0`, and complete Web runtime trace evidence

## Required Fixes

- None for Web rhythm release.
- A physical-play feedback pass found that the old per-note pickup sounds and `合図` lane made the player unsure whether to follow audio or visuals. Follow-up fix: note cue sounds now land on the hit line, the audio row is subdued as a guide, and the UI copy names the gold judgment line as the input target.
- Physical listening remains useful as manual QA, but the release gate is automated through audio-grid analysis, WebAudio clock checks, and live runtime state traces.

## Ship / QA Verdict

`ship web rhythm`

理由: 機械監査で全ステージの細分グリッドが一致し、timing warning は 0。さらに Web 実行中の実 state trace で 7 stages * 3 difficulties を確認した。
