import assert from "node:assert/strict";
import {
  comboBonusDamage,
  finisherBonusDamage,
  judgeMash,
  noteDamage,
} from "../src/rhythm.js";

function applyHit({ enemyHp, combo, rank = "perfect", baseDamage = noteDamage(rank), note = {} }) {
  const hitDamage = baseDamage + comboBonusDamage(combo, baseDamage) + finisherBonusDamage(note, rank);
  return {
    enemyHp: Math.max(0, enemyHp - hitDamage),
    hitDamage,
    hpReachedZero: enemyHp > 0 && enemyHp - hitDamage <= 0,
  };
}

const combo5 = applyHit({ enemyHp: 7, combo: 5, baseDamage: 3 });
assert.equal(combo5.hitDamage, 7, "combo5 fixture must kill from exact HP");
assert.equal(combo5.enemyHp, 0, "combo5 fixture reaches HP zero");
assert.equal(combo5.hpReachedZero, true, "combo5 fixture emits HP zero boundary");

const combo10 = applyHit({ enemyHp: 21, combo: 10, baseDamage: 3 });
assert.equal(combo10.hitDamage, 21, "combo10 fixture must include large combo milestone damage");
assert.equal(combo10.enemyHp, 0, "combo10 fixture reaches HP zero");
assert.equal(combo10.hpReachedZero, true, "combo10 fixture emits HP zero boundary");

const finisher = applyHit({ enemyHp: 11, combo: 1, baseDamage: 3, note: { finisher: true } });
assert.equal(finisher.hitDamage, 11, "finisher fixture must kill from exact HP");
assert.equal(finisher.enemyHp, 0, "finisher fixture reaches HP zero");
assert.equal(finisher.hpReachedZero, true, "finisher fixture emits HP zero boundary");

const mashNote = { type: "mash", timeMs: 1000, durationMs: 500, targetCount: 5 };
assert.equal(
  judgeMash(mashNote, [930, 1000, 1070, 1140, 1210]).rank,
  "perfect",
  "mash exact target fixture",
);
assert.equal(
  judgeMash(mashNote, [930, 1000, 1070, 1140]).rank,
  "good",
  "mash one-short fixture",
);

console.log("rhythm boundary fixtures ok: combo5/combo10/finisher hp-zero, mash exact/one-short");
