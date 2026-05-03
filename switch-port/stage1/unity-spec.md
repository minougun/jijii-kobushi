# Stage 1 Unity Portable Core Spec

Date: 2026-05-03

This document defines the Stage 1 vertical slice target for a Unity/C# port. It is intentionally limited to portable Stage 1 rhythm data and logic. Platform-specific integration details, production deployment, renderer migration, and all-stage support are out of scope.

## Source Of Truth

- JSON: `docs/exports/switch-stage1-shotengai.stage.json`
- Validator: `npm run validate:switch-stage1`
- Portable runner: `npm run run:switch-stage1`
- Combined check: `npm run check:switch-stage1`
- Current Stage: `shotengai`
- Stage title: `誘拐の朝`
- BGM path: `./assets/audio/koiwazurai.mp3`

Unity should treat the JSON as the canonical data contract. Do not re-create the chart in C# constants.

## Stage Metadata

| Field | Value |
| --- | --- |
| stage.id | `shotengai` |
| stage.index | `0` |
| stage.bpm | `78` |
| stage.travelMs | `8000` |
| player.maxHp | `12` |
| enemy.name | `黒腕章の使い` |
| enemy.hp | `610` |
| enemy.attackPower | `1` |

Difficulty chart summaries:

| Difficulty | Notes | Tap | Hold | Mash | First note | Last end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 106 | 73 | 26 | 7 | 1200ms | 114026ms |
| Normal | 150 | 105 | 36 | 9 | 1200ms | 112964ms |
| Hard | 187 | 127 | 48 | 12 | 1200ms | 112752ms |

## Audio And Timeline

- Count-in: `3.0` seconds.
- Virtual timeline in milliseconds: `virtualTimeMs = countInMs + note.timeMs`.
- `countInMs = 3000`.
- Chart starts at battle clock `0ms`; first visible/judgable note is `note.timeMs = 1200ms`, so its virtual timeline timestamp is `4200ms`.
- BGM:
  - Asset path: `./assets/audio/koiwazurai.mp3`
  - Track key: `koiwazurai`
  - Gain: `0.74`
  - Track volume: `0.78`
  - Lead: `220`
- Battle finish timeline: `countInMs + lastNoteEndMs + battleDurationPaddingMs`.
- `battleDurationPaddingMs = 1800`.
- `bgmStopPaddingMs = 900`.
- Default input offset: `0ms`.

Unity timing should use the audio clock as the master clock. Prefer `AudioSettings.dspTime` or an equivalent monotonic audio-backed clock, then convert to milliseconds:

```csharp
double elapsedMs = (AudioSettings.dspTime - songStartDspTime) * 1000.0;
double battleClockMs = elapsedMs - countInMs;
double noteVirtualMs = countInMs + note.timeMs;
```

Do not drive judging from frame count. `Update()` should read the audio clock, process due notes, and render placeholders from the same clock.

## Note Schema

Each chart entry is one of:

- `tap`: requires a single press near `note.timeMs`.
- `hold`: requires press near `note.timeMs` and release near `note.timeMs + durationMs`.
- `mash`: requires repeated presses between mash start and mash end.

Common fields:

- `id`
- `type`
- `timeMs`
- `durationMs`
- Optional presentation fields such as phrase/cue text are for UI and can be ignored by the first placeholder slice.

Type-specific fields:

- `hold.durationMs`: hold length.
- `mash.durationMs`: mash active length.
- `mash.targetCount`: required counted taps.

## Judgement Windows

Judgement rank is based on absolute offset in milliseconds:

| Rank | Condition |
| --- | --- |
| Perfect | `abs(offsetMs) <= 60` |
| Good | `abs(offsetMs) <= 120` |
| Bad | `abs(offsetMs) <= 190` |
| Miss | otherwise |

Input grace for pending notes: `250ms`.

The runner validates both sides of the Bad/Miss boundary:

- `-190ms` and `+190ms` are Bad.
- `-191ms` and `+191ms` are Miss.

## Tap Judgement

Tap offset:

```csharp
offsetMs = inputAtMs + inputOffsetMs - note.timeMs;
```

Use the judgement window table above. `inputOffsetMs` defaults to `0`.

Recommended behavior:

- Keep each active tap note pending until it is judged or passes the miss deadline.
- A tap note misses when no valid input is consumed before `note.timeMs + inputGraceMs`.
- Consume at most one input for one tap note.

## Hold Judgement

Hold has two offsets:

```csharp
startOffsetMs = downAtMs + inputOffsetMs - note.timeMs;
endOffsetMs = upAtMs + inputOffsetMs - (note.timeMs + note.durationMs);
```

