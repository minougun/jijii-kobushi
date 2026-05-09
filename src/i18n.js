
const JA = {
  meta: {
    kicker: "演歌風タイミング活劇",
  },
  phase: {
    opening: "開幕",
    title: "タイトル",
    intro: "会話",
    travel: "道中",
    battle: "戦闘",
    rest: "小休止",
    finalReveal: "正体",
    defeat: "敗北",
    ending: "救出",
    endingVideo: "ED",
    results: "結果",
  },
  sync: {
    openingMode: "開幕の構え",
    openingJudge: "開幕の構え",
    openingInput: "構えて待つ",
    inputTap: "ノーツが判定線に重なったらタップ",
    judgeTapBar: "金の判定線を見る",
    inputHold: "金の「長押」で押し続け、白い「離す」で離す",
    judgeHoldLong: "長押し中。白い「離す」が判定線に来たら離す",
    inputTapDense: "細かい拍は間隔を見て、同じレーンでタップ",
    inputMash: "赤い「連打」が枠に入ったらその間ずっと連打",
    inputMashActive: "枠のあいだ連打",
    judgeMash: "目標回数まで素早く。過打ちでランクが落ちる",
  },
  overlay: {
    openingTitle: "爺コブシ",
    openingBody: "爺コブシ。\nこの物語は、立石小次郎と、その仲間たちが巻き起こす一大感動巨編である。",
    openingAction: "ゲームへ進む",
    newGame: "ニューゲーム",
    startGame: "ゲーム開始",
    titleMain: "孫を取り戻せ",
    titleBoot: "",
    tapStart: "タップで開始",
    afterReturnTitle: "難易度を選んで、タップで開始。",
    returnedTitle: "タイトルへ戻りました",
    paused: "一時停止中",
    pauseBody: "現在のステージ冒頭から再開できるように保存できます。",
    savedRun: "周回をセーブしました",
    loadedRun: "セーブから再開します",
    defeatTitle: "膝をついた",
    defeatBody: "まだ声は届く。必要なら設定で入力補正を見直して、もう一度コブシを効かせろ。",
    retry: "再挑戦",
  },
  settings: {
    summary: "設定",
    muteOn: "音 ON",
    muteOff: "音 OFF",
    offset: "入力補正",
    motionAuto: "動き 自動",
    motionOn: "動き 少なめ",
    motionOff: "動き 通常",
    reset: "記録リセット",
    langJa: "表示 日本語",
    langEn: "English UI",
  },
  portrait: {
    text: "スマホでは横向き推奨。判定ラインとノーツが見やすくなります。",
    dismiss: "了解",
  },
  help: {
    summary: "操作ガイド（初回は開いておく）",
  },
  confirm: {
    returnTitle: "現在の挑戦を終了してタイトルへ戻りますか？",
    reset: "保存済みのクリア状況とベストスコアをすべて削除しますか？",
  },
  a11y: {
    pause: "戦闘を一時停止する",
    save: "現在の周回をセーブする",
  },
  chrome: {
    pauseShort: "一時停止",
    quickSave: "セーブ",
    savedShort: "保存済み",
    resume: "再開",
    saveRun: "現在の周回をセーブ",
    loadFirst: "1周目をロード",
    loadLoopPlus: "2周目以降をロード",
    openSettings: "設定を開く",
    openHelp: "遊び方",
    inputOffsetShort: "入力補正",
    settingsShort: "設定",
    returnTitle: "タイトルへ戻る",
    skipCleared: "クリア済みなのでスキップ",
    skipDialogue: "会話を送る",
  },
  hud: {
    playerName: "立石小次郎",
    spirit: "気合",
    enemyFallback: "敵",
  },
  difficulty: {
    easy: { label: "イージー", description: "気楽に救出" },
    normal: { label: "ノーマル", description: "標準勝負" },
    hard: { label: "ハード", description: "上級者向け" },
  },
  stages: {
    shotengai: { title: "誘拐の朝", enemy: "黒腕章の使い" },
    warehouse: { title: "港の倉庫", enemy: "金縁フードの見張り" },
    riverside: { title: "伊藤道場", enemy: "伊藤道場の師範代" },
    mountain: { title: "峠道", enemy: "X結社 鉄仮面兵" },
    garage: { title: "改造車庫", enemy: "X結社 改造音響兵" },
    redgate: { title: "赤門", enemy: "X親衛隊長" },
    finalhideout: { title: "X結社本部", enemy: "スーパーステロイドX" },
  },
  saves: {
    firstLoop: "1周目",
    loopPlus: "2周目以降",
    noSave: "セーブなし",
    firstNoSave: "1周目セーブなし",
    loopPlusNoSave: "2周目以降セーブなし",
  },
  loop: {
    nth: "{n}周目",
  },
};

