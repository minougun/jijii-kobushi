import {
  STAGES,
  damageScaleForDifficulty,
  getStageChart,
  loopEnemyHpMultiplier,
  loopLabel,
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

const RUNS = 10000;
const PLAYER_MAX_HP = 12;

const MODE_MATCHED_PROFILES = {
  easy: {
    label: "Easy",
    rankWeights: { perfect: 0.2, good: 0.42, bad: 0.26, miss: 0.12 },
  },
  normal: {
    label: "Normal",
    rankWeights: { perfect: 0.32, good: 0.42, bad: 0.18, miss: 0.08 },
  },
  hard: {
    label: "Hard",
    rankWeights: { perfect: 0.48, good: 0.36, bad: 0.12, miss: 0.04 },
  },
};

const CROSS_CHECK_PROFILES = {
  novice: {
    label: "Novice same player",
    rankWeights: { perfect: 0.18, good: 0.36, bad: 0.28, miss: 0.18 },
  },
  steady: {
    label: "Steady same player",
    rankWeights: { perfect: 0.32, good: 0.42, bad: 0.18, miss: 0.08 },
  },
  skilled: {
    label: "Skilled same player",
    rankWeights: { perfect: 0.48, good: 0.36, bad: 0.12, miss: 0.04 },
  },
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
    if (note.type === "hold" && rank !== "miss" && random() < 0.08) {
      rank = lowerRank(rank);
    }
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

  return { damage, maxCombo, rank: rankScore(score) };
}

function quantile(values, q) {
  const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * q)));
  return values[index];
}

function summarizeStage(stage, difficulty, rankWeights, stageIndex, loop = 1) {
  const damages = [];
  const combos = [];
  const rankCounts = { S: 0, A: 0, B: 0, C: 0 };
  for (let i = 0; i < RUNS; i += 1) {
    const result = simulateRun(stage, difficulty, rankWeights, (stageIndex + 1) * 1000003 + i * 97, loop);
    damages.push(result.damage);
    combos.push(result.maxCombo);
    rankCounts[result.rank] += 1;
  }
  damages.sort((a, b) => a - b);
  combos.sort((a, b) => a - b);
  const hp = Math.round(stage.enemy.hp * loopEnemyHpMultiplier(loop, stage, difficulty));
  const clearRate = damages.filter((damage) => damage >= hp).length / damages.length;
  return {
    hp,
    notes: getStageChart(stage, difficulty).length,
    clearRate,
    damageP10: Math.round(quantile(damages, 0.1)),
    damageP50: Math.round(quantile(damages, 0.5)),
    damageP90: Math.round(quantile(damages, 0.9)),
    comboP50: quantile(combos, 0.5),
    rankCounts,
  };
}

function rankSummary(rankCounts, total = RUNS) {
  return Object.entries(rankCounts)
    .map(([rank, count]) => `${rank}${Math.round((count / total) * 100)}%`)
    .join("/");
}

function printModeMatchedProfiles(loop = 1) {
  console.log(`\n${loopLabel(loop)} balance`);
  for (const [difficulty, profile] of Object.entries(MODE_MATCHED_PROFILES)) {
    console.log(`\n${profile.label}: mode-matched player profile`);
    for (const [stageIndex, stage] of STAGES.entries()) {
      const summary = summarizeStage(stage, difficulty, profile.rankWeights, stageIndex, loop);
      console.log(
        `${stage.id.padEnd(14)} hp=${String(summary.hp).padStart(4)} clear=${Math.round(summary.clearRate * 100)}% notes=${summary.notes} damage[p10=${summary.damageP10}, p50=${summary.damageP50}, p90=${summary.damageP90}] combo[p50=${summary.comboP50}] rank[${rankSummary(summary.rankCounts)}]`,
      );
    }
  }
}

function printCrossDifficultyProfiles(loop = 1) {
  console.log(`\nCross-difficulty same-player check (${loopLabel(loop)})`);
  for (const profile of Object.values(CROSS_CHECK_PROFILES)) {
    console.log(`\n${profile.label}`);
    for (const difficulty of Object.keys(MODE_MATCHED_PROFILES)) {
      const stageSummaries = STAGES.map((stage, stageIndex) => summarizeStage(stage, difficulty, profile.rankWeights, stageIndex, loop));
      const clearRates = stageSummaries.map((summary) => Math.round(summary.clearRate * 100));
      const averageClear = Math.round(clearRates.reduce((sum, rate) => sum + rate, 0) / clearRates.length);
      const minClear = Math.min(...clearRates);
      const rankTotals = stageSummaries.reduce(
        (acc, summary) => {
          for (const [rank, count] of Object.entries(summary.rankCounts)) acc[rank] += count;
          return acc;
        },
        { S: 0, A: 0, B: 0, C: 0 },
      );
      console.log(
        `${difficulty.padEnd(6)} avgClear=${String(averageClear).padStart(3)}% minClear=${String(minClear).padStart(3)}% ranks[${rankSummary(rankTotals, RUNS * STAGES.length)}]`,
      );
    }
  }
}

printModeMatchedProfiles(1);
printCrossDifficultyProfiles(1);
printModeMatchedProfiles(2);
printCrossDifficultyProfiles(2);

console.log("\nHP_BY_STAGE =");
console.log(JSON.stringify(Object.fromEntries(STAGES.map((stage) => [stage.id, stage.enemy.hp])), null, 2));
