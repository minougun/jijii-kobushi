# Switch Runtime Asset Manifest

`runtime-assets.json` records the Web runtime assets that the Switch port must import, transcode, or intentionally recreate.

The manifest is generated from the current Web original source references under:

- `index.html`
- `src/audio.js`
- `src/main.js`
- `src/renderer.js`
- `src/stages.js`
- `assets/*/README.md`

Generate and validate:

```bash
npm run export:switch-assets
npm run validate:switch-assets
```

The default validator checks that referenced runtime assets are tracked in the Git index. It does not require every large image file to be present in the local working tree because this repo uses skip-worktree for some Web runtime images during local Switch-port work.

Unity-side planning uses the same file through `StageJsonLoader.LoadRuntimeAssetManifest(...)`. `RuntimeAssetImportPlanner` groups the manifest into AudioClip / VideoClip / Font / image import buckets, verifies WebP+PNG stage background pairs, and reports Git/local-file gaps separately. The EditMode tests `RuntimeAssetManifestLoadsForUnityImportPlanning` and `RuntimeAssetImportPlanKeepsWebAssetCoverage` guard the key runtime entries needed for character art, special cut-ins, ED video, Stage 1 BGM, and stage backgrounds.

Before a real Unity asset import pass, run the stricter local check after restoring the asset files:

```bash
node scripts/export-switch-assets.mjs --check --require-local
```
