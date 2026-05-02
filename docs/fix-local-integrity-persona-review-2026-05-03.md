# Local Integrity / Persona Review Fix

Date: 2026-05-03

## Scope

- `scripts/check-data-integrity.mjs`
- `scripts/persona-review-score.mjs`

## Changes

- Local asset integrity now accepts either a present filesystem asset or a tracked `HEAD:<path>` Git object. This keeps the local no-binary-asset workflow while preserving deployment-safety checks.
- Required ED videos are included in the integrity check.
- Persona review hit-line scoring now parses the current desktop branch of ternary rhythm-bar layout constants instead of returning `NaN`.

## Verification

- `npm run check` passed.
- `npm run review:persona` passed with `Average 100.0 / 100`.
- `node --check scripts/check-data-integrity.mjs`
- `node --check scripts/persona-review-score.mjs`
- `git diff --check`
