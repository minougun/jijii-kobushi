# Live Rhythm Verdict 2026-05-14

Overall verdict: `inconclusive`

Reference URL: https://minougun.github.io/jijii-kobushi/

## Device Matrix

| Device / Browser | Audio Output | Input | Offset | Result |
| --- | --- | --- | ---: | --- |
| Windows Chrome headless via WSL/CDP | WebAudio only, 物理スピーカー聴取なし | CDP操作 | 0ms / -60ms | BGM/ゲームクロックのドリフトは 0ms。聴感判定は不可 |
| iOS | 未テスト | 未テスト | 未テスト | 未テスト |

## Stage Verdicts

| Stage | Best Offset Result | Notes |
| --- | --- | --- |
| 1 `shotengai` | 約 `-40ms` 候補 | 機械上は約35-42ms早め候補。既報の `-60ms` が効く可能性は残る |
| 2 `warehouse` | `0ms` 寄り | Stage 1基準で `-60ms` にすると違和感が出る可能性あり |
| 3 `riverside` | `0ms` 寄り | 約+16msで軽微 |
| 4 `mountain` | `0ms` | ドリフト警告なし相当 |
| 5 `garage` | `0ms` | 速い譜面だがグリッド中央値は良好 |
| 6 `redgate` | 約 `-35ms` 候補 | 既存 warning と一致する注意点 |
| 7 `finalhideout` | `0ms` | 開幕 pickup は機械上は大崩れなし |

## Findings

- Critical: なし。ただし、人間の耳での最終聴感確認はできていない。
- High: 物理音声を聴けず、system audio入り録画も取れていない。
- Medium: Stage 1 `shotengai` と Stage 6 `redgate` は、波形オンセット解析で譜面がBGM拍候補より約35-42ms早めに出る候補あり。
- Medium: Stage 2 `warehouse` は機械上かなり合っているため、全体を `-60ms` に寄せる修正は採用しない。

## Required Fixes

- Stage 1 `shotengai` と Stage 6 `redgate` は、物理スピーカーまたはsystem audio入り録画で人間の聴感確認を行う。
- 0ms、`-40ms`、`-60ms` の比較は Stage 1 だけでなく Stage 2 と Stage 6 も同時に確認する。
- 聴感 fail が確定するまで、全ステージ共通のデフォルト入力補正は変更しない。

## Ship / QA Verdict

`do not ship rhythm`

理由: 機械上のクロックは良いが、「耳で聴いて合っているか」は未確認。
