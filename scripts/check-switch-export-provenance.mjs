import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const stageDirs = [
  path.join(repoRoot, "switch-port", "stage1"),
  path.join(repoRoot, "switch-port", "stages"),
];

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function stageFiles() {
  return stageDirs.flatMap((directory) => {
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
      .filter((file) => file.endsWith(".stage.json"))
      .map((file) => path.join(directory, file));
  });
}

function gitFileAtCommit(commit, relativePath) {
  try {
    return execFileSync("git", ["show", `${commit}:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 80 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function workingFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const failures = [];
const files = stageFiles();

for (const filePath of files) {
  const relativeStagePath = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
  const payload = readJson(filePath);
  if (!payload.sourceGitCommit) {
    failures.push(`${relativeStagePath}: missing sourceGitCommit`);
    continue;
  }
  if (payload.sourceWorktreeDirty !== false) {
    failures.push(`${relativeStagePath}: sourceWorktreeDirty must be false`);
  }
  if (payload.sourceDirtyFiles?.length) {
    failures.push(`${relativeStagePath}: sourceDirtyFiles must be empty`);
  }

  for (const sourceFile of payload.sourceFiles ?? []) {
    const committed = gitFileAtCommit(payload.sourceGitCommit, sourceFile);
    if (committed === null) {
      failures.push(`${relativeStagePath}: ${sourceFile} is missing at ${payload.sourceGitCommit}`);
      continue;
    }
    if (committed !== workingFile(sourceFile)) {
      failures.push(`${relativeStagePath}: ${sourceFile} differs from clean source commit ${payload.sourceGitCommit}`);
    }
  }
}

const status = git([
  "status",
  "--porcelain=v1",
  "--untracked-files=all",
  "--",
  "switch-port/stage1",
  "switch-port/stages",
])
  .split("\n")
  .filter(Boolean);

const untracked = status.filter((line) => line.startsWith("?? "));
if (untracked.length > 0) {
  failures.push(`untracked Switch export files:\n${untracked.join("\n")}`);
}

if (failures.length > 0) {
  throw new Error(`Switch export provenance gate failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(`switch export provenance ok: ${files.length} stage export files`);
