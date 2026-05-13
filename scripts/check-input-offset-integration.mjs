import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { judgeHold, judgeMash, judgeTap } from "../src/rhythm.js";

const mainSource = readFileSync("src/main.js", "utf8");
const mashCallPattern = /judgeMash\(([^)]*)\)/g;
const badMashCalls = [];
for (const match of mainSource.matchAll(mashCallPattern)) {
  const call = match[0];
  if (!call.includes("state.inputOffsetMs")) badMashCalls.push(call);
}
assert.deepEqual(badMashCalls, [], `main.js judgeMash calls missing state.inputOffsetMs: ${badMashCalls.join("; ")}`);

const offsetMs = -60;
assert.equal(judgeTap({ timeMs: 1000 }, 1060, offsetMs).rank, "perfect");

const hold = { timeMs: 2000, durationMs: 600 };
assert.equal(judgeHold(hold, 2060, 2660, offsetMs).rank, "perfect");

const mash = { timeMs: 3000, durationMs: 280, targetCount: 5 };
const rawLateTaps = [3120, 3190, 3260, 3330, 3400];
assert.equal(judgeMash(mash, rawLateTaps, offsetMs).rank, "perfect");
assert.equal(judgeMash(mash, rawLateTaps, offsetMs).count, 5);
assert.equal(judgeMash(mash, rawLateTaps).rank, "good");

console.log("input offset integration ok");
