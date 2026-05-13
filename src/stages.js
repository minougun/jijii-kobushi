function tap(timeMs, meta = {}) {
  return { type: "tap", timeMs, ...meta };
}

function hold(timeMs, durationMs, meta = {}) {
  return { type: "hold", timeMs, durationMs, ...meta };
}

function mash(timeMs, durationMs, targetCount, meta = {}) {
  return { type: "mash", timeMs, durationMs, targetCount, ...meta };
}

const DEFAULT_BURST_TAP_GAP_MS = 120;
const PRE_HOLD_TAP_CLEARANCE_MS = 420;
const HARD_PRE_HOLD_TAP_CLEARANCE_MS = 340;
const POST_HOLD_RECOVERY_MS = 180;
const POST_MASH_RECOVERY_MS = 360;
const FINISHER_WINDOW_MS = 30000;
const MASH_DURATION_BONUS_MS = 360;
const MAX_MASH_DURATION_MS = 1280;
const MAX_MASH_TARGET_COUNT = 7;
const ENKA_SIGNATURE_PHRASES = {
  tameKobushi: {
    label: "溜め泣き",
    callText: "敵の溜め節",
    responseText: "泣き返し",
    items: [
      ["tap", 0, "call"],
      ["hold", -44, "tame"],
      ["tap", 36, "answer"],
      ["tap", -18, "answer"],
      ["tap", 54, "kobushi"],
      ["hold", -52, "tame"],
      ["tap", 18, "answer"],
      ["mash", 66, "kobushi"],
      ["tap", -34, "answer"],
      ["tap", 0, "answer"],
      ["hold", 48, "tame"],
      ["tap", -22, "answer"],
      ["tap", 42, "kobushi"],
      ["tap", -46, "answer"],
      ["hold", 64, "tame"],
      ["tap", 76, "answer"],
    ],
  },
  minatoNagashi: {
    label: "港流し",
    callText: "潮の呼び節",
    responseText: "流し返し",
    items: [
      ["tap", -28, "call"],
      ["tap", 22, "answer"],
      ["hold", 48, "tame"],
      ["tap", -18, "answer"],
      ["tap", 32, "kobushi"],
      ["mash", 72, "kobushi"],
      ["tap", -38, "answer"],
      ["tap", 12, "answer"],
      ["hold", 58, "tame"],
      ["tap", -44, "answer"],
      ["tap", 0, "answer"],
      ["tap", 40, "kobushi"],
      ["hold", -54, "tame"],
      ["tap", 30, "answer"],
      ["tap", -16, "answer"],
      ["mash", 70, "kobushi"],
    ],
  },
  yoruYuri: {
    label: "夜揺り",
    callText: "闇の揺り節",
    responseText: "間を揺らす",
    items: [
      ["tap", 0, "call"],
      ["tap", -48, "answer"],
      ["tap", 30, "answer"],
      ["hold", 78, "tame"],
      ["tap", -36, "answer"],
      ["tap", 4, "answer"],
      ["mash", 68, "kobushi"],
      ["tap", -42, "answer"],
      ["tap", 26, "answer"],
      ["hold", -58, "tame"],
      ["tap", 64, "kobushi"],
      ["tap", -26, "answer"],
      ["tap", 0, "answer"],
      ["hold", 54, "tame"],
      ["tap", -54, "answer"],
      ["tap", 74, "kobushi"],
    ],
  },
  hayashiKakeai: {
    label: "囃子掛け",
    callText: "追手の囃子",
    responseText: "畳み返し",
    items: [
      ["tap", -38, "call"],
      ["tap", 16, "answer"],
      ["hold", 34, "tame"],
      ["tap", -26, "answer"],
      ["mash", 70, "kobushi"],
      ["tap", -34, "answer"],
      ["tap", 24, "answer"],
      ["hold", -46, "tame"],
      ["tap", 56, "kobushi"],
      ["tap", -18, "answer"],
      ["tap", 32, "answer"],
      ["mash", 74, "kobushi"],
      ["tap", -30, "answer"],
      ["hold", -50, "tame"],
      ["tap", 44, "answer"],
      ["tap", 0, "answer"],
    ],
  },
  oiwakeFinal: {
    label: "追分決着",
    callText: "親分の追分",
    responseText: "決着返し",
    items: [
      ["hold", -52, "call"],
      ["tap", 24, "answer"],
      ["tap", -22, "answer"],
      ["mash", 78, "kobushi"],
      ["tap", -36, "answer"],
      ["hold", 44, "tame"],
      ["tap", 0, "answer"],
      ["tap", 36, "kobushi"],
      ["tap", -46, "answer"],
      ["mash", 76, "kobushi"],
      ["tap", -24, "answer"],
      ["hold", 58, "tame"],
      ["tap", 0, "answer"],
      ["tap", -38, "answer"],
      ["tap", 44, "kobushi"],
      ["hold", 70, "tame"],
    ],
  },
};

