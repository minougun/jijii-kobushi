# Font Assets

- `NotoSansJP-VF.ttf`
  - Use: bundled Japanese UI font so the static game remains readable in browser environments without Japanese system fonts.
  - Local source used for this build: `/mnt/c/Windows/Fonts/NotoSansJP-VF.ttf`

- `NotoSansJP-JiiKobushi-subset.woff2`
  - Use: active first-choice UI font loaded by `src/styles.css`.
  - Creation date: 2026-04-30.
  - Source: subset of `NotoSansJP-VF.ttf`, generated from current `index.html` and `src/*.{js,css}` glyphs plus ASCII punctuation.
  - Generation command: `uvx --from fonttools --with brotli pyftsubset assets/fonts/NotoSansJP-VF.ttf --output-file=assets/fonts/NotoSansJP-JiiKobushi-subset.woff2 --flavor=woff2 --text-file=/tmp/jii-kobushi-font-glyphs.txt --layout-features='*' --no-hinting --desubroutinize`.
  - Fallback: the full TTF remains in CSS after the WOFF2 source for missing glyphs or unsupported browsers.

License reference checked on 2026-04-27:

- `https://notofonts.github.io/noto-docs/website/use/`
- The Noto documentation states that Noto fonts are licensed under the Open Font License.
