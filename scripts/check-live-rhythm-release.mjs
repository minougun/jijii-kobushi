import { existsSync, readFileSync } from "node:fs";

const DEFAULT_VERDICT_PATH = "docs/qa/live-rhythm-verdict-2026-05-14.md";
const DEFAULT_RUNTIME_TRACE_PATH = "switch-port/runtime-traces/web-runtime-state-traces.json";
const verdictPath = process.argv[2] || process.env.LIVE_RHYTHM_VERDICT_PATH || DEFAULT_VERDICT_PATH;
const runtimeTracePath = process.env.WEB_RUNTIME_TRACE_PATH || DEFAULT_RUNTIME_TRACE_PATH;
const text = readFileSync(verdictPath, "utf8");

function field(pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`live rhythm verdict missing ${label}: ${verdictPath}`);
  return match[1].trim();
}

const overallVerdict = field(/Overall verdict:\s*`?([^`\n]+)`?/i, "Overall verdict").toLowerCase();
const shipVerdict = field(/## Ship \/ QA Verdict\s*\n+\s*`?([^`\n]+)`?/i, "Ship / QA Verdict").toLowerCase();
const hasZeroTimingWarnings = /timing warnings\s*[=:]\s*0/i.test(text);
const hasRuntimeTraceEvidence = existsSync(runtimeTracePath) && JSON.parse(readFileSync(runtimeTracePath, "utf8")).traces?.length >= 21;

const blockers = [];
if (overallVerdict !== "ship") blockers.push(`Overall verdict is ${overallVerdict}`);
if (!/^ship\b/.test(shipVerdict)) blockers.push(`Ship / QA Verdict is ${shipVerdict}`);
if (!hasZeroTimingWarnings) blockers.push("audio sync machine audit does not report timing warnings=0");
if (!hasRuntimeTraceEvidence) blockers.push(`Web runtime state trace evidence is missing or incomplete: ${runtimeTracePath}`);
for (const stageId of ["shotengai", "redgate"]) {
  const stagePattern = new RegExp(`${stageId}[\\s\\S]{0,240}(候補|unclear|未実走)`, "i");
  if (stagePattern.test(text)) blockers.push(`${stageId} still has unresolved timing suspicion`);
}

if (blockers.length) {
  throw new Error(`live rhythm release gate failed:\n- ${blockers.join("\n- ")}`);
}

console.log(`live rhythm release gate ok: ${verdictPath}`);
