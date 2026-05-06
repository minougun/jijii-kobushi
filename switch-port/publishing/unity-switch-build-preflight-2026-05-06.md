# Unity Switch Build Target Preflight

Date: 2026-05-06

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`
Current Editor: `2022.3.62f3`

## NDA-safe Boundary

This checklist does not name private SDK packages, platform module ids, certificates, device tooling, or submission tools. Use approved Nintendo/Unity documentation for those items.

## Current Local State

- Unity project opens under `2022.3.62f3`.
- `Packages/manifest.json` currently contains only public Unity modules:
  - audio
  - image conversion
  - UnityWebRequest
  - UnityWebRequestAudio
  - video
  - test framework
- Local completion gate exists:
  - `npm run check:switch-local-complete`
- Switch platform module is not recorded in this public repo.

## Before Installing Switch Module

- [ ] Confirm Nintendo approval has reached the account stage that exposes Switch development docs.
- [ ] Confirm Unity license path: Unity Pro or platform holder license key.
- [ ] Confirm target Unity Editor version required by official docs.
- [ ] Back up or commit current local state.
- [ ] Run `npm run check:switch-local-complete`.

## After Installing Switch Module

- [ ] Confirm Unity Editor lists the Switch platform target.
- [ ] Do not commit private module files or generated SDK configuration.
- [ ] Open `Stage1Prototype.unity`.
- [ ] Re-run `npm run check:switch-local-complete` to ensure local Windows/prototype gates still pass.
- [ ] Create a local-only Switch build profile or settings entry.
- [ ] Confirm generated files are ignored unless safe and intentional.

## First Build Strategy

1. Build an empty/minimal Unity scene to the dev kit.
2. Confirm input, display, audio output, suspend/resume baseline.
3. Build `Stage1Prototype.unity` with runtime assets.
4. Confirm Stage 1 boot and rhythm input.
5. Expand to all-stage smoke manually on hardware.
6. Only after hardware is stable, replace temporary IMGUI with final production UI if required.

## Port-specific Technical Checks

- Input
  - [ ] Map platform controls to logical actions, not directly to gameplay code.
  - [ ] Preserve tap/mash, hold down/up, pause, restart, save, load.
- Save
  - [ ] Replace only `IRunSaveStore`; do not rewrite run-state semantics.
  - [ ] Preserve first-loop / loop-plus slot split.
- Assets
  - [ ] Confirm 35 runtime assets are included or intentionally excluded.
  - [ ] Confirm ED videos are in a platform-supported codec/profile.
  - [ ] Confirm Japanese font rendering.
- Timing
  - [ ] Verify audio-clock rhythm timing on hardware.
  - [ ] Verify ED video clock or approved fallback path.
- Display
  - [ ] TV and handheld safe area.
  - [ ] No browser/mobile-only UI assumptions.

## Local Commands

Before and after module setup:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check:switch-local-complete
```

List installed Unity Editors:

```bash
"/mnt/c/Program Files/Unity Hub/Unity Hub.exe" -- --headless editors -i
```
