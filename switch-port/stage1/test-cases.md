# Stage 1 Portable Core Test Cases

Source JSON: `docs/exports/switch-stage1-shotengai.stage.json`

Use these tests before implementing the Unity renderer. The C# port should run the same logical input profiles through the same judgement path used by live input. Expected profile results come from `npm run run:switch-stage1`.

For gameplay, HP 0 may transition to `Failed` immediately. For parity tests, run a diagnostic mode that continues resolving the full chart after HP reaches 0 so the final judge breakdown and score can be compared with the JS portable runner.

## Required Commands On JS Reference

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check:switch-stage1
```

The command must pass before using the values below as the Unity oracle.

## Timing Baseline

| Case | Input | Expected |
| --- | --- | --- |
| Count-in | Start Stage 1 | Count-in duration is `3.0s` / `3000ms`. |
| First note battle time | First note `timeMs=1200` | Battle clock target is `1200ms`. |
| First note virtual time | `countInMs + note.timeMs` | `3000 + 1200 = 4200ms`. |
| Virtual timeline formula | Any note | `virtualTimeMs = 3000 + note.timeMs`. |
| BGM metadata | Stage 1 JSON | path `./assets/audio/koiwazurai.mp3`, gain `0.74`, track volume `0.78`, lead `220`. |

## Judgement Boundary Tests

Use a tap note at `timeMs=1000`.

| Offset | Input time | Expected |
| ---: | ---: | --- |
| `0ms` | `1000ms` | Perfect |
| `+60ms` | `1060ms` | Perfect |
| `-60ms` | `940ms` | Perfect |
| `+61ms` | `1061ms` | Good |
| `-61ms` | `939ms` | Good |
| `+120ms` | `1120ms` | Good |
| `-120ms` | `880ms` | Good |
| `+121ms` | `1121ms` | Bad |
| `-121ms` | `879ms` | Bad |
| `+190ms` | `1190ms` | Bad |
| `-190ms` | `810ms` | Bad |
| `+191ms` | `1191ms` | Miss |
| `-191ms` | `809ms` | Miss |

Required assertion:

```text
abs(offsetMs) <= 60  => Perfect
abs(offsetMs) <= 120 => Good
abs(offsetMs) <= 190 => Bad
abs(offsetMs) > 190  => Miss
```

## Input Grace 250ms

Use a tap note at `timeMs=1000`.

| Case | Input / clock | Expected |
| --- | --- | --- |
| No input at `1249ms` | Note still pending | Not auto-missed yet. |
| No input at `1250ms` | Deadline reached | Auto-miss is allowed at or after this point. |
| No input after `1250ms` | Pending note expires | Miss. |
| Input at `1190ms` | Within Bad window | Bad, not Miss. |
| Input at `1191ms` | Outside Bad window but before grace deadline | Miss by judgement window. |

Implementation note: input grace controls how long a note remains pending; it does not widen the judgement windows.

## Hold Tests

Use a hold note with `timeMs=1000`, `durationMs=800`, end target `1800ms`.

| Down offset | Up offset | Expected |
| ---: | ---: | --- |
| `0ms` | `0ms` | Perfect |
| `+60ms` | `-60ms` | Perfect |
| `+61ms` | `0ms` | Good |
| `0ms` | `+121ms` | Bad |
| `+190ms` | `-190ms` | Bad |
| `+191ms` | `0ms` | Miss |
| `0ms` | `-191ms` | Miss |

Required assertion: final hold rank is the lower rank of start and end.

Hold interruption test:

| Case | Expected |
| --- | --- |
| Pause while hold is down, resume while still down, release at valid timestamp | Judge with original down time and release timestamp. |
| Pause while hold is down, release cannot be timestamped during pause | Resolve as Miss on resume, or enforce a documented deterministic policy. |

## Mash Grace 80ms

Use a mash note with `timeMs=1000`, `durationMs=1000`, `targetCount=4`.

Valid counting range:

```text
start = 1000 - 80 = 920ms
end = 1000 + 1000 + 80 = 2080ms
```

| Tap times | Counted | Expected note |
| --- | ---: | --- |
| `919, 1000, 1100, 1200, 1300` | 4 | `919ms` ignored before grace. |
| `920, 1000, 1100, 1200` | 4 | Start boundary included. |
| `1000, 1100, 1200, 2080` | 4 | End boundary included. |
| `1000, 1100, 1200, 2081` | 3 | `2081ms` ignored after grace. |

## Mash Dedup 70ms

Use a mash note with `timeMs=1000`, `durationMs=1000`, `targetCount=4`.

| Tap times | Counted | Expected |
| --- | ---: | --- |
| `1000, 1069, 1140, 1210` | 3 | `1069` is less than 70ms after `1000`, so ignored. |
| `1000, 1070, 1140, 1210` | 4 | Exactly 70ms gap is counted. |
| `1000, 1060, 1120, 1180, 1240` | 3 | Every other close tap is ignored by last-counted gap. |

## Mash Rank Tests

Use `targetCount=4`.

| Count | Expected before overmash | Final expected |
| ---: | --- | --- |
| 4 | Perfect | Perfect |
| 3 | Good | Good |
| 1 | Bad | Bad |
| 0 | Miss | Miss |
| 7 | Perfect | Good, because `count > targetCount + 2` |

Use `targetCount=6`.

| Count | Expected before overmash | Final expected |
| ---: | --- | --- |
| 6 | Perfect | Perfect |
| 5 | Good | Good |
| 3 | Bad | Bad |
| 2 | Miss | Miss |
| 9 | Perfect | Good, because `count > targetCount + 2` |

## Profile Definitions

Run each profile on Easy, Normal, and Hard.

| Profile | Tap offsets | Hold start offsets | Hold end offsets | Mash input |
| --- | --- | --- | --- | --- |
| `perfect` | `0` | `0` | `0` | exactly `targetCount` counted taps |
| `steady` | `0, 32, -44, 58, -76, 96, -112` | `0, 38, -56, 84, -108` | `0, 46, -64, 102, -118` | alternating Perfect/Good |
| `early` | `-190, -191, -220` | `-190, -191, -220` | `-190, -191, -220` | exactly `targetCount` counted taps |
| `late` | `190, 191, 220` | `190, 191, 220` | `190, 191, 220` | exactly `targetCount` counted taps |
| `mash-weak` | `0` | `0` | `0` | zero counted taps |
| `mash-heavy` | `0` | `0` | `0` | `targetCount + 3` counted taps |

## Expected Profile Results

| Profile | Difficulty | Clear | Score | Rank | MaxCombo | Perfect | Good | Bad | Miss | Tap Miss | Hold Miss | Mash Miss |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| perfect | Easy | true | 9800 | S | 106 | 106 | 0 | 0 | 0 | 0 | 0 | 0 |
| perfect | Normal | true | 9800 | S | 150 | 150 | 0 | 0 | 0 | 0 | 0 | 0 |
| perfect | Hard | true | 9800 | S | 187 | 187 | 0 | 0 | 0 | 0 | 0 | 0 |
| steady | Easy | true | 8790 | S | 106 | 55 | 51 | 0 | 0 | 0 | 0 | 0 |
| steady | Normal | true | 8848 | S | 150 | 82 | 68 | 0 | 0 | 0 | 0 | 0 |
| steady | Hard | true | 8823 | S | 187 | 100 | 87 | 0 | 0 | 0 | 0 | 0 |
| early | Easy | false | 1164 | C | 2 | 7 | 0 | 34 | 65 | 48 | 17 | 0 |
| early | Normal | false | 1084 | C | 2 | 9 | 0 | 46 | 95 | 70 | 25 | 0 |
| early | Hard | false | 1139 | C | 2 | 12 | 0 | 60 | 115 | 84 | 31 | 0 |
| late | Easy | false | 1164 | C | 2 | 7 | 0 | 34 | 65 | 48 | 17 | 0 |
| late | Normal | false | 1084 | C | 2 | 9 | 0 | 46 | 95 | 70 | 25 | 0 |
| late | Hard | false | 1139 | C | 2 | 12 | 0 | 60 | 115 | 84 | 31 | 0 |
| mash-weak | Easy | true | 8064 | A | 16 | 99 | 0 | 0 | 7 | 0 | 0 | 7 |
| mash-weak | Normal | true | 8040 | A | 16 | 141 | 0 | 0 | 9 | 0 | 0 | 9 |
| mash-weak | Hard | true | 7979 | A | 16 | 175 | 0 | 0 | 12 | 0 | 0 | 12 |
| mash-heavy | Easy | true | 9661 | S | 106 | 99 | 7 | 0 | 0 | 0 | 0 | 0 |
| mash-heavy | Normal | true | 9674 | S | 150 | 141 | 9 | 0 | 0 | 0 | 0 | 0 |
| mash-heavy | Hard | true | 9665 | S | 187 | 175 | 12 | 0 | 0 | 0 | 0 | 0 |

## Required Assertions

- `perfect` is S rank with Miss 0 on Easy, Normal, and Hard.
- `steady` is S rank with Miss 0 on Easy, Normal, and Hard.
- `early` produces both Bad and Miss, with `-190ms` as Bad and `-191ms` as Miss.
- `late` produces both Bad and Miss, with `+190ms` as Bad and `+191ms` as Miss.
- `mash-weak` misses only mash notes: tap Miss 0, hold Miss 0, mash Miss equals each difficulty's mash count.
- `mash-heavy` produces Good on overmash notes and Miss 0.
- HP reaches 0 for `early` and `late`, causing `clear=false`.
- Mash Miss does not reduce HP in this portable runner parity layer.

## SaveSnapshot Tests

| Case | Expected |
| --- | --- |
| Result reached after perfect Easy | Snapshot stores `stageId=shotengai`, `difficulty=Easy`, `score=9800`, `rank=S`, `clear=true`. |
| Failed after early Easy | Snapshot stores `clear=false`, `hp=0`, and judge breakdown from the run. |
| Retry after Failed | New snapshot/run starts with HP 12, combo 0, maxCombo 0, note index 0. |
| Pause then resume | Snapshot/runtime keeps battle clock stable across paused duration. |

## Minimum Unity Test Harness

The first C# test harness should not need final rendering.

1. Load `docs/exports/switch-stage1-shotengai.stage.json`.
2. Select one difficulty.
3. Generate timestamped input events for one profile.
4. Advance an audio-clock simulator through count-in and battle.
5. Resolve all notes.
6. Compare `clear`, `score`, `rank`, `maxCombo`, judge counts, and type-specific miss counts against the table above.
