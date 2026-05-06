# Runtime Asset License Register

Date: 2026-05-06

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

## Important

This is an engineering provenance register, not legal advice. Before external submission, verify every third-party license from the current official source page and keep screenshots/PDF receipts outside this public repo if they contain account data.

## Public Source References

- Nintendo Developer Portal: `https://developer.nintendo.com/`
- PeriTune usage page: `https://peritune.com/about/`
- PeriTune free material list: `https://peritune.com/freematerial_list/`
- Google Fonts Noto Sans Japanese: `https://fonts.google.com/noto/specimen/Noto+Sans+JP`

## Audio

Current stage-assigned BGM is documented in `assets/audio/README.md`.

| Asset | Runtime role | Source / provenance | Current attribution | Release status |
| --- | --- | --- | --- | --- |
| `assets/audio/koiwazurai.mp3` | Stage 1 BGM | PeriTune `Koi_Wazurai` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/oboro.mp3` | Stage 2 BGM | PeriTune `Oboro` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/shizima4.mp3` | Stage 3 BGM | PeriTune `Shizima4` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/hanagoyomi2.mp3` | Stage 4 BGM | PeriTune `Hanagoyomi2` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/taishoroman-battle.mp3` | Stage 5 BGM | PeriTune `TaishoRoman_Battle` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/amenoshita3.mp3` | Stage 6 BGM | PeriTune `Amenoshita3` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/epicbattle-j.mp3` | Stage 7 BGM | PeriTune `EpicBattle_J` | `Music: PeriTune` | Verify official terms before submission |
| `assets/audio/harvest-festival.mp3` | Unassigned/test | PeriTune | `Music: PeriTune` if used | Not used in current stage pack |
| `assets/audio/retroroman-battle3.mp3` | Unassigned/test | PeriTune | `Music: PeriTune` if used | Not used in current stage pack |
| `assets/audio/retroroman-city.mp3` | Unassigned/test | PeriTune | `Music: PeriTune` if used | Not used in current stage pack |

Synthetic callouts:

- Generated in `src/audio.js` from oscillators/formant filters.
- Non-lyrical, not sampled from a vocalist.
- Release status: first-party/generated; keep generation note.

## Fonts

| Asset | Runtime role | Source / provenance | Release status |
| --- | --- | --- | --- |
| `assets/fonts/NotoSansJP-JiiKobushi-subset.woff2` | UI font subset | Noto Sans Japanese derivative/subset | Verify OFL text and include license if required |
| `assets/fonts/NotoSansJP-VF.ttf` | UI font | Noto Sans Japanese | Verify OFL text and include license if required |

## Images

| Asset group | Assets | Provenance | Release status |
| --- | --- | --- | --- |
| Opening still | `op-title-kakizome-hanshi-v1.png` | Generated/created for this game | OK pending internal source archive |
| Character sheet | `jii-kobushi-chibi-character-sheet-v1.png` | Generated/created for this game | OK pending internal source archive |
| Special cut-in | `kojiro-cutin.png` | Generated/created for this game | OK pending internal source archive |
| Final reveal | `hasegawa-reveal-sprite-v7.png` | Generated/created for this game | OK pending internal source archive |
| Final boss sprite | `super-steroid-x-horse-mask-v1.png` | Generated/created for this game | OK pending internal source archive |
| Stage backgrounds | `stage-bg-*-v1.webp/png` | Generated/created for this game | OK pending internal source archive |
| Lower motif | `enka-wave-band.svg` | Hand-authored project SVG | OK pending source archive |
| Fallback atlas | `jii-kobushi-imagegen-atlas-v1.png` | Generated project atlas | Only ship if still referenced by final build |

## Video

| Asset | Runtime role | Provenance | Release status |
| --- | --- | --- | --- |
| `assets/video/ending.mp4` | Loop 1 ED | Illustrated game-style video track, original ED audio retained | Verify audio ownership/provenance before submission |
| `assets/video/ending-loop2.mp4` | Loop 2+ ED | Derived from loop 1 illustrated ED, doodle/pixel variant | Verify derivation source retained |

## Required Pre-submission Evidence

- [ ] Current PeriTune terms captured from official pages.
- [ ] Noto Sans Japanese license captured and included if required.
- [ ] Generated image/video source prompts or creation logs archived outside public repo if needed.
- [ ] Confirmation that no earlier live-action ED video remains in the Switch build.
- [ ] Confirmation that unused audio files are either excluded from final build or licensed.
- [ ] Final in-game credits include required attribution text.
- [ ] Store page metadata does not imply Nintendo endorsement.
