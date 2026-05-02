import assert from "node:assert/strict";
import {
  calculateStageScore,
  comboBonusDamage,
  judgeHold,
  judgeMash,
  judgeTap,
  mashStrikeMultiplier,
  noteDamage,
  rankScore,
} from "../src/rhythm.js";

assert.equal(judgeTap({ timeMs: 1000 }, 1060).rank, "perfect");
assert.equal(judgeTap({ timeMs: 1000 }, 1120).rank, "good");
assert.equal(judgeTap({ timeMs: 1000 }, 1190).rank, "bad");
assert.equal(judgeTap({ timeMs: 1000 }, 1191).rank, "miss");
assert.equal(judgeTap({ timeMs: 1000 }, 1210, 0, 20).rank, "bad");
assert.equal(judgeTap({ timeMs: 1000 }, 1211, 0, 20).rank, "miss");
assert.equal(judgeTap({ timeMs: 1000 }, 1085, -50).rank, "perfect");

const hold = { timeMs: 2000, durationMs: 760 };
assert.equal(judgeHold(hold, 2020, 2760).rank, "perfect");
assert.equal(judgeHold(hold, 2020, 2910).rank, "bad");
assert.equal(judgeHold(hold, 2200, 2760).rank, "miss");
assert.equal(judgeHold(hold, 2020, 2970, 0, 20).rank, "bad");

const mashNote = { timeMs: 3000, durationMs: 500, targetCount: 5 };
const tapsPerfect = [3000, 3080, 3160, 3240, 3320].map((t) => t + 20);
assert.equal(judgeMash(mashNote, tapsPerfect).rank, "perfect");
assert.equal(judgeMash(mashNote, tapsPerfect).count, 5);
assert.ok(mashStrikeMultiplier("perfect", 6, 5) > 1.2);
assert.equal(judgeMash(mashNote, [2920, 2990, 3060, 3130, 3200]).rank, "perfect");
assert.equal(judgeMash(mashNote, [2920, 2980, 3040, 3100, 3160, 3220, 3280]).count, 4);
assert.equal(judgeMash(mashNote, [3000, 3070, 3140, 3210, 3280, 3350, 3420, 3490]).rank, "good");
assert.equal(judgeMash(mashNote, [2600, 2700, 3600, 3700]).rank, "miss");

const score = calculateStageScore({
  notes: [{ rank: "perfect" }, { rank: "good" }, { rank: "bad" }, { rank: "miss" }],
  maxCombo: 2,
  hp: 4,
  maxHp: 8,
});
assert.equal(score, 4900);

const earlyClearScore = calculateStageScore({
  notes: [{ rank: "perfect" }],
  totalNotes: 4,
  maxCombo: 1,
  hp: 8,
  maxHp: 8,
  comboBonusDamage: 10,
});
assert.equal(earlyClearScore, 3449);

assert.equal(comboBonusDamage(4, 3), 0);
assert.equal(comboBonusDamage(5, 3), 4);
assert.equal(comboBonusDamage(10, 3), 18);
assert.equal(comboBonusDamage(10, 1), 18);

let comboDamage = 0;
for (let combo = 1; combo <= 10; combo += 1) {
  const baseDamage = noteDamage("perfect");
  comboDamage += baseDamage;
  comboDamage += comboBonusDamage(combo, baseDamage);
}
assert.equal(comboDamage, 52);
assert.equal(rankScore(8400), "S");
assert.equal(rankScore(8399), "A");
assert.equal(rankScore(7000), "A");
assert.equal(rankScore(5400), "B");
assert.equal(rankScore(3000), "C");

console.log("rhythm unit ok");
