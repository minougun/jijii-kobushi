# Web Original vs Unity Switch Port Diff Register

Date: 2026-05-06

Web original: `https://minougun.github.io/jijii-kobushi/`
Local repo: `/mnt/c/Users/minou/jii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Current Position

The Web original remains the product source of truth. The Unity local prototype is a port target that should match Web behavior as closely as possible while keeping platform integration isolated.

## Matching Areas

| Area | Web original | Unity port status |
| --- | --- | --- |
| Stage count | 7 stages | 7 stage packs validated |
| Stage order | `shotengai`, `warehouse`, `riverside`, `mountain`, `garage`, `redgate`, `finalhideout` | `StagePackCatalog` owns same order |
| Stage 1 location | `うさぎ公園` | Validated in stage pack and PlayMode |
| Rhythm note types | tap, hold, mash | Ported to C# sessions and parity runners |
| Difficulty | easy, normal, hard | Exported and validated |
| Loop 2+ | harder loop and doodle presentation | Loop-plus charts and doodle ED path validated |
| ED bonus | Video-backed rhythm bonus | ED bonus data and interactive session ported |
| Save split | first-loop / loop-plus slots | `RunSaveService` mirrors slot split |
| Runtime assets | audio/image/font/video manifest | 35 asset manifest validated |
| Opening | `爺コブシ` opening still | Unity opening overlay loads same still |
| Final reveal | Hasegawa reveal | Unity final result panel loads reveal sprite |
| Result card | Commercial-style centered result | Unity IMGUI result card mirrors structure |

## Intentional Differences

| Area | Difference | Reason | Follow-up |
| --- | --- | --- | --- |
| Rendering layer | Web uses Canvas/DOM; Unity uses temporary IMGUI prototype | Fast local port and validation | Replace with production Unity UI after platform build is stable |
| Browser mobile UI | Web has touch-specific layout | Switch uses controller/hardware UI | Map to Joy-Con/Pro Controller after module/dev kit setup |
| Social metadata | Web uses OGP/Twitter/favicons for link sharing and browser tabs | Switch has no browser metadata surface | Mirror the same hook through eShop icon, screenshots, trailer, and store copy |
| HTML accessibility helpers | Web uses live regions, `lang`, noscript, and focus traps | Unity needs native UI focus and platform text handling | Recreate equivalent focus/readability behavior in production Unity UI |
| Local Windows smoke | Uses Windows build and `-nographics` smoke flags | Pre-Switch automation | Replace/add hardware smoke once SDK/dev kit is available |
| Asset loading | Unity uses StreamingAssets-first fallback/local resolver | Local dev and sparse asset support | Confirm final platform packaging path |
| Save backend | Unity local uses file/memory store | Platform-neutral abstraction | Replace `IRunSaveStore` implementation with platform save API |

## Open Parity Items Before Submission

- [ ] Confirm Switch hardware input mapping feels equivalent to Web touch/keyboard.
- [ ] Confirm hardware rhythm timing matches Web BGM feel.
- [ ] Confirm ED video transcode does not change beat alignment.
- [ ] Confirm doodle loop mode has both player and enemy state visible on hardware.
- [ ] Confirm final result screen center/size in TV and handheld modes.
- [ ] Confirm all stage backgrounds and character art match the current Web source, not older generated variants.
- [ ] Confirm all Web-only debug or browser-only assumptions are absent from final build.

## Evidence Already Available

- `npm run check:switch-local-complete`: local 100% gate.
- `switch-port/release-readiness-2026-05-04.md`: cumulative verification record.
- `switch-port/assets/runtime-assets.json`: runtime asset contract.
- `switch-port/stages/*.stage.json`: exported stage data.
- `switch-port/ending/ending-bonus.stage.json`: exported ED bonus data.