function phraseItemFor(config, index) {
  const phrase = ENKA_SIGNATURE_PHRASES[config.phrase] ?? null;
  if (!phrase) return null;
  const phraseIndex = index % phrase.items.length;
  const [type, nudgeMs, role = "answer"] = phrase.items[phraseIndex];
  const phraseTurn = Math.floor(index / phrase.items.length);
  const breathedNudge = nudgeMs + (phraseTurn % 2 === 1 ? (index % 3 === 0 ? 18 : -10) : 0);
  return {
    type,
    nudgeMs: breathedNudge,
    phraseLabel: phrase.label,
    callText: role === "call" ? phrase.callText : phrase.responseText,
    responseText: phrase.responseText,
    enemyCue: role === "call",
    phraseRole: role,
  };
}

function noteMetaFromPhrase(phraseItem, index) {
  if (!phraseItem) return {};
  return {
    phraseLabel: phraseItem.phraseLabel,
    callText: phraseItem.callText,
    responseText: phraseItem.responseText,
    enemyCue: phraseItem.enemyCue,
    phraseRole: phraseItem.phraseRole,
    phraseStep: index,
  };
}

function makeChart(config) {
  const {
    count,
    startMs,
    stepMs,
    baseStepMs = stepMs,
    slotStep,
    quantizeDivisions = 0,
    holdDurationMs,
    burstDurationMs: burstSpanMs,
    burstTapTarget: burstTapHint,
    burstTapGapMs = DEFAULT_BURST_TAP_GAP_MS,
    holdEvery,
    burstEvery,
    tapRunEvery,
    tapRunGapMs = burstTapGapMs,
    preHoldTapClearanceMs = PRE_HOLD_TAP_CLEARANCE_MS,
    finale = false,
  } = config;
  const gridMs = quantizeDivisions > 0 ? baseStepMs / quantizeDivisions : 0;
  const slotsPerNote = slotStep ?? quantizeDivisions;
  const quantizeAt = (timeMs) => {
    if (!gridMs) return Math.round(timeMs);
    return Math.round(startMs + Math.round((timeMs - startMs) / gridMs) * gridMs);
  };
  const ceilQuantizeAt = (timeMs) => {
    if (!gridMs) return Math.round(timeMs);
    return Math.round(startMs + Math.ceil((timeMs - startMs) / gridMs) * gridMs);
  };
  const quantizeDuration = (durationMs, maxMs = Infinity) => {
    if (!gridMs) return Math.round(durationMs);
    const units = Math.max(1, Math.round(durationMs / gridMs));
    const maxUnits = Number.isFinite(maxMs) ? Math.max(1, Math.floor(maxMs / gridMs)) : units;
    return Math.round(Math.min(units, maxUnits) * gridMs);
  };
  const timeAtIndex = (index) => {
    if (!gridMs) return startMs + index * stepMs;
    return startMs + Math.round(index * slotsPerNote) * gridMs;
  };
  const chart = [];
  for (let i = 0; i < count; i += 1) {
    const phraseItem = phraseItemFor(config, i);
    const at = quantizeAt(timeAtIndex(i) + (phraseItem?.nudgeMs ?? 0));
    const noteType =
      i === 0
        ? "tap"
        : phraseItem?.type ?? (i % burstEvery === 0 ? "mash" : i % holdEvery === 0 ? "hold" : "tap");
    if (noteType === "mash") {
      const target = Math.min(MAX_MASH_TARGET_COUNT, Math.max(3, burstTapHint + (i % (burstEvery * 2) === 0 ? 0 : 1)));
      chart.push(mash(at, quantizeDuration(burstSpanMs, MAX_MASH_DURATION_MS), target, noteMetaFromPhrase(phraseItem, i)));
    } else if (noteType === "hold") {
      chart.push(hold(at, quantizeDuration(holdDurationMs), noteMetaFromPhrase(phraseItem, i)));
    } else {
      chart.push(tap(at, noteMetaFromPhrase(phraseItem, i)));
      if (tapRunEvery && i > 0 && i % tapRunEvery === tapRunEvery - 1) {
        chart.push(tap(ceilQuantizeAt(at + tapRunGapMs), { ...noteMetaFromPhrase(phraseItem, i), phraseRole: "kobushi" }));
      }
    }
  }
  if (finale) {
    const last = chart.at(-1);
    chart.push(hold(ceilQuantizeAt(last.timeMs + stepMs * 2), quantizeDuration(1260), { phraseLabel: "追分決着", callText: "最後の溜め", responseText: "大団円", enemyCue: true, phraseRole: "tame" }));
  }
  const indexedChart = chart.map((note, sourceIndex) => ({ ...note, __sourceIndex: sourceIndex }));
  const spacedChart = enforcePlayableSpacing(indexedChart, burstTapGapMs, ceilQuantizeAt, gridMs ? baseStepMs : Infinity);
  const cleanedChart = removePreHoldTapOverlap(spacedChart, preHoldTapClearanceMs);
  const finalChart = stripChartAuditSources(markFinisherPhrase(cleanedChart));
  Object.defineProperty(finalChart, "timingAudit", {
    value: {
      droppedNotes: [
        ...droppedNotesBetween(indexedChart, spacedChart, "playable-spacing"),
        ...droppedNotesBetween(spacedChart, cleanedChart, "pre-hold-overlap"),
      ],
    },
  });
  return finalChart;
}

