import { readFileSync } from "node:fs";
import {
  DIFFICULTIES,
  STAGES,
  damageScaleForDifficulty,
  getStageChart,
  loopEnemyHpMultiplier,
  loopPlayerDamageMultiplier,
} from "../src/stages.js";
import {
  calculateStageScore,
  comboBonusDamage,
  comboHitMultiplier,
  finisherBonusDamage,
  mashStrikeMultiplier,
  noteDamage,
  rankScore,
} from "../src/rhythm.js";

const RUNS = 2500;
const PLAYER_MAX_HP = 12;
const SOURCE_FILES = {
  main: readFileSync("src/main.js", "utf8"),
  renderer: readFileSync("src/renderer.js", "utf8"),
  styles: readFileSync("src/styles.css", "utf8"),
  simulator: readFileSync("scripts/difficulty-simulation.mjs", "utf8"),
};

const PROFILES = {
  novice: { perfect: 0.18, good: 0.36, bad: 0.28, miss: 0.18 },
  steady: { perfect: 0.32, good: 0.42, bad: 0.18, miss: 0.08 },
  skilled: { perfect: 0.48, good: 0.36, bad: 0.12, miss: 0.04 },
  expert: { perfect: 0.72, good: 0.24, bad: 0.04, miss: 0 },
};

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pickRank(random, weights) {
  const roll = random();
  let acc = 0;
  for (const rank of ["perfect", "good", "bad", "miss"]) {
    acc += weights[rank];
    if (roll <= acc) return rank;
  }
  return "miss";
}

function lowerRank(rank) {
  if (rank === "perfect") return "good";
  if (rank === "good") return "bad";
  if (rank === "bad") return "miss";
  return "miss";
}

function simulatedMashCount(note, rank, random) {
  if (rank === "perfect") return Math.min(note.targetCount + 2, note.targetCount + 1 + Math.floor(random() * 2));
  if (rank === "good") return Math.max(1, note.targetCount - 1);
  if (rank === "bad") return Math.max(1, note.targetCount - 2);
  return Math.max(0, note.targetCount - 4);
}

function simulateRun(stage, difficulty, rankWeights, seed, loop = 1) {
  const random = rng(seed);
  const notes = [];
  let damage = 0;
  let combo = 0;
  let maxCombo = 0;
  let comboBonusTotal = 0;
  const damageScale = damageScaleForDifficulty(stage, difficulty) * loopPlayerDamageMultiplier(loop, stage, difficulty);

  for (const note of getStageChart(stage, difficulty)) {
    let rank = pickRank(random, rankWeights);
    if (note.type === "hold" && rank !== "miss" && random() < 0.08) rank = lowerRank(rank);
    notes.push({ rank });

    if (rank === "miss") {
      combo = 0;
      continue;
    }

    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const baseDamage = noteDamage(rank);
    const mashMul = note.type === "mash" ? mashStrikeMultiplier(rank, simulatedMashCount(note, rank, random), note.targetCount) : 1;
    const hitDamage = baseDamage * comboHitMultiplier(combo, random) * mashMul * damageScale;
    const comboDamage = comboBonusDamage(combo, baseDamage) * mashMul * damageScale;
    const finisherDamage = finisherBonusDamage(note, rank) * mashMul * damageScale;
    damage += hitDamage + comboDamage + finisherDamage;
    comboBonusTotal += Math.max(0, hitDamage - baseDamage * damageScale) + comboDamage + finisherDamage;
  }

  const score = calculateStageScore({
    notes,
    totalNotes: getStageChart(stage, difficulty).length,
    maxCombo,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    comboBonusDamage: comboBonusTotal,
  });

  return { clear: damage >= Math.round(stage.enemy.hp * loopEnemyHpMultiplier(loop, stage, difficulty)), rank: rankScore(score) };
}

function profileSummary(difficulty, profileName, loop = 1) {
  const rankWeights = PROFILES[profileName];
  const stageRates = [];
  const ranks = { S: 0, A: 0, B: 0, C: 0 };
  for (const [stageIndex, stage] of STAGES.entries()) {
    let clears = 0;
    for (let i = 0; i < RUNS; i += 1) {
      const result = simulateRun(stage, difficulty, rankWeights, (stageIndex + 1) * 1000003 + i * 97, loop);
      if (result.clear) clears += 1;
      ranks[result.rank] += 1;
    }
    stageRates.push((clears / RUNS) * 100);
  }
  return {
    avgClear: stageRates.reduce((sum, rate) => sum + rate, 0) / stageRates.length,
    minClear: Math.min(...stageRates),
    ranks,
  };
}

function points(checks) {
  return Math.round(checks.reduce((sum, item) => sum + (item.pass ? item.points : 0), 0));
}

function numericMatch(pattern) {
  const match = SOURCE_FILES.renderer.match(pattern);
  return match ? Number(match[1]) : NaN;
}

