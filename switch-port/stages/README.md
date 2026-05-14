# Switch Stage Packs

This directory contains tracked portable JSON exports for all seven web stages. The files are generated from `src/stages.js`, `src/rhythm.js`, `src/audio.js`, and `src/main.js` and are intended as data-contract inputs for later Unity/Switch port work.

The matching `*.expected-results.json` files are generated from the stage exports and define deterministic parity expectations for six input profiles (`perfect`, `steady`, `early`, `late`, `mash-weak`, `mash-heavy`) across Easy/Normal/Hard. Unity EditMode tests use these files to verify that every stage, not only Stage 1, still matches the Web judgement and scoring contract.

## Files

- `stage01-shotengai.stage.json`
- `stage02-warehouse.stage.json`
- `stage03-riverside.stage.json`
- `stage04-mountain.stage.json`
- `stage05-garage.stage.json`
- `stage06-redgate.stage.json`
- `stage07-finalhideout.stage.json`

## Commands

From the repo root:

```bash
npm run export:switch-stages
npm run validate:switch-stages
```

The validator compares every exported stage, scenario line, enemy payload, BGM metadata, timing constant, difficulty summary, and note payload back to the current web source.

For release-grade trace/provenance refreshes, use the stricter wrapper:

```bash
REQUIRE_CLEAN_WEB_TRACES=1 npm run export:switch-traces
npm run check:switch-provenance
```

This refuses dirty Web source exports, regenerates the stage packs and expected result traces from the clean source commit, and verifies that each tracked export records a clean `sourceGitCommit` whose source files still match the current Web runtime files.

The expected-result files are supplemented by deterministic boundary fixtures in `npm run check:rhythm-boundary-fixtures`, covering HP-zero on combo 5, combo 10, finisher, plus mash exact/one-short judgement boundaries.

## Scope

These packs do not include Nintendo SDK material, external submission data, deployment, portal screenshots, certificates, keys, or private platform documentation.