function stripChartAuditSources(chart) {
  return chart.map(({ __sourceIndex, ...note }) => note);
}

function droppedNotesBetween(before, after, reason) {
  const kept = new Set(after.map((note) => note.__sourceIndex));
  return before
    .filter((note) => !kept.has(note.__sourceIndex))
    .map(({ __sourceIndex, ...note }) => ({
      ...note,
      sourceIndex: __sourceIndex,
      dropReason: reason,
    }));
}

function noteEndMs(note) {
  return note.timeMs + (note.durationMs ?? 0);
}

function recoveryAfter(note, tapRecoveryMs = DEFAULT_BURST_TAP_GAP_MS) {
  if (note.type === "mash") return POST_MASH_RECOVERY_MS;
  if (note.type === "hold") return POST_HOLD_RECOVERY_MS;
  return tapRecoveryMs;
}

function isAnchorNote(note) {
  return Boolean(note.enemyCue || note.phraseRole === "call");
}

function nextAllowedAfter(chart, tapRecoveryMs = DEFAULT_BURST_TAP_GAP_MS) {
  const last = chart.at(-1);
  return last ? noteEndMs(last) + recoveryAfter(last, tapRecoveryMs) : -Infinity;
}

function enforcePlayableSpacing(chart, tapRecoveryMs = DEFAULT_BURST_TAP_GAP_MS, snapStart = Math.round, maxShiftMs = Infinity) {
  let nextAllowedAt = -Infinity;
  const spaced = [];
  for (const note of chart) {
    let minStartMs = Math.max(note.timeMs, Math.round(nextAllowedAt));
    let snappedStartMs = snapStart(minStartMs);
    if (snappedStartMs - note.timeMs > maxShiftMs && isAnchorNote(note)) {
      while (spaced.length && snappedStartMs - note.timeMs > maxShiftMs) {
        if (isAnchorNote(spaced.at(-1))) break;
        spaced.pop();
        nextAllowedAt = nextAllowedAfter(spaced, tapRecoveryMs);
        minStartMs = Math.max(note.timeMs, Math.round(nextAllowedAt));
        snappedStartMs = snapStart(minStartMs);
      }
    }
    if (snappedStartMs - note.timeMs > maxShiftMs) continue;
    const adjusted = {
      ...note,
      timeMs: snappedStartMs,
    };
    spaced.push(adjusted);
    nextAllowedAt = noteEndMs(adjusted) + recoveryAfter(adjusted, tapRecoveryMs);
  }
  return spaced;
}

function removePreHoldTapOverlap(chart, clearanceMs = PRE_HOLD_TAP_CLEARANCE_MS) {
  if (!clearanceMs || clearanceMs <= 0) return chart;
  const cleaned = [];
  for (const note of chart) {
    let dropCurrent = false;
    if (note.type === "hold") {
      while (cleaned.at(-1)?.type === "tap" && note.timeMs - noteEndMs(cleaned.at(-1)) < clearanceMs) {
        if (isAnchorNote(cleaned.at(-1))) {
          dropCurrent = true;
          break;
        }
        cleaned.pop();
      }
    }
    if (dropCurrent) continue;
    cleaned.push(note);
  }
  return cleaned;
}

function markFinisherPhrase(chart, windowMs = FINISHER_WINDOW_MS) {
  const last = chart.at(-1);
  if (!last) return chart;
  const finishStartMs = noteEndMs(last) - windowMs;
  return chart.map((note) => (note.timeMs >= finishStartMs ? { ...note, finisher: true } : note));
}