function rhythmHitLineCheck() {
  const canvasW = numericMatch(/const W = ([0-9.]+);/);
  const panelX = numericMatch(/drawCanvasRhythmBar\(\) \{[\s\S]*?const panelX = ([0-9.]+);/);
  const normalInfoW = numericMatch(/drawCanvasRhythmBar\(\) \{[\s\S]*?const infoW = showRhythmGuide \? [0-9.]+ : ([0-9.]+);/);
  const normalStripXOffset = numericMatch(/drawCanvasRhythmBar\(\) \{[\s\S]*?const stripX = panelX \+ infoW \+ ([0-9.]+);/);
  const normalStripWOffset = numericMatch(/drawCanvasRhythmBar\(\) \{[\s\S]*?const stripW = panelW - infoW - ([0-9.]+);/);
  const normalHitRatio = numericMatch(/drawCanvasRhythmBar\(\) \{[\s\S]*?const hitX = stripX \+ stripW \* ([0-9.]+);/);
  const doodlePanelX = numericMatch(/drawDoodleRhythmBar\(\) \{[\s\S]*?const panelX = ([0-9.]+);/);
  const doodleHitRatio = numericMatch(/drawDoodleRhythmBar\(\) \{[\s\S]*?const hitX = panelX \+ panelW \* ([0-9.]+);/);

  const normalPanelW = canvasW - panelX * 2;
  const normalStripX = panelX + normalInfoW + normalStripXOffset;
  const normalStripW = normalPanelW - normalInfoW - normalStripWOffset;
  const normalHitX = normalStripX + normalStripW * normalHitRatio;
  const doodlePanelW = canvasW - doodlePanelX * 2;
  const doodleHitX = doodlePanelX + doodlePanelW * doodleHitRatio;
  const diffPx = Math.abs(normalHitX - doodleHitX);

  return {
    pass:
      [
        canvasW,
        panelX,
        normalInfoW,
        normalStripXOffset,
        normalStripWOffset,
        normalHitRatio,
        doodlePanelX,
        doodleHitRatio,
        normalHitX,
        doodleHitX,
        diffPx,
      ].every(Number.isFinite) &&
      diffPx <= 3,
    normalHitX,
    doodleHitX,
    diffPx,
  };
}

const easyNovice = profileSummary("easy", "novice");
const normalSteady = profileSummary("normal", "steady");
const hardSteady = profileSummary("hard", "steady");
const hardSkilled = profileSummary("hard", "skilled");
const hardExpert = profileSummary("hard", "expert");
const hardLoopTwoSkilled = profileSummary("hard", "skilled", 2);
const stageOneTutorialChart = getStageChart(STAGES[0], "easy");
const secretKinds = new Set([...SOURCE_FILES.renderer.matchAll(/kind === "([^"]+)"/g)].map((match) => match[1]));
const heroBranchCount = (SOURCE_FILES.renderer.match(/if \(isHero\)/g) ?? []).length;
const hasCanvasEnemyCard =
  SOURCE_FILES.renderer.includes("敵体力") || SOURCE_FILES.renderer.includes("コンボ追撃") || SOURCE_FILES.renderer.includes("ctx.fillRect(536, 54");
const hitLine = rhythmHitLineCheck();
const finalRevealDoodle =
  SOURCE_FILES.renderer.includes('["intro", "battle", "rest", "finalReveal"].includes(state.phase)') &&
  SOURCE_FILES.renderer.includes("state.finalRevealUnmasked") &&
  SOURCE_FILES.renderer.includes('"hasegawaReveal"') &&
  !SOURCE_FILES.renderer.includes('revealedFinalBoss ? "bruiser"');

const personaScores = [
  {
    persona: "初見スマホ勢",
    score: points([
      { pass: easyNovice.avgClear >= 95, points: 30 },
      { pass: easyNovice.minClear >= 90, points: 18 },
      { pass: stageOneTutorialChart.length >= 8, points: 18 },
      { pass: stageOneTutorialChart.some((note, index, notes) => index > 0 && note.type === "tap" && notes[index - 1].type === "tap" && note.timeMs - notes[index - 1].timeMs <= 300), points: 14 },
      { pass: !SOURCE_FILES.styles.includes("aspect-ratio: 4 / 3"), points: 10 },
      { pass: SOURCE_FILES.styles.includes("min-height: 58px"), points: 10 },
    ]),
    note: `Easy novice avg ${easyNovice.avgClear.toFixed(1)}%, min ${easyNovice.minClear.toFixed(1)}%`,
  },
  {
    persona: "リズムゲーム経験者",
    score: points([
      { pass: hardSteady.avgClear >= 5 && hardSteady.avgClear <= 25, points: 16 },
      { pass: hardSkilled.avgClear >= 80 && hardSkilled.avgClear <= 92, points: 20 },
      { pass: hardLoopTwoSkilled.avgClear >= 65 && hardLoopTwoSkilled.avgClear <= 82 && hardLoopTwoSkilled.minClear >= 45, points: 20 },
      { pass: (hardExpert.ranks.S / (RUNS * STAGES.length)) * 100 >= 90, points: 22 },
      { pass: SOURCE_FILES.simulator.includes("Cross-difficulty same-player check"), points: 8 },
      { pass: SOURCE_FILES.simulator.includes("rank["), points: 7 },
      { pass: DIFFICULTIES.hard.description.includes("上級者"), points: 7 },
    ]),
    note: `Hard steady avg ${hardSteady.avgClear.toFixed(1)}%, skilled avg ${hardSkilled.avgClear.toFixed(1)}%, loop2 skilled avg ${hardLoopTwoSkilled.avgClear.toFixed(1)}%, expert S ${((hardExpert.ranks.S / (RUNS * STAGES.length)) * 100).toFixed(1)}%`,
  },
  {
    persona: "UI/a11y監査者",
    score: points([
      { pass: !hasCanvasEnemyCard, points: 12 },
      { pass: SOURCE_FILES.styles.includes(".topbar::before") && SOURCE_FILES.styles.includes(".topbar::after"), points: 12 },
      { pass: SOURCE_FILES.styles.includes("clip-path: polygon") && SOURCE_FILES.styles.includes(".duelVs"), points: 12 },
      { pass: SOURCE_FILES.styles.includes(".meterTrack--duel::before") && SOURCE_FILES.styles.includes(".meterTrack--duel::after"), points: 12 },
      { pass: SOURCE_FILES.renderer.includes("state.reducedMotion") && SOURCE_FILES.renderer.includes("idleBob"), points: 12 },
      { pass: SOURCE_FILES.styles.includes("@media (prefers-reduced-motion: reduce)"), points: 8 },
      { pass: SOURCE_FILES.styles.includes("button:focus-visible"), points: 6 },
      { pass: SOURCE_FILES.styles.includes("font-family: \"JiiKobushiNotoSansJP\""), points: 6 },
      { pass: SOURCE_FILES.styles.includes('html[data-phase="battle"] .gameSurface') && !SOURCE_FILES.styles.includes("aspect-ratio: 4 / 3"), points: 10 },
      { pass: hitLine.pass, points: 10 },
    ]),
    note: `commercial duel HUD, reduced motion, focus, Japanese font chain, hitX normal ${hitLine.normalHitX.toFixed(2)}px, doodle ${hitLine.doodleHitX.toFixed(2)}px, diff ${hitLine.diffPx.toFixed(2)}px`,
  },
  {
    persona: "キャラ/物語重視",
    score: points([
      { pass: secretKinds.size >= 8, points: 18 },
      { pass: heroBranchCount === 1, points: 18 },
      { pass: SOURCE_FILES.renderer.includes("drawLooseHero"), points: 14 },
      { pass: SOURCE_FILES.renderer.includes("drawImagegenEnemy"), points: 14 },
      { pass: SOURCE_FILES.renderer.includes("pixelWarehouse") && SOURCE_FILES.renderer.includes("pixelTextSign"), points: 12 },
      { pass: SOURCE_FILES.main.includes("小次郎の記憶は") && SOURCE_FILES.main.includes("安いペイント"), points: 6 },
      { pass: finalRevealDoodle, points: 6 },
      { pass: !hasCanvasEnemyCard, points: 12 },
    ]),
    note: `enemy kind checks ${secretKinds.size}, hero branch count ${heroBranchCount}, final reveal doodle ${finalRevealDoodle ? "ok" : "missing"}`,
  },
  {
    persona: "QA/保守担当",
    score: points([
      { pass: SOURCE_FILES.simulator.includes("MODE_MATCHED_PROFILES"), points: 12 },
      { pass: SOURCE_FILES.simulator.includes("CROSS_CHECK_PROFILES"), points: 12 },
      { pass: normalSteady.avgClear >= 95, points: 12 },
      { pass: !SOURCE_FILES.styles.includes('data-phase="travel"'), points: 10 },
      { pass: heroBranchCount === 1, points: 12 },
      { pass: SOURCE_FILES.simulator.includes("HP_BY_STAGE"), points: 10 },
      { pass: SOURCE_FILES.simulator.includes("loopEnemyHpMultiplier") && SOURCE_FILES.simulator.includes("loopPlayerDamageMultiplier"), points: 12 },
      { pass: SOURCE_FILES.main.includes("triggerEnemyAttack") && SOURCE_FILES.main.includes('resolveNote(i, "miss")'), points: 10 },
      { pass: SOURCE_FILES.renderer.includes("drawCombatMotion") && SOURCE_FILES.renderer.includes("heroStrike"), points: 10 },
    ]),
    note: `Normal steady avg ${normalSteady.avgClear.toFixed(1)}%, combat exchange ${SOURCE_FILES.main.includes("triggerEnemyAttack") ? "present" : "missing"}`,
  },
];

const average = personaScores.reduce((sum, item) => sum + item.score, 0) / personaScores.length;
for (const item of personaScores) {
  console.log(`${item.persona.padEnd(12)} ${String(item.score).padStart(3)} / 100  ${item.note}`);
}
console.log(`Average ${average.toFixed(1)} / 100`);

if (average < 95) {
  process.exitCode = 1;
}
