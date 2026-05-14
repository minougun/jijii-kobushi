# 爺コブシ

孫を救うため、おじいちゃんが演歌風のコブシタイミングで敵を倒すブラウザ完結ゲームです。演歌/歌謡感の強いPeriTune MP3を5曲に絞って7ステージへ割り当て、入力キューと効果音はWebAudioで鳴らします。

## Public URL

```text
https://minougun.github.io/jijii-kobushi/
```

## Run

Open directly:

```text
/mnt/c/Users/minou/jii-kobushi/index.html
```

Or serve locally:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run serve
```

Then open:

```text
http://localhost:4188/
```

## iOS Prototype

The first iOS port prototype lives in:

```text
/mnt/c/Users/minou/jii-kobushi/ios
```

Open `ios/JiiKobushi.xcodeproj` on a Mac with Xcode. It bundles the existing web game into a native Swift/UIKit iPhone app shell and runs it locally in `WKWebView` through a local `jiikobushi://` resource scheme.

## Checks

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check
npm run simulate:difficulty
npm run audit:timing
node scripts/check-ios-project.mjs
```

Rhythm release gate:

```bash
npm run check:live-rhythm-release
```

This gate requires the latest live rhythm verdict to be `ship`, the audio sync machine audit to report `timing warnings=0`, and the Web runtime-state traces to cover the live app execution path. Physical listening is still useful manual QA, but the release gate is now automated through audio-grid analysis, WebAudio clock checks, and live Web runtime state traces.

Stage 1 Unity port planning notes:

- `/mnt/c/Users/minou/jii-kobushi/switch-port/stage1/pseudocode-csharp.md`
- `/mnt/c/Users/minou/jii-kobushi/switch-port/stage1/state-machine.md`
- `/mnt/c/Users/minou/jii-kobushi/switch-port/stage1/test-cases.md`
- `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/README.md`
- `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/implementation-plan.md`
- `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/file-map.md`

## Controls

- Mobile: one large rhythm zone handles tap, hold, and short MASH/連打 windows. Dense kobushi phrases may appear as tight TAP runs or red 連打 windows, depending on the chart phrase.
- Desktop: click/tap the rhythm zone or use `Space`.
- Select `イージー`, `ノーマル`, or `ハード` on the title screen before starting. Enemy HP is shared per stage; difficulty changes how fine and dense the kobushi taps are. Saved best scores are difficulty-specific.
- Movement is automatic.
- Stage intros advance directly into battle; there is no pre-battle walking-only travel wait.
- In battle, press when the marker moving from the right overlaps the gold judgment line. Audio cues remain active as support.
- 戦闘中は、右から流れるマーカーが金の判定線に重なった瞬間に入力します。音の合図は補助として機能します。
- The tap/judgment bar is displayed inside the game screen, not as a separate panel below it.
- Cleared stages can be skipped from their intro overlay. Skipped stages use the saved best score in the final result.
- The game has 7 stages, 6 enka/kayo core MP3 tracks, and 1 boss-only battle track. Reused tracks stay at natural `1.0x` from the beginning; stage variation comes from gain, cue overlays, light WebAudio tone filtering, and remix layers rather than different start offsets. The final stage intentionally leaves the enka frame for a final boss battle cue.
- Battle charts fit within one natural pass of the assigned MP3. Enemy HP reaching 0 clears the stage immediately, so a strong run does not need to wait for the remaining chart.
- Enemy HP was retuned with `scripts/difficulty-simulation.mjs`, using 10,000 simulated runs per stage and difficulty. The HP table is shared by difficulty; per-difficulty damage normalization keeps clear timing in the song's later section while level design comes from chart density, hold spacing, and dense TAP patterns instead of enemy toughness.
- Every 5 successful inputs triggers a kobushi combo bonus. Every 10 combo starts a special move cut-in with larger extra damage, enemy hit reaction, and a heavier cherry blossom storm; normal hits are not permanently doubled after 10 combo.
- The protagonist is `立石小次郎`, a friendly Japanese enka elder rendered from the generated chibi RPG-style character sheet: stage 1 red tracksuit with drink bottle, and stage 2 onward deep purple kimono with microphone. The scenario is a compact 7-stage secret-society rescue roadshow:裕太 is kidnapped at the park, Kojiro follows the X mark through the warehouse, restores the `爺コブシ・内部破壊` technique at Ito Dojo, then pushes through the mountain road, modified garage, red gate, and X headquarters to face `スーパーステロイドX`.
- Stage intros use a visual-novel style conversation view with Tateishi Kojiro and the current enemy shown as standing portraits behind a bottom dialogue window.
- Source audio and attribution notes are in `/mnt/c/Users/minou/jii-kobushi/assets/audio/README.md`.
- Japanese UI text uses bundled Noto Sans JP so the browser build remains readable even when the OS/browser has no Japanese font installed. Font notes are in `/mnt/c/Users/minou/jii-kobushi/assets/fonts/README.md`.

## References

- Local design system: `/mnt/c/Users/minou/DESIGN.md`
- Design operation guide: `/mnt/c/Users/minou/docs/design-md-operational-guide-2026-04-25.md`
- Existing local game reference: `/mnt/c/Users/minou/local-kansai-brawler/README.md`
- Web reference URLs:
  - `https://dova-s.jp/contents/license`
  - `https://dova-s.jp/en/bgm/detail/8576`
  - `https://dova-s.jp/en/bgm/detail/18821/track/2`
  - `https://pixabay.com/music/pop-koiwa-ichidodake-154742/`
  - `https://pixabay.com/service/license-summary/`
  - `https://peritune.com/about/`
  - `https://peritune.com/koiwazurai/`
  - `https://peritune.com/blog/2021/06/06/shizima4/`
  - `https://peritune.com/freematerial_list/`
  - `https://notofonts.github.io/noto-docs/website/use/`