const STAGE_TEMPLATES = [
  {
    id: "shotengai",
    title: "誘拐の朝",
    locationName: "うさぎ公園",
    bpm: 88,
    travelMs: 8000,
    palette: {
      sky: "#dff0d6",
      far: "#9bc28a",
      mid: "#5e8a52",
      road: "#3a4a30",
      accent: "#c2482d",
    },
    introLines: [
      "立石小次郎は、若い頃には全国大会を制したほどの演歌の実力者だった。だが孫の裕太が生まれてからは、すっかり歌から離れていた。",
      "「裕太、ちょっと散歩に行こうか」うさぎ公園の朝。そこへ黒腕章の男たちが現れる。",
      "「孫は預かった。返してほしくば、爺コブシを取り戻せ」黒腕章の使いは要求状を小次郎の足元へ落とし、逃げ道をふさぐように立ちはだかった。",
    ],
    restLine: "倒れ込んだ黒腕章の使いの懐から、港の倉庫を示す地図が落ちる。黒腕章の印は、秘密結社Xのものだった。",
    clearLine: "裕太を取り戻すため、小次郎は地図を握りしめ、港へ向かった。",
    enemy: {
      name: "黒腕章の使い",
      attackPower: 1,
      kind: "agent",
      coat: "#1f2937",
      accent: "#c2482d",
    },
    chartConfig: { count: 165, startMs: 1293, stepBeatRatio: 1, quantizeDivisions: 4, holdDurationMs: 682, burstDurationMs: 682, burstTapTarget: 5, holdEvery: 8, burstEvery: 18, phrase: "tameKobushi" },
    bgm: { cue: "恋患い", track: "koiwazurai", gain: 0.74, overlay: "kane", lead: 220, tone: "warm", variation: "原曲" },
  },
  {
    id: "warehouse",
    title: "港の倉庫",
    locationName: "港の倉庫",
    bpm: 85,
    travelMs: 10000,
    palette: {
      sky: "#cbd6dd",
      far: "#7792a1",
      mid: "#3f5461",
      road: "#242b31",
      accent: "#d8a83f",
    },
    introLines: [
      "港の倉庫に、潮風と鉄の匂いがこもっている。積み上がった木箱には、黒いXの印が焼き付けられていた。",
      "金縁フードの見張りが、倉庫の影から現れる。「ここから先は、声の戻らぬ者に用はない」",
      "小次郎はマイクを握る。だが久しぶりの一節は、喉の奥でつかえてしまう。",
      "見張りは笑った。「爺コブシを忘れたままでは、裕太には届かん」",
    ],
    restLine: "見張りを退けると、木箱の裏から古い稽古札が見つかった。そこには「伊藤道場」の文字がある。",
    clearLine: "小次郎は思い出す。若い頃、声の芯を叩き込まれた道場があった。爺コブシを取り戻すには、そこへ行くしかない。",
    enemy: {
      name: "金縁フードの見張り",
      attackPower: 1,
      kind: "bruiser",
      coat: "#273449",
      accent: "#d8a83f",
    },
    chartConfig: { count: 208, startMs: 1151, stepBeatRatio: 1, quantizeDivisions: 4, holdDurationMs: 706, burstDurationMs: 706, burstTapTarget: 6, holdEvery: 7, burstEvery: 20, phrase: "minatoNagashi" },
    bgm: { cue: "朧", track: "oboro", gain: 0.8, overlay: "kane", lead: 220, tone: "warm", variation: "港" },
  },
  {
    id: "riverside",
    title: "伊藤道場",
    locationName: "伊藤道場",
    bpm: 85,
    travelMs: 9000,
    palette: { sky: "#243746", far: "#668da2", mid: "#b27543", road: "#2b2d2e", accent: "#f2bd52" },
    introLines: [
      "川沿いの奥に、伊藤道場はまだ残っていた。板間には古い太鼓と譜面台が並んでいる。",
      "伊藤は小次郎の歌を一節聞き、首を振った。「拳はある。でも内側から来ない。昔のお前は、もっと腹の底から響かせていた」",
      "若い頃の小次郎が無意識に使っていた力。それは、相手の内側を震わせる奥義だった。",
      "掛け軸に太い筆で「内部破壊」と書かれる。師範代が前に出た。「裕太を助けたいなら、ここで爺コブシを取り戻せ」",
    ],
    restLine: "溜め、揺り、返し。猛特訓の果て、小次郎はついに奥義を知る。爺コブシは、演歌を知る相手の内側へ響く内部破壊の拳だった。",
    clearLine: "爺コブシ・内部破壊は完成した。小次郎は裕太の名を叫び、秘密結社Xの足取りを追って峠道へ走る。",
    enemy: { name: "伊藤道場の師範代", attackPower: 1, kind: "captain", coat: "#3a3148", accent: "#f2bd52" },
    chartConfig: { count: 158, startMs: 1114, stepBeatRatio: 1, quantizeDivisions: 4, holdDurationMs: 706, burstDurationMs: 706, burstTapTarget: 6, holdEvery: 8, burstEvery: 18, phrase: "tameKobushi" },
    bgm: { cue: "静寂 道場", track: "shizima", gain: 0.78, overlay: "low", lead: 220, tone: "night", variation: "道場" },
  },
  {
    id: "mountain",
    title: "峠道",
    locationName: "峠道",
    bpm: 95,
    travelMs: 11000,
    palette: { sky: "#162335", far: "#445b50", mid: "#263d35", road: "#171717", accent: "#9fd57b" },
    introLines: [
      "峠道。ガードレールの向こうで、秘密結社Xの車列が山へ消えていく。",
      "鉄仮面の追跡兵が道をふさぐ。「内部破壊を覚えたか。ならば、ここで試してやる」",
      "小次郎は腹の底に息を落とす。道場で叩き込まれた拍が、胸の奥で鳴った。",
      "「裕太、待っとれ」小次郎は峠の風に向かって、一節目を放つ。",
    ],
    restLine: "内部破壊の爺コブシは、鉄仮面の腹へ鈍く響いた。追跡兵は膝をつき、山向こうの改造車庫を指さす。",
    clearLine: "秘密結社Xは、改造車庫で奇妙な音響兵器を作っているらしい。小次郎は峠を越える。",
    enemy: { name: "X結社 鉄仮面兵", attackPower: 1, kind: "maskedHeavy", coat: "#24382e", accent: "#9fd57b" },
    chartConfig: { count: 223, startMs: 1097, stepBeatRatio: 1, quantizeDivisions: 4, holdDurationMs: 632, burstDurationMs: 632, burstTapTarget: 6, holdEvery: 6, burstEvery: 20, phrase: "yoruYuri" },
    bgm: { cue: "花暦 一回戦", track: "hanagoyomi", gain: 0.78, overlay: "low", lead: 196, tone: "night", remix: "toge", variation: "一回戦" },
  },
  {
    id: "garage",
    title: "改造車庫",
    locationName: "改造車庫",
    bpm: 165,
    travelMs: 12000,
    palette: { sky: "#2b2029", far: "#8e3140", mid: "#49272e", road: "#1d1518", accent: "#ffcf5a" },
    introLines: [
      "改造車庫では、スピーカーと古い車体が山のように積まれていた。赤いランプが拍を狂わせる。",
      "白衣の音響兵が、改造マイクを掲げる。「その声、周波数ごとねじ曲げてやる」",
      "小次郎は伊藤の言葉を思い出す。内側から来るものを、外へ逃がすな。",
      "爺コブシの響きは、機械で曲げられるほど薄くない。",
    ],
    restLine: "音響兵の機材は火花を散らして止まった。車庫の奥には、赤い門へ続く地図が残されている。",
    clearLine: "赤門は秘密結社Xの外門。そこを抜ければ、裕太をさらった親玉に近づける。",
    enemy: { name: "X結社 改造音響兵", attackPower: 2, kind: "scientist", coat: "#252528", accent: "#ffcf5a" },
    chartConfig: { count: 252, startMs: 922, stepBeatRatio: 1.5, quantizeDivisions: 6, holdDurationMs: 364, burstDurationMs: 727, burstTapTarget: 7, holdEvery: 6, burstEvery: 20, phrase: "hayashiKakeai" },
    bgm: { cue: "大正戦 車庫", track: "taishoroman", gain: 0.84, overlay: "heavy", lead: 349.23, tone: "battle", remix: "garage", variation: "車庫リミックス" },
  },
  {
    id: "redgate",
    title: "赤門",
    locationName: "赤門",
    bpm: 128,
    travelMs: 13000,
    palette: { sky: "#1d1717", far: "#703333", mid: "#3a2020", road: "#120f0f", accent: "#e0c45a" },
    introLines: [
      "赤門の前に、X親衛隊長が立っていた。黒い外套の袖には、金のX章が光っている。",
      "「ここから先は本部だ。年寄りの懐メロで通れる場所ではない」",
      "小次郎は静かにマイクを構える。懐メロではない。これは裕太へ続く声だ。",
      "親衛隊長は門を閉ざす。「ならば、その爺コブシでこじ開けてみろ」",
    ],
    restLine: "赤門がきしみ、ゆっくりと開く。奥にはX結社本部の黒い建物が見えた。",
    clearLine: "本部の最上階で待つのは、スーパーステロイドX。裕太を取り戻す最後の一曲が始まる。",
    enemy: { name: "X親衛隊長", attackPower: 2, kind: "elite", coat: "#3c1f1f", accent: "#e0c45a" },
    chartConfig: { count: 302, startMs: 943, stepBeatRatio: 1, quantizeDivisions: 4, holdDurationMs: 469, burstDurationMs: 938, burstTapTarget: 7, holdEvery: 6, burstEvery: 20, phrase: "oiwakeFinal" },
    bgm: { cue: "天の下", track: "amenoshita", gain: 0.86, overlay: "solemn", lead: 246.94, tone: "final", variation: "赤門" },
  },
  {
    id: "finalhideout",
    title: "X結社本部",
    locationName: "X結社本部",
    bpm: 150,
    travelMs: 14000,
    palette: { sky: "#11111a", far: "#33223f", mid: "#17151f", road: "#0b0b10", accent: "#f6d95f" },
    introLines: [
      "X結社本部の奥。玉座のような椅子に、スーパーステロイドXが座っていた。",
      "白馬の被り物、派手なマント、そして不気味な低い声。「よくここまで来たな、立石小次郎」",
      "裕太の声が、部屋の奥から聞こえる。「じいちゃん！」",
      "小次郎は奥義の構えを取る。爺コブシ・内部破壊。裕太へ届く最後の一撃だ。",
    ],
    restLine: "内部破壊の爺コブシが、本部の奥まで響いた。スーパーステロイドXは吹き飛び、白馬の被り物を押さえて倒れ込む。",
    finalRevealLines: [
      "倒れ込んだスーパーステロイドXは、震える手で白馬の被り物をつかんだ。",
      "白い馬の頭が床に転がる。現れた顔を見て、小次郎の眉が動いた。そこにいたのは、長年の知り合い、長谷川だった。",
      "長谷川「……小次郎。すまん。スーパーステロイドXは、わしだ」",
      "小次郎「長谷川、お前が裕太をさらったのか」",
      "長谷川「お前の声を、もう一度だけ聞きたかった。爺コブシを忘れたまま老いていくお前を、どうしても見ていられんかった」",
      "長谷川「裕太には傷ひとつ付けていない。怖がらせたことは、何度謝っても足りん。だが、あの子がいなければ、お前は二度とマイクを握らんと思った」",
      "奥の扉が開き、裕太が走り出す。「じいちゃん！」",
      "小次郎は長谷川を見下ろし、それから裕太を抱きしめた。「馬鹿者。歌わせたいなら、茶でも出して頼みに来い」",
      "長谷川は床に座ったまま、白馬の被り物を膝に抱え、深く頭を下げた。",
    ],
    clearLine: "裕太は小次郎の腕の中で泣き笑いした。爺コブシは戻った。長谷川の無茶な芝居も、ここで幕を下ろした。",
    enemy: { name: "スーパーステロイドX", attackPower: 2, kind: "steroidBoss", coat: "#22415c", accent: "#f6d95f" },
    chartConfig: { count: 260, startMs: 885, stepBeatRatio: 1.5, quantizeDivisions: 6, holdDurationMs: 400, burstDurationMs: 800, burstTapTarget: 7, holdEvery: 5, burstEvery: 17, finale: true, phrase: "oiwakeFinal" },
    bgm: { cue: "最終決戦", track: "epicbattle", gain: 0.88, overlay: "final", lead: 440, tone: "boss", remix: "boss", variation: "ラスボス戦" },
  },
];

