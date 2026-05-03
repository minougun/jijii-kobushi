# Unity Stage 1 Local Prototype

This directory is a lightweight preparation area for a normal Unity local prototype. It is not a generated Unity project yet. The goal is to define the minimum file layout and implementation sequence before creating large Unity project assets.

## Scope

- Stage 1 only: `shotengai`
- Local Unity prototype only
- Placeholder rendering is acceptable
- JSON-driven chart and metadata
- Audio-clock-driven judgement
- Automated parity tests against the Stage 1 portable runner

Out of scope:

- Full seven-stage support
- Final renderer migration
- Production deployment
- External submission
- Platform-specific SDK, NDA, portal, certificate, or key material

## Stage 1 Port Pack

Use the tracked Stage 1 pack:

- `../stage1/shotengai.stage.json`
- `../stage1/unity-spec.md`
- `../stage1/expected-results.json`
- `../stage1/pseudocode-csharp.md`
- `../stage1/state-machine.md`
- `../stage1/test-cases.md`

Reference source paths:

- Local repo: `/mnt/c/Users/minou/jii-kobushi`
- Web URL: `https://minougun.github.io/jijii-kobushi/`
- GitHub: `https://github.com/minougun/jijii-kobushi`
- Handoff: `/mnt/c/Users/minou/jii-kobushi/docs/switch-port-handoff-2026-05-03.md`

## Prototype Success Criteria

The local prototype is ready for the next decision gate when it can:

1. Load `../stage1/shotengai.stage.json`.
2. Run Easy, Normal, and Hard with an audio-clock timeline.
3. Apply count-in `3.0s`.
4. Place the first note at virtual timeline `4200ms`.
5. Judge tap, hold, and mash according to `../stage1/unity-spec.md`.
6. Produce score, rank, maxCombo, judge counts, HP, and clear.
7. Match `../stage1/expected-results.json` for `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.

## Recommended Local Verification

Before comparing Unity results, run the JS reference:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check
npm run check:switch-stage1
```

Unity test output should be compared to `../stage1/expected-results.json`, not hand-entered chart constants.
