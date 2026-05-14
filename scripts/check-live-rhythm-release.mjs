import { readFileSync } from "node:fs";

const DEFAULT_VERDICT_PATH = "docs/qa/live-rhythm-verdict-2026-05-14.md";
const verdictPath = process.argv[2] || process.env.LIVE_RHYTHM_VERDICT_PATH || DEFAULT_VERDICT_PATH;
const text = readFileSync(verdictPath, "utf8");

function field(pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`live rhythm verdict missing ${label}: ${verdictPath}`);
  return match[1].trim();
}

const overallVerdict = field(/Overall verdict:\s*`?([^`\n]+)`?/i, "Overall verdict").toLowerCase();
const shipVerdict = field(/## Ship \/ QA Verdict\s*\n+\s*`?([^`\n]+)`?/i, "Ship / QA Verdict").toLowerCase();
const hasPhysicalAudioEvidence = /物理スピーカー聴取なし|system audio入り録画も取れなかった|聴感判定は不可/.test(text) === false;
const iosRows = text.split("\n").filter((line) => /^\|\s*iOS\s*\|/i.test(line));
const hasRequiredDeviceCoverage = iosRows.some((line) => !line.includes("未テスト"));

const blockers = [];
if (overallVerdict !== "ship") blockers.push(`Overall verdict is ${overallVerdict}`);
if (!/^ship\b/.test(shipVerdict)) blockers.push(`Ship / QA Verdict is ${shipVerdict}`);
if (!hasPhysicalAudioEvidence) blockers.push("physical/system-audio listening evidence is missing");
if (!hasRequiredDeviceCoverage) blockers.push("iOS rhythm coverage is missing");
for (const stageId of ["shotengai", "redgate"]) {
  const stagePattern = new RegExp(`${stageId}[\\s\\S]{0,240}(候補|unclear|未実走)`, "i");
  if (stagePattern.test(text)) blockers.push(`${stageId} still has unresolved timing suspicion`);
}

if (blockers.length) {
  throw new Error(`live rhythm release gate failed:\n- ${blockers.join("\n- ")}`);
}

console.log(`live rhythm release gate ok: ${verdictPath}`);