function chartStepMsFor(stage) {
  return (60000 / stage.bpm) * (stage.chartConfig.stepBeatRatio ?? 1);
}

function resolveStageTemplate(stage) {
  return {
    ...stage,
    chartConfig: {
      ...stage.chartConfig,
      stepMs: chartStepMsFor(stage),
    },
  };
}

const RESOLVED_STAGE_TEMPLATES = STAGE_TEMPLATES.map(resolveStageTemplate);

export const DIFFICULTIES = {
  easy: { id: "easy", label: "イージー", description: "拍を広く取る", density: 0.72, damageFactor: 1.6, burstTapGapMs: 250, tapRunEvery: 18, tapRunGapMs: 250 },
  normal: { id: "normal", label: "ノーマル", description: "標準の節回し", density: 1.0, damageFactor: 1.06, burstTapGapMs: 200, tapRunEvery: 14, tapRunGapMs: 200 },
  hard: { id: "hard", label: "ハード", description: "上級者向け", density: 1.34, damageFactor: 0.77, burstTapGapMs: 140, tapRunEvery: 7, tapRunGapMs: 140 },
};

export const LOOP_DIFFICULTY = {
  maxBonusLoopLevel: 4,
  enemyHpStep: 0.03,
  playerDamageStep: 0.02,
  enemyAttackStep: 0.12,
};

