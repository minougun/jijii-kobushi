import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(repoRoot, "docs", "commercial-review-evidence-2026-05-07");
const requiredEvidence = [
  "01-op-desktop.png",
  "02-title-desktop.png",
  "03-help-desktop.png",
  "04-mobile-portrait-landscape-default.png",
  "05-mobile-landscape-title.png",
  "06-battle-desktop.png",
  "07-pause-help-popout-desktop.png",
  "08-ending-overlay-desktop.png",
  "09-ed-bonus-desktop.png",
  "10-results-desktop.png",
  "11-loop2-doodle-battle-desktop.png",
];

function run(label, command, args) {
  console.log(`\n== ${label}`);
  console.log([command, ...args].join(" "));
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEvidence() {
  assert(existsSync(evidenceDir), `commercial evidence directory missing: ${evidenceDir}`);
  const found = new Set(readdirSync(evidenceDir));
  for (const file of requiredEvidence) {
    const fullPath = path.join(evidenceDir, file);
    assert(found.has(file), `commercial evidence screenshot missing: ${file}`);
    assert(statSync(fullPath).size > 16_000, `commercial evidence screenshot is unexpectedly small: ${file}`);
  }
}

run("web original integrity gate", "npm", ["run", "check"]);
run("web strict browser smoke", "npm", ["run", "test:web-smoke:strict"]);
run("commercial evidence capture", "npm", ["run", "capture:commercial-evidence"]);
assertEvidence();
console.log("\nWeb commercial completion gate: pass");