Judge start and end separately with the same window table. The final hold rank is the lower rank of start and end.

Example:

- Start Perfect + End Good => Hold Good.
- Start Bad + End Miss => Hold Miss.

The reported hold offset should be whichever of start/end has the larger absolute offset. This matches the portable runner output.

## Mash Judgement

Mash active counting range:

```csharp
startMs = note.timeMs - 80;
endMs = note.timeMs + note.durationMs + 80;
```

Mash settings:

- Grace before/after mash window: `80ms`.
- Dedup minimum gap: `70ms`.
- Presses closer than `70ms` from the previous counted press do not increment the mash count.
- Presses outside `[startMs, endMs]` are ignored.

Rank from counted presses:

| Rank | Condition |
| --- | --- |
| Perfect | `count >= targetCount` |
| Good | `count >= targetCount - 1` |
| Bad | `count >= targetCount - 3` |
| Miss | otherwise |

Overmash penalty:

- If `count > targetCount + 2`, lower the rank by one step.
- Perfect becomes Good, Good becomes Bad, Bad becomes Miss.

## Combo, HP, Score, Rank

Judge score values:

| Rank | Points |
| --- | ---: |
| Perfect | 100 |
| Good | 70 |
| Bad | 30 |
| Miss | 0 |

Combo:

- Any non-Miss judgement increments combo by 1.
- Miss resets combo to 0.
- `maxCombo` is the largest combo reached during the chart.

HP:

- Start HP: `player.maxHp = 12`.
- In the portable runner, tap/hold Miss applies enemy damage.
- Mash Miss does not reduce HP in the runner check.
- Stage 1 loop enemy attack multiplier is `1` for Easy/Normal/Hard.
- Damage per tap/hold Miss in Stage 1 runner: `enemy.attackPower * loop.enemyAttackMultiplier = 1`.
- Clear condition for the portable runner: `remainingHp > 0`.

Score formula:

```text
judgePart = (sumJudgePoints / (totalNotes * 100)) * 7000
comboPart = (maxCombo / totalNotes) * 1500
hpPart = (max(0, hp) / maxHp) * 1300
comboBonusPart = min(900, comboBonusDamage * 2.4)
score = round(clamp(judgePart + comboPart + hpPart + comboBonusPart, 0, 10000))
```

For this Stage 1 portable slice, `comboBonusDamage` can be `0` unless combat damage simulation is added.

Rank thresholds:

| Rank | Score |
| --- | ---: |
| S | `>= 8400` |
| A | `>= 7000` |
| B | `>= 5400` |
| C | otherwise |

## Controller Mapping

Use action names rather than hardware-specific button names in the portable layer.

Recommended first slice actions:

| Action | Use |
| --- | --- |
| `RhythmPressPrimary` | Tap note input and mash press input |
| `RhythmPressAlt` | Optional alternate tap/mash input |
| `HoldDown` | Hold start; may share `RhythmPressPrimary` |
| `HoldUp` | Hold release; generated when the held action is released |
| `Pause` | Pause/debug menu |
| `Confirm` | Start Stage 1 / continue result screen |

The judgement layer should receive timestamped logical input events:

```csharp
public readonly struct RhythmInputEvent
{
    public readonly RhythmAction Action;
    public readonly double TimeMs;
    public readonly bool IsDown;
}
```

Mapping from physical controls to these logical events belongs outside the portable judgement code.

## Recommended Unity/C# Classes

Keep data, timing, input mapping, judgement, and presentation separate.

```text
StageJsonLoader
  Loads docs/exports/switch-stage1-shotengai.stage.json into typed C# data.

StageDefinition
  Holds stage/audio/player/enemy/difficulty metadata.

ChartDefinition
  Holds Easy/Normal/Hard note arrays.

NoteDefinition
  Holds id/type/timeMs/durationMs/targetCount and optional UI text.

RhythmClock
  Owns count-in and audio-clock conversion.

RhythmInputBuffer
  Stores timestamped logical input events.

RhythmJudge
  Implements tap/hold/mash judgement exactly as this spec defines.

StageRunState
  Holds active difficulty, pending notes, combo, maxCombo, HP, stats, score.

Stage1Runner
  Advances the Stage 1 run using RhythmClock, RhythmInputBuffer, and RhythmJudge.

Stage1PlaceholderView
  Draws minimal placeholders and result text; no final renderer dependency.
```

Suggested enum names:

```csharp
public enum NoteType { Tap, Hold, Mash }
public enum JudgeRank { Perfect, Good, Bad, Miss }
public enum DifficultyId { Easy, Normal, Hard }
```

