# Bundled Audio

The game uses 5 PeriTune MP3 core tracks selected for stronger enka/kayo fit across stages 1-9, plus 1 boss-only battle track for stage 10. Reused tracks play from the beginning at natural `1.0x`; stage variation comes from gain, WebAudio EQ tone, stronger stage-specific remix layers, and short original WebAudio kobushi-style voice callouts rather than different start offsets.

The kobushi-style callouts are generated in `src/audio.js` from oscillators, formant filters, pitch bends, and vibrato. They are non-lyrical synthetic effects and are not sampled from PeriTune, DOVA-SYNDROME, Pixabay, or any vocalist.

Stage track mapping:

- Stage 1 `shotengai`: `koiwazurai.mp3` from `Koi_Wazurai`, warm tone, start `0s`
- Stage 2 `warehouse`: `oboro.mp3` from `Oboro`, warm tone, start `0s`
- Stage 3 `backalley`: `hanagoyomi2.mp3` from `Hanagoyomi2`, night tone, start `0s`
- Stage 4 `riverside`: `koiwazurai.mp3` from `Koi_Wazurai`, bright tone, `yatai` remix
- Stage 5 `station`: `taishoroman-battle.mp3` from `TaishoRoman_Battle`, battle tone, start `0s`
- Stage 6 `mountain`: `oboro.mp3` from `Oboro`, night tone, `toge` remix
- Stage 7 `garage`: `taishoroman-battle.mp3` from `TaishoRoman_Battle`, battle tone, `garage` remix
- Stage 8 `highway`: `taishoroman-battle.mp3` from `TaishoRoman_Battle`, bright tone, `highway` remix
- Stage 9 `redgate`: `amenoshita3.mp3` from `Amenoshita3`, final tone, start `0s`
- Stage 10 `finalhideout`: `epicbattle-j.mp3` from `EpicBattle_J`, boss tone, `boss` remix

Remix layer policy:

- `yatai`: brighter festival-style kane, off-beat wood blocks, and short pentatonic answer phrases.
- `toge`: lower bass hits, sparse wood blocks, and stretched low kobushi phrases for a mountain-road feel.
- `garage`: heavier bass/wood pulse, snappy noise hits, plucked runs, and stronger kane accents.
- `highway`: driving off-beat wood pulse, higher pluck figures, and short rising lead answers.
- `boss`: low battle hits, kane, noise strikes, and heavier final-response phrases.

Selection policy:

- Persona review judged the previous 10-unique-track set as too broad: several tracks read as festival, scenic, or action BGM rather than enka/kayo.
- Stage 1 and Stage 2 remain the reference pair for the game's enka/kayo impression.
- The current build prioritizes consistency over "no repeats": `Koi_Wazurai`, `Oboro`, `Hanagoyomi2`, `TaishoRoman_Battle`, and `Amenoshita3` are the 5 enka/kayo core tracks.
- Stage 10 is an explicit exception: `EpicBattle_J` is used because the final boss should feel like a decisive battle even if it leaves the enka/kayo frame.
- Festival-only or scenic/action tracks such as `Harvest_Festival`, `Shizima4`, `RetroRoman_Battle3`, and `RetroRoman_City` are kept in the folder for provenance/testing but are not stage-assigned in the current build.
- `src/audio.js` の `BGM_TRACKS` には上記の未ステージ曲もエントリがあり、将来の差し替えやローカル検証用です。`scripts/check-data-integrity.mjs` が実際にステージで参照するファイルのみを必須チェックします。

Source references（利用条件の一次情報）:

- PeriTune usage page: `https://peritune.com/about/`
- PeriTune free material list: `https://peritune.com/freematerial_list/`
- `Koi_Wazurai`: `https://peritune.com/koiwazurai/`
- `Oboro`: `https://peritune.com/blog/2019/04/08/oboro/`

ライセンス・商用可否の判断は **常に公式ページの現行文言を優先**し、本 README の要約だけを根拠に配布や改変を決めないでください。ここに書くのは開発メモであり法的助言ではありません。

Attribution:

Music: PeriTune