const HARD_LOOP_STAGE_RELIEF = {
  warehouse: { enemyHp: 0.94, playerDamage: 1, enemyAttack: 0.96 },
  mountain: { enemyHp: 1.02, playerDamage: 1, enemyAttack: 0.96 },
  garage: { enemyHp: 0.97, playerDamage: 1, enemyAttack: 0.96 },
  redgate: { enemyHp: 0.99, playerDamage: 1, enemyAttack: 0.96 },
  finalhideout: { enemyHp: 0.97, playerDamage: 1, enemyAttack: 0.97 },
};

function stageReliefForLoop(stage, difficulty, loop = 1) {
  if (difficulty !== "hard" || normalizeLoop(loop) < 2) return null;
  return HARD_LOOP_STAGE_RELIEF[stage?.id] ?? null;
}

export function normalizeLoop(loop = 1) {
  const numeric = Number(loop);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.floor(numeric));
}

export function loopLabel(loop = 1) {
  return `${normalizeLoop(loop)}周目`;
}

export function loopDifficultyLevel(loop = 1) {
  return Math.min(LOOP_DIFFICULTY.maxBonusLoopLevel, Math.max(0, normalizeLoop(loop) - 1));
}

export function loopEnemyHpMultiplier(loop = 1, stage = null, difficulty = "normal") {
  const base = 1 + loopDifficultyLevel(loop) * LOOP_DIFFICULTY.enemyHpStep;
  return base * (stageReliefForLoop(stage, difficulty, loop)?.enemyHp ?? 1);
}

