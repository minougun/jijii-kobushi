export const NOTE_TYPES = new Set(["tap", "hold", "mash"]);

export const JUDGE_ORDER = {
  perfect: 4,
  good: 3,
  bad: 2,
  miss: 1,
};

export const JUDGE_SCORE = {
  perfect: 100,
  good: 70,
  bad: 30,
  miss: 0,
};

export const WINDOWS_MS = {
  perfect: 60,
  good: 120,
  bad: 190,
};

export const MASH_INPUT_GRACE_MS = 80;
export const SPIRIT_FOCUS_DURATION_MS = 8000;
export const SPIRIT_FOCUS_WINDOW_BONUS_MS = 20;

export function judgeOffset(offsetMs, windowBonusMs = 0) {
  const abs = Math.abs(offsetMs);
  const bonus = Math.max(0, windowBonusMs);
  if (abs <= WINDOWS_MS.perfect + bonus) return "perfect";
  if (abs <= WINDOWS_MS.good + bonus) return "good";
  if (abs <= WINDOWS_MS.bad + bonus) return "bad";
  return "miss";
}

export function lowerJudge(a, b) {
  return JUDGE_ORDER[a] <= JUDGE_ORDER[b] ? a : b;
}

export function judgeTap(note, inputAtMs, inputOffsetMs = 0, windowBonusMs = 0) {
  const adjustedAt = inputAtMs + inputOffsetMs;
  const offsetMs = Math.round(adjustedAt - note.timeMs);
  const rank = judgeOffset(offsetMs, windowBonusMs);
  return { rank, offsetMs };
}

export function judgeMash(note, tapTimesMs) {
  const start = note.timeMs - MASH_INPUT_GRACE_MS;
  const end = note.timeMs + note.durationMs + MASH_INPUT_GRACE_MS;
  let count = 0;
  let lastCounted = -Infinity;

  for (const time of tapTimesMs) {
    if (time < start || time > end) continue;
    if (time - lastCounted < 70) continue;
    count += 1;
    lastCounted = time;
  }

  let rank = "miss";
  if (count >= note.targetCount) rank = "perfect";
  else if (count >= note.targetCount - 1) rank = "good";
  else if (count >= note.targetCount - 3) rank = "bad";

  if (count > note.targetCount + 2) {
    if (rank === "perfect") rank = "good";
    else if (rank === "good") rank = "bad";
    else if (rank === "bad") rank = "miss";
  }

  return {
    rank,
    offsetMs: 0,
    count,
    targetCount: note.targetCount,
  };
}

export function mashStrikeMultiplier(rank, count, targetCount) {
  if (rank === "miss" || targetCount <= 0) return 1;
  const over = Math.max(0, count - targetCount);
  const rankBoost = rank === "perfect" ? 0.14 : rank === "good" ? 0.09 : 0.05;
  const tapScale = Math.min(0.95, (Math.max(1, count) - 1) * 0.052 + over * 0.06);
  return Math.min(2.35, 1 + rankBoost + tapScale);
}

export function judgeHold(note, downAtMs, upAtMs, inputOffsetMs = 0, windowBonusMs = 0) {
  const start = judgeTap(note, downAtMs, inputOffsetMs, windowBonusMs);
  const endTarget = note.timeMs + note.durationMs;
  const endOffset = Math.round(upAtMs + inputOffsetMs - endTarget);
  const endRank = judgeOffset(endOffset, windowBonusMs);
  const rank = lowerJudge(start.rank, endRank);
  return {
    rank,
    offsetMs: Math.abs(start.offsetMs) >= Math.abs(endOffset) ? start.offsetMs : endOffset,
    start,
    end: { rank: endRank, offsetMs: endOffset },
  };
}

export function noteDamage(rank) {
  if (rank === "perfect") return 3;
  if (rank === "good") return 2;
  if (rank === "bad") return 1;
  return 0;
}

export function noteSpirit(rank) {
  if (rank === "perfect") return 12;
  if (rank === "good") return 7;
  if (rank === "bad") return 2;
  return -10;
}

export function comboBonusDamage(combo, baseDamage) {
  if (combo > 0 && combo % 10 === 0) return Math.max(18, baseDamage * 6);
  if (combo > 0 && combo % 5 === 0) return 4;
  return 0;
}

export function comboHitMultiplier(combo, random = Math.random) {
  if (combo < 10) return 1;
  return 1.3 + random() * 0.2;
}

export function finisherBonusDamage(note, rank) {
  if (!note?.finisher || rank === "miss") return 0;
  if (rank === "perfect") return 8;
  if (rank === "good") return 6;
  if (rank === "bad") return 3;
  return 0;
}

export function rankScore(score) {
  if (score >= 8400) return "S";
  if (score >= 7000) return "A";
  if (score >= 5400) return "B";
  return "C";
}

export function calculateStageScore({ notes, maxCombo, hp, maxHp, totalNotes = notes.length, comboBonusDamage = 0 }) {
  const total = totalNotes || notes.length || 1;
  const judgePoints = notes.reduce((sum, note) => sum + JUDGE_SCORE[note.rank], 0);
  const judgePart = (judgePoints / (total * 100)) * 7000;
  const comboPart = (maxCombo / total) * 1500;
  const hpPart = (Math.max(0, hp) / maxHp) * 1300;
  const comboBonusPart = Math.min(900, comboBonusDamage * 2.4);
  return Math.round(Math.max(0, Math.min(10000, judgePart + comboPart + hpPart + comboBonusPart)));
}
