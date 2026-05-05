import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const unityRoot = path.join(repoRoot, "switch-port", "unity-stage1-prototype");
const unityProject = path.join(unityRoot, "UnityProject");
const unityExe = process.env.UNITY_EXE || "/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe";
const cscExe = process.env.CSC_EXE || "/mnt/c/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe";
const buildOutput = path.join(unityProject, "Builds", "Windows", "Stage1Prototype.exe");

function toWindowsPath(value) {
  const normalized = value.replaceAll("\\", "/");
  const match = normalized.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!match) return value;
  return `${match[1].toUpperCase()}:\\${match[2].replaceAll("/", "\\")}`;
}

function run(label, command, args, options = {}) {
  console.log(`\n== ${label}`);
  console.log([command, ...args].join(" "));
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
    env: process.env,
  });

  if (options.capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }

  return result;
}

function assertFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} missing: ${filePath}`);
  }
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function assertUnityXmlPass(filePath, label) {
  assertFile(filePath, label);
  const xml = readText(filePath);
  if (!/result="Passed"/.test(xml) || !/failed="0"/.test(xml)) {
    throw new Error(`${label} did not report a clean pass: ${filePath}`);
  }
}

function assertLogContains(filePath, pattern, label) {
  assertFile(filePath, label);
  const text = readText(filePath);
  if (!pattern.test(text)) {
    throw new Error(`${label} did not contain ${pattern}: ${filePath}`);
  }
}

function collectCsFiles(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) collectCsFiles(fullPath, files);
    else if (entry.endsWith(".cs")) files.push(fullPath);
  }
  return files;
}

function compileStandaloneCli() {
  assertFile(cscExe, "csc.exe");
  const sourceRoot = path.join(unityProject, "Assets", "Scripts");
  const sources = collectCsFiles(sourceRoot);
  mkdirSync(unityRoot, { recursive: true });
  run("compile standalone C# parity CLI", cscExe, [
    "/nologo",
    "/target:exe",
    `/out:${toWindowsPath(path.join(unityRoot, "Stage1PortableCli.exe"))}`,
    ...sources.map(toWindowsPath),
  ]);
}

function runUnityTests(platform, resultName, logName) {
  assertFile(unityExe, "Unity Editor");
  const resultPath = path.join(unityRoot, resultName);
  const logPath = path.join(unityRoot, logName);
  run(`Unity ${platform} tests`, unityExe, [
    "-batchmode",
    "-projectPath",
    toWindowsPath(unityProject),
    "-runTests",
    "-testPlatform",
    platform,
    "-testResults",
    toWindowsPath(resultPath),
    "-logFile",
    toWindowsPath(logPath),
  ]);
  assertUnityXmlPass(resultPath, `Unity ${platform} results`);
}

function runUnityPortableParity() {
  assertFile(unityExe, "Unity Editor");
  const reportPath = path.join(unityRoot, "unity-portable-parity.txt");
  const logPath = path.join(unityRoot, "unity-validation.log");
  run("Unity portable parity validation", unityExe, [
    "-batchmode",
    "-projectPath",
    toWindowsPath(unityProject),
    "-executeMethod",
    "JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeValidation.RunPortableParityChecks",
    "-validationOutput",
    toWindowsPath(reportPath),
    "-logFile",
    toWindowsPath(logPath),
    "-quit",
  ]);
  assertLogContains(reportPath, /Unity portable parity: pass/, "Unity portable parity report");
}

function buildWindowsPlayer() {
  assertFile(unityExe, "Unity Editor");
  const logPath = path.join(unityRoot, "unity-build-windows.log");
  run("Unity Windows prototype build", unityExe, [
    "-batchmode",
    "-projectPath",
    toWindowsPath(unityProject),
    "-executeMethod",
    "JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeBuild.BuildWindowsPrototype",
    "-buildOutput",
    toWindowsPath(buildOutput),
    "-logFile",
    toWindowsPath(logPath),
    "-quit",
  ]);
  assertFile(buildOutput, "Windows prototype player");
  assertLogContains(logPath, /Windows prototype build succeeded/, "Windows prototype build log");
}

function runPlayerSmoke(flag, logName, pattern) {
  assertFile(buildOutput, "Windows prototype player");
  const logPath = path.join(unityRoot, logName);
  run(`Windows player smoke ${flag}`, buildOutput, [
    "-batchmode",
    "-nographics",
    flag,
    "-logFile",
    toWindowsPath(logPath),
  ]);
  assertLogContains(logPath, pattern, `Windows player smoke ${flag}`);
}

run("web original integrity gate", "npm", ["run", "check"]);
run("switch portable data gates", "npm", ["run", "check:switch-port"]);
compileStandaloneCli();
run("standalone C# all-stage parity", path.join(unityRoot, "Stage1PortableCli.exe"), ["--all-stages"]);
runUnityTests("EditMode", "unity-editmode-results.xml", "unity-editmode.log");
runUnityTests("PlayMode", "unity-playmode-results.xml", "unity-playmode.log");
runUnityPortableParity();
buildWindowsPlayer();
runPlayerSmoke("-jijiiSmokeQuit", "unity-player-smoke.log", /player smoke quit: exitCode=0/);
runPlayerSmoke("-jijiiSmokeAllStages", "unity-player-allstages-smoke.log", /all-stage smoke quit: exitCode=0/);
runPlayerSmoke("-jijiiSmokeLoopPlus", "unity-player-loopplus-smoke.log", /loop-plus smoke quit: exitCode=0/);
runPlayerSmoke("-jijiiSmokeEnding", "unity-player-ending-smoke.log", /ending smoke quit: exitCode=0/);

console.log("\nSwitch local completion gate: pass");
