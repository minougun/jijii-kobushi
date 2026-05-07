# 句獣大戦 カミシモ 20語プロトタイプ

このディレクトリは、100語/10,000体へ拡張する前の検証用プロトタイプです。
既存のブラウザゲーム本体とは独立しており、語札20枚から400体のクリーチャーデータを生成します。

## 目的

- 上の句=性質、下の句=本体という核ルールがデータで守れるか確認する。
- 20語 x 20語の400体で、逆順差、ステータス、コスト、能力文の破綻を先に見つける。
- 画像生成前に、代表カードと検品対象を選べるテキスト図鑑を作る。

## 生成

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run kamishimo:generate
```

出力:

- `generated/creatures-400.json`: 400体のフルデータ
- `generated/creatures-400.csv`: 表計算確認用
- `generated/qa-report.json`: 自動QA集計
- `generated/starter-reference.md`: 紙テスト用の代表カード一覧
- `generated/image-candidates-40.json`: 代表40体の画像生成プロンプトと検品観点

## ブラウザ確認

ローカルサーバーを起動します。

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run serve
```

- 図鑑/句合わせ: `http://localhost:4188/prototypes/kamishimo/`
- バトル検証: `http://localhost:4188/prototypes/kamishimo/battle.html`

バトル検証は、2人分の手札、3スロット、ライフ20、エネルギー、召喚、攻撃、分解/捨て札を確認するためのローカル手動プロトタイプです。

## 100語/10,000体生成

企画書の100語セットから全量データを生成します。

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run kamishimo:generate-full
```

出力:

- `generated/full-set/terms-100.json`: 100語マスタ
- `generated/full-set/creatures-10000.json`: 10,000体データ
- `generated/full-set/creatures-10000.csv`: 表計算確認用
- `generated/full-set/qa-report.json`: 全量QA

## プレイテスト最小ルール

- デッキ: 語札30枚。同名語札は2枚まで。
- 初期手札: 5枚。
- ライフ: 20。
- 場: 左/中央/右の3スロット。
- 1ターン1回、手札2枚を上の句/下の句として重ねて召喚する。
- クリーチャーが倒されたら、2枚の語札は捨て札に戻る。

## 400体QAの見方

- `samePairChecks`: 逆順ペアが名称、能力、ステータスで違うか見る。
- `outOfBandPower`: コスト帯の想定戦闘力から大きく外れた候補。
- `abilityWarnings`: 禁止級能力や複雑すぎる文面の候補。
- `imagePromptWarnings`: 画像生成前に直すべきプロンプト候補。

## 次の判断

400体のうち、代表40体で画像を作り、下の句が本体として見えるか検品します。
この段階で逆順差が弱い場合は、100語へ増やさず、語札マスタの造形と補正を直します。
