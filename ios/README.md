# 爺コブシ iOS Prototype

This directory contains a first iOS port prototype for `爺コブシ`.

The current implementation is a native Swift/UIKit shell that bundles the existing web game files into the app and runs them in `WKWebView`. It is intended as the fastest local iOS build path before a deeper native rewrite.

## What Is Included

- `JiiKobushi.xcodeproj`
- A landscape-only iPhone app target
- Local bundle loading for:
  - `index.html`
  - `src/`
  - `assets/`
- Inline media playback support
- Native haptic feedback for rhythm taps and UI selection
- App icon asset catalog generated from the title artwork
- `PrivacyInfo.xcprivacy` declaring no data collection or tracking in this prototype
- A local `jiikobushi://local/...` resource scheme so JavaScript, audio, video, fonts, and images load from the app bundle without network access

## Run On Mac

Open the project:

```bash
open ios/JiiKobushi.xcodeproj
```

Then in Xcode:

1. Select the `JiiKobushi` scheme.
2. Select an iPhone simulator or a signed physical iPhone.
3. Run.

CLI build example:

```bash
xcodebuild \
  -project ios/JiiKobushi.xcodeproj \
  -scheme JiiKobushi \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build
```

## App Store Notes

This is not yet the strongest App Store submission shape. Because the game is still primarily hosted inside `WKWebView`, App Review may scrutinize it under Guideline 4.2 if it looks like a repackaged website.

Before submission, strengthen the native layer with features that are genuinely app-specific, such as:

- Game Center achievements / leaderboards
- Native settings and save management
- Native review-safe haptic/audio options
- A native title/settings shell around the bundled game
- App Store-ready icons, screenshots, privacy answers, and age rating notes

No Apple account, signing identity, App Store Connect record, or external publishing action is configured here.

The Japanese metadata draft is in `ios/app-store-metadata-ja.md`.
The submission readiness checklist is in `ios/app-store-readiness.md`.

## Local Checks

Run from the repository root:

```bash
node scripts/check-ios-project.mjs
```

This verifies the Xcode project references the web bundle, app icon catalog, privacy manifest, and local resource scheme files. It does not replace an Xcode simulator or device run.

To generate local screenshot drafts:

```bash
npm run capture:ios-store-assets
```

The screenshots are written to `ios/store-assets/screenshots/`.
