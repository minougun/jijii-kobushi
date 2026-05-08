# 爺コブシ iOS App Store Readiness

Status: local prototype, not submitted.

## Done Locally

- Native Swift/UIKit iPhone target exists.
- Existing web game is bundled into the app.
- Local resources are served through `jiikobushi://local/...`.
- External WebView navigation is blocked.
- Rhythm and UI taps trigger native haptics.
- App icon asset catalog exists.
- Privacy manifest exists for the current no-collection prototype.
- Support and privacy pages exist for future public hosting.
- Japanese App Store metadata draft exists.
- Local screenshot draft generation exists.
- `npm run check:ios` validates structure, metadata lengths, key plist values, referenced bundle assets, support page, and privacy page.
- GitHub Actions check workflow exists for future push/PR validation.

## Must Verify On Mac

```bash
xcodebuild \
  -project ios/JiiKobushi.xcodeproj \
  -scheme JiiKobushi \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build
```

Then run on a simulator or physical iPhone and verify:

- Title screen appears.
- Audio starts after user interaction.
- BGM fetch/decode works through `jiikobushi://local/assets/audio/...`.
- Ending videos play inline.
- Save/load works across app restarts.
- Orientation is landscape-only.
- Haptics fire on rhythm taps and button selection.

## Must Decide Before App Store Connect

- Paid or free release.
- Bundle identifier final value.
- Apple Developer Team ID and signing.
- Primary category and any game subcategory.
- Age rating answers.
- Support contact route.
- Whether Game Center achievements/leaderboards should be added before first submission.

## Current App Review Risk

The prototype still uses the existing web game inside `WKWebView`. It is bundled, offline, game-like, and has native haptics, but Apple may still review it under Guideline 4.2 if it appears too close to a repackaged website.

Recommended hardening before submission:

- Add Game Center achievements or leaderboard support.
- Add a native settings/about screen outside WebView.
- Add a native save-management or reset confirmation surface.
- Capture screenshots from an actual iPhone simulator/device.
- Re-check the privacy policy if any analytics, ads, network, Game Center, or IAP is added.
