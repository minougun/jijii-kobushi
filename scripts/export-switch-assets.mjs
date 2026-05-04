import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "switch-port/assets/runtime-assets.json");
const scannedFiles = [
  "index.html",
  "src/audio.js",
  "src/main.js",
  "src/renderer.js",
  "src/stages.js",
  "assets/audio/README.md",
  "assets/images/README.md",
  "assets/video/README.md",
];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const requireLocal = args.has("--require-local");

function stripQuery(src) {
  return src.replace(/\?.*$/, "");
}

function normalizeAssetPath(src) {
  return stripQuery(src.replace(/\\/g, "/").replace(/^\.\//, ""));
}

function gitTrackedAssets() {
  const raw = execFileSync("git", ["ls-files", "-s", "assets"], { cwd: repoRoot, encoding: "utf8" });
  const map = new Map();
  raw.trim().split("\n").filter(Boolean).forEach((line) => {
    const match = line.match(/^(\d+)\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/);
    if (!match) return;
    map.set(match[3], { mode: match[1], objectId: match[2] });
  });
  return map;
}

function collectReferencedAssets() {
  const assets = new Map();
  const pattern = /["'`](\.\/assets\/(?:audio|fonts|images|video)\/[^"'`\s)]+)["'`]/g;
  for (const file of scannedFiles) {
    const absolute = path.join(repoRoot, file);
    if (!existsSync(absolute)) continue;
    const text = readFileSync(absolute, "utf8");
    for (const match of text.matchAll(pattern)) {
      const assetPath = normalizeAssetPath(match[1]);
      if (!assets.has(assetPath)) {
        assets.set(assetPath, { path: assetPath, references: [] });
      }
      assets.get(assetPath).references.push(file);
    }
  }
  return assets;
}

function classify(assetPath) {
  const ext = path.extname(assetPath).toLowerCase().replace(".", "");
  const folder = assetPath.split("/")[1] ?? "";
  if (folder === "audio") return { kind: "audio", importHint: "AudioClip", codec: ext };
  if (folder === "video") return { kind: "video", importHint: "VideoClip", codec: ext };
  if (folder === "fonts") return { kind: "font", importHint: "Font", codec: ext };
  if (folder === "images") {
    if (ext === "svg") return { kind: "vector-image", importHint: "Texture2D or VectorImage", codec: ext };
    return { kind: "raster-image", importHint: "Texture2D", codec: ext };
  }
  return { kind: "unknown", importHint: "Manual review", codec: ext };
}

function roleFor(assetPath) {
  const name = path.basename(assetPath);
  if (name.startsWith("stage-bg-")) return "stage-background";
  if (name.includes("chibi-character-sheet")) return "character-sheet";
  if (name.includes("imagegen-atlas")) return "fallback-atlas";
  if (name.includes("kojiro-cutin")) return "special-cutin";
  if (name.includes("horse-mask")) return "final-boss-sprite";
  if (name.includes("hasegawa-reveal")) return "final-reveal-sprite";
  if (name.includes("op-title")) return "opening-still";
  if (name.includes("enka-wave-band")) return "overlay-motif";
  if (assetPath.startsWith("assets/audio/")) return "stage-bgm";
  if (assetPath.startsWith("assets/video/ending-loop2")) return "ending-video-loop-plus";
  if (assetPath.startsWith("assets/video/ending")) return "ending-video-first-loop";
  if (assetPath.startsWith("assets/fonts/")) return "ui-font";
  return "runtime-asset";
}

function buildManifest() {
  const tracked = gitTrackedAssets();
  const referenced = collectReferencedAssets();
  const assets = Array.from(referenced.values())
    .map((entry) => {
      const git = tracked.get(entry.path) ?? null;
      return {
        path: entry.path,
        role: roleFor(entry.path),
        ...classify(entry.path),
        gitTracked: Boolean(git),
        gitObjectId: git?.objectId ?? "",
        references: Array.from(new Set(entry.references)).sort(),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    schemaVersion: 1,
    gameId: "jii-kobushi",
    exportId: "switch-runtime-assets",
    source: {
      webUrl: "https://minougun.github.io/jijii-kobushi/",
      localRepo: repoRoot,
      scannedFiles,
    },
    notes: [
      "This manifest is source-only. It records the runtime Web assets that the Switch port must import or recreate.",
      "gitTracked confirms that the asset exists in the repository index. Some large image files may be skip-worktree locally and are intentionally not required by the default validator.",
    ],
    assets,
  };
}

function validateManifest(manifest) {
  const missingGit = manifest.assets.filter((asset) => !asset.gitTracked);
  if (missingGit.length > 0) {
    throw new Error(`runtime assets missing from git index: ${missingGit.map((asset) => asset.path).join(", ")}`);
  }

  if (requireLocal) {
    const missingLocal = manifest.assets.filter((asset) => !existsSync(path.join(repoRoot, asset.path)));
    if (missingLocal.length > 0) {
      throw new Error(`runtime assets missing locally: ${missingLocal.map((asset) => asset.path).join(", ")}`);
    }
  }
}

const manifest = buildManifest();
validateManifest(manifest);
const json = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  if (current !== json) {
    throw new Error(`switch asset manifest is stale. Run npm run export:switch-assets.`);
  }
  console.log(`switch runtime assets ok: ${manifest.assets.length} assets`);
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json);
  console.log(`wrote ${path.relative(repoRoot, outputPath)} (${manifest.assets.length} assets)`);
}
