# Switch Hardware QA Matrix

Date: 2026-05-06

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Purpose

This is the practical QA grid to run once dev kit access is available. It is written without SDK-specific or NDA-specific instructions.

## Smoke Matrix

| Area | Case | Expected result | Status |
| --- | --- | --- | --- |
| Boot | Launch from HOME/menu equivalent | Opening `爺コブシ` screen appears first | Pending dev kit |
| Boot | No save data | New game starts at loop 1 stage 1 | Pending dev kit |
| Boot | Existing save data | Save/load path works without corrupting stage progress | Pending dev kit |
| Input | Tap | Tap/mash action fires once per press | Pending dev kit |
| Input | Hold down/up | HOLD starts and release timing is visible | Pending dev kit |
| Input | Mash | Mash count is human-playable and registers repeated presses | Pending dev kit |
| Input | Pause | Pause freezes rhythm and audio/video clock | Pending dev kit |
| Input | Controller disconnect | Game pauses or remains recoverable | Pending dev kit |
| Display | Handheld mode | Rhythm lane, HP, text, and notes remain readable | Pending dev kit |
| Display | TV mode | Game area centered and not cropped | Pending dev kit |
| Display | Safe area | No essential UI touches screen edges | Pending dev kit |
| Performance | Stage 1 battle | Stable frame pacing during simple chart | Pending dev kit |
| Performance | Stage 7 hard | Stable frame pacing during dense chart | Pending dev kit |
| Performance | Loop 2 doodle UI | No extra jank from doodle rendering | Pending dev kit |
| Audio | BGM sync | Hit timing matches BGM beat | Pending dev kit |
| Audio | ED video | ED audio/video starts from user-controlled transition | Pending dev kit |
| Audio | Suspend/resume | Audio clock recovers without offset drift | Pending dev kit |
| Save | Save during intro | Restores same stage/loop without broken intro state | Pending dev kit |
| Save | Save during battle | Restores to valid retry/progress state | Pending dev kit |
| Save | Save after stage clear | Restores next intended stage | Pending dev kit |
| Save | Save after final/ED | Restores next loop as intended | Pending dev kit |
| Storage | Storage full/no write | User-visible failure, no crash | Pending dev kit |
| ED | Loop 1 ED | Illustrated ED video is used | Pending dev kit |
| ED | Loop 2+ ED | Doodle ED video is selected | Pending dev kit |
| Results | Stage result | Result card is centered/readable | Pending dev kit |
| Results | Final result | Stage total, average, ED bonus, ranks visible | Pending dev kit |

## Full Playthrough Matrix

| Difficulty | Loop | Expected focus | Status |
| --- | --- | --- | --- |
| Easy | 1 | New player clearability, tutorial feel | Pending dev kit |
| Normal | 1 | Default balance | Pending dev kit |
| Hard | 1 | Late-stage challenge but fair | Pending dev kit |
| Easy | 2 | Doodle presentation readability | Pending dev kit |
| Normal | 2 | Loop+ chart density | Pending dev kit |
| Hard | 2 | Hard loop+ clearability, especially stage 5-7 and ED | Pending dev kit |

## Known Local Gates Before Hardware QA

- `npm run check:switch-local-complete`
- Unity local Windows player smoke:
  - `-jijiiSmokeQuit`
  - `-jijiiSmokeAllStages`
  - `-jijiiSmokeLoopPlus`
  - `-jijiiSmokeEnding`

## Hardware QA Evidence To Capture

- [ ] Build identifier.
- [ ] Dev kit firmware/environment label, recorded privately outside public repo if sensitive.
- [ ] Controller type.
- [ ] Mode: handheld / TV.
- [ ] Difficulty / loop / stage.
- [ ] Pass/fail.
- [ ] Video clip for any timing or frame pacing issue.
- [ ] Repro steps.
- [ ] Fix commit reference.
