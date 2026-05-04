# Switch Stage Loop Export 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`

## Scope

The Web original remains the source of truth. This pass mirrors the current Web stage data into the Switch portable stage packs without editing the Web runtime files under `src/`.

## Change

- `switch-port/stages/*.stage.json` now keeps the existing root `difficulty` and `charts` fields as loop-1 compatibility aliases.
- Each stage pack also includes `loops["1"]` and `loops["2"]`.
- `loops["2"]` contains the current Web 2周目以降 chart density and loop multipliers.
- `switch-port/stages/*.expected-results.json` now includes matching `loops["1"]` and `loops["2"]` expected parity results.
- Unity prototype loading and simulation now select a stage loop explicitly while preserving old loop-1 behavior.

## Current Balance Snapshot

Latest `npm run simulate:difficulty` after the Web deployment:

| Scope | mountain | garage | redgate | finalhideout |
| --- | ---: | ---: | ---: | ---: |
| Hard loop 1 clear | 84% | 62% | 77% | 78% |
| Hard loop 2 clear | 88% | 89% | 90% | 87% |

Cross-check:

- Skilled same-player Hard loop 1: avg clear 85%, min clear 62%.
- Skilled same-player Hard loop 2: avg clear 92%, min clear 87%.
- Loop 2 is denser than loop 1, but the late-stage HP pressure is softened enough for skilled play to remain viable.

## Verification

- `npm run check`
- `npm run check:switch-port`
- Windows .NET Framework `csc.exe` compile of the standalone Unity parity CLI
- `switch-port/unity-stage1-prototype/Stage1PortableCli.exe --all-stages`
- Unity batch validation:
  `JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeValidation.RunPortableParityChecks`

Unity portable parity result:

- stages: 7
- stage profile results: 252
- ending profile results: 36
