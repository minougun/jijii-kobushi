import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const requiredPaths = [
  "ios/JiiKobushi.xcodeproj/project.pbxproj",
  "ios/JiiKobushi.xcodeproj/xcshareddata/xcschemes/JiiKobushi.xcscheme",
  "ios/JiiKobushi/AppDelegate.swift",
  "ios/JiiKobushi/SceneDelegate.swift",
  "ios/JiiKobushi/GameViewController.swift",
  "ios/JiiKobushi/BundleResourceSchemeHandler.swift",
  "ios/JiiKobushi/Info.plist",
  "ios/JiiKobushi/PrivacyInfo.xcprivacy",
  "ios/app-store-metadata-ja.md",
  "ios/app-store-readiness.md",
  "support.html",
  "privacy.html",
  "ios/JiiKobushi/Assets.xcassets/Contents.json",
  "ios/JiiKobushi/Assets.xcassets/AppIcon.appiconset/Contents.json",
  "ios/JiiKobushi/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png",
  "ios/JiiKobushi/Base.lproj/LaunchScreen.storyboard",
  "index.html",
  "src/main.js",
  "src/styles.css",
  "assets/audio/koiwazurai.mp3",
  "assets/images/op-title-kakizome-hanshi-v1.png",
  "assets/video/ending.mp4",
];

const missing = requiredPaths.filter((relativePath) => !existsSync(join(ROOT, relativePath)));
if (missing.length > 0) {
  throw new Error(`Missing iOS project dependency paths:\n${missing.map((path) => `- ${path}`).join("\n")}`);
}

if (process.env.REQUIRE_TRACKED_IOS_FILES === "1") {
  assertTrackedPaths(requiredPaths);
  assertNoUntrackedUnder(["ios", "support.html", "privacy.html"]);
}

const project = readFileSync(join(ROOT, "ios/JiiKobushi.xcodeproj/project.pbxproj"), "utf8");
for (const token of ["../index.html", "../src", "../assets", "GameViewController.swift", "BundleResourceSchemeHandler.swift", "Assets.xcassets", "PrivacyInfo.xcprivacy"]) {
  if (!project.includes(token)) throw new Error(`Xcode project is missing ${token}`);
}

const infoPlist = readFileSync(join(ROOT, "ios/JiiKobushi/Info.plist"), "utf8");
if (!infoPlist.includes("CFBundleDisplayName")) throw new Error("Info.plist is missing CFBundleDisplayName");
for (const token of ["public.app-category.games", "ITSAppUsesNonExemptEncryption", "UIUserInterfaceStyle"]) {
  if (!infoPlist.includes(token)) throw new Error(`Info.plist is missing ${token}`);
}

const controller = readFileSync(join(ROOT, "ios/JiiKobushi/GameViewController.swift"), "utf8");
for (const token of ["setURLSchemeHandler", "jiikobushi://local/index.html", "allowsInlineMediaPlayback", "jiiKobushiNative", "decidePolicyFor"]) {
  if (!controller.includes(token)) throw new Error(`GameViewController is missing ${token}`);
}

const schemeHandler = readFileSync(join(ROOT, "ios/JiiKobushi/BundleResourceSchemeHandler.swift"), "utf8");
for (const token of ["WKURLSchemeHandler", "audio/mpeg", "video/mp4", "font/woff2"]) {
  if (!schemeHandler.includes(token)) throw new Error(`BundleResourceSchemeHandler is missing ${token}`);
}

const bundledReferenceRoots = ["index.html", "src"];
const referencedBundlePaths = new Set();
for (const filePath of filesUnder(...bundledReferenceRoots)) {
  const text = readFileSync(join(ROOT, filePath), "utf8");
  for (const match of text.matchAll(/["'`](?:\.\/)?((?:assets|src)\/[^"'`?#)]+)(?:[?#][^"'`]*)?["'`]/g)) {
    referencedBundlePaths.add(match[1]);
  }
}

const missingBundleReferences = [...referencedBundlePaths].filter((relativePath) => !existsSync(join(ROOT, relativePath)));
if (missingBundleReferences.length > 0) {
  throw new Error(`Missing bundled asset references:\n${missingBundleReferences.map((path) => `- ${path}`).join("\n")}`);
}

const metadata = readFileSync(join(ROOT, "ios/app-store-metadata-ja.md"), "utf8");
const subtitleCandidates = readNumberedList(metadata, "Subtitle Candidates");
for (const subtitle of subtitleCandidates) {
  if ([...subtitle].length > 30) throw new Error(`Subtitle exceeds 30 characters: ${subtitle}`);
}
const promotionalText = readSectionBody(metadata, "Promotional Text Draft").trim();
if ([...promotionalText].length > 170) throw new Error(`Promotional text exceeds 170 characters: ${promotionalText}`);
const keywords = readSectionBody(metadata, "Keywords Draft").split("\n")[0].trim();
if ([...keywords].length > 100) throw new Error(`Keywords exceed 100 characters: ${keywords}`);
for (const token of ["support.html", "privacy.html", "https://minougun.github.io/jijii-kobushi/"]) {
  if (!metadata.includes(token)) throw new Error(`Metadata is missing ${token}`);
}

const privacyPage = readFileSync(join(ROOT, "privacy.html"), "utf8");
const supportPage = readFileSync(join(ROOT, "support.html"), "utf8");
if (!privacyPage.includes("サーバー送信を使用していません")) throw new Error("Privacy page is missing current data posture");
if (!supportPage.includes("入力補正")) throw new Error("Support page is missing input offset help");

console.log("iOS project structure OK");

function git(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function assertTrackedPaths(paths) {
  const missingFromIndex = [];
  for (const relativePath of paths) {
    const result = spawnSync("git", ["ls-files", "--error-unmatch", relativePath], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) missingFromIndex.push(relativePath);
  }
  if (missingFromIndex.length > 0) {
    throw new Error(`iOS release files are not tracked:\n${missingFromIndex.map((path) => `- ${path}`).join("\n")}`);
  }
}

function assertNoUntrackedUnder(paths) {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths])
    .split("\n")
    .filter(Boolean);
  const untracked = status.filter((line) => line.startsWith("?? "));
  if (untracked.length > 0) {
    throw new Error(`untracked iOS release files would be missing after clone:\n${untracked.join("\n")}`);
  }
}

function filesUnder(...roots) {
  const files = [];
  for (const root of roots) {
    const absoluteRoot = join(ROOT, root);
    if (!existsSync(absoluteRoot)) continue;
    const stat = statSync(absoluteRoot);
    if (stat.isFile()) {
      files.push(root);
      continue;
    }
    for (const entry of readdirSync(absoluteRoot)) {
      const relativePath = `${root}/${entry}`;
      const absolutePath = join(ROOT, relativePath);
      const entryStat = statSync(absolutePath);
      if (entryStat.isDirectory()) files.push(...filesUnder(relativePath));
      else if (/\.(html|css|js|mjs)$/.test(entry)) files.push(relativePath);
    }
  }
  return files;
}

function readSectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, "m"));
  if (!match) throw new Error(`Missing metadata section: ${heading}`);
  return match[1];
}

function readNumberedList(markdown, heading) {
  return readSectionBody(markdown, heading)
    .split("\n")
    .map((line) => line.match(/^\\d+\\.\\s+(.+)$/)?.[1])
    .filter(Boolean);
}
