import { spawnSync } from "node:child_process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

const env = process.env.REQUIRE_CLEAN_WEB_TRACES === "1"
  ? { REQUIRE_CLEAN_WEB_TRACES: "1" }
  : {};

run("node", ["scripts/export-switch-stage1.mjs"], env);
run("node", ["scripts/export-switch-stages.mjs"], env);
run("node", ["scripts/export-switch-stage-results.mjs"], env);
run("node", ["scripts/check-switch-export-provenance.mjs"], env);

console.log("switch trace exports ok");
