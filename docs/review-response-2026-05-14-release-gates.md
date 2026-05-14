# Review Response: Release Gate Hardening

Date: 2026-05-14

## Adopted From Review

- Added a tracked release-file gate so untracked iOS/Web/Switch critical files fail before merge.
- Added `scripts/check-ios-port.sh` as the iOS port gate:
  - tracked-file verification
  - existing iOS structure validation
  - Xcode simulator `.app` build
  - bundle resource existence checks
  - `codesign --verify --deep --strict`
  - simulator install and launch when a booted simulator is available
- Added clean Web provenance for Switch trace-style exports:
  - `REQUIRE_CLEAN_WEB_TRACES=1 npm run export:switch-traces`
  - `npm run check:switch-provenance`
- Regenerated Switch stage packs and expected-result traces from the clean Web source commit.
- Added small deterministic rhythm boundary fixtures for:
  - HP zero on combo 5
  - HP zero on combo 10
  - HP zero on finisher
  - mash exact target
  - mash one-short
- Added a live Web runtime-state trace exporter:
  - `npm run export:web-runtime-traces`
  - `npm run check:web-runtime-traces`
  - 21 traces covering 7 stages * 3 difficulties through the actual Web app diagnostics path.
- Added a macOS GitHub Actions `iOS Artifact` gate that runs the Xcode `.app` build, bundle checks, codesign verification, simulator boot/install, and launch smoke.

## Not Adopted In This Pass

- The reviewed 714-trace iOS verifier stack is not present on current `main`; adding it would be a new feature lane, not a local review fix.
- Full iOS `.app` artifact verification still requires a Mac/Xcode/simulator environment locally. The GitHub `iOS Artifact` workflow is now the release evidence path for that gate.

## Commands

```bash
npm run check:tracked-release-files
REQUIRE_CLEAN_WEB_TRACES=1 npm run export:switch-traces
npm run check:switch-provenance
npm run check:rhythm-boundary-fixtures
npm run check:web-runtime-traces
REQUIRE_TRACKED_IOS_FILES=1 IOS_ALLOW_RELEASE_UNSAFE_SKIP_XCODE_ARTIFACTS=1 scripts/check-ios-port.sh
```
