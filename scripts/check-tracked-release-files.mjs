import { spawnSync } from "node:child_process";

const releaseRoots = [
  ".github/workflows",
  "assets",
  "index.html",
  "ios",
  "package-lock.json",
  "package.json",
  "privacy.html",
  "scripts",
  "src",
  "support.html",
  "switch-port/assets",
  "switch-port/ending",
  "switch-port/stage1",
  "switch-port/stages",
];

const requiredPaths = [
  ".github/workflows/checks.yml",
  "index.html",
  "ios/JiiKobushi.xcodeproj/project.pbxproj",
  "ios/JiiKobushi.xcodeproj/xcshareddata/xcschemes/JiiKobushi.xcscheme",
  "ios/JiiKobushi/GameViewController.swift",
  "ios/JiiKobushi/BundleResourceSchemeHandler.swift",
  "ios/JiiKobushi/Info.plist",
  "privacy.html",
  "scripts/check-ios-project.mjs",
  "scripts/check-switch-local-complete.mjs",
  "src/main.js",
  "src/rhythm.js",
  "src/stages.js",
  "switch-port/assets/runtime-assets.json",
  "switch-port/stage1/shotengai.stage.json",
  "switch-port/stages/stage01-shotengai.stage.json",
  "switch-port/stages/stage07-finalhideout.stage.json",
];

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function assertTracked(relativePath) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", relativePath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return false;
  return true;
}

const missing = requiredPaths.filter((relativePath) => !assertTracked(relativePath));
if (missing.length > 0) {
  throw new Error(`release-critical paths are not tracked:\n${missing.map((path) => `- ${path}`).join("\n")}`);
}

const statusLines = git(["status", "--porcelain=v1", "--untracked-files=all", "--", ...releaseRoots])
  .split("\n")
  .filter(Boolean);
const untracked = statusLines.filter((line) => line.startsWith("?? "));
if (untracked.length > 0) {
  throw new Error(`untracked release files would not exist after clone:\n${untracked.join("\n")}`);
}

console.log(`tracked release file gate ok: ${requiredPaths.length} required paths, ${releaseRoots.length} roots`);