export function loopPlayerDamageMultiplier(loop = 1, stage = null, difficulty = "normal") {
  const base = 1 / (1 + loopDifficultyLevel(loop) * LOOP_DIFFICULTY.playerDamageStep);
  return base * (stageReliefForLoop(stage, difficulty, loop)?.playerDamage ?? 1);
}

export function loopEnemyAttackMultiplier(loop = 1, stage = null, difficulty = "normal") {
  const base = 1 + loopDifficultyLevel(loop) * LOOP_DIFFICULTY.enemyAttackStep;
  return base * (stageReliefForLoop(stage, difficulty, loop)?.enemyAttack ?? 1);
}

const HP_BY_STAGE = {
  shotengai: 610,
  warehouse: 840,
  riverside: 655,
  mountain: 880,
  garage: 900,
  redgate: 980,
  finalhideout: 1080,
};

function chartConfigForDifficulty(config, difficulty) {
  const density = DIFFICULTIES[difficulty].density;
  const count = Math.max(24, Math.round(config.count * density));
  const baseSlots = (config.count - 1) * (config.quantizeDivisions || 1);
  return {
    ...config,
    count,
    baseCount: config.count,
    baseStepMs: config.stepMs,
    slotStep: baseSlots / Math.max(1, count - 1),
    holdDurationMs: Math.round(config.holdDurationMs * (difficulty === "easy" ? 1.08 : difficulty === "hard" ? 0.9 : 1)),
    burstDurationMs: Math.min(MAX_MASH_DURATION_MS, Math.round(config.burstDurationMs * (difficulty === "easy" ? 1.12 : difficulty === "hard" ? 1.02 : 1.08)) + MASH_DURATION_BONUS_MS),
    burstTapTarget: Math.max(3, Math.min(MAX_MASH_TARGET_COUNT, config.burstTapTarget + (difficulty === "easy" ? -2 : difficulty === "hard" ? 0 : -1))),
    burstTapGapMs: DIFFICULTIES[difficulty].burstTapGapMs,
    tapRunEvery: DIFFICULTIES[difficulty].tapRunEvery,
    tapRunGapMs: DIFFICULTIES[difficulty].tapRunGapMs,
    preHoldTapClearanceMs: difficulty === "hard" ? HARD_PRE_HOLD_TAP_CLEARANCE_MS : PRE_HOLD_TAP_CLEARANCE_MS,
    holdEvery: Math.max(4, config.holdEvery + (difficulty === "easy" ? 2 : difficulty === "hard" ? -1 : 0)),
    burstEvery: Math.max(12, config.burstEvery + (difficulty === "easy" ? 6 : difficulty === "hard" ? -3 : 0)),
  };
}

function chartConfigForLoop(config, difficulty, loop = 1) {
  const loopLevel = loopDifficultyLevel(loop);
  if (loopLevel <= 0) return config;
  const boost = difficulty === "hard" ? 1.08 : difficulty === "normal" ? 1.06 : 1.04;
  const count = Math.max(24, Math.round(config.count * boost));
  const baseSlots = ((config.baseCount ?? config.count) - 1) * (config.quantizeDivisions || 1);
  const tapGapScale = difficulty === "hard" ? 0.9 : difficulty === "normal" ? 0.92 : 0.94;
  return {
    ...config,
    count,
    slotStep: baseSlots / Math.max(1, count - 1),
    holdDurationMs: Math.round(config.holdDurationMs * (difficulty === "hard" ? 0.95 : 0.97)),
    burstDurationMs: Math.min(MAX_MASH_DURATION_MS, Math.round(config.burstDurationMs * (difficulty === "hard" ? 0.98 : 1))),
    burstTapGapMs: Math.max(110, Math.round(config.burstTapGapMs * tapGapScale)),
    tapRunEvery: Math.max(5, config.tapRunEvery - (difficulty === "hard" ? 2 : 1)),
    tapRunGapMs: Math.max(110, Math.round(config.tapRunGapMs * tapGapScale)),
    holdEvery: Math.max(4, config.holdEvery - (difficulty === "hard" ? 1 : 0)),
    burstEvery: Math.max(12, config.burstEvery - (difficulty === "hard" ? 2 : 1)),
  };
}

