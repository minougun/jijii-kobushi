# Stage 1 Portable Port Pack

This directory is the tracked Stage 1 handoff pack for the Unity local prototype. It mirrors the necessary outputs from ignored `docs/` files so the Unity preparation can be reviewed and committed independently from local-only notes.

## Files

- `shotengai.stage.json`: canonical Stage 1 export copied from `docs/exports/switch-stage1-shotengai.stage.json`.
- `unity-spec.md`: Unity/C# portable core spec copied from `docs/switch-stage1-unity-spec-2026-05-03.md`.
- `expected-results.json`: expected runner outputs for `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.
- `pseudocode-csharp.md`: C#-style pseudocode for the portable logic.
- `state-machine.md`: gameplay state transitions for the local prototype.
- `test-cases.md`: boundary and profile test cases.

## Verification

Run from the repo root:

```bash
npm run check:switch-stage1
```

The expected profile table in `expected-results.json` must match `npm run run:switch-stage1`.

## Scope

This pack is for a normal Unity local prototype only. It does not include external submission, deployment, platform SDK material, NDA content, portal screenshots, certificates, keys, or private documentation.