## Update Loop Policy

The first playable slice should be Stage 1 only.

Minimum screen:

- Difficulty selector for Easy/Normal/Hard.
- Start button.
- Placeholder note lane or log-only note status.
- Current time, combo, HP, and judgement text.
- Result summary with score, rank, maxCombo, judge breakdown, and clear.

Update loop:

1. Read audio-backed current time.
2. Convert to `battleClockMs`.
3. Poll input and append timestamped logical events.
4. Feed due events into `RhythmJudge`.
5. Auto-miss notes that exceed their miss deadlines.
6. Update combo, HP, judge stats, score preview/result.
7. Render placeholder state from `StageRunState`.

Do not couple judgement to visual animation timing. Visuals can lag or interpolate; judgement must use timestamped input and the audio clock.

## Expected Portable Tests

The Unity implementation should match `npm run run:switch-stage1` for the following profiles.

Profile definitions:

| Profile | Tap offsets | Hold start offsets | Hold end offsets | Mash mode |
| --- | --- | --- | --- | --- |
| perfect | `0` | `0` | `0` | `targetCount` taps |
| steady | `0, 32, -44, 58, -76, 96, -112` | `0, 38, -56, 84, -108` | `0, 46, -64, 102, -118` | alternating Perfect/Good |
| early | `-190, -191, -220` | same | same | Perfect mash |
| late | `190, 191, 220` | same | same | Perfect mash |
| mash-weak | `0` | `0` | `0` | `0` counted taps |
| mash-heavy | `0` | `0` | `0` | `targetCount + 3` counted taps |

Expected summary from the current portable runner:

| Profile | Difficulty | Clear | Score | Rank | MaxCombo | Perfect | Good | Bad | Miss |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| perfect | Easy | true | 9800 | S | 106 | 106 | 0 | 0 | 0 |
| perfect | Normal | true | 9800 | S | 150 | 150 | 0 | 0 | 0 |
| perfect | Hard | true | 9800 | S | 187 | 187 | 0 | 0 | 0 |
| steady | Easy | true | 8790 | S | 106 | 55 | 51 | 0 | 0 |
| steady | Normal | true | 8848 | S | 150 | 82 | 68 | 0 | 0 |
| steady | Hard | true | 8823 | S | 187 | 100 | 87 | 0 | 0 |
| early | Easy | false | 1164 | C | 2 | 7 | 0 | 34 | 65 |
| early | Normal | false | 1084 | C | 2 | 9 | 0 | 46 | 95 |
| early | Hard | false | 1139 | C | 2 | 12 | 0 | 60 | 115 |
| late | Easy | false | 1164 | C | 2 | 7 | 0 | 34 | 65 |
| late | Normal | false | 1084 | C | 2 | 9 | 0 | 46 | 95 |
| late | Hard | false | 1139 | C | 2 | 12 | 0 | 60 | 115 |
| mash-weak | Easy | true | 8064 | A | 16 | 99 | 0 | 0 | 7 |
| mash-weak | Normal | true | 8040 | A | 16 | 141 | 0 | 0 | 9 |
| mash-weak | Hard | true | 7979 | A | 16 | 175 | 0 | 0 | 12 |
| mash-heavy | Easy | true | 9661 | S | 106 | 99 | 7 | 0 | 0 |
| mash-heavy | Normal | true | 9674 | S | 150 | 141 | 9 | 0 | 0 |
| mash-heavy | Hard | true | 9665 | S | 187 | 175 | 12 | 0 | 0 |

Required assertions:

- Perfect must be S with Miss 0 for Easy/Normal/Hard.
- Early and late must produce Bad at `abs(offsetMs) == 190` and Miss beyond that window.
- Mash-weak must fail only mash notes: tap Miss 0, hold Miss 0, mash Miss equals each difficulty's mash note count.
- Mash-heavy must apply overmash downgrade to mash notes and produce no Miss.

## First Unity Milestone

Build only this:

- Load `docs/exports/switch-stage1-shotengai.stage.json`.
- Select Easy/Normal/Hard.
- Play or simulate the BGM clock with a 3.0 second count-in.
- Advance the Stage 1 chart by virtual timeline.
- Judge tap/hold/mash with this spec.
- Display placeholder notes or logs.
- Show score, rank, maxCombo, judge breakdown, HP, and clear at the end.
- Run the six expected input profiles and compare against the table above.

Do not implement final art, final renderer migration, all seven stages, production deployment, or platform-specific integration in this milestone.