const EN = {
  meta: {
    kicker: "Enka-flavored rhythm brawl",
  },
  phase: {
    opening: "Opening",
    title: "Title",
    intro: "Story",
    travel: "Travel",
    battle: "Battle",
    rest: "Break",
    finalReveal: "Reveal",
    defeat: "Defeat",
    ending: "Rescue",
    endingVideo: "Ending",
    results: "Results",
  },
  sync: {
    openingMode: "Opening stance",
    openingJudge: "Opening stance",
    openingInput: "Hold… wait for the count-in",
    inputTap: "Tap when the marker meets the gold judgment line",
    judgeTapBar: "Watch the lane below",
    inputHold: "Hold on the gold long-hold marker; release on the white release marker",
    judgeHoldLong: "Keep holding, then release when the white release marker reaches the line",
    inputTapDense: "Dense taps: watch spacing and hit the gold judgment line each time",
    inputMash: "Mash while the red mash marker is in the window",
    inputMashActive: "Keep mashing in the window",
    judgeMash: "Hit the target count—spamming too wildly lowers rank",
  },
  overlay: {
    openingTitle: "Jii Kobushi",
    openingBody: "Jii Kobushi.\nThis is the grand tale of Kojiro Tateishi and the companions swept into his song...",
    openingAction: "Continue",
    newGame: "New game",
    startGame: "Start game",
    titleMain: "Rescue the Grandkid",
    titleBoot: "",
    tapStart: "Tap to start",
    afterReturnTitle: "Pick difficulty, then tap to start.",
    returnedTitle: "Returned to title",
    paused: "Paused",
    pauseBody: "Save from here and resume at the start of this stage.",
    savedRun: "Run saved",
    loadedRun: "Loaded save",
    defeatTitle: "You went down",
    defeatBody: "Adjust input offset in Settings if needed, then try again.",
    retry: "Retry stage",
  },
  settings: {
    summary: "Settings",
    muteOn: "Sound on",
    muteOff: "Sound off",
    offset: "Input offset",
    motionAuto: "Motion: auto",
    motionOn: "Motion: reduce",
    motionOff: "Motion: full",
    reset: "Reset saves",
    langJa: "日本語表示",
    langEn: "English UI",
  },
  portrait: {
    text: "On phones, landscape is recommended so the timing line and notes stay readable.",
    dismiss: "OK",
  },
  help: {
    summary: "How to play (opens on first visit)",
  },
  confirm: {
    returnTitle: "End this run and return to the title screen?",
    reset: "Delete all saved progress and best scores?",
  },
  a11y: {
    pause: "Pause battle",
    save: "Save current loop",
  },
  chrome: {
    pauseShort: "Pause",
    quickSave: "Save",
    savedShort: "Saved",
    resume: "Resume",
    saveRun: "Save current loop",
    loadFirst: "Load first loop",
    loadLoopPlus: "Load loop 2+",
    openSettings: "Open settings",
    openHelp: "How to play",
    inputOffsetShort: "Input offset",
    settingsShort: "Settings",
    returnTitle: "Return to title",
    skipCleared: "Skip cleared stage",
    skipDialogue: "Skip dialogue",
  },
  hud: {
    playerName: "You",
    spirit: "Spirit",
    enemyFallback: "Enemy",
  },
  difficulty: {
    easy: { label: "Easy", description: "Relaxed rescue" },
    normal: { label: "Normal", description: "Standard rhythm" },
    hard: { label: "Hard", description: "Advanced" },
  },
  stages: {
    shotengai: { title: "Kidnapping Morning", enemy: "Black-Armband Agent" },
    warehouse: { title: "Harbor Warehouse", enemy: "Gold-Trim Hood Guard" },
    riverside: { title: "Ito Dojo", enemy: "Ito Dojo Senior Disciple" },
    mountain: { title: "Mountain Pass", enemy: "X Society Iron-Mask Trooper" },
    garage: { title: "Tuned Garage", enemy: "X Society Audio Engineer" },
    redgate: { title: "Red Gate", enemy: "X Guard Captain" },
    finalhideout: { title: "X Society HQ", enemy: "Super Steroid X" },
  },
  saves: {
    firstLoop: "First loop",
    loopPlus: "Loop 2+",
    noSave: "No save",
    firstNoSave: "No first-loop save",
    loopPlusNoSave: "No loop 2+ save",
  },
  loop: {
    nth: "Loop {n}",
  },
};

export function normalizeLang(v) {
  return v === "en" ? "en" : "ja";
}

export function strings(lang) {
  return normalizeLang(lang) === "en" ? EN : JA;
}

export function t(lang, path) {
  const L = normalizeLang(lang);
  const parts = path.split(".");
  let cur = L === "en" ? EN : JA;
  for (const p of parts) {
    cur = cur?.[p];
  }
  return typeof cur === "string" ? cur : path;
}

export function phaseBadgeLabel(lang, phase) {
  const L = strings(lang);
  const key = phase in L.phase ? phase : "title";
  return L.phase[key] ?? phase;
}

function interpolate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function localizedDifficulty(lang, id, field = "label", fallback = "") {
  const L = strings(lang);
  return L.difficulty?.[id]?.[field] ?? fallback;
}

export function localizedStageTitle(lang, stage, fallback = "") {
  const L = strings(lang);
  return L.stages?.[stage?.id]?.title ?? fallback;
}

export function localizedEnemyName(lang, stage, fallback = "") {
  const L = strings(lang);
  return L.stages?.[stage?.id]?.enemy ?? fallback;
}

export function localizedLoopLabel(lang, loop = 1) {
  const L = strings(lang);
  const numeric = Math.max(1, Math.floor(Number(loop) || 1));
  return interpolate(L.loop?.nth ?? "{n}", { n: numeric });
}