function makeChartsByDifficulty(config) {
  return Object.fromEntries(Object.keys(DIFFICULTIES).map((difficulty) => [difficulty, makeChart(chartConfigForDifficulty(config, difficulty))]));
}

function makeLoopPlusChartsByDifficulty(config) {
  return Object.fromEntries(
    Object.keys(DIFFICULTIES).map((difficulty) => {
      const difficultyConfig = chartConfigForDifficulty(config, difficulty);
      return [difficulty, makeChart(chartConfigForLoop(difficultyConfig, difficulty, 2))];
    }),
  );
}

export const STAGES = RESOLVED_STAGE_TEMPLATES.map((stage) => ({
  ...stage,
  enemy: {
    ...stage.enemy,
    hp: HP_BY_STAGE[stage.id],
  },
  chartsByDifficulty: makeChartsByDifficulty(stage.chartConfig),
  loopPlusChartsByDifficulty: makeLoopPlusChartsByDifficulty(stage.chartConfig),
  chart: makeChart(stage.chartConfig),
}));

export function getStage(index) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, index))];
}

export function getEnemyHp(stage) {
  return stage.enemy.hp;
}

export function getStageChart(stage, difficulty = "normal", loop = 1) {
  const charts = normalizeLoop(loop) >= 2 ? stage.loopPlusChartsByDifficulty : stage.chartsByDifficulty;
  return charts?.[difficulty] ?? charts?.normal ?? stage.chartsByDifficulty?.[difficulty] ?? stage.chartsByDifficulty?.normal ?? stage.chart;
}

export function getStageChartTimingAudit(stage, difficulty = "normal", loop = 1) {
  return getStageChart(stage, difficulty, loop).timingAudit ?? { droppedNotes: [] };
}

export function damageScaleForDifficulty(stage, difficulty = "normal", loop = 1) {
  const normalLength = getStageChart(stage, "normal", loop).length || 1;
  const selectedLength = getStageChart(stage, difficulty, loop).length || normalLength;
  const damageFactor = DIFFICULTIES[difficulty]?.damageFactor ?? 1;
  return (normalLength / selectedLength) * damageFactor;
}

export function nextNoteLabel(note) {
  if (!note) return "拍";
  if (note.type === "tap") return "TAP";
  if (note.type === "hold") return "長押";
  if (note.type === "mash") return "連打";
  return "TAP";
}

export function validateStages(stages = STAGES) {
  const errors = [];
  const ids = new Set();

  for (const stage of stages) {
    if (ids.has(stage.id)) errors.push(`duplicate stage id: ${stage.id}`);
    ids.add(stage.id);
    if (!stage.chart.length) errors.push(`${stage.id}: chart is empty`);
    const preHoldTapClearanceMs = stage.id.endsWith(":hard") ? HARD_PRE_HOLD_TAP_CLEARANCE_MS : PRE_HOLD_TAP_CLEARANCE_MS;

    let previous = -Infinity;
    let previousPlayableAt = -Infinity;
    let lastMash = -Infinity;
    for (const [index, note] of stage.chart.entries()) {
      if (!["tap", "hold", "mash"].includes(note.type)) errors.push(`${stage.id}:${index}: unknown type`);
      if (note.timeMs <= previous) errors.push(`${stage.id}:${index}: timeMs must increase`);
      if (note.timeMs < previousPlayableAt) errors.push(`${stage.id}:${index}: note starts before previous recovery window`);
      const previousNote = stage.chart[index - 1];
      if (previousNote?.type === "tap" && note.type === "hold" && note.timeMs - noteEndMs(previousNote) < preHoldTapClearanceMs) {
        errors.push(`${stage.id}:${index}: tap before hold below ${preHoldTapClearanceMs}ms`);
      }
      previous = note.timeMs;
      if (note.type === "hold" && (!note.durationMs || note.durationMs <= 0)) {
        errors.push(`${stage.id}:${index}: hold duration required`);
      }
      if (note.type === "mash") {
        if (!note.durationMs || note.durationMs <= 0) errors.push(`${stage.id}:${index}: mash duration required`);
        if (!note.targetCount || note.targetCount <= 0) errors.push(`${stage.id}:${index}: mash targetCount required`);
        if (note.durationMs > MAX_MASH_DURATION_MS) errors.push(`${stage.id}:${index}: mash duration > ${MAX_MASH_DURATION_MS}ms`);
        if (note.targetCount > MAX_MASH_TARGET_COUNT) errors.push(`${stage.id}:${index}: mash targetCount > ${MAX_MASH_TARGET_COUNT}`);
        if (note.timeMs - lastMash < (60000 / stage.bpm) * 2) {
          errors.push(`${stage.id}:${index}: mash spacing below 2 beats`);
        }
        lastMash = note.timeMs;
      }
      previousPlayableAt = noteEndMs(note) + recoveryAfter(note);
    }
  }

  return errors;
}
