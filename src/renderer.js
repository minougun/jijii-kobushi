import { loopLabel, normalizeLoop, nextNoteLabel } from "./stages.js?v=20260501-0100";
import { normalizeLang, phaseBadgeLabel, t } from "./i18n.js?v=20260430-1607";

const CANVAS_FONT = "JiiKobushiNotoSansJP, Noto Sans JP, Hiragino Sans, Yu Gothic, sans-serif";
const DIFFICULTY_LABELS = { easy: "イージー", normal: "ノーマル", hard: "ハード" };
const HERO_PALETTE = {
  coat: "#4b2b68",
  robe: "#3c234f",
  trim: "#fff7e6",
  face: "#f0b783",
  hair: "#2b252b",
  accent: "#d7a84a",
};

export function createRenderer(canvas, ctx, state) {
  const W = 960;
  const H = 540;
  const ENABLE_WEB_DOODLE_LOOP_SCREEN = true;
  const cutinImage = new Image();
  const imagegenAtlasImage = new Image();
  const chibiCharacterSheetImage = new Image();
  chibiCharacterSheetImage.src = "./assets/images/jii-kobushi-chibi-character-sheet-v1.png";
  const horseMaskBossImage = new Image();
  const hasegawaRevealImage = new Image();
  const enkaWaveBandImage = new Image();
  enkaWaveBandImage.src = "./assets/images/enka-wave-band.svg";
  const stageBackgroundSources = {
    shotengai: { webp: "./assets/images/stage-bg-shotengai-v1.webp", png: "./assets/images/stage-bg-shotengai-v1.png" },
    warehouse: { webp: "./assets/images/stage-bg-warehouse-v1.webp", png: "./assets/images/stage-bg-warehouse-v1.png" },
    riverside: { webp: "./assets/images/stage-bg-riverside-v1.webp", png: "./assets/images/stage-bg-riverside-v1.png" },
    mountain: { webp: "./assets/images/stage-bg-mountain-v1.webp", png: "./assets/images/stage-bg-mountain-v1.png" },
    garage: { webp: "./assets/images/stage-bg-garage-v1.webp", png: "./assets/images/stage-bg-garage-v1.png" },
    redgate: { webp: "./assets/images/stage-bg-redgate-v1.webp", png: "./assets/images/stage-bg-redgate-v1.png" },
    finalhideout: { webp: "./assets/images/stage-bg-finalhideout-v1.webp", png: "./assets/images/stage-bg-finalhideout-v1.png" },
  };
  const stageBackgroundImages = new Map();
  const stageSceneCache = new Map();
  const rhythmChromeCache = new Map();
  const paperCutoutCache = new WeakMap();
  let cutinRequested = false;
  let imagegenAtlasRequested = false;
  let horseMaskBossRequested = false;
  let hasegawaRevealRequested = false;
  enkaWaveBandImage.addEventListener("load", () => stageSceneCache.clear(), { once: true });
  const enemySpriteCache = new Map();
  const imagegenCropCache = new Map();
  const chibiCharacterCache = new Map();
  const whiteFloodCutoutCache = new WeakMap();
  const SECRET_ENEMY_KINDS = new Set(["agent", "bruiser", "scientist", "maskedHeavy", "captain", "scout", "elite", "steroidBoss"]);
  const imagegenAtlas = {
    heroStage1: { sx: 44, sy: 28, sw: 250, sh: 350, drawW: 168, drawH: 232, footInset: 10 },
    heroKimono: { sx: 562, sy: 16, sw: 268, sh: 354, drawW: 184, drawH: 244, footInset: 6 },
    enemies: {
      agent: { sx: 38, sy: 400, sw: 186, sh: 246, drawW: 148, drawH: 164, footInset: 8 },
      bruiser: { sx: 248, sy: 398, sw: 180, sh: 250, drawW: 154, drawH: 168, footInset: 8 },
      scientist: { sx: 1030, sy: 398, sw: 184, sh: 250, drawW: 148, drawH: 164, footInset: 8 },
      maskedHeavy: { sx: 472, sy: 398, sw: 176, sh: 250, drawW: 158, drawH: 170, footInset: 8 },
      captain: { sx: 674, sy: 398, sw: 172, sh: 250, drawW: 148, drawH: 164, footInset: 8 },
      scout: { sx: 846, sy: 398, sw: 176, sh: 250, drawW: 146, drawH: 162, footInset: 8 },
      armored: { sx: 674, sy: 398, sw: 172, sh: 250, drawW: 158, drawH: 170, footInset: 8 },
      operator: { sx: 1030, sy: 398, sw: 184, sh: 250, drawW: 148, drawH: 164, footInset: 8 },
      elite: { sx: 248, sy: 398, sw: 180, sh: 250, drawW: 152, drawH: 166, footInset: 8 },
      steroidBoss: { sx: 472, sy: 398, sw: 176, sh: 250, drawW: 168, drawH: 176, footInset: 8 },
    },
    backgrounds: {
      park: { sx: 78, sy: 668, sw: 1098, sh: 150 },
      warehouse: { sx: 78, sy: 833, sw: 1098, sh: 151 },
      hideout: { sx: 78, sy: 1003, sw: 1098, sh: 166 },
    },
  };
  const chibiCharacterSheet = {
    cols: 5,
    rows: 2,
    sprites: {
      heroStage1: { index: 0, drawW: 138, drawH: 176, footInset: 0 },
      heroKimono: { index: 1, drawW: 166, drawH: 176, footInset: 0 },
      agent: { index: 2, drawW: 134, drawH: 150, footInset: 0 },
      bruiser: { index: 3, drawW: 150, drawH: 158, footInset: 0 },
      scientist: { index: 4, drawW: 132, drawH: 156, footInset: 0 },
      maskedHeavy: { index: 5, drawW: 164, drawH: 174, footInset: 0 },
      scout: { index: 6, drawW: 134, drawH: 148, footInset: 0 },
      captain: { index: 8, drawW: 150, drawH: 166, footInset: 0 },
      elite: { index: 7, drawW: 148, drawH: 164, footInset: 0 },
      steroidBoss: { index: 9, drawW: 176, drawH: 184, footInset: 0 },
    },
  };

  function makeCanvas(width = W, height = H) {
    const next = document.createElement("canvas");
    next.width = Math.ceil(width);
    next.height = Math.ceil(height);
    return next;
  }

  function prepareWhiteFloodCutout(image, threshold = 196) {
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null;
    const key = `${image.naturalWidth}x${image.naturalHeight}:${threshold}`;
    const cached = whiteFloodCutoutCache.get(image);
    if (cached?.key === key) return cached.canvas;

    const source = makeCanvas(image.naturalWidth, image.naturalHeight);
    const sourceCtx = source.getContext("2d", { willReadFrequently: true });
    sourceCtx.drawImage(image, 0, 0);
    const pixels = sourceCtx.getImageData(0, 0, source.width, source.height);
    const data = pixels.data;
    const total = source.width * source.height;
    const seen = new Uint8Array(total);
    const queue = new Int32Array(total);
    let read = 0;
    let write = 0;
    const isOuterWhite = (index) => {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return a > 0 && min >= threshold && max - min <= 28;
    };
    const enqueue = (index) => {
      if (index < 0 || index >= total || seen[index] || !isOuterWhite(index)) return;
      seen[index] = 1;
      queue[write] = index;
      write += 1;
    };

    for (let x = 0; x < source.width; x += 1) {
      enqueue(x);
      enqueue((source.height - 1) * source.width + x);
    }
    for (let y = 0; y < source.height; y += 1) {
      enqueue(y * source.width);
      enqueue(y * source.width + source.width - 1);
    }

    while (read < write) {
      const index = queue[read];
      read += 1;
      data[index * 4 + 3] = 0;
      const x = index % source.width;
      if (x > 0) enqueue(index - 1);
      if (x < source.width - 1) enqueue(index + 1);
      if (index >= source.width) enqueue(index - source.width);
      if (index < total - source.width) enqueue(index + source.width);
    }

    sourceCtx.putImageData(pixels, 0, 0);
    const trimmed = trimTransparentCanvas(source, 18);
    whiteFloodCutoutCache.set(image, { key, canvas: trimmed });
    return trimmed;
  }

  function requestImagegenAtlas() {
    if (imagegenAtlasRequested) return;
    imagegenAtlasRequested = true;
    imagegenAtlasImage.src = "./assets/images/jii-kobushi-imagegen-atlas-v1.png";
  }

  function requestCutinImage() {
    if (cutinRequested) return;
    cutinRequested = true;
    cutinImage.decoding = "async";
    cutinImage.src = "./assets/images/kojiro-cutin.png";
  }

  function requestHorseMaskBoss() {
    if (horseMaskBossRequested) return;
    horseMaskBossRequested = true;
    horseMaskBossImage.src = "./assets/images/super-steroid-x-horse-mask-v1.png";
  }

  function requestHasegawaReveal() {
    if (hasegawaRevealRequested) return;
    hasegawaRevealRequested = true;
    hasegawaRevealImage.src = "./assets/images/hasegawa-reveal-sprite-v7.png";
  }

  function stageBgKeyFor(id) {
    return id === "warehouse" || id === "garage" ? "warehouse" : id === "redgate" || id === "finalhideout" ? "hideout" : "park";
  }

  function loadStageBackground(id) {
    const source = stageBackgroundSources[id];
    if (!source) return null;
    if (stageBackgroundImages.has(id)) return stageBackgroundImages.get(id);
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.dataset.stageBgId = id;
    image.onerror = () => {
      if (source.png && image.src.endsWith(".webp")) {
        image.src = source.png;
      }
    };
    image.onload = () => {
      for (const key of stageSceneCache.keys()) {
        if (key.startsWith(`${id}:`)) stageSceneCache.delete(key);
      }
    };
    image.src = source.webp ?? source.png;
    stageBackgroundImages.set(id, image);
    return image;
  }

  function retainStageBackgrounds(ids = []) {
    const keep = new Set(ids.filter((id) => stageBackgroundSources[id]));
    for (const id of keep) loadStageBackground(id);
    for (const [id, image] of stageBackgroundImages.entries()) {
      if (keep.has(id)) continue;
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
      stageBackgroundImages.delete(id);
    }
    for (const key of stageSceneCache.keys()) {
      const id = key.split(":")[0];
      if (!keep.has(id)) stageSceneCache.delete(key);
    }
  }

  function transparentizeEdgeBackground(canvas, isBackground) {
    const cropCtx = canvas.getContext("2d");
    const imageData = cropCtx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;
    const seen = new Uint8Array(width * height);
    const queue = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const index = y * width + x;
      if (seen[index] || !isBackground(data, index)) return;
      seen[index] = 1;
      queue.push(index);
    };
    for (let x = 0; x < width; x += 1) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      push(0, y);
      push(width - 1, y);
    }
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      const x = index % width;
      const y = Math.floor(index / width);
      data[index * 4 + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    cropCtx.putImageData(imageData, 0, 0);
    return imageData;
  }

  function trimTransparentCanvas(canvas, pad = 8) {
    const cropCtx = canvas.getContext("2d");
    const { data, width, height } = cropCtx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return canvas;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const trimmed = document.createElement("canvas");
    trimmed.width = maxX - minX + 1;
    trimmed.height = maxY - minY + 1;
    trimmed.getContext("2d").drawImage(canvas, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
    return trimmed;
  }

  function eraseGeneratedPreviewFootBase(canvas) {
    const cropCtx = canvas.getContext("2d");
    const imageData = cropCtx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;
    for (let y = Math.floor(height * 0.76); y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        if (r > 170 && g > 170 && b > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 60) {
          data[offset + 3] = 0;
        }
      }
    }
    cropCtx.putImageData(imageData, 0, 0);
  }

  function prepareChibiCharacterCrop(key, spec) {
    if (!chibiCharacterSheetImage.complete || !chibiCharacterSheetImage.naturalWidth) return null;
    if (chibiCharacterCache.has(key)) return chibiCharacterCache.get(key);
    const gridCellW = chibiCharacterSheet.cols ? chibiCharacterSheetImage.naturalWidth / chibiCharacterSheet.cols : 0;
    const gridCellH = chibiCharacterSheet.rows ? chibiCharacterSheetImage.naturalHeight / chibiCharacterSheet.rows : 0;
    const col = spec.index != null && chibiCharacterSheet.cols ? spec.index % chibiCharacterSheet.cols : 0;
    const row = spec.index != null && chibiCharacterSheet.cols ? Math.floor(spec.index / chibiCharacterSheet.cols) : 0;
    const sx = spec.sx ?? col * gridCellW;
    const sy = spec.sy ?? row * gridCellH;
    const cellW = spec.sw ?? gridCellW;
    const cellH = spec.sh ?? gridCellH;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.ceil(cellW);
    cropCanvas.height = Math.ceil(cellH);
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(chibiCharacterSheetImage, sx, sy, cellW, cellH, 0, 0, cropCanvas.width, cropCanvas.height);
    transparentizeEdgeBackground(cropCanvas, (data, index) => {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const warmPaper = r > 212 && g > 194 && b > 162 && r >= g && g >= b && r - g < 42 && g - b < 58;
      const popYellow = r > 236 && g > 188 && b < 128 && r > g && g > b;
      const lightChecker = r > 205 && g > 205 && b > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 20;
      return warmPaper || popYellow || lightChecker;
    });
    const trimmed = trimTransparentCanvas(cropCanvas, 24);
    chibiCharacterCache.set(key, trimmed);
    return trimmed;
  }

  function prepareImagegenCrop(key, spec, transparent = true) {
    requestImagegenAtlas();
    if (!imagegenAtlasImage.complete || !imagegenAtlasImage.naturalWidth) return null;
    const cacheKey = `${key}:${transparent ? "transparent" : "opaque"}`;
    if (imagegenCropCache.has(cacheKey)) return imagegenCropCache.get(cacheKey);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = spec.sw;
    cropCanvas.height = spec.sh;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(imagegenAtlasImage, spec.sx, spec.sy, spec.sw, spec.sh, 0, 0, spec.sw, spec.sh);
    if (transparent) {
      const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
      const { data, width, height } = imageData;
      const seen = new Uint8Array(width * height);
      const queue = [];
      const isBackground = (index) => {
        const offset = index * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        return r > 205 && g > 190 && b > 165 && Math.max(r, g, b) - Math.min(r, g, b) < 62;
      };
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (seen[index] || !isBackground(index)) return;
        seen[index] = 1;
        queue.push(index);
      };
      for (let x = 0; x < width; x += 1) {
        push(x, 0);
        push(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        push(0, y);
        push(width - 1, y);
      }
      for (let head = 0; head < queue.length; head += 1) {
        const index = queue[head];
        const x = index % width;
        const y = Math.floor(index / width);
        data[index * 4 + 3] = 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }
      cropCtx.putImageData(imageData, 0, 0);
    }
    imagegenCropCache.set(cacheKey, cropCanvas);
    return cropCanvas;
  }

  function shadeHex(hex, amount) {
    const clean = String(hex || "#222222").replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((ch) => ch + ch).join("") : clean.padEnd(6, "0").slice(0, 6);
    const n = Number.parseInt(full, 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const r = clamp(((n >> 16) & 255) + amount);
    const g = clamp(((n >> 8) & 255) + amount);
    const b = clamp((n & 255) + amount);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  function enemySpriteCanvas(kind, palette) {
    const coat = palette.coat ?? "#1f2937";
    const accent = palette.accent ?? "#c2482d";
    const key = `${kind}:${coat}:${accent}`;
    if (enemySpriteCache.has(key)) return enemySpriteCache.get(key);

    const sprite = document.createElement("canvas");
    sprite.width = 80;
    sprite.height = 96;
    const sctx = sprite.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    const outline = "#07080a";
    const mask = kind === "scientist" ? "#202a31" : kind === "steroidBoss" ? "#0b0b10" : "#131923";
    const coatBase = kind === "scientist" ? "#e8edf3" : kind === "steroidBoss" ? "#15111c" : coat;
    const coatDark = kind === "scientist" ? "#9fa9b6" : kind === "steroidBoss" ? "#2b1d3c" : shadeHex(coatBase, -34);
    const coatLight = kind === "scientist" ? "#ffffff" : shadeHex(coatBase, 30);
    const visor = kind === "scientist" ? "#91efff" : kind === "steroidBoss" ? "#ff5b4f" : "#fff1b8";
    const big = kind === "maskedHeavy" || kind === "armored" || kind === "steroidBoss";
    const headX = big ? 15 : 18;
    const headY = big ? 9 : 12;
    const headW = big ? 50 : 44;
    const headH = big ? 36 : 32;

    const block = (x, y, w, h, color) => {
      sctx.fillStyle = color;
      sctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    const box = (x, y, w, h, color, border = 3) => {
      block(x, y, w, h, outline);
      block(x + border, y + border, w - border * 2, h - border * 2, color);
    };
    const stepLine = (x, y, steps, color) => {
      for (const [dx, dy, w = 5, h = 5] of steps) block(x + dx, y + dy, w, h, color);
    };

    // Shadow and feet.
    block(18, 90, 46, 4, "#00000066");
    box(20, 76, 14, 16, coatDark, 2);
    box(46, 76, 14, 16, coatDark, 2);
    box(15, 88, 23, 6, "#08090b", 2);
    box(42, 88, 23, 6, "#08090b", 2);

    // Compact body.
    box(22, 45, 36, 35, coatBase, 3);
    block(28, 50, 24, 6, coatLight);
    block(28, 58, 24, 17, mask);
    block(24, 50, 6, 26, coatDark);
    block(50, 50, 6, 26, coatDark);
    stepLine(25, 55, [[0, 0, 8, 5], [8, 5, 8, 5], [16, 10, 8, 5], [24, 15, 8, 5]], accent);
    stepLine(47, 55, [[0, 0, 8, 5], [-8, 5, 8, 5], [-16, 10, 8, 5], [-24, 15, 8, 5]], accent);

    if (kind === "scientist") {
      box(17, 47, 10, 31, "#f5f7f8", 2);
      box(53, 47, 10, 31, "#f5f7f8", 2);
      block(34, 72, 12, 5, "#91efff");
    }
    if (kind === "armored" || kind === "maskedHeavy" || kind === "steroidBoss") {
      box(17, 51, 46, 10, "#303640", 2);
      box(24, 66, 32, 7, accent, 1);
    }
    if (kind === "operator") {
      box(22, 67, 36, 8, "#26384d", 1);
      block(27, 70, 26, 2, "#70c7ff");
    }

    // Stepped arms.
    stepLine(10, 48, [[10, 0, 9, 8], [6, 7, 9, 8], [2, 14, 9, 8], [0, 21, 9, 8]], outline);
    stepLine(12, 50, [[10, 0, 6, 5], [6, 7, 6, 5], [2, 14, 6, 5], [0, 21, 6, 5]], coatBase);
    stepLine(61, 48, [[0, 0, 9, 8], [4, 7, 9, 8], [8, 14, 9, 8], [10, 21, 9, 8]], outline);
    stepLine(63, 50, [[0, 0, 6, 5], [4, 7, 6, 5], [8, 14, 6, 5], [10, 21, 6, 5]], coatBase);
    box(7, 71, 9, 9, mask, 2);
    box(65, 71, 9, 9, mask, 2);

    // Large masked head.
    box(headX, headY, headW, headH, mask, 3);
    block(headX + 8, headY + 6, headW - 16, 4, "#ffffff1f");
    box(headX + 10, headY + 17, 12, 9, visor, 2);
    box(headX + headW - 22, headY + 17, 12, 9, visor, 2);
    block(headX + 25, headY + 31, headW - 50, 4, "#000000");
    block(headX + 20, headY + 30, 20, 4, "#050609");

    if (kind === "agent") {
      block(headX - 3, headY + 10, headW + 6, 5, accent);
      block(headX + 4, headY + 11, headW - 8, 2, shadeHex(accent, 48));
    } else if (kind === "bruiser") {
      box(headX - 3, headY - 4, headW + 6, 8, accent, 2);
      box(headX + 9, headY - 13, headW - 18, 10, "#111827", 2);
    } else if (kind === "scientist") {
      box(headX - 2, headY - 6, headW + 4, 9, "#f5f7f8", 2);
      box(headX + headW - 11, headY - 14, 8, 14, "#91efff", 1);
    } else if (kind === "captain") {
      box(headX - 4, headY - 6, headW + 8, 9, "#111827", 2);
      box(headX + 6, headY - 15, headW - 12, 10, "#161b24", 2);
      block(headX + headW / 2 - 4, headY - 17, 8, 5, accent);
    } else if (kind === "scout") {
      stepLine(headX - 10, headY - 13, [[10, 8], [6, 4], [2, 0]], accent);
      stepLine(headX + headW, headY - 13, [[0, 8], [4, 4], [8, 0]], accent);
    } else if (kind === "armored") {
      box(headX - 4, headY - 8, headW + 8, 10, "#303640", 2);
      box(headX + 5, headY - 16, headW - 10, 9, accent, 2);
    } else if (kind === "operator") {
      box(headX - 8, headY + 15, 8, 16, accent, 2);
      box(headX + headW, headY + 15, 8, 16, accent, 2);
      block(headX - 2, headY + 8, 4, 4, accent);
      block(headX + headW - 2, headY + 8, 4, 4, accent);
      block(headX + 2, headY + 4, headW - 4, 4, accent);
    } else if (kind === "elite") {
      box(headX - 5, headY - 7, headW + 10, 10, "#1a1111", 2);
      box(headX + 5, headY - 16, headW - 10, 9, accent, 2);
      block(headX + headW / 2 - 3, headY - 24, 6, 8, "#f6d95f");
    } else if (kind === "steroidBoss") {
      box(headX - 5, headY - 8, headW + 10, 11, "#211528", 2);
      for (let i = 0; i < 5; i += 1) block(headX + 8 + i * 8, headY - 21 + (i % 2) * 3, 5, 15, "#f6d95f");
      block(headX + 5, headY + headH - 10, headW - 10, 5, "#b63a32");
    }

    // 1px highlight noise to sell it as a hand-authored sprite.
    block(headX + 7, headY + 8, 4, 3, "#ffffff2a");
    block(29, 48, 4, 3, "#ffffff18");
    block(48, 78, 4, 3, "#ffffff14");

    enemySpriteCache.set(key, sprite);
    return sprite;
  }

  function cleanEnemySpriteCanvas(kind, palette) {
    const coat = palette.coat ?? "#243041";
    const accent = palette.accent ?? "#c2482d";
    const key = `clean:${kind}:${coat}:${accent}`;
    if (enemySpriteCache.has(key)) return enemySpriteCache.get(key);

    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 80;
    const sctx = sprite.getContext("2d");
    sctx.imageSmoothingEnabled = false;

    const outline = "#101820";
    const inner = kind === "scientist" ? "#1e2932" : kind === "steroidBoss" ? "#111018" : "#172131";
    const main = kind === "scientist" ? "#e9eef3" : kind === "steroidBoss" ? "#1c1426" : shadeHex(coat, 8);
    const shade = kind === "scientist" ? "#b7c1cc" : shadeHex(coat, -18);
    const hi = kind === "scientist" ? "#ffffff" : shadeHex(coat, 42);
    const eye = kind === "scientist" ? "#9cf3ff" : kind === "steroidBoss" ? "#ff655e" : "#fff2bb";
    const boss = kind === "maskedHeavy" || kind === "armored" || kind === "steroidBoss";
    const head = boss ? { x: 13, y: 5, w: 38, h: 31 } : { x: 15, y: 7, w: 34, h: 29 };

    const px = (x, y, w, h, color) => {
      sctx.fillStyle = color;
      sctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    };
    const box = (x, y, w, h, color, b = 2) => {
      px(x, y, w, h, outline);
      px(x + b, y + b, w - b * 2, h - b * 2, color);
    };
    const stair = (x, y, parts, color) => {
      for (const part of parts) px(x + part[0], y + part[1], part[2], part[3], color);
    };

    // Legs and shoes: short and clean, no random noise.
    box(18, 61, 11, 13, shade, 2);
    box(35, 61, 11, 13, shade, 2);
    box(14, 72, 18, 6, "#0b1018", 1);
    box(32, 72, 18, 6, "#0b1018", 1);

    // Body.
    box(19, 37, 26, 28, main, 2);
    px(23, 40, 18, 4, hi);
    px(25, 46, 14, 12, inner);
    px(20, 41, 4, 20, shade);
    px(40, 41, 4, 20, shade);
    px(26, 49, 12, 4, accent);
    px(29, 53, 6, 4, accent);

    if (kind === "scientist") {
      box(15, 39, 8, 23, "#f7fafc", 1);
      box(41, 39, 8, 23, "#f7fafc", 1);
      px(29, 58, 6, 3, "#9cf3ff");
    }
    if (boss) {
      box(14, 42, 36, 8, "#2f3947", 1);
      px(22, 55, 20, 4, accent);
    }
    if (kind === "operator") {
      px(22, 57, 20, 4, "#29435d");
      px(25, 58, 14, 1, "#70c7ff");
    }

    // Arms, closer to the body so it does not read as a dirty pile.
    stair(11, 39, [[8, 0, 6, 8], [5, 7, 6, 8], [3, 14, 6, 8]], outline);
    stair(13, 41, [[8, 0, 3, 5], [5, 7, 3, 5], [3, 14, 3, 5]], main);
    stair(47, 39, [[0, 0, 6, 8], [3, 7, 6, 8], [5, 14, 6, 8]], outline);
    stair(49, 41, [[0, 0, 3, 5], [3, 7, 3, 5], [5, 14, 3, 5]], main);
    box(14, 57, 7, 7, inner, 1);
    box(44, 57, 7, 7, inner, 1);

    // Masked head.
    box(head.x, head.y, head.w, head.h, inner, 2);
    px(head.x + 6, head.y + 5, head.w - 12, 3, "#ffffff24");
    box(head.x + 8, head.y + 14, 9, 7, eye, 1);
    box(head.x + head.w - 17, head.y + 14, 9, 7, eye, 1);
    px(head.x + 16, head.y + 24, head.w - 32, 3, "#05070a");

    if (kind === "agent") {
      px(head.x - 2, head.y + 9, head.w + 4, 4, accent);
      px(head.x + 4, head.y + 10, head.w - 8, 1, shadeHex(accent, 56));
    } else if (kind === "bruiser") {
      box(head.x - 2, head.y - 4, head.w + 4, 7, accent, 1);
      box(head.x + 7, head.y - 12, head.w - 14, 8, "#111827", 1);
    } else if (kind === "scientist") {
      box(head.x - 2, head.y - 5, head.w + 4, 7, "#f7fafc", 1);
      box(head.x + head.w - 9, head.y - 12, 7, 11, "#9cf3ff", 1);
    } else if (kind === "captain") {
      box(head.x - 3, head.y - 5, head.w + 6, 7, "#111827", 1);
      box(head.x + 5, head.y - 13, head.w - 10, 8, "#202636", 1);
      px(head.x + head.w / 2 - 3, head.y - 15, 6, 4, accent);
    } else if (kind === "scout") {
      stair(head.x - 8, head.y - 10, [[8, 6, 4, 4], [5, 3, 4, 4], [2, 0, 4, 4]], accent);
      stair(head.x + head.w, head.y - 10, [[0, 6, 4, 4], [3, 3, 4, 4], [6, 0, 4, 4]], accent);
    } else if (kind === "armored") {
      box(head.x - 3, head.y - 6, head.w + 6, 8, "#374151", 1);
      box(head.x + 5, head.y - 13, head.w - 10, 7, accent, 1);
    } else if (kind === "operator") {
      box(head.x - 6, head.y + 13, 6, 13, accent, 1);
      box(head.x + head.w, head.y + 13, 6, 13, accent, 1);
      px(head.x + 2, head.y + 4, head.w - 4, 3, accent);
    } else if (kind === "elite") {
      box(head.x - 4, head.y - 6, head.w + 8, 8, "#211414", 1);
      box(head.x + 5, head.y - 13, head.w - 10, 7, accent, 1);
      px(head.x + head.w / 2 - 2, head.y - 20, 4, 7, "#f6d95f");
    } else if (kind === "steroidBoss") {
      box(head.x - 4, head.y - 7, head.w + 8, 9, "#2b1d3c", 1);
      for (let i = 0; i < 5; i += 1) px(head.x + 7 + i * 6, head.y - 18 + (i % 2) * 2, 4, 11, "#f6d95f");
      px(head.x + 5, head.y + head.h - 8, head.w - 10, 4, "#b63a32");
    }

    enemySpriteCache.set(key, sprite);
    return sprite;
  }

  function drawSceneDetailLayer(stage, travelRatio) {
    const stageId = stage.id;
    const p = stage.palette;
    const scroll = travelRatio * 300;
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";

    if (stageId === "shotengai") {
      for (let i = 0; i < 9; i += 1) {
        const x = ((i * 118 - scroll * 0.65) % (W + 160)) - 80;
        pixelRect(x, 314, 58, 10, "#d7eac2", 0.82);
        pixelRect(x + 6, 318, 46, 2, "#9dbc85", 0.72);
      }
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 132 - scroll * 0.54) % (W + 140)) - 70;
        pixelRect(x, 248, 54, 18, "#f4f0df", 0.84);
        pixelRect(x + 4, 252, 14, 4, "#c2482d", 0.8);
        pixelRect(x + 24, 252, 22, 4, "#6f9f56", 0.72);
        pixelRect(x + 8, 260, 36, 3, "#83966d", 0.65);
      }
      for (let i = 0; i < 10; i += 1) {
        const x = ((i * 96 - scroll * 0.8) % (W + 120)) - 60;
        pixelRect(x, 292, 18, 8, i % 2 ? "#f2bd52" : "#ef8f8f", 0.86);
        pixelRect(x + 4, 300, 10, 12, "#567e45", 0.74);
      }
    } else if (stageId === "warehouse" || stageId === "backalley") {
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 154 - scroll) % (W + 180)) - 90;
        pixelRect(x, 214, 112, 9, "#d9dee5", 0.28);
        pixelRect(x, 232, 112, 9, "#d9dee5", 0.22);
        pixelRect(x + 14, 258, 80, 26, "#111827", 0.22);
        pixelRect(x + 22, 262, 64, 4, stageId === "warehouse" ? "#d8a83f" : "#ff8f70", 0.62);
      }
      for (let i = 0; i < 4; i += 1) {
        const x = 120 + i * 190;
        crateStack(x, 330 + (i % 2) * 10, 0.45, i % 2 ? "X" : "港");
      }
    } else if (stageId === "riverside") {
      for (let i = 0; i < 10; i += 1) {
        const x = ((i * 104 - scroll) % (W + 120)) - 60;
        pixelRect(x, 300 + (i % 3) * 6, 54, 3, i % 2 ? "#ffd983" : "#ff8f70", 0.5);
        lantern(x + 24, 250 + (i % 2) * 10, i % 2 ? "#f2bd52" : "#d85f46");
      }
    } else if (stageId === "station") {
      for (let i = 0; i < 6; i += 1) {
        const x = 170 + i * 92;
        pixelRect(x, 186, 54, 8, "#ecf2f8", 0.75);
        pixelRect(x + 8, 226, 38, 44, "#111827", 0.55);
        pixelRect(x + 12, 232, 12, 10, "#ffd983", 0.42);
      }
      pixelRect(650, 250, 92, 34, "#ffcf5a", 0.75);
      pixelRect(662, 260, 68, 5, "#171717", 0.42);
    } else if (stageId === "mountain") {
      for (let i = 0; i < 13; i += 1) {
        const x = ((i * 86 - scroll * 0.8) % (W + 120)) - 60;
        pixelRect(x, 246, 10, 58, "#1b2a23", 0.82);
        pixelRect(x - 18, 228, 46, 20, "#334c38", 0.72);
      }
      guardRail(302, "#dfe6ed");
    } else if (stageId === "garage" || stageId === "highway") {
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 118 - scroll * 1.1) % (W + 160)) - 80;
        pixelRect(x, 224, 74, 26, "#111827", 0.52);
        pixelRect(x + 8, 230, 22, 8, stageId === "garage" ? "#ffcf5a" : "#70c7ff", 0.76);
        pixelRect(x + 42, 230, 22, 8, "#ff8f70", 0.52);
        oval(x + 14, 254, 8, 8, "#0b0b10", 0.9);
        oval(x + 60, 254, 8, 8, "#0b0b10", 0.9);
      }
    } else if (stageId === "redgate" || stageId === "finalhideout") {
      for (let i = 0; i < 12; i += 1) {
        const x = 190 + i * 48;
        pixelRect(x, 170 + (i % 2) * 8, 34, 10, stageId === "redgate" ? "#c2482d" : "#34233f", 0.8);
        pixelRect(x + 6, 214, 20, 42, "#050509", 0.36);
      }
      lantern(278, 238, "#f6d95f");
      lantern(682, 238, "#f6d95f");
    }

    ctx.restore();
  }

  function nextTapGapMs() {
    const ns = state.noteStates;
    if (!ns?.length) return null;
    const idx = ns.findIndex((e) => !e.resolved);
    if (idx < 0) return null;
    const cur = ns[idx].note;
    if (cur.type !== "tap") return null;
    const nxtEntry = ns.slice(idx + 1).find((e) => !e.resolved);
    if (!nxtEntry || nxtEntry.note.type !== "tap") return null;
    return nxtEntry.note.timeMs - cur.timeMs;
  }

  function pixelRect(x, y, w, h, fill, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function lantern(x, y, color = "#ef5b4f") {
    ctx.save();
    ctx.fillStyle = "#2a1610";
    ctx.fillRect(x - 5, y - 4, 10, 8);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 18, y, 36, 34, 7);
    ctx.fill();
    ctx.fillStyle = "#ffd983";
    ctx.fillRect(x - 10, y + 8, 20, 16);
    ctx.strokeStyle = "#3a1d14";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 4);
    ctx.lineTo(x - 12, y + 31);
    ctx.moveTo(x + 12, y + 4);
    ctx.lineTo(x + 12, y + 31);
    ctx.stroke();
    ctx.restore();
  }

  function signPanel(x, y, w, h, label, bg = "#fff7d2", fg = "#171717") {
    void x;
    void y;
    void w;
    void h;
    void label;
    void bg;
    void fg;
  }

  function windowGrid(x, y, cols, rows, cellW, cellH, lit = "#ffd983") {
    ctx.save();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        ctx.fillStyle = (row + col) % 3 === 0 ? lit : "#111827";
        ctx.globalAlpha = (row + col) % 3 === 0 ? 0.74 : 0.48;
        ctx.fillRect(x + col * (cellW + 8), y + row * (cellH + 8), cellW, cellH);
      }
    }
    ctx.restore();
  }

  function utilityPole(x, y, height = 148) {
    ctx.save();
    ctx.strokeStyle = "#2a211c";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 28, y - height + 34);
    ctx.lineTo(x + 28, y - height + 34);
    ctx.stroke();
    ctx.strokeStyle = "#17171766";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 60, y - height + 42);
    ctx.quadraticCurveTo(x + 20, y - height + 70, x + 120, y - height + 36);
    ctx.stroke();
    ctx.restore();
  }

  function cone(x, y) {
    ctx.save();
    ctx.fillStyle = "#ef5b4f";
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x - 12, y);
    ctx.lineTo(x + 12, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff7e6";
    ctx.fillRect(x - 8, y - 12, 16, 4);
    ctx.fillStyle = "#171717";
    ctx.fillRect(x - 16, y, 32, 5);
    ctx.restore();
  }

  function oval(cx, cy, rx, ry, fill, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function guardRail(y, color = "#d9dee5") {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.strokeStyle = "#17171755";
    ctx.lineWidth = 3;
    for (let x = 24; x < W; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x, y + 28);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roadMark(x, y, label, bg = "#fff7d2", fg = "#171717") {
    void x;
    void y;
    void label;
    void bg;
    void fg;
  }

  function crateStack(x, y, scale = 1, label = "X") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    for (let i = 0; i < 3; i += 1) {
      const bx = (i % 2) * 44;
      const by = -Math.floor(i / 2) * 30;
      pixelRect(bx, by, 42, 28, "#8a5a34");
      pixelRect(bx + 4, by + 4, 34, 20, "#b97842");
      ctx.strokeStyle = "#3a2518";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 6);
      ctx.lineTo(bx + 36, by + 24);
      ctx.moveTo(bx + 36, by + 6);
      ctx.lineTo(bx + 6, by + 24);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawForegroundSet(stage, travelRatio) {
    const stageId = stage.id;
    const scroll = travelRatio * 520;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (stageId === "shotengai") {
      pixelRect(0, 348, W, 12, "#6f9f56");
      for (let i = 0; i < 18; i += 1) {
        const x = ((i * 58 - scroll * 0.38) % (W + 80)) - 40;
        ctx.fillStyle = i % 2 ? "#4f8f45" : "#8bbd78";
        ctx.beginPath();
        ctx.moveTo(x, 360);
        ctx.lineTo(x + 5, 344);
        ctx.lineTo(x + 10, 360);
        ctx.fill();
      }
      roadMark(92, 392, "公園入口", "#fff7d2");
      pixelRect(158, 376, 46, 36, "#8a5a34");
      pixelRect(164, 366, 34, 14, "#d4a15b");
      ctx.strokeStyle = "#3a2518";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(164, 385);
      ctx.lineTo(198, 385);
      ctx.moveTo(172, 376);
      ctx.lineTo(172, 410);
      ctx.moveTo(190, 376);
      ctx.lineTo(190, 410);
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        oval(706 + i * 30, 380 + (i % 2) * 8, 18, 5, "#ffffff66");
      }
    } else if (stageId === "warehouse") {
      crateStack(74, 386, 0.86, "港");
      crateStack(784, 394, 0.74, "X");
      pixelRect(238, 374, 116, 38, "#1d2832");
      pixelRect(250, 360, 86, 16, "#33414d");
      ctx.strokeStyle = "#ffd98399";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 24, 361);
        ctx.lineTo(246 + i * 24, 408);
        ctx.stroke();
      }
      roadMark(578, 390, "第三倉庫", "#d8a83f");
    } else if (stageId === "backalley") {
      pixelRect(64, 360, 104, 70, "#2a252b");
      pixelRect(78, 344, 72, 18, "#5b4038");
      ctx.strokeStyle = "#ff8f7088";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(82, 372);
      ctx.lineTo(150, 412);
      ctx.moveTo(150, 372);
      ctx.lineTo(82, 412);
      ctx.stroke();
      pixelRect(770, 350, 42, 86, "#3f2f38");
      pixelRect(820, 366, 26, 70, "#5b4038");
      lantern(810, 344, "#d85f46");
      roadMark(566, 392, "裏口", "#2d1d24", "#ffd983");
    } else if (stageId === "riverside") {
      for (let i = 0; i < 3; i += 1) {
        const x = 82 + i * 82;
        pixelRect(x, 380, 58, 38, "#5a351f");
        pixelRect(x + 6, 366, 46, 16, i % 2 ? "#f2bd52" : "#d85f46");
      }
      ctx.strokeStyle = "#d6c19a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(660, 350);
      ctx.lineTo(856, 350);
      ctx.moveTo(676, 350);
      ctx.lineTo(654, 420);
      ctx.moveTo(834, 350);
      ctx.lineTo(858, 420);
      ctx.stroke();
      lantern(754, 354, "#f2bd52");
    } else if (stageId === "station") {
      pixelRect(54, 372, 116, 42, "#ffcf5a");
      pixelRect(74, 354, 70, 24, "#ffcf5a");
      pixelRect(82, 360, 20, 12, "#ecf2f8");
      pixelRect(112, 360, 20, 12, "#ecf2f8");
      oval(82, 418, 11, 11, "#171717");
      oval(142, 418, 11, 11, "#171717");
      pixelRect(756, 354, 84, 72, "#ecf2f8");
      pixelRect(766, 364, 64, 24, "#40546a");
      signPanel(766, 324, 64, 28, "案内", "#f6f1e7");
      roadMark(492, 392, "駅前", "#f6f1e7");
    } else if (stageId === "mountain") {
      guardRail(356, "#dfe6ed");
      for (let i = 0; i < 8; i += 1) {
        const x = 68 + i * 108;
        pixelRect(x, 362, 10, 38, i % 2 ? "#ef5b4f" : "#f6f1e7");
      }
      signPanel(728, 352, 86, 34, "急カーブ", "#f6f1e7");
      ctx.strokeStyle = "#f6f1e766";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(252, 430);
      ctx.quadraticCurveTo(476, 382, 708, 428);
      ctx.stroke();
    } else if (stageId === "garage") {
      pixelRect(76, 374, 128, 52, "#17151f");
      pixelRect(92, 350, 96, 24, "#331b22");
      ctx.strokeStyle = "#ffcf5a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(104, 366);
      ctx.lineTo(176, 366);
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) oval(112 + i * 22, 410, 13, 13, "#0b0b10");
      cone(700, 420);
      cone(746, 420);
      roadMark(526, 392, "改造車庫", "#ffcf5a");
    } else if (stageId === "highway") {
      guardRail(362, "#9cc7e6");
      for (let i = 0; i < 5; i += 1) {
        const x = 82 + i * 168;
        ctx.strokeStyle = "#70c7ff88";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, 358);
        ctx.lineTo(x + 40, 420);
        ctx.stroke();
      }
      signPanel(684, 352, 128, 38, "港湾道路", "#162739", "#d9f3ff");
      pixelRect(102, 392, 126, 30, "#1d3348");
      pixelRect(122, 378, 76, 18, "#304b68");
      oval(128, 426, 11, 11, "#09090c");
      oval(204, 426, 11, 11, "#09090c");
    } else if (stageId === "redgate") {
      for (let i = 0; i < 8; i += 1) {
        pixelRect(i * 126 - 20, 348, 96, 16, i % 2 ? "#5f1b1b" : "#7a2323");
      }
      lantern(96, 372, "#f6d95f");
      lantern(842, 372, "#f6d95f");
      roadMark(480, 394, "赤門", "#fff7d2");
      ctx.strokeStyle = "#e0c45a99";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(330, 358);
      ctx.lineTo(626, 358);
      ctx.stroke();
    } else if (stageId === "finalhideout") {
      pixelRect(72, 350, 108, 78, "#17151f");
      pixelRect(780, 350, 108, 78, "#17151f");
      ctx.strokeStyle = "#f6d95f";
      ctx.lineWidth = 4;
      for (const x of [126, 834]) {
        ctx.beginPath();
        ctx.moveTo(x - 26, 374);
        ctx.lineTo(x + 26, 408);
        ctx.moveTo(x + 26, 374);
        ctx.lineTo(x - 26, 408);
        ctx.stroke();
      }
      roadMark(480, 392, "X結社", "#111827", "#f6d95f");
      ctx.fillStyle = "#f6d95f55";
      for (let i = 0; i < 7; i += 1) oval(352 + i * 42, 356 + (i % 2) * 12, 7, 7, "#f6d95f", 0.5);
    }

    ctx.restore();
  }

  function drawStageSet(stage, travelRatio, horizonY) {
    const p = stage.palette;
    const scroll = travelRatio * 280;
    const stageId = stage.id;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (stageId === "shotengai") {
      // 朝の公園。芝生・緑の木立・ベンチ・遊具・水飲み場・公園入口の門柱で「公園」を一目で読ませる。
      ctx.fillStyle = "#9bc28a";
      ctx.fillRect(0, 110, W, 220);
      ctx.fillStyle = "#7ea76d";
      ctx.fillRect(0, 110, W, 26);
      ctx.fillStyle = "#5e8a52";
      ctx.beginPath();
      ctx.moveTo(0, 134);
      ctx.quadraticCurveTo(W / 2, 116, W, 132);
      ctx.lineTo(W, 142);
      ctx.lineTo(0, 144);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#cfe6b4";
      ctx.beginPath();
      ctx.moveTo(0, 322);
      ctx.quadraticCurveTo(W / 2, 268, W, 322);
      ctx.lineTo(W, 348);
      ctx.lineTo(0, 348);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a3c08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 322);
      ctx.quadraticCurveTo(W / 2, 268, W, 322);
      ctx.stroke();

      ctx.strokeStyle = "#6f9f56";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 14; i += 1) {
        const px = ((i * 70 + scroll * 0.4) % (W + 80)) - 40;
        const py = 280 + Math.sin(i * 1.7) * 8;
        ctx.fillStyle = i % 2 ? "#6f9f56" : "#a8c975";
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const trees = [
        { baseX: 80, scale: 1.1, leaf: "#4f8f45", light: "#87b96c" },
        { baseX: 380, scale: 0.9, leaf: "#5f9b4d", light: "#a4cb7a" },
        { baseX: 620, scale: 1.05, leaf: "#477f3e", light: "#79ad63" },
        { baseX: 860, scale: 0.85, leaf: "#6da455", light: "#bdd58a" },
      ];
      for (const tree of trees) {
        const x = ((tree.baseX - scroll * 0.6) % (W + 220)) - 110;
        if (x < -90 || x > W + 90) continue;
        const s = tree.scale;
        ctx.save();
        ctx.translate(x, 174);
        ctx.scale(s, s);
        ctx.strokeStyle = "#5a3a24";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 76);
        ctx.quadraticCurveTo(-4, 30, -10, -10);
        ctx.stroke();
        ctx.strokeStyle = "#7a4a2f";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.quadraticCurveTo(-30, -8, -42, -32);
        ctx.moveTo(-6, -8);
        ctx.quadraticCurveTo(20, -16, 36, -38);
        ctx.stroke();
        ctx.fillStyle = tree.leaf;
        ctx.beginPath();
        ctx.ellipse(-22, -34, 40, 24, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(20, -42, 38, 26, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -54, 32, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = tree.light;
        ctx.beginPath();
        ctx.ellipse(-8, -54, 18, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const drawBench = (benchX, benchY, scale = 1) => {
        ctx.save();
        ctx.translate(benchX, benchY);
        ctx.scale(scale, scale);
        ctx.fillStyle = "#5a351f";
        ctx.fillRect(-4, -18, 88, 6);
        ctx.fillRect(0, -8, 82, 6);
        ctx.fillRect(4, 2, 72, 5);
        ctx.fillStyle = "#8a5a34";
        ctx.fillRect(2, -16, 78, 2);
        ctx.fillRect(6, -6, 70, 2);
        ctx.strokeStyle = "#2d221b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, 6);
        ctx.lineTo(4, 22);
        ctx.moveTo(70, 6);
        ctx.lineTo(78, 22);
        ctx.moveTo(14, 18);
        ctx.lineTo(76, 18);
        ctx.stroke();
        ctx.restore();
      };
      drawBench(((-scroll * 0.8) % 1040) - 60, 276, 1);
      drawBench(((260 - scroll * 0.65) % 1080) - 70, 236, 0.82);
      drawBench(((600 - scroll * 0.72) % 1100) - 60, 262, 0.9);

      const slideX = ((720 - scroll * 1.0) % 1100) - 60;
      ctx.fillStyle = "#dfe6ed";
      ctx.beginPath();
      ctx.moveTo(slideX, 220);
      ctx.lineTo(slideX + 60, 268);
      ctx.lineTo(slideX + 52, 274);
      ctx.lineTo(slideX - 4, 226);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#9aa5af";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ef5b4f";
      ctx.fillRect(slideX - 6, 210, 22, 10);
      ctx.fillStyle = "#3a3a3f";
      ctx.fillRect(slideX - 12, 220, 3, 50);
      ctx.fillRect(slideX + 2, 220, 3, 50);

      const fountainX = ((900 - scroll * 1.2) % 1140) - 60;
      ctx.fillStyle = "#3a4a30";
      ctx.fillRect(fountainX, 268, 5, 22);
      ctx.fillStyle = "#5b6a76";
      ctx.beginPath();
      ctx.ellipse(fountainX + 2, 268, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a3c0d6";
      ctx.beginPath();
      ctx.ellipse(fountainX + 2, 266, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3a3f";
      ctx.fillRect(fountainX - 10, 290, 26, 4);

      const lampX = ((40 - scroll * 0.6) % 1020) - 40;
      ctx.fillStyle = "#3a3a3f";
      ctx.fillRect(lampX, 178, 3, 90);
      ctx.fillStyle = "#f6d95f";
      ctx.beginPath();
      ctx.arc(lampX + 1, 175, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#cfd6cf";
      for (let i = 0; i < 5; i += 1) {
        const cx = ((i * 220 + scroll * 1.4) % (W + 240)) - 120;
        ctx.beginPath();
        ctx.ellipse(cx, 90, 36, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 30, 86, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#5e8a52";
      for (let i = 0; i < 14; i += 1) {
        const gx = ((i * 80 + scroll * 1.1) % (W + 80)) - 40;
        ctx.beginPath();
        ctx.moveTo(gx, 326);
        ctx.lineTo(gx + 4, 318);
        ctx.lineTo(gx + 8, 326);
        ctx.closePath();
        ctx.fill();
      }
    } else if (stageId === "warehouse" || stageId === "backalley") {
      for (let i = 0; i < 5; i += 1) {
        const x = ((i * 230 - scroll) % 1240) - 130;
        const topY = stageId === "warehouse" ? 138 : 156;
        pixelRect(x, topY, 190, 188, i % 2 ? p.mid : p.far);
        pixelRect(x - 6, topY - 12, 202, 14, "#1f2937");
        windowGrid(x + 22, topY + 40, 2, 2, 42, 26, stageId === "warehouse" ? "#ffd983" : "#ff8f70");
        pixelRect(x + 14, 302, 160, 20, "#0f1117");
        pixelRect(x + 24, 266, 54, 36, "#2f3b45");
        pixelRect(x + 90, 270, 66, 32, "#44301f");
        ctx.strokeStyle = "#d9dee588";
        ctx.lineWidth = 2;
        for (let r = 0; r < 5; r += 1) {
          ctx.beginPath();
          ctx.moveTo(x + 26, 274 + r * 6);
          ctx.lineTo(x + 154, 274 + r * 6);
          ctx.stroke();
        }
        if (stageId === "backalley") {
          ctx.strokeStyle = "#ffd98366";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x + 14, 144);
          ctx.lineTo(x + 174, 198);
          ctx.stroke();
          signPanel(x + 46, 188, 76, 28, "裏口", "#171717", "#ffd983");
          pixelRect(x + 150, 238, 18, 64, "#5b4038");
        }
      }
      if (stageId === "warehouse") {
        pixelRect(632, 108, 120, 54, "#d8a83f");
        signPanel(80, 108, 118, 34, "第三倉庫", "#f6f1e7");
        utilityPole(850, 318, 156);
        for (let i = 0; i < 4; i += 1) cone(604 + i * 34, 330);
      } else {
        utilityPole(124, 326, 138);
        signPanel(720, 122, 102, 32, "路地裏", "#2d1d24", "#ffd983");
      }
    } else if (stageId === "riverside") {
      pixelRect(0, 286, W, 56, "#1a3442", 0.7);
      pixelRect(0, 310, W, 24, "#0f2631", 0.6);
      guardRail(286, "#d6c19a");
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 150 - scroll) % 1110) - 70;
        pixelRect(x, 208, 108, 90, "#8a4b2e");
        pixelRect(x - 8, 196, 124, 18, "#f2bd52");
        pixelRect(x + 8, 218, 34, 52, "#fff7e6", 0.88);
        ctx.fillStyle = "#d8322b";
        ctx.fillRect(x + 8, 218, 34, 8);
        lantern(x + 92, 218, "#ff8f70");
        pixelRect(x + 26, 292, 18, 18, "#392518");
        pixelRect(x + 58, 292, 18, 18, "#392518");
      }
      for (let i = 0; i < 9; i += 1) {
        const x = ((i * 118 + scroll * 0.5) % (W + 120)) - 60;
        ctx.fillStyle = i % 2 ? "#ffd98355" : "#ff8f7055";
        ctx.fillRect(x, 320 + (i % 3) * 4, 48, 3);
      }
      signPanel(64, 166, 110, 34, "川沿い屋台", "#fff7d2");
    } else if (stageId === "station") {
      pixelRect(130, 118, 700, 178, "#5b6a76");
      pixelRect(166, 154, 628, 46, "#ecf2f8");
      pixelRect(180, 218, 72, 68, "#20242a");
      pixelRect(292, 218, 72, 68, "#20242a");
      pixelRect(404, 218, 72, 68, "#20242a");
      pixelRect(548, 218, 160, 68, "#20242a");
      pixelRect(116, 104, 728, 18, "#33414d");
      signPanel(380, 132, 196, 34, "駅前ロータリー", "#f6f1e7");
      ctx.fillStyle = "#f6f1e7";
      ctx.beginPath();
      ctx.arc(708, 174, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(708, 174);
      ctx.lineTo(708, 160);
      ctx.moveTo(708, 174);
      ctx.lineTo(720, 174);
      ctx.stroke();
      pixelRect(70, 276, 124, 38, "#ffcf5a");
      pixelRect(92, 254, 70, 28, "#ffcf5a");
      pixelRect(96, 260, 24, 14, "#ecf2f8");
      pixelRect(128, 260, 24, 14, "#ecf2f8");
      oval(98, 318, 12, 12, "#171717");
      oval(164, 318, 12, 12, "#171717");
      signPanel(790, 228, 80, 56, "バス停", "#fff7d2");
    } else if (stageId === "mountain") {
      ctx.fillStyle = "#263d35";
      ctx.beginPath();
      ctx.moveTo(0, horizonY + 16);
      ctx.lineTo(150, 134);
      ctx.lineTo(330, horizonY + 24);
      ctx.lineTo(510, 118);
      ctx.lineTo(752, horizonY + 20);
      ctx.lineTo(960, 138);
      ctx.lineTo(960, horizonY + 70);
      ctx.lineTo(0, horizonY + 70);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 10; i += 1) {
        const x = ((i * 120 - scroll * 0.8) % 1080) - 60;
        pixelRect(x, 226, 10, 84, "#1b2a23");
        ctx.fillStyle = "#334c38";
        ctx.beginPath();
        ctx.moveTo(x - 28, 236);
        ctx.lineTo(x + 6, 162);
        ctx.lineTo(x + 36, 236);
        ctx.closePath();
        ctx.fill();
      }
      guardRail(318, "#dfe6ed");
      ctx.strokeStyle = "#f6f1e766";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(180, 352);
      ctx.quadraticCurveTo(430, 320, 780, 366);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 126 - scroll * 1.4) % 1080) - 60;
        pixelRect(x, 304, 10, 24, i % 2 ? "#ef5b4f" : "#f6f1e7");
      }
      signPanel(662, 174, 92, 32, "峠道", "#1b2a23", "#f6f1e7");
    } else if (stageId === "garage" || stageId === "highway") {
      for (let i = 0; i < 6; i += 1) {
        const x = ((i * 210 - scroll * 1.2) % 1220) - 110;
        pixelRect(x, 194, 164, 84, stageId === "garage" ? "#331b22" : "#162739");
        pixelRect(x + 12, 224, 48, 28, "#ffd983", 0.86);
        pixelRect(x + 86, 224, 48, 28, "#ff8f70", 0.68);
        pixelRect(x + 18, 278, 126, 28, "#111827");
        oval(x + 38, 310, 13, 13, "#171717");
        oval(x + 124, 310, 13, 13, "#171717");
        ctx.strokeStyle = stageId === "garage" ? "#ffcf5a88" : "#70c7ff88";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 12, 202);
        ctx.lineTo(x + 150, 202);
        ctx.stroke();
      }
      if (stageId === "garage") {
        signPanel(70, 142, 118, 36, "改造車庫", "#ffcf5a");
        for (let i = 0; i < 5; i += 1) {
          oval(720 + i * 34, 318, 14, 14, "#101017");
        }
        cone(652, 330);
        cone(880, 330);
      }
      if (stageId === "highway") {
        ctx.strokeStyle = "#70c7ff55";
        ctx.lineWidth = 4;
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(140 + i * 170, 124);
          ctx.lineTo(60 + i * 200, 320);
          ctx.stroke();
        }
        guardRail(318, "#9cc7e6");
        signPanel(690, 138, 146, 40, "港湾道路", "#162739", "#d9f3ff");
      }
    } else if (stageId === "redgate" || stageId === "finalhideout") {
      pixelRect(0, 124, W, 204, stageId === "redgate" ? "#2c1414" : "#101017");
      pixelRect(250, 112, 460, 48, stageId === "redgate" ? "#9c2f2f" : "#2b2238");
      pixelRect(286, 160, 70, 170, stageId === "redgate" ? "#7a2323" : "#17151f");
      pixelRect(604, 160, 70, 170, stageId === "redgate" ? "#7a2323" : "#17151f");
      pixelRect(392, 178, 176, 148, "#09090c", 0.9);
      for (let i = 0; i < 9; i += 1) {
        pixelRect(252 + i * 48, 104 - (i % 2) * 8, 38, 16, stageId === "redgate" ? "#5f1b1b" : "#34233f");
      }
      pixelRect(334, 146, 292, 20, stageId === "redgate" ? "#c2482d" : "#3a2d55");
      signPanel(416, 130, 130, 34, stageId === "redgate" ? "赤門" : "X結社", stageId === "redgate" ? "#fff7d2" : "#111827", stageId === "redgate" ? "#171717" : "#f6d95f");
      ctx.fillStyle = "#17171766";
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(306 + i * 68, 206, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      lantern(344, 206, "#f6d95f");
      lantern(616, 206, "#f6d95f");
      ctx.strokeStyle = stageId === "redgate" ? "#e0c45a" : "#f6d95f";
      ctx.lineWidth = 8;
      ctx.strokeRect(392, 178, 176, 148);
      if (stageId === "finalhideout") {
        pixelRect(168, 242, 70, 54, "#17151f");
        pixelRect(726, 242, 70, 54, "#17151f");
        ctx.strokeStyle = "#f6d95f99";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(180, 252);
        ctx.lineTo(226, 286);
        ctx.moveTo(226, 252);
        ctx.lineTo(180, 286);
        ctx.moveTo(738, 252);
        ctx.lineTo(784, 286);
        ctx.moveTo(784, 252);
        ctx.lineTo(738, 286);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawPixelBackdropTexture(stage, travelRatio) {
    const p = stage.palette;
    const accent = p.accent ?? "#f6d95f";
    const scroll = travelRatio * 360;
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";

    // Smooth gradient の上に粗い色面を重ね、全ステージを2Dドット絵風の読み味に寄せる。
    const skyBands = [
      { y: 0, h: 56, color: p.sky, alpha: 0.32 },
      { y: 56, h: 52, color: "#ffffff", alpha: 0.16 },
      { y: 108, h: 58, color: p.far, alpha: 0.18 },
      { y: 166, h: 58, color: p.mid, alpha: 0.14 },
    ];
    for (const band of skyBands) pixelRect(0, band.y, W, band.h, band.color, band.alpha);

    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 22; i += 1) {
      const x = ((i * 72 - scroll * 0.18) % (W + 96)) - 48;
      const y = 70 + ((i * 37) % 190);
      const size = 4 + (i % 3) * 3;
      ctx.fillStyle = i % 2 ? "#ffffff" : accent;
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, size, size);
    }
    ctx.globalAlpha = 1;

    const groundColors = [p.road, "#000000", "#ffffff", p.mid];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 18; col += 1) {
        const x = ((col * 64 - scroll * 1.08) % (W + 96)) - 48;
        const y = 360 + row * 24 + ((col + row) % 2) * 4;
        const color = groundColors[(col + row) % groundColors.length];
        pixelRect(x, y, 22 + ((col + row) % 3) * 8, 4, color, row % 2 ? 0.18 : 0.1);
      }
    }

    // 舞台ごとに大きなピクセル看板・シルエットを追加し、色違いの背景に見えないようにする。
    const id = stage.id;
    if (id === "shotengai") {
      pixelRect(36, 168, 92, 56, "#fff7d2", 0.38);
      pixelRect(44, 176, 76, 8, accent, 0.65);
      pixelRect(44, 196, 56, 8, "#3a4a30", 0.42);
    } else if (id === "warehouse") {
      for (let i = 0; i < 4; i += 1) {
        pixelRect(90 + i * 158, 138, 96, 138, "#25313b", 0.34);
        pixelRect(102 + i * 158, 158, 72, 8, accent, 0.42);
        pixelRect(102 + i * 158, 178, 72, 8, "#d9dee5", 0.28);
      }
    } else if (id === "backalley") {
      for (let i = 0; i < 6; i += 1) {
        const x = 70 + i * 140;
        pixelRect(x, 118, 58, 178, "#211d22", 0.34);
        pixelRect(x + 10, 142, 38, 8, accent, 0.42);
      }
    } else if (id === "riverside") {
      pixelRect(0, 284, W, 18, "#f2bd52", 0.18);
      for (let i = 0; i < 7; i += 1) pixelRect(52 + i * 130, 214, 76, 10, i % 2 ? "#d85f46" : "#f2bd52", 0.45);
    } else if (id === "station") {
      pixelRect(150, 132, 660, 34, "#f6f1e7", 0.36);
      pixelRect(386, 174, 188, 20, "#171717", 0.28);
      for (let i = 0; i < 5; i += 1) pixelRect(190 + i * 112, 224, 56, 48, "#0f1117", 0.35);
    } else if (id === "mountain") {
      for (let i = 0; i < 7; i += 1) {
        const x = i * 150 - 50;
        ctx.fillStyle = i % 2 ? "#263d35aa" : "#445b50aa";
        ctx.beginPath();
        ctx.moveTo(x, 282);
        ctx.lineTo(x + 86, 130 + (i % 3) * 18);
        ctx.lineTo(x + 178, 282);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === "garage" || id === "highway") {
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 126 - scroll * 0.42) % (W + 160)) - 80;
        pixelRect(x, 140 + (i % 3) * 18, 84, 10, i % 2 ? accent : "#ffffff", 0.38);
        pixelRect(x + 20, 162 + (i % 2) * 16, 46, 34, "#0f1117", 0.3);
      }
    } else if (id === "redgate" || id === "finalhideout") {
      pixelRect(240, 104, 480, 48, id === "redgate" ? "#9c2f2f" : "#2b2238", 0.42);
      pixelRect(304, 156, 352, 18, accent, 0.36);
      for (let i = 0; i < 6; i += 1) pixelRect(280 + i * 68, 196, 38, 38, "#050509", 0.3);
    }

    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 176 - scroll * 0.31) % (W + 220)) - 110;
      const y = 238 + (i % 3) * 24;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 28, y - 5 + (i % 2) * 8, x + 78, y + 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  function pixelBox(x, y, w, h, fill, edge = "#17171755", edgeW = 4) {
    pixelRect(x, y, w, h, edge);
    pixelRect(x + edgeW, y + edgeW, w - edgeW * 2, h - edgeW * 2, fill);
  }

  function pixelLine(x, y, w, h, fill, repeats = 1, gap = 8) {
    for (let i = 0; i < repeats; i += 1) pixelRect(x, y + i * gap, w, h, fill);
  }

  function pixelTextSign(x, y, w, h, label, bg = "#fff7d2", fg = "#171717", edge = "#171717") {
    void x;
    void y;
    void w;
    void h;
    void label;
    void bg;
    void fg;
    void edge;
  }

  function pixelCloud(x, y, tone = "#e9efe9") {
    pixelRect(x, y + 8, 56, 12, tone, 0.72);
    pixelRect(x + 14, y, 42, 12, tone, 0.72);
    pixelRect(x + 54, y + 6, 34, 10, tone, 0.64);
    pixelRect(x + 8, y + 20, 46, 6, tone, 0.36);
  }

  function pixelTree(x, groundY, scale = 1, trunk = "#684425", leaf = "#4f8f45", light = "#8fc06b") {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY));
    ctx.scale(scale, scale);
    pixelRect(-8, -74, 16, 74, trunk);
    pixelRect(-2, -76, 20, 12, "#7a5531");
    pixelRect(-46, -116, 70, 30, leaf);
    pixelRect(-30, -136, 76, 34, leaf);
    pixelRect(-10, -156, 62, 28, leaf);
    pixelRect(-24, -134, 28, 10, light, 0.9);
    pixelRect(18, -148, 18, 8, light, 0.75);
    ctx.restore();
  }

  function pixelBench(x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    pixelRect(0, 0, 88, 8, "#7c4e2d");
    pixelRect(0, 16, 88, 8, "#5a351f");
    pixelRect(8, 8, 72, 4, "#c08345");
    pixelRect(12, 24, 8, 26, "#3a2518");
    pixelRect(68, 24, 8, 26, "#3a2518");
    pixelRect(6, 48, 76, 4, "#3a2518");
    ctx.restore();
  }

  function pixelLanternPost(x, y, color = "#f6d95f") {
    pixelRect(x, y, 6, 78, "#252323");
    pixelBox(x - 14, y - 24, 34, 24, color, "#3a2518", 3);
    pixelRect(x - 8, y - 18, 22, 4, "#fff7d2", 0.45);
    pixelRect(x - 10, y, 26, 4, "#3a2518");
  }

  function pixelWarehouse(x, y, w, h, wall, trim, label = "") {
    pixelBox(x, y, w, h, wall, "#1b252e", 5);
    pixelRect(x, y - 14, w, 14, "#1b252e");
    pixelRect(x + 16, y + 18, w - 32, 8, trim, 0.78);
    for (let r = 0; r < 5; r += 1) pixelRect(x + 18, y + 54 + r * 12, w - 36, 4, "#d9dee544", 0.72);
    pixelRect(x + 24, y + h - 58, 58, 44, "#202a33");
    pixelRect(x + w - 82, y + h - 54, 54, 40, "#3a271a");
    if (label) pixelTextSign(x + 20, y + 22, 86, 28, label, "#f6f1e7", "#26313b", "#26313b");
  }

  function pixelStorefront(x, y, w, h, wall, awning, label) {
    pixelBox(x, y, w, h, wall, "#2a252b", 4);
    pixelRect(x - 6, y - 16, w + 12, 18, awning);
    for (let i = 0; i < 5; i += 1) pixelRect(x + i * Math.floor(w / 5), y - 16, Math.floor(w / 10), 18, "#fff7d277", 0.75);
    pixelRect(x + 14, y + 34, 34, h - 46, "#15191f");
    pixelRect(x + 58, y + 34, w - 74, h - 46, "#1e2830");
    pixelLine(x + 62, y + 48, w - 84, 4, "#ffffff44", 4, 12);
    if (label) pixelTextSign(x + 16, y + 8, 68, 24, label, "#fff7d2", "#171717", "#3a2518");
  }

  function pixelCar(x, y, body = "#d8a83f") {
    pixelRect(x, y + 20, 116, 34, body);
    pixelRect(x + 22, y, 70, 24, body);
    pixelRect(x + 30, y + 6, 22, 12, "#ecf2f8");
    pixelRect(x + 60, y + 6, 22, 12, "#ecf2f8");
    pixelRect(x + 10, y + 54, 22, 10, "#111827");
    pixelRect(x + 82, y + 54, 22, 10, "#111827");
    pixelRect(x + 12, y + 24, 16, 6, "#fff7d2", 0.8);
  }

  function drawPixelWorldBackground(stage, travelRatio) {
    if (drawImagegenBackground(stage, travelRatio)) return;
    const p = stage.palette;
    const id = stage.id;
    const scroll = travelRatio * 320;
    const accent = p.accent ?? "#f6d95f";
    const snapScroll = Math.round(scroll / 8) * 8;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = p.sky;
    ctx.fillRect(0, 0, W, H);

    const skyBands = [
      [0, 72, p.sky],
      [72, 70, "#ffffff24"],
      [142, 64, p.far],
      [206, 74, p.mid],
      [280, 68, shadeHex(p.mid, -24)],
    ];
    for (const [y, h, color] of skyBands) pixelRect(0, y, W, h, color, typeof color === "string" && color.includes("24") ? 1 : 0.86);
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 188 - snapScroll * 0.18) % (W + 220)) - 110;
      pixelCloud(x, 58 + (i % 3) * 20, id === "finalhideout" ? "#343044" : "#e9efe9");
    }

    if (id === "shotengai") {
      pixelRect(0, 160, W, 96, "#78a969");
      pixelRect(0, 226, W, 82, "#9bc28a");
      pixelRect(0, 304, W, 44, "#cfe6b4");
      for (let i = 0; i < 6; i += 1) pixelTree(((i * 190 - snapScroll * 0.62) % (W + 260)) - 130, 306, 0.78 + (i % 3) * 0.1);
      pixelTextSign(24, 24, 154, 46, "うさぎ公園", "#fff7d2", "#5e8a52", "#5e8a52");
      pixelRect(34, 72, 10, 36, "#5e8a52");
      pixelRect(158, 72, 10, 36, "#5e8a52");
      pixelBench(90 - snapScroll * 0.25, 284, 0.8);
      pixelBench(344 - snapScroll * 0.35, 274, 0.72);
      pixelBench(644 - snapScroll * 0.32, 286, 0.78);
      const slideX = 742 - snapScroll * 0.5;
      pixelRect(slideX, 214, 12, 76, "#35393f");
      pixelRect(slideX + 20, 214, 12, 76, "#35393f");
      pixelRect(slideX - 8, 204, 52, 12, accent);
      pixelRect(slideX + 4, 232, 74, 14, "#dfe6ed");
      pixelRect(slideX + 36, 246, 14, 44, "#dfe6ed");
      pixelLanternPost(890 - snapScroll * 0.22, 210, "#f2d35b");
    } else if (id === "warehouse") {
      pixelRect(0, 152, W, 196, "#425967");
      for (let i = 0; i < 5; i += 1) pixelWarehouse(((i * 232 - snapScroll * 0.7) % 1240) - 140, 150, 190, 176, i % 2 ? "#3f5461" : "#536b78", accent, i === 1 ? "第三倉庫" : "");
      pixelTextSign(650, 118, 120, 42, "港湾", accent, "#171717", "#26313b");
      pixelRect(0, 316, W, 32, "#1d2832");
      for (let i = 0; i < 7; i += 1) crateStack(((i * 142 - snapScroll) % (W + 180)) - 90, 334 + (i % 2) * 10, 0.45, i % 2 ? "X" : "港");
    } else if (id === "backalley") {
      pixelRect(0, 130, W, 218, "#241d24");
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 156 - snapScroll * 0.55) % (W + 180)) - 90;
        pixelStorefront(x, 150 + (i % 2) * 16, 118, 164, i % 2 ? "#352934" : "#2d2530", i % 2 ? "#5b4038" : "#7a3030", i % 3 === 0 ? "裏口" : "");
        pixelLanternPost(x + 92, 226, "#d85f46");
      }
      pixelRect(0, 314, W, 34, "#1a151a");
      pixelTextSign(726, 118, 112, 34, "路地裏", "#2d1d24", "#ffd983", "#ffd983");
    } else if (id === "riverside") {
      pixelRect(0, 190, W, 76, "#223f4c");
      pixelRect(0, 266, W, 40, "#102a36");
      pixelRect(0, 306, W, 42, "#4e3d31");
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 140 - snapScroll * 0.72) % (W + 170)) - 90;
        pixelStorefront(x, 188, 110, 116, "#8a4b2e", i % 2 ? "#f2bd52" : "#d85f46", i % 2 ? "串" : "酒");
        pixelLanternPost(x + 92, 206, "#ff8f70");
      }
      for (let i = 0; i < 10; i += 1) pixelRect(((i * 110 + snapScroll * 0.28) % (W + 140)) - 70, 272 + (i % 3) * 8, 72, 4, i % 2 ? "#ffd98366" : "#ff8f7066");
      pixelTextSign(50, 146, 134, 38, "川沿い屋台", "#fff7d2", "#5a351f", "#5a351f");
    } else if (id === "station") {
      pixelRect(0, 188, W, 160, "#5b6a76");
      pixelBox(118, 118, 724, 182, "#697986", "#33414d", 6);
      pixelRect(136, 100, 688, 20, "#33414d");
      pixelRect(168, 154, 628, 48, "#ecf2f8");
      for (let i = 0; i < 5; i += 1) pixelBox(180 + i * 116, 224, 72, 68, "#20242a", "#111827", 4);
      pixelTextSign(374, 132, 206, 38, "駅前ロータリー", "#f6f1e7", "#171717", "#33414d");
      pixelCar(68, 286, "#ffcf5a");
      pixelTextSign(794, 224, 82, 58, "バス停", "#fff7d2", "#171717", "#33414d");
    } else if (id === "mountain") {
      pixelRect(0, 172, W, 176, "#263d35");
      for (let i = 0; i < 8; i += 1) {
        const x = i * 138 - 70;
        pixelRect(x + 58, 126 + (i % 2) * 16, 28, 178, i % 2 ? "#334c38" : "#445b50");
        pixelRect(x + 30, 176, 88, 44, i % 2 ? "#263d35" : "#334c38");
        pixelRect(x + 18, 220, 112, 48, "#1b2a23");
      }
      for (let i = 0; i < 9; i += 1) pixelTree(((i * 126 - snapScroll * 0.7) % (W + 160)) - 80, 322, 0.58, "#4a321f", "#263d35", "#445b50");
      guardRail(316, "#dfe6ed");
      pixelTextSign(684, 170, 90, 34, "峠道", "#1b2a23", "#f6f1e7", "#dfe6ed");
    } else if (id === "garage" || id === "highway") {
      pixelRect(0, 150, W, 198, id === "garage" ? "#271722" : "#162739");
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 170 - snapScroll * 0.82) % (W + 220)) - 110;
        pixelBox(x, 182, 138, 102, id === "garage" ? "#331b22" : "#1d3348", "#0f1117", 5);
        pixelRect(x + 14, 210, 42, 30, accent, 0.86);
        pixelRect(x + 72, 210, 42, 30, "#ff8f70", 0.62);
        pixelRect(x + 16, 284, 106, 22, "#111827");
      }
      if (id === "garage") {
        pixelTextSign(72, 136, 124, 40, "改造車庫", "#ffcf5a", "#171717", "#331b22");
        for (let i = 0; i < 4; i += 1) cone(650 + i * 42, 326);
      } else {
        for (let i = 0; i < 6; i += 1) pixelRect(120 + i * 160, 112, 8, 214, "#70c7ff66");
        guardRail(318, "#9cc7e6");
        pixelTextSign(688, 136, 146, 40, "港湾道路", "#162739", "#d9f3ff", "#9cc7e6");
      }
    } else if (id === "redgate" || id === "finalhideout") {
      const final = id === "finalhideout";
      pixelRect(0, 112, W, 236, final ? "#101017" : "#2c1414");
      pixelBox(252, 106, 456, 54, final ? "#2b2238" : "#9c2f2f", final ? "#0a0910" : "#5f1b1b", 6);
      pixelBox(286, 156, 72, 180, final ? "#17151f" : "#7a2323", "#0a0910", 6);
      pixelBox(602, 156, 72, 180, final ? "#17151f" : "#7a2323", "#0a0910", 6);
      pixelBox(392, 178, 176, 158, "#09090c", accent, 6);
      for (let i = 0; i < 9; i += 1) pixelRect(252 + i * 48, 96 - (i % 2) * 8, 38, 16, final ? "#34233f" : "#5f1b1b");
      pixelTextSign(416, 128, 132, 38, final ? "X結社" : "赤門", final ? "#111827" : "#fff7d2", final ? "#f6d95f" : "#171717", accent);
      pixelLanternPost(338, 198, "#f6d95f");
      pixelLanternPost(616, 198, "#f6d95f");
      if (final) {
        pixelBox(164, 242, 78, 56, "#17151f", "#f6d95f", 4);
        pixelBox(722, 242, 78, 56, "#17151f", "#f6d95f", 4);
      }
    }

    drawEnkaWaveBand(stage, id === "warehouse" || id === "station" || id === "garage" || id === "highway" ? "warehouse" : id === "redgate" || id === "finalhideout" ? "hideout" : "park");
    ctx.restore();
  }

  function drawEnkaWaveBand(stage, bgKey, target = ctx) {
    const y = 348;
    const h = H - y;
    target.save();
    if (enkaWaveBandImage.complete && enkaWaveBandImage.naturalWidth) {
      target.drawImage(enkaWaveBandImage, 0, y, W, h);
      if (bgKey === "hideout" || bgKey === "park") {
        target.globalCompositeOperation = "source-atop";
        target.fillStyle = bgKey === "hideout" ? "rgba(80, 30, 58, 0.22)" : "rgba(38, 74, 42, 0.18)";
        target.fillRect(0, y, W, h);
        target.globalCompositeOperation = "source-over";
      }
      target.restore();
      return;
    }

    const baseTop = bgKey === "hideout" ? "#211622" : bgKey === "warehouse" ? "#202832" : "#253826";
    const baseBottom = bgKey === "hideout" ? "#110c14" : bgKey === "warehouse" ? "#111820" : "#172319";
    const base = target.createLinearGradient(0, y, 0, H);
    base.addColorStop(0, baseTop);
    base.addColorStop(0.58, baseBottom);
    base.addColorStop(1, "#0b0b0d");
    target.fillStyle = base;
    target.fillRect(0, y, W, h);

    target.fillStyle = "rgba(0, 0, 0, 0.34)";
    target.fillRect(0, y, W, 18);
    target.fillStyle = "rgba(255, 247, 210, 0.16)";
    target.fillRect(0, y + 1, W, 2);
    target.restore();
  }

  function drawScenarioLocationOverlay(stage, bgKey, travelRatio) {
    const id = stage.id;
    const scroll = Math.round(travelRatio * 180);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (id === "shotengai") {
      pixelRect(0, 300, W, 48, "#172319", 0.22);
    } else if (id === "warehouse") {
      pixelBox(218, 122, 142, 98, "#3f5461", "#1b252e", 5);
      pixelRect(234, 146, 110, 8, "#d8a83f");
      pixelRect(250, 176, 70, 34, "#202a33");
      for (let i = 0; i < 5; i += 1) crateStack(76 + i * 140, 322 + (i % 2) * 8, 0.43, i % 2 ? "X" : "港");
    } else if (id === "riverside") {
      pixelRect(0, 118, W, 230, "#4f3728", 0.92);
      pixelRect(0, 118, W, 28, "#2e221d", 0.94);
      pixelRect(84, 142, 792, 158, "#d9c49b", 0.95);
      for (let i = 0; i < 10; i += 1) pixelRect(96 + i * 78, 292, 58, 10, i % 2 ? "#b89f73" : "#ead9ad", 0.95);
      for (let i = 0; i < 3; i += 1) {
        const x = 168 + i * 94;
        pixelRect(x, 226, 18, 66, "#6b4a2d");
        oval(x + 9, 216, 22, 16, "#c49a5a");
        pixelRect(x - 18, 250, 54, 8, "#7a5531");
      }
    } else if (id === "mountain") {
      pixelRect(0, 122, W, 226, "#162335", 0.72);
      pixelRect(0, 280, W, 68, "#171717", 0.78);
      guardRail(286, "#dfe6ed");
      for (let i = 0; i < 8; i += 1) {
        const x = 88 + i * 92 - (scroll % 32);
        pixelRect(x, 240, 10, 62, "#1b2a23", 0.82);
        pixelRect(x - 16, 224, 42, 20, "#334c38", 0.74);
      }
    } else if (id === "garage") {
      pixelRect(0, 126, W, 222, "#1d1518", 0.95);
      for (let i = 0; i < 8; i += 1) {
        const h = 16 + ((i * 19 + scroll) % 54);
        pixelRect(126 + i * 16, 258 - h, 10, h, i % 2 ? "#ffcf5a" : "#ff8f70", 0.9);
      }
      for (let i = 0; i < 3; i += 1) {
        pixelBox(666 + i * 48, 190, 36, 62, "#0b0b10", "#4d5963", 3);
        oval(684 + i * 48, 208, 12, 12, "#ffcf5a", 0.7);
        oval(684 + i * 48, 236, 15, 15, "#ff8f70", 0.55);
      }
      ctx.strokeStyle = "#ffcf5a88";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(282, 260);
      ctx.bezierCurveTo(420, 330, 520, 198, 642, 272);
      ctx.stroke();
    } else if (id === "redgate") {
      pixelRect(0, 116, W, 232, "#2c1414", 0.96);
      pixelRect(128, 222, 72, 42, "#9c2f2f", 0.9);
      pixelRect(152, 214, 22, 58, "#f6d95f", 0.86);
      pixelRect(708, 228, 38, 26, "#f6f1e7");
      pixelRect(720, 250, 14, 34, "#d9dee5");
      lantern(316, 238, "#f6d95f");
      lantern(614, 238, "#f6d95f");
    } else if (id === "finalhideout") {
      lantern(356, 226, "#f6d95f");
      lantern(604, 226, "#f6d95f");
    }

    ctx.restore();
  }

  function drawImagegenBackground(stage, travelRatio) {
    const id = stage.id;
    const stageBackground = loadStageBackground(id);
    const stageBgKey = stageBgKeyFor(id);
    if (stageBackground?.complete && stageBackground.naturalWidth > 0) {
      const cacheKey = `${id}:${stageBackground.currentSrc || stageBackground.src}:${enkaWaveBandImage.complete ? "wave" : "fallback"}`;
      let scene = stageSceneCache.get(cacheKey);
      if (!scene) {
        scene = makeCanvas();
        const sceneCtx = scene.getContext("2d");
        sceneCtx.imageSmoothingEnabled = true;
        sceneCtx.fillStyle = "#171717";
        sceneCtx.fillRect(0, 0, W, H);
        sceneCtx.drawImage(stageBackground, 0, 0, W, H);
        drawEnkaWaveBand(stage, stageBgKey, sceneCtx);
        stageSceneCache.set(cacheKey, scene);
      }
      ctx.drawImage(scene, 0, 0);
      return true;
    }
    if (stageBackground) return false;
    requestImagegenAtlas();
    if (!imagegenAtlasImage.complete || !imagegenAtlasImage.naturalWidth) return false;
    const bgKey =
      id === "shotengai" || id === "mountain"
        ? "park"
        : id === "warehouse" || id === "riverside" || id === "station" || id === "garage" || id === "highway"
          ? "warehouse"
          : "hideout";
    const spec = imagegenAtlas.backgrounds[bgKey];
    const scroll = Math.round((travelRatio * 220) % 220);
    const upperBgY = 0;
    const upperBgH = 350;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bgKey === "hideout" ? "#17111b" : bgKey === "warehouse" ? "#283240" : "#dcefd0";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(imagegenAtlasImage, spec.sx + scroll, spec.sy, spec.sw - scroll, spec.sh, 0, upperBgY, W, upperBgH);
    if (scroll > 0) {
      ctx.drawImage(
        imagegenAtlasImage,
        spec.sx,
        spec.sy,
        scroll,
        spec.sh,
        W - (W * scroll) / spec.sw,
        upperBgY,
        (W * scroll) / spec.sw,
        upperBgH,
      );
    }
    drawEnkaWaveBand(stage, bgKey);
    drawScenarioLocationOverlay(stage, bgKey, travelRatio);
    ctx.restore();
    return true;
  }

  function drawImagegenForeground(stage, bgKey, travelRatio) {
    const id = stage.id;
    const scroll = travelRatio * 260;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bgKey === "hideout" ? "#1b1420" : bgKey === "warehouse" ? "#252d34" : "#7fa66f";
    ctx.fillRect(0, 342, W, 198);
    ctx.fillStyle = bgKey === "hideout" ? "#120e16" : bgKey === "warehouse" ? "#182027" : "#49633f";
    ctx.fillRect(0, 420, W, 120);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 342, W, 14);

    if (bgKey === "park") {
      ctx.fillStyle = "#e7d69d";
      ctx.beginPath();
      ctx.moveTo(358, 342);
      ctx.quadraticCurveTo(484, 402, 458, 540);
      ctx.lineTo(300, 540);
      ctx.quadraticCurveTo(342, 420, 278, 342);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 44; i += 1) {
        const x = ((i * 43 - scroll * 0.35) % (W + 60)) - 30;
        const y = 368 + ((i * 29) % 130);
        pixelRect(x, y, 4 + (i % 3), 4, i % 2 ? "#5c7f4a" : "#a4c681", 0.9);
      }
      for (let i = 0; i < 4; i += 1) {
        const x = ((i * 250 - scroll * 0.2) % (W + 260)) - 130;
        pixelRect(x, 388, 78, 9, "#8a5730");
        pixelRect(x + 4, 401, 70, 8, "#7a4b29");
        pixelRect(x + 8, 410, 7, 34, "#3e2d20");
        pixelRect(x + 60, 410, 7, 34, "#3e2d20");
      }
      pixelRect(76, 360, 92, 16, "#f4f0df", 0.9);
      pixelRect(84, 366, 74, 4, "#6f9f56", 0.9);
    } else if (bgKey === "warehouse") {
      for (let i = 0; i < 16; i += 1) {
        const x = ((i * 74 - scroll * 0.24) % (W + 90)) - 45;
        pixelRect(x, 368 + (i % 4) * 30, 58, 22, i % 2 ? "#7d5d38" : "#9a7042", 0.94);
        pixelRect(x + 6, 372 + (i % 4) * 30, 46, 3, "#c59a63", 0.7);
        pixelRect(x + 26, 368 + (i % 4) * 30, 4, 22, "#5d4429", 0.65);
      }
      for (let x = -40; x < W + 60; x += 84) {
        pixelRect(x, 424, 58, 4, "#4d5963", 0.72);
        pixelRect(x + 18, 456, 66, 4, "#151b21", 0.7);
        pixelRect(x + 4, 498, 72, 4, "#3a444d", 0.58);
      }
      pixelRect(684, 358, 80, 62, "#2d3a43", 0.88);
      pixelRect(700, 370, 48, 8, "#70c7ff", 0.55);
    } else {
      for (let x = -20; x < W + 40; x += 72) {
        pixelRect(x, 356, 44, 92, "#241827", 0.92);
        pixelRect(x + 6, 366, 32, 6, "#5a2c35", 0.7);
        pixelRect(x + 12, 410, 20, 4, "#f6d95f", 0.38);
      }
      pixelRect(332, 360, 300, 112, "#1a111a", 0.94);
      pixelRect(364, 376, 236, 14, "#432131", 0.9);
      pixelRect(452, 402, 58, 70, "#2a1c2f", 0.95);
      pixelRect(464, 416, 34, 8, "#f6d95f", 0.52);
      for (let i = 0; i < 8; i += 1) {
        const x = 96 + i * 100;
        pixelRect(x, 454, 42, 44, "#382030", 0.76);
        pixelRect(x + 8, 462, 26, 5, "#b63a32", 0.68);
      }
    }
    ctx.restore();
  }

  function drawBackground(stage, travelRatio) {
    drawPixelWorldBackground(stage, travelRatio);
  }

  function drawDuelLighting(stage) {
    if (state.phase !== "battle" && state.phase !== "intro") return;
    ctx.save();
    const accent = stage.palette?.accent ?? "#f6d95f";
    const heroGlow = ctx.createRadialGradient(244, 286, 18, 244, 286, 150);
    heroGlow.addColorStop(0, "rgba(246, 217, 95, 0.22)");
    heroGlow.addColorStop(0.58, "rgba(246, 217, 95, 0.08)");
    heroGlow.addColorStop(1, "rgba(246, 217, 95, 0)");
    ctx.fillStyle = heroGlow;
    ctx.beginPath();
    ctx.ellipse(244, 286, 170, 72, 0, 0, Math.PI * 2);
    ctx.fill();

    const enemyGlow = ctx.createRadialGradient(686, 286, 18, 686, 286, 154);
    enemyGlow.addColorStop(0, `${accent}44`);
    enemyGlow.addColorStop(0.62, `${accent}16`);
    enemyGlow.addColorStop(1, `${accent}00`);
    ctx.fillStyle = enemyGlow;
    ctx.beginPath();
    ctx.ellipse(686, 286, 178, 76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGroundShadow(x, y, width, height, alpha = 0.24) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Enemy `kind` は `src/stages.js` のみ。未知はフードのフォールバック（下の else）へ。 */
  function drawCharacter(x, y, palette, facing = 1, pose = 0, elder = false, hit = 0, kind = "agent", displayScale = 1) {
    const hitLean = hit > 0 ? -10 : 0;
    const isHero = elder || kind === "hero";
    const isLarge = kind === "maskedHeavy" || kind === "armored" || kind === "steroidBoss";
    const isSecretEnemy = !isHero && SECRET_ENEMY_KINDS.has(kind);
    const frame = state.reducedMotion ? 0 : Math.floor(state.elapsed / 90) % 8;
    const bob = state.reducedMotion || isHero || isSecretEnemy ? 0 : Math.sin((frame / 8) * Math.PI * 2) * 2;
    const step = state.reducedMotion ? 0 : Math.sin((frame / 8) * Math.PI * 2);
    const outline = "#17110f";

    function drawPaperCutoutImage(image, x, y, w, h) {
      const pad = 14;
      const key = `${Math.ceil(w)}x${Math.ceil(h)}`;
      let sized = paperCutoutCache.get(image);
      if (!sized) {
        sized = new Map();
        paperCutoutCache.set(image, sized);
      }
      let prepared = sized.get(key);
      if (!prepared) {
        const preparedCanvas = makeCanvas(w + pad * 2, h + pad * 2);
        const preparedCtx = preparedCanvas.getContext("2d");
        preparedCtx.imageSmoothingEnabled = true;
        preparedCtx.filter = "drop-shadow(0 2px 0 #fff7d2) drop-shadow(4px 6px 0 rgba(0, 0, 0, 0.2))";
        preparedCtx.drawImage(image, pad, pad, w, h);
        preparedCtx.filter = "none";
        prepared = { canvas: preparedCanvas, pad };
        sized.set(key, prepared);
      }
      ctx.drawImage(prepared.canvas, x - prepared.pad, y - prepared.pad);
    }

    function drawImagegenEnemy() {
      const spec = imagegenAtlas.enemies[kind] ?? imagegenAtlas.enemies.agent;
      const crop = prepareImagegenCrop(`enemy:${kind}`, spec, true);
      if (!crop) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawPaperCutoutImage(crop, -spec.drawW / 2, -spec.drawH + spec.footInset, spec.drawW, spec.drawH);
      if (hit > 0) {
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = "#fff3a2";
        ctx.fillRect(24, -132, 20, 12);
        ctx.fillRect(15, -120, 12, 12);
        ctx.fillStyle = "#ff5b4f";
        ctx.fillRect(34, -110, 10, 10);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      return true;
    }

    function drawChibiCharacterAsset(spriteKey, currentHit = 0) {
      const spec = chibiCharacterSheet.sprites[spriteKey];
      if (!spec) return false;
      const crop = prepareChibiCharacterCrop(spriteKey, spec);
      if (!crop) return false;
      const drawW = spec.drawW;
      const drawH = spec.drawH;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      drawPaperCutoutImage(crop, -drawW / 2, -drawH + (spec.footInset ?? 0), drawW, drawH);
      ctx.restore();
      return true;
    }

    function drawHorseMaskBossAsset() {
      requestHorseMaskBoss();
      if (!horseMaskBossImage.complete || horseMaskBossImage.naturalWidth <= 0) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      drawPaperCutoutImage(horseMaskBossImage, -86, -214, 158, 214);
      if (hit > 0) {
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = "#fff3a2";
        ctx.fillRect(34, -152, 22, 12);
        ctx.fillRect(22, -138, 13, 13);
        ctx.fillStyle = "#ff5b4f";
        ctx.fillRect(45, -125, 10, 10);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      return true;
    }

    function drawHasegawaRevealAsset() {
      requestHasegawaReveal();
      if (!hasegawaRevealImage.complete || hasegawaRevealImage.naturalWidth <= 0) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      drawPaperCutoutImage(hasegawaRevealImage, -86, -214, 158, 214);
      ctx.restore();
      return true;
    }

    function fillStroke(fill, stroke = outline, width = 3) {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fill();
      ctx.stroke();
    }

    function drawLimb(points, width, fill, stroke = outline) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width + 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = fill;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function oval(cx, cy, rx, ry, fill, rotation = 0, stroke = outline, width = 3) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
      fillStroke(fill, stroke, width);
    }

    function rect(x0, y0, w, h, fill, stroke = outline, width = 2) {
      ctx.beginPath();
      ctx.rect(x0, y0, w, h);
      fillStroke(fill, stroke, width);
    }

    function looseLine(points, width, fill, stroke = outline) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const next = points[i];
        const midX = (prev[0] + next[0]) / 2;
        const midY = (prev[1] + next[1]) / 2;
        ctx.quadraticCurveTo(prev[0], prev[1], midX, midY);
      }
      ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width + 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = fill;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function drawLooseHero() {
      const tracksuitMode = state.stage?.id === "shotengai";
      const skin = "#e5aa79";
      const skinLight = "#f0bb84";
      const skinDark = "#8f553d";
      const hairBase = "#7a746e";
      const hairLight = "#d8d1c6";
      const hairDark = "#3a3633";

      ctx.save();
      const looseScale = tracksuitMode ? 0.78 : 0.8;
      ctx.scale(looseScale, looseScale);
      ctx.translate(0, -44);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      function drawOldFace() {
        ctx.beginPath();
        ctx.moveTo(-25, -132);
        ctx.quadraticCurveTo(-28, -158, -10, -170);
        ctx.quadraticCurveTo(12, -184, 36, -166);
        ctx.quadraticCurveTo(47, -151, 42, -121);
        ctx.quadraticCurveTo(39, -99, 22, -91);
        ctx.quadraticCurveTo(13, -85, -4, -94);
        ctx.quadraticCurveTo(-22, -105, -25, -132);
        ctx.closePath();
        fillStroke(skinLight, outline, 3);

        ctx.beginPath();
        ctx.moveTo(-32, -139);
        ctx.quadraticCurveTo(-17, -178, 17, -183);
        ctx.quadraticCurveTo(46, -182, 60, -147);
        ctx.quadraticCurveTo(45, -151, 28, -141);
        ctx.quadraticCurveTo(7, -132, -14, -136);
        ctx.quadraticCurveTo(-22, -137, -32, -139);
        ctx.closePath();
        fillStroke(hairBase, outline, 3);

        ctx.strokeStyle = hairDark;
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 8; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-19 + i * 8, -172 + (i % 2) * 2);
          ctx.quadraticCurveTo(-15 + i * 7, -154, -20 + i * 8, -136);
          ctx.stroke();
        }
        ctx.strokeStyle = hairLight;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, -169);
        ctx.quadraticCurveTo(7, -178, 29, -164);
        ctx.stroke();

        ctx.strokeStyle = outline;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-13, -133);
        ctx.quadraticCurveTo(-5, -137, 4, -133);
        ctx.moveTo(16, -133);
        ctx.quadraticCurveTo(25, -137, 34, -132);
        ctx.stroke();
        ctx.strokeStyle = "#221410";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-9, -124);
        ctx.lineTo(3, -124);
        ctx.moveTo(18, -124);
        ctx.lineTo(30, -123);
        ctx.stroke();
        ctx.strokeStyle = skinDark;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(11, -121);
        ctx.quadraticCurveTo(5, -109, 17, -106);
        ctx.stroke();
        ctx.strokeStyle = "#7b4936";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-8, -149);
        ctx.quadraticCurveTo(6, -153, 22, -149);
        ctx.moveTo(-7, -143);
        ctx.quadraticCurveTo(8, -146, 25, -142);
        ctx.moveTo(-16, -129);
        ctx.quadraticCurveTo(-7, -127, 2, -128);
        ctx.moveTo(15, -128);
        ctx.quadraticCurveTo(25, -126, 35, -128);
        ctx.moveTo(-12, -116);
        ctx.quadraticCurveTo(-19, -108, -16, -99);
        ctx.moveTo(31, -116);
        ctx.quadraticCurveTo(38, -108, 34, -99);
        ctx.moveTo(3, -93);
        ctx.quadraticCurveTo(13, -88, 27, -94);
        ctx.stroke();
        ctx.strokeStyle = "#6d241e";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(1, -99);
        ctx.quadraticCurveTo(12, -94, 27, -99);
        ctx.stroke();
      }

      if (tracksuitMode) {
        const red = "#c2342f";
        const redDark = "#731f20";
        const white = "#fff8e8";
        const blue = "#78cde9";
        const bottleOutline = "#13232b";

        ctx.beginPath();
        ctx.rect(-6, -101, 16, 14);
        fillStroke(skin, outline, 2);

        ctx.beginPath();
        ctx.moveTo(-24, -94);
        ctx.quadraticCurveTo(-32, -76, -31, -44);
        ctx.lineTo(-27, -10);
        ctx.quadraticCurveTo(-13, -3, 20, -4);
        ctx.lineTo(29, -16);
        ctx.quadraticCurveTo(31, -55, 24, -94);
        ctx.quadraticCurveTo(7, -88, -24, -94);
        ctx.closePath();
        fillStroke(red, outline, 3);

        ctx.beginPath();
        ctx.rect(-28, -9, 51, 9);
        fillStroke(redDark, outline, 2);
        ctx.strokeStyle = "#fff7e6";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -93);
        ctx.lineTo(0, -1);
        ctx.moveTo(-23, -82);
        ctx.quadraticCurveTo(-29, -46, -28, -13);
        ctx.moveTo(23, -82);
        ctx.quadraticCurveTo(27, -48, 28, -15);
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(-22, -56, 30, 13);
        fillStroke(white, "#2f3b3f", 1.5);
        ctx.fillStyle = "#2f3b3f";
        ctx.font = `800 8px ${CANVAS_FONT}`;
        ctx.fillText("小次郎", -20, -46);

        looseLine([[23, -84], [35, -61], [32, -27]], 9, red);
        oval(32, -24, 7, 6, skinLight, 0.1, outline, 2);
        looseLine([[-24, -84], [-39, -69], [-43, -103], [-35, -115]], 10, red);
        oval(-33, -114, 8, 7, skinLight, -0.2, outline, 2);

        ctx.beginPath();
        ctx.rect(-66, -137, 28, 62);
        fillStroke(blue, bottleOutline, 3);
        ctx.fillStyle = "#dff8ff";
        ctx.fillRect(-60, -128, 9, 45);
        ctx.fillStyle = "#fff7d2";
        ctx.fillRect(-63, -105, 22, 15);
        ctx.fillStyle = "#d64b3a";
        ctx.fillRect(-59, -99, 16, 4);
        ctx.beginPath();
        ctx.rect(-57, -148, 13, 11);
        fillStroke("#2d86c1", bottleOutline, 2);

        ctx.beginPath();
        ctx.moveTo(-18, -1);
        ctx.lineTo(-5, -1);
        ctx.lineTo(-6, 58);
        ctx.lineTo(-20, 58);
        ctx.closePath();
        fillStroke(redDark, outline, 2.4);
        ctx.beginPath();
        ctx.moveTo(6, -1);
        ctx.lineTo(19, -1);
        ctx.lineTo(21, 58);
        ctx.lineTo(8, 58);
        ctx.closePath();
        fillStroke(redDark, outline, 2.4);
        ctx.strokeStyle = "#fff7e6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-13, 3);
        ctx.lineTo(-13, 55);
        ctx.moveTo(13, 3);
        ctx.lineTo(14, 55);
        ctx.stroke();
        oval(-13, 63, 14, 5, "#171717", 0, outline, 1.5);
        oval(15, 63, 14, 5, "#171717", 0, outline, 1.5);
        drawOldFace();
      } else {
        const purple = "#4b2b68";
        const purpleDark = "#2b183f";
        const trim = "#fff7e6";
        const obi = "#d0c8cf";
        const gold = "#d7a84a";

        ctx.beginPath();
        ctx.moveTo(-38, -98);
        ctx.quadraticCurveTo(-68, -78, -78, -22);
        ctx.quadraticCurveTo(-67, 6, -45, -5);
        ctx.lineTo(-30, -58);
        ctx.lineTo(-25, 53);
        ctx.quadraticCurveTo(3, 63, 36, 53);
        ctx.lineTo(28, -57);
        ctx.quadraticCurveTo(51, -8, 78, -25);
        ctx.quadraticCurveTo(67, -78, 34, -98);
        ctx.closePath();
        fillStroke(purple, outline, 3);

        ctx.strokeStyle = trim;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-22, -91);
        ctx.quadraticCurveTo(-10, -60, 0, -26);
        ctx.quadraticCurveTo(11, -61, 24, -91);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-32, -23, 70, 15);
        fillStroke(obi, outline, 2);
        oval(7, -15, 6, 5, gold, 0, outline, 1.2);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath();
          ctx.arc(-16 + i * 10, 15 + i * 5, 10 + i, Math.PI * 0.05, Math.PI * 0.83);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-21 + i * 10, 34 + (i % 3) * 5, 8 + i, Math.PI * 0.02, Math.PI * 0.84);
          ctx.stroke();
        }
        ctx.fillStyle = "#fff4b8";
        for (let i = 0; i < 16; i += 1) {
          ctx.fillRect(-18 + (i % 5) * 12, -2 + Math.floor(i / 5) * 14, 2, 2);
        }

        looseLine([[43, -76], [62, -67], [82, -81]], 11, skin);
        oval(87, -82, 13, 7, skinLight, -0.2, outline, 2);
        looseLine([[-45, -70], [-37, -105], [-26, -118]], 12, skin);
        oval(-24, -118, 8, 7, skinLight, -0.2, outline, 2);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-28, -114);
        ctx.lineTo(-41, -88);
        ctx.stroke();
        ctx.strokeStyle = "#2f3035";
        ctx.lineWidth = 3;
        ctx.stroke();
        oval(-25, -124, 8, 7, "#c8cbd0", -0.12, outline, 2);

        ctx.beginPath();
        ctx.moveTo(-21, 53);
        ctx.lineTo(-5, 53);
        ctx.lineTo(-9, 69);
        ctx.lineTo(-27, 69);
        ctx.closePath();
        fillStroke(purpleDark, outline, 2.2);
        ctx.beginPath();
        ctx.moveTo(8, 53);
        ctx.lineTo(25, 53);
        ctx.lineTo(29, 69);
        ctx.lineTo(10, 69);
        ctx.closePath();
        fillStroke(purpleDark, outline, 2.2);
        oval(-18, 74, 17, 6, "#171717", 0, outline, 1.5);
        oval(19, 74, 17, 6, "#171717", 0, outline, 1.5);
        drawOldFace();
      }

      ctx.restore();
    }

    function drawChibiSecretEnemy() {
      ctx.save();
      if (kind === "steroidBoss") {
        drawHorseMaskBossAsset();
        ctx.restore();
        return;
      }
      if (drawChibiCharacterAsset(kind, hit)) {
        ctx.restore();
        return;
      }
      const chibiSheetReady = chibiCharacterSheetImage.complete && chibiCharacterSheetImage.naturalWidth > 0;
      if (chibiSheetReady && drawImagegenEnemy()) {
        ctx.restore();
        return;
      }

      const sprite = cleanEnemySpriteCanvas(kind, palette);
      const spriteBig = kind === "maskedHeavy" || kind === "armored" || kind === "steroidBoss";
      const drawW = spriteBig ? 166 : 154;
      const drawH = spriteBig ? 184 : 176;
      const footInset = drawH * 0.04;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, -drawW / 2, -drawH + footInset, drawW, drawH);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y + bob);
    if (hit > 0 && !state.reducedMotion) {
      const recoil = Math.min(1, hit / 760);
      const backDir = isHero ? -facing : 1;
      const stagger = Math.sin(recoil * Math.PI * 0.5);
      const snap = Math.sin(recoil * Math.PI * 2.2) * 0.08;
      ctx.translate(backDir * (74 * stagger + 12 * snap), -12 * stagger);
      ctx.rotate(backDir * (0.38 * stagger + snap));
    }
    ctx.rotate((hitLean * Math.PI) / 180);
    ctx.scale(facing * displayScale, displayScale);

    ctx.save();
    ctx.scale(!isSecretEnemy && isLarge ? 1.12 : 1, !isSecretEnemy && isLarge ? 1.08 : 1);

    if (!isSecretEnemy && !isHero) {
      ctx.fillStyle = "#0007";
      ctx.beginPath();
      ctx.ellipse(0, 108, isLarge ? 58 : 46, isLarge ? 15 : 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const armSwing = step * 8;
    const coat = palette.coat;
    const accent = palette.accent;
    const face = isSecretEnemy ? palette.mask ?? "#151a22" : palette.face;
    const waistY = 63;
    const torsoTop = 27;
    const torsoBottom = 74;
    const torsoLeft = -22;
    const torsoRight = 24;

    if (isHero) {
      const heroSpriteKey = state.stage?.id === "shotengai" ? "heroStage1" : "heroKimono";
      if (drawChibiCharacterAsset(heroSpriteKey, hit)) {
        ctx.restore();
        ctx.restore();
        return;
      }
      drawLooseHero();
      ctx.restore();
      ctx.restore();
      return;
    }

    if (kind === "hasegawaReveal") {
      drawHasegawaRevealAsset();
      ctx.restore();
      ctx.restore();
      return;
    }

    if (isSecretEnemy) {
      drawChibiSecretEnemy();
      ctx.restore();
      ctx.restore();
      return;
    }

    drawLimb(
      [
        [-12, waistY],
        [-18 - armSwing * 0.12, 84],
        [-22 - armSwing * 0.2, 101],
      ],
      11,
      "#e9e9e9",
    );
    drawLimb(
      [
        [12, waistY],
        [17 + armSwing * 0.12, 84],
        [22 + armSwing * 0.2, 101],
      ],
      11,
      "#e9e9e9",
    );
    oval(-24 - armSwing * 0.18, 104, 13, 5, "#151515", -0.08);
    oval(24 + armSwing * 0.18, 104, 13, 5, "#151515", 0.08);

    ctx.beginPath();
    ctx.moveTo(torsoLeft, torsoTop + 6);
    ctx.quadraticCurveTo(-30, 42, -24, torsoBottom);
    ctx.quadraticCurveTo(0, torsoBottom + 8, torsoRight, torsoBottom);
    ctx.quadraticCurveTo(31, 42, torsoRight - 3, torsoTop + 4);
    ctx.quadraticCurveTo(0, torsoTop - 7, torsoLeft, torsoTop + 6);
    fillStroke(coat);

    ctx.beginPath();
    ctx.moveTo(-10, torsoTop + 5);
    ctx.lineTo(-7, torsoBottom - 12);
    ctx.lineTo(9, torsoBottom - 12);
    ctx.lineTo(11, torsoTop + 5);
    fillStroke(kind === "scientist" ? "#f3f4f6" : isSecretEnemy ? "#111827" : "#f0f4f8", outline, 2);
    ctx.beginPath();
    ctx.moveTo(torsoLeft + 4, torsoBottom - 12);
    ctx.lineTo(torsoRight - 4, torsoBottom - 12);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    if (isSecretEnemy) {
      ctx.beginPath();
      ctx.moveTo(torsoLeft + 4, torsoTop + 9);
      ctx.lineTo(-8, torsoBottom - 16);
      ctx.moveTo(torsoRight - 4, torsoTop + 9);
      ctx.lineTo(9, torsoBottom - 16);
      ctx.strokeStyle = kind === "scientist" ? "#d9dee5" : "#0b1020";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 48, 11, 0, Math.PI * 2);
      fillStroke(accent, outline, 2);
      ctx.save();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = "#171717";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-6, 42);
      ctx.lineTo(6, 54);
      ctx.moveTo(6, 42);
      ctx.lineTo(-6, 54);
      ctx.stroke();
      ctx.restore();
    }
    if (kind === "armored" || kind === "steroidBoss") {
      for (let i = 0; i < 4; i += 1) {
        rect(-19 + i * 12, 47, 4, 4, "#d9dee5", outline, 1);
      }
    }

    drawLimb(
      [
        [-17, 36],
        [-42, 47 - armSwing * 0.1],
        [-55, 56 - armSwing * 0.2],
      ],
      12,
      coat,
    );
    oval(-59, 58 - armSwing * 0.2, 7, 6, face, 0.25);
    drawLimb(
      [
        [17, 36],
        [42, 44 + armSwing * 0.1],
        [57, 51 + armSwing * 0.2],
      ],
      12,
      coat,
    );
    oval(62, 52 + armSwing * 0.2, 7, 6, face, -0.2);
    if (kind === "armored" || kind === "elite" || kind === "steroidBoss") {
      drawLimb(
        [
          [45, 49 + armSwing * 0.15],
          [74, 62 + armSwing * 0.15],
        ],
        7,
        "#2b2b2b",
      );
      oval(81, 67 + armSwing * 0.15, 14, 9, accent, -0.15);
      ctx.beginPath();
      ctx.moveTo(69, 58 + armSwing * 0.15);
      ctx.lineTo(92, 41 + armSwing * 0.15);
      ctx.strokeStyle = "#d9dee5";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (kind === "bruiser") {
      rect(-68, 52 - armSwing * 0.2, 22, 16, "#171717", outline, 2);
      oval(-62, 60 - armSwing * 0.2, 4, 4, accent, 0, outline, 1);
      oval(-52, 60 - armSwing * 0.2, 4, 4, accent, 0, outline, 1);
    }
    if (kind === "operator") {
      oval(72, 53 + armSwing * 0.2, 14, 14, "#171717", 0, outline, 2);
      oval(72, 53 + armSwing * 0.2, 6, 6, accent, 0, outline, 1.5);
    }
    if (kind === "scientist") {
      ctx.beginPath();
      ctx.moveTo(-56, 56 - armSwing * 0.2);
      ctx.lineTo(-44, 68 - armSwing * 0.2);
      ctx.lineTo(-54, 76 - armSwing * 0.2);
      fillStroke("#7be7ff", outline, 1.8);
    }
    if (kind === "elite") {
      ctx.beginPath();
      ctx.moveTo(-31, 30);
      ctx.quadraticCurveTo(-42, 56, -36, 91);
      ctx.lineTo(-19, 80);
      ctx.quadraticCurveTo(-21, 52, -18, 35);
      ctx.closePath();
      fillStroke("#5b1f27", outline, 2);
      ctx.beginPath();
      ctx.moveTo(31, 30);
      ctx.quadraticCurveTo(42, 56, 36, 91);
      ctx.lineTo(19, 80);
      ctx.quadraticCurveTo(21, 52, 18, 35);
      ctx.closePath();
      fillStroke("#5b1f27", outline, 2);
      oval(-23, 38, 8, 5, "#f6d95f", -0.2, outline, 1.4);
      oval(23, 38, 8, 5, "#f6d95f", 0.2, outline, 1.4);
    }

    oval(0, 1, isLarge ? 18 : 16, isLarge ? 21 : 19, face);
    ctx.fillStyle = "#0002";
    ctx.beginPath();
    ctx.ellipse(7, 7, 8, 10, -0.35, 0, Math.PI * 2);
    ctx.fill();

    if (isSecretEnemy) {
      const hoodFill = kind === "scientist" ? "#d9dee5" : kind === "steroidBoss" ? "#0b0b10" : "#20263a";
      const wideHood = kind === "bruiser" || kind === "maskedHeavy" || kind === "armored";
      if (wideHood) {
        ctx.beginPath();
        ctx.moveTo(-32, -5);
        ctx.quadraticCurveTo(-10, -29, 30, -5);
        ctx.lineTo(24, 4);
        ctx.quadraticCurveTo(0, -9, -28, 4);
        ctx.closePath();
        fillStroke(hoodFill, outline, 2.8);
      } else if (kind === "scout") {
        ctx.beginPath();
        ctx.moveTo(-22, -5);
        ctx.quadraticCurveTo(-6, -31, 22, -6);
        ctx.lineTo(19, 2);
        ctx.quadraticCurveTo(2, -11, -20, 2);
        ctx.closePath();
        fillStroke(hoodFill, outline, 2.6);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-16, -16);
        ctx.lineTo(-25, -29);
        ctx.moveTo(16, -16);
        ctx.lineTo(25, -29);
        ctx.stroke();
        oval(-27, -31, 4, 4, accent, 0, outline, 1.4);
        oval(27, -31, 4, 4, accent, 0, outline, 1.4);
      } else {
        ctx.beginPath();
        ctx.moveTo(-23, -7);
        ctx.quadraticCurveTo(-5, -23, 19, -8);
        ctx.lineTo(18, 1);
        ctx.quadraticCurveTo(2, -6, -19, 1);
        ctx.closePath();
        fillStroke(hoodFill, outline, 2.5);
      }
      if (kind === "agent") {
        ctx.beginPath();
        ctx.moveTo(-20, -5);
        ctx.lineTo(20, -5);
        ctx.lineTo(24, -2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }
      if (kind === "captain") {
        ctx.beginPath();
        ctx.moveTo(-28, -8);
        ctx.lineTo(28, -8);
        ctx.lineTo(38, -1);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = "#f6d95f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, -5);
        ctx.lineTo(20, -5);
        ctx.stroke();
      }
      if (kind === "elite") {
        ctx.beginPath();
        ctx.moveTo(-26, -8);
        ctx.lineTo(26, -8);
        ctx.lineTo(34, -2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = "#f6d95f";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-24, -11);
        ctx.lineTo(24, -11);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3, -20);
        ctx.lineTo(0, -29);
        ctx.lineTo(3, -20);
        ctx.closePath();
        fillStroke("#f6d95f", outline, 1.4);
      }
      if (kind === "bruiser" || kind === "maskedHeavy" || kind === "armored") {
        ctx.beginPath();
        ctx.rect(-15, -2, 30, 17);
        fillStroke("#111827", outline, 2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.lineTo(10, 5);
        ctx.stroke();
      }
      if (kind === "operator") {
        oval(-17, -1, 6, 10, accent, 0, outline, 2);
        oval(17, -1, 6, 10, accent, 0, outline, 2);
        ctx.beginPath();
        ctx.arc(0, -7, 18, Math.PI, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      if (kind === "steroidBoss") {
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-22 + i * 11, -11);
          ctx.lineTo(-18 + i * 11, -28);
          ctx.lineTo(-14 + i * 11, -10);
          ctx.closePath();
          fillStroke("#f6d95f", outline, 1.8);
        }
        ctx.beginPath();
        ctx.arc(0, 0, 27, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = "#b63a32";
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.fillStyle = "#f7f0d0";
      if (kind === "scientist") ctx.fillStyle = "#92f4ff";
      if (kind === "steroidBoss") ctx.fillStyle = "#ff5b4f";
      ctx.beginPath();
      ctx.roundRect(-11, 2, 8, 6, 2);
      ctx.roundRect(4, 2, 8, 6, 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-20, -5);
      ctx.quadraticCurveTo(0, -24, 22, -5);
      ctx.quadraticCurveTo(10, 2, -12, 2);
      ctx.closePath();
      fillStroke("#1e293b", outline, 2.5);
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.quadraticCurveTo(0, -14, 16, -8);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (isSecretEnemy) {
      ctx.fillStyle = "#f7f0d0";
      if (kind === "scientist") ctx.fillStyle = "#91efff";
      if (kind === "steroidBoss") ctx.fillStyle = "#ff5b4f";
      ctx.beginPath();
      ctx.roundRect(-12, 1, 10, 7, 2);
      ctx.roundRect(3, 1, 10, 7, 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9, 15);
      ctx.lineTo(10, 15);
      ctx.strokeStyle = hit > 0 ? "#ff8f70" : "#0b0b10";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (hit > 0) {
        ctx.fillStyle = "#fff3a2";
        ctx.beginPath();
        ctx.moveTo(16, 3);
        ctx.lineTo(28, -4);
        ctx.lineTo(23, 9);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.ellipse(-6, 2, 2.2, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(7, 2, 2.2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-6.7, 0.8, 0.7, 1, 0, 0, Math.PI * 2);
      ctx.ellipse(6.3, 0.8, 0.7, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.quadraticCurveTo(-5, -6, -1, -4.5);
      ctx.moveTo(3, -4.5);
      ctx.quadraticCurveTo(8, -6, 11, -4);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 12);
      ctx.quadraticCurveTo(2, hit > 0 ? 18 : 15, 8, 12);
      ctx.strokeStyle = hit > 0 ? "#7a2118" : "#3a231c";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  function drawPetals() {
    for (const petal of state.petals) {
      const alpha = Math.max(0, Math.min(1, petal.life / petal.maxLife));
      const scale = 0.75 + petal.layer * 0.9;
      const size = petal.size * scale;
      ctx.save();
      ctx.globalAlpha = alpha * (0.45 + petal.layer * 0.55);
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.spin);
      ctx.fillStyle = petal.layer > 0.72 ? "#fff1f6" : "#ffd6e5";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.56, size * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff8fb3";
      ctx.beginPath();
      ctx.ellipse(size * 0.18, 0, size * 0.22, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (petal.layer > 0.78) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, 0);
        ctx.quadraticCurveTo(0, -size * 0.12, size * 0.42, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawHitBurst(enemyX, enemyY) {
    if (state.enemyHit <= 0) return;
    const alpha = Math.min(1, state.enemyHit / 520);
    const heavy = state.enemyHit > 700;
    const burstX = enemyX - 50;
    const burstY = enemyY - 108;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const rays = heavy ? 14 : 10;
    for (let i = 0; i < rays; i += 1) {
      const t = rays === 1 ? 0 : i / (rays - 1);
      const startX = burstX - 24 - (i % 3) * 7;
      const startY = enemyY - 166 + t * 126;
      const endX = burstX + (heavy ? 78 : 58) + (i % 2) * 10;
      const endY = burstY - 30 + t * 96;
      ctx.strokeStyle = i % 2 ? "#171717" : "#fff3a2";
      ctx.lineWidth = i % 2 ? 4 : 5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = heavy ? "#ff8f70" : "#fff3a2";
    ctx.beginPath();
    ctx.moveTo(burstX - 20, burstY - 18);
    ctx.lineTo(burstX + 18, burstY - 42);
    ctx.lineTo(burstX + 8, burstY - 7);
    ctx.lineTo(burstX + 48, burstY - 16);
    ctx.lineTo(burstX + 12, burstY + 12);
    ctx.lineTo(burstX + 30, burstY + 48);
    ctx.lineTo(burstX - 8, burstY + 18);
    ctx.lineTo(burstX - 42, burstY + 32);
    ctx.lineTo(burstX - 18, burstY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 5;
    ctx.font = `600 ${heavy ? 34 : 30}px ${CANVAS_FONT}`;
    ctx.textAlign = "center";
    ctx.strokeText(heavy ? "のけぞり!" : "ぐらっ", enemyX + 12, enemyY - 174);
    ctx.fillText(heavy ? "のけぞり!" : "ぐらっ", enemyX + 12, enemyY - 174);
    ctx.restore();
  }

  function motionPulse(motion) {
    if (!motion) return 0;
    if (state.reducedMotion) return 0.65;
    const progress = Math.max(0, Math.min(1, 1 - motion.life / motion.maxLife));
    return Math.sin(progress * Math.PI);
  }

  function drawCombatMotion(heroX, heroY, enemyX, enemyY) {
    const heroStrikePulse = motionPulse(state.heroStrike);
    const enemyAttackPulse = motionPulse(state.enemyAttack);
    const guardPulse = motionPulse(state.heroGuard);
    if (!heroStrikePulse && !enemyAttackPulse && !guardPulse) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (heroStrikePulse) {
      const heavy = state.heroStrike?.heavy;
      const alpha = heavy ? 0.95 : 0.72;
      const impactX = enemyX - 78 + heroStrikePulse * 10;
      const impactY = enemyY - 118;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = heavy ? "#fff4b8" : "#ffffff";
      ctx.lineWidth = heavy ? 7 : 5;
      for (let i = 0; i < (heavy ? 5 : 4); i += 1) {
        const y = impactY - 34 + i * 18;
        ctx.beginPath();
        ctx.moveTo(impactX - 56 - i * 3, y + 12);
        ctx.lineTo(impactX + 8 + i * 5, y - 8);
        ctx.stroke();
      }
      ctx.strokeStyle = "#d04b36";
      ctx.lineWidth = heavy ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(impactX - 30, impactY + 38);
      ctx.lineTo(impactX + 14, impactY + 14);
      ctx.stroke();
      if (heavy) {
        ctx.fillStyle = "#fff7d2";
        ctx.font = `600 25px ${CANVAS_FONT}`;
        ctx.fillText("一撃", impactX - 10, impactY - 50);
      }
    }

    if (enemyAttackPulse) {
      const slashX = heroX + 74 - enemyAttackPulse * 22;
      const slashY = heroY - 120;
      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = "#ff5b4f";
      ctx.lineWidth = state.enemyAttack?.pressure ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(slashX + 58, slashY - 12);
      ctx.quadraticCurveTo(slashX + 6, slashY + 4, slashX - 36, slashY + 52);
      ctx.stroke();
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slashX + 48, slashY - 2);
      ctx.quadraticCurveTo(slashX + 2, slashY + 12, slashX - 26, slashY + 48);
      ctx.stroke();
    }

    if (guardPulse) {
      ctx.globalAlpha = 0.66;
      ctx.strokeStyle = "#fff4b8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(heroX + 42, heroY - 112, 26 + guardPulse * 8, 42 + guardPulse * 6, -0.18, Math.PI * 1.55, Math.PI * 0.42);
      ctx.stroke();
      ctx.fillStyle = "#fff7d2";
      ctx.font = `600 18px ${CANVAS_FONT}`;
      ctx.fillText("受けた", heroX + 48, heroY - 158);
    }

    ctx.restore();
  }

  function drawSpecialCutin() {
    if (!state.specialCutin) return;
    requestCutinImage();
    const progress = 1 - state.specialCutin.life / state.specialCutin.maxLife;
    const alpha = Math.min(1, state.specialCutin.life / 220, progress / 0.12);
    const y = 34;
    const h = 236;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#05070e";
    ctx.fillRect(0, y, W, h);
    if (cutinImage.complete && cutinImage.naturalWidth > 0) {
      ctx.drawImage(cutinImage, 0, 0, cutinImage.naturalWidth, cutinImage.naturalHeight, 0, y, W, h);
    }
    ctx.fillStyle = "#0008";
    ctx.fillRect(0, y, W, h);
    ctx.strokeStyle = "#f6d95f";
    ctx.lineWidth = 5;
    ctx.strokeRect(0, y, W, h);
    ctx.fillStyle = "#fff7d2";
    ctx.textAlign = "left";
    ctx.font = `600 48px ${CANVAS_FONT}`;
    ctx.fillText(state.specialCutin.internalDestruction ? "奥義" : "十連", 650, 130);
    ctx.font = `600 34px ${CANVAS_FONT}`;
    ctx.fillText(state.specialCutin.internalDestruction ? "爺コブシ" : "大追撃", 638, 176);
    ctx.font = `600 22px ${CANVAS_FONT}`;
    ctx.fillText(state.specialCutin.internalDestruction ? "内部破壊" : `追撃 +${state.specialCutin.damage}`, 672, 214);
    if (state.specialCutin.internalDestruction) {
      ctx.font = `600 18px ${CANVAS_FONT}`;
      ctx.fillText(`追撃 +${state.specialCutin.damage}`, 672, 238);
    }
    ctx.restore();
  }

  function drawFocusEffect() {
    if (!state.focusEffect && state.spiritFocusMs <= 0) return;
    const life = state.focusEffect?.life ?? Math.min(900, state.spiritFocusMs);
    const maxLife = state.focusEffect?.maxLife ?? 900;
    const progress = 1 - life / maxLife;
    const alpha = Math.min(1, life / 320, state.spiritFocusMs > 0 ? 1 : progress / 0.18);
    const cx = state.stage?.id === "shotengai" ? 244 : 244;
    const cy = state.stage?.id === "shotengai" ? 224 : 214;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ringCount = state.reducedMotion ? 1 : 3;
    for (let i = 0; i < ringCount; i += 1) {
      const phase = Math.max(0, Math.min(1, progress * 1.25 - i * 0.22));
      if (phase <= 0) continue;
      ctx.strokeStyle = i % 2 === 0 ? "#8fd8ff" : "#f6d95f";
      ctx.lineWidth = 5 - i;
      ctx.globalAlpha = alpha * (1 - phase * 0.55);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 18, 38 + phase * 74, 18 + phase * 28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e8f7ff";
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 5;
    ctx.font = `600 38px ${CANVAS_FONT}`;
    const text = state.focusEffect?.text ?? "見切り節";
    ctx.strokeText(text, cx + 118, cy - 54 - progress * 24);
    ctx.fillText(text, cx + 118, cy - 54 - progress * 24);
    ctx.fillStyle = "#8fd8ff";
    ctx.font = `600 26px ${CANVAS_FONT}`;
    for (let i = 0; i < (state.reducedMotion ? 2 : 7); i += 1) {
      const angle = (Math.PI * 2 * i) / 7 + progress * Math.PI * 0.7;
      const radius = 58 + progress * 38 + (i % 2) * 12;
      ctx.fillText("◇", cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius - 6);
    }
    ctx.restore();
  }

  function drawEffects() {
    for (const fx of state.effects) {
      const alpha = Math.max(0, fx.life / fx.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fx.color;
      const isCombo = fx.text.includes("コブシ");
      ctx.font = `600 ${isCombo ? 42 : 34}px ${CANVAS_FONT}`;
      if (isCombo && !state.reducedMotion) {
        ctx.strokeStyle = "#171717";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(492, 208, 72 * (1.15 - alpha * 0.15), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillText(fx.text, fx.x, fx.y);
      ctx.globalAlpha = 1;
    }
  }

  function getRhythmPanelChrome(showRhythmGuide, layout) {
    const { panelX, panelY, panelW, panelH, stripX, stripY, stripW, stripH, callY, repeatY } = layout;
    const key = [
      showRhythmGuide ? "guide" : "compact",
      panelX,
      panelY,
      panelW,
      panelH,
      stripX,
      stripY,
      stripW,
      stripH,
      callY,
      repeatY,
    ].join(":");
    if (rhythmChromeCache.has(key)) return rhythmChromeCache.get(key);
    const chrome = makeCanvas();
    const c = chrome.getContext("2d");
    c.shadowColor = "rgba(0, 0, 0, 0.22)";
    c.shadowBlur = 10;
    c.shadowOffsetY = 6;
    c.fillStyle = "#fff7d2";
    c.beginPath();
    c.roundRect(panelX, panelY, panelW, panelH, 8);
    c.fill();
    c.shadowColor = "transparent";
    c.lineWidth = 4;
    c.strokeStyle = "#171717";
    c.stroke();

    c.fillStyle = "#11151d";
    c.beginPath();
    c.roundRect(stripX, stripY, stripW, stripH, 7);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = "#171717";
    c.stroke();

    c.fillStyle = "rgba(255, 247, 210, 0.08)";
    for (let x = stripX + 24; x < stripX + stripW; x += 54) {
      c.fillRect(x, stripY + 8, 2, stripH - 16);
    }
    c.fillStyle = "rgba(246, 217, 95, 0.18)";
    c.fillRect(stripX + 8, callY - 15, stripW - 16, 30);
    c.fillStyle = "rgba(255, 247, 210, 0.08)";
    c.fillRect(stripX + 8, repeatY - 22, stripW - 16, 44);
    c.strokeStyle = "rgba(255, 247, 210, 0.4)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(stripX + 12, repeatY);
    c.lineTo(stripX + stripW - 12, repeatY);
    c.stroke();
    rhythmChromeCache.set(key, chrome);
    return chrome;
  }

  function drawCanvasRhythmBar() {
    if (state.phase !== "battle") return;
    const next = state.nextNote;
    const isMobilePortrait =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
    const isMobileLandscape =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1100px) and (orientation: landscape)").matches;
    const showRhythmGuide = state.stageIndex === 0 && !isMobilePortrait;
    const showInputButton = (isMobilePortrait || isMobileLandscape) && !showRhythmGuide;
    const panelX = isMobilePortrait ? 24 : 48;
    const panelY = isMobilePortrait ? 334 : 352;
    const panelW = W - panelX * 2;
    const panelH = isMobilePortrait ? 186 : 170;
    const infoW = showRhythmGuide ? 124 : isMobilePortrait ? 102 : 82;
    const stripX = panelX + infoW + (isMobilePortrait ? 10 : 18);
    const stripY = panelY + (isMobilePortrait ? 16 : 22);
    const stripW = panelW - infoW - (isMobilePortrait ? 22 : 48);
    const stripH = panelH - (isMobilePortrait ? 56 : 66);
    const hitX = stripX + stripW * (isMobilePortrait ? 0.44 : 0.42);
    const repeatY = stripY + (isMobilePortrait ? 66 : 68);
    const callY = stripY + (isMobilePortrait ? 24 : 26);
    const portraitCx = panelX + 78;
    const portraitCy = panelY + 92;
    const markerRange = 2500;
    const openingMs = Math.max(0, -state.battleTimeMs);
    const noteColor = (note) => (note?.type === "hold" ? "#e3bf55" : note?.type === "mash" ? "#ef5b4f" : "#fff7d2");
    const noteBlockLabel = (note) => (note?.type === "hold" ? "長押" : note?.type === "mash" ? "連打" : nextNoteLabel(note).slice(0, 1));
    const nextActionHint = (note) => {
      if (!note) return "曲が始まるまで待つ";
      if (note.type === "hold") return "押し続けて、白い「離す」で離す";
      if (note.type === "mash") return "赤い枠の間、連打する";
      return "金の線に重なったら押す";
    };
    const trackXForTime = (timeMs) => {
      const dt = timeMs - state.battleTimeMs;
      return hitX + (dt / markerRange) * (stripW * 0.7);
    };

    ctx.save();
    ctx.drawImage(
      getRhythmPanelChrome(showRhythmGuide, {
        panelX,
        panelY,
        panelW,
        panelH,
        stripX,
        stripY,
        stripW,
        stripH,
        callY,
        repeatY,
      }),
      0,
      0,
    );

    ctx.fillStyle = "#171717";
    ctx.font = `600 12px ${CANVAS_FONT}`;
    ctx.textAlign = "left";
    if (showInputButton) {
      const buttonX = panelX + 10;
      const buttonY = panelY + (isMobilePortrait ? 18 : 20);
      const buttonW = isMobilePortrait ? infoW - 12 : 64;
      const buttonH = isMobilePortrait ? 112 : 106;
      const actionText = next ? nextNoteLabel(next) : "待機";
      const buttonPulse = state.reducedMotion ? 0.45 : Math.sin(state.elapsed / 180) * 0.12 + 0.42;
      const buttonGradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonH);
      buttonGradient.addColorStop(0, "rgba(255, 247, 210, 0.98)");
      buttonGradient.addColorStop(0.48, "rgba(246, 217, 95, 0.96)");
      buttonGradient.addColorStop(1, "rgba(227, 191, 85, 0.98)");
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#171717";
      ctx.beginPath();
      ctx.roundRect(buttonX + 4, buttonY + 5, buttonW, buttonH, 12);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = buttonGradient;
      ctx.beginPath();
      ctx.roundRect(buttonX, buttonY, buttonW, buttonH, 12);
      ctx.fill();
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 0.32 + buttonPulse;
      ctx.strokeStyle = "#fff7d2";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(buttonX + 8, buttonY + 8, buttonW - 16, buttonH - 16, 9);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#171717";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 ${isMobilePortrait ? 12 : 11}px ${CANVAS_FONT}`;
      ctx.fillText("入力", buttonX + buttonW / 2, buttonY + 24);
      ctx.font = `600 ${actionText.length >= 3 ? (isMobilePortrait ? 24 : 19) : (isMobilePortrait ? 30 : 24)}px ${CANVAS_FONT}`;
      ctx.fillText(actionText, buttonX + buttonW / 2, buttonY + 62);
      ctx.font = `600 ${isMobilePortrait ? 11 : 10}px ${CANVAS_FONT}`;
      ctx.fillText("拍", buttonX + buttonW / 2, buttonY + (isMobilePortrait ? 92 : 88));
      ctx.restore();
    } else {
      ctx.fillText(showRhythmGuide ? "次の操作" : "次", panelX + 18, panelY + 26);
      ctx.font = `600 26px ${CANVAS_FONT}`;
      ctx.fillText(next ? nextNoteLabel(next) : "待機", panelX + 18, panelY + 56);
    }
    if (showRhythmGuide) {
      ctx.font = `500 12px ${CANVAS_FONT}`;
      ctx.fillText(nextActionHint(next), panelX + 18, panelY + 78);

      ctx.save();
      ctx.translate(portraitCx, portraitCy);
      if (!state.reducedMotion) ctx.rotate(Math.sin(state.elapsed / 280) * 0.04);
      ctx.fillStyle = "#171717";
      ctx.beginPath();
      ctx.ellipse(4, 6, 48, 42, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f6d95f";
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 42, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#171717";
      ctx.font = `600 18px ${CANVAS_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("金の線", 0, -5);
      ctx.font = `600 13px ${CANVAS_FONT}`;
      ctx.fillText("で押す", 0, 18);
      ctx.restore();
    }

    ctx.fillStyle = "#fff7d2";
    ctx.font = `600 12px ${CANVAS_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (showRhythmGuide) {
      ctx.fillText("合図", stripX + 12, callY);
      ctx.fillText("入力", stripX + 12, repeatY);
    }

    const callText = next?.enemyCue ? "相手の合図" : next?.phraseLabel ?? "曲の拍";
    const callW = Math.min(isMobilePortrait ? 176 : 210, Math.max(isMobilePortrait ? 90 : 108, 18 + callText.length * 14));
    const callX = stripX + (showRhythmGuide ? 66 : 24);
    ctx.fillStyle = next?.enemyCue ? "#ef5b4f" : "rgba(255, 247, 210, 0.78)";
    ctx.beginPath();
    ctx.roundRect(callX, callY - 13, callW, 26, 5);
    ctx.fill();
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = next?.enemyCue ? "#fff7d2" : "#171717";
    ctx.textAlign = "center";
    ctx.fillText(callText, callX + callW / 2, callY + 1);

    if (showRhythmGuide && next?.responseText) {
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#fff7d2";
      ctx.font = `600 11px ${CANVAS_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(`次: ${nextActionHint(next)}`, Math.min(stripX + stripW - 188, callX + callW + 16), callY + 1);
      ctx.globalAlpha = 1;
    }

    const pulse = state.reducedMotion ? 0 : Math.sin(state.elapsed / 150) * 0.5 + 0.5;
    ctx.fillStyle = "rgba(246, 217, 95, 0.28)";
    ctx.fillRect(hitX - 13 - pulse * 2, stripY + 8, 26 + pulse * 4, stripH - 16);
    ctx.strokeStyle = "#f6d95f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hitX, stripY + 4);
    ctx.lineTo(hitX, stripY + stripH - 4);
    ctx.stroke();
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff7d2";
    ctx.font = `600 12px ${CANVAS_FONT}`;
    ctx.textAlign = "center";
    if (showRhythmGuide) ctx.fillText("ここで押す", hitX, stripY + stripH + 13);

    if (state.noteStates?.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(stripX + 1, stripY + 1, stripW - 2, stripH - 2);
      ctx.clip();
      for (let i = state.nextUnresolvedIndex; i < state.noteStates.length; i += 1) {
        const note = state.noteStates[i]?.note;
        if (!note) continue;
        const dt = note.timeMs - state.battleTimeMs;
        const holdEndTime = note.timeMs + (note.durationMs ?? 0);
        const holdEndDt = holdEndTime - state.battleTimeMs;
        const isDurationNote = note.type === "hold" || note.type === "mash";
        if (isDurationNote ? dt > markerRange || holdEndDt < -260 : dt > markerRange || dt < -260) continue;
        const noteX = trackXForTime(note.timeMs);
        const noteY = repeatY;
        const color = noteColor(note);
        const tokenW = note.type === "tap" ? 54 : 70;
        const tokenH = 24;
        if (note.type === "mash") {
          const endX = trackXForTime(holdEndTime);
          const isActiveMash =
            state.battleTimeMs >= note.timeMs - 80 &&
            state.battleTimeMs <= holdEndTime + 80 &&
            !state.noteStates[i]?.resolved;
          const bodyX = Math.min(noteX, endX);
          const bodyW = Math.max(92, Math.abs(endX - noteX));
          const bodyH = 34;
          const pulseAlpha = state.reducedMotion ? 0.88 : 0.72 + Math.sin(state.elapsed / 85) * 0.12;
          const mashGradient = ctx.createLinearGradient(bodyX, noteY, bodyX + bodyW, noteY);
          mashGradient.addColorStop(0, isActiveMash ? "rgba(239, 91, 79, 0.98)" : "rgba(239, 91, 79, 0.72)");
          mashGradient.addColorStop(1, isActiveMash ? "rgba(246, 217, 95, 0.92)" : "rgba(239, 91, 79, 0.34)");
          ctx.fillStyle = mashGradient;
          ctx.beginPath();
          ctx.roundRect(bodyX, noteY - bodyH / 2, bodyW, bodyH, 6);
          ctx.fill();
          ctx.strokeStyle = isActiveMash ? "#fff7d2" : "#171717";
          ctx.lineWidth = isActiveMash ? 4 : 3;
          ctx.stroke();
          if (isActiveMash) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.45, pulseAlpha);
            ctx.strokeStyle = "#fff7d2";
            ctx.lineWidth = 3;
            ctx.setLineDash([9, 7]);
            ctx.strokeRect(bodyX + 6, noteY - bodyH / 2 + 6, bodyW - 12, bodyH - 12);
            ctx.setLineDash([]);
            ctx.restore();
          }
          ctx.fillStyle = "#fff7d2";
          ctx.font = `600 14px ${CANVAS_FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`連打 ${note.targetCount}回`, bodyX + bodyW / 2, noteY + 1);
          ctx.fillStyle = "#171717";
          ctx.beginPath();
          ctx.roundRect(endX - 18, noteY - 20, 36, 12, 3);
          ctx.fill();
          ctx.fillStyle = "#fff7d2";
          ctx.font = `600 10px ${CANVAS_FONT}`;
          ctx.fillText("終", endX, noteY - 13);
          continue;
        }
        if (note.type === "hold") {
          const endX = trackXForTime(holdEndTime);
          const isActiveHold = state.hold?.index === i;
          const releaseRemainingMs = holdEndTime - state.battleTimeMs;
          const releaseUrgent = isActiveHold && releaseRemainingMs <= 360;
          const bodyX = Math.min(noteX, endX);
          const bodyW = Math.max(24, Math.abs(endX - noteX));
          const bodyGradient = ctx.createLinearGradient(bodyX, noteY, bodyX + bodyW, noteY);
          bodyGradient.addColorStop(0, isActiveHold ? "rgba(255, 247, 210, 0.7)" : "rgba(227, 191, 85, 0.48)");
          bodyGradient.addColorStop(1, isActiveHold ? "rgba(227, 191, 85, 0.36)" : "rgba(227, 191, 85, 0.24)");
          ctx.fillStyle = bodyGradient;
          ctx.fillRect(bodyX, noteY - 10, bodyW, 20);
          ctx.strokeStyle = isActiveHold ? "#fff7d2" : "rgba(255, 247, 210, 0.5)";
          ctx.lineWidth = isActiveHold ? 3 : 2;
          ctx.strokeRect(bodyX, noteY - 10, bodyW, 20);

          ctx.fillStyle = releaseUrgent ? "#ef5b4f" : "#fff7d2";
          ctx.strokeStyle = "#171717";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(endX - 30, noteY - 13, 60, 26, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = releaseUrgent ? "#fff7d2" : "#171717";
          ctx.font = `600 13px ${CANVAS_FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("離す", endX, noteY + 1);

          if (isActiveHold) {
            ctx.save();
            const pulseAlpha = state.reducedMotion ? 0.88 : 0.62 + Math.sin(state.elapsed / 90) * 0.2;
            ctx.globalAlpha = Math.max(0.35, pulseAlpha);
            ctx.strokeStyle = releaseUrgent ? "#ef5b4f" : "#fff7d2";
            ctx.lineWidth = releaseUrgent ? 4 : 3;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(endX, stripY + 14);
            ctx.lineTo(endX, stripY + stripH - 14);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = releaseUrgent ? "#ef5b4f" : "rgba(255, 247, 210, 0.94)";
            ctx.beginPath();
            ctx.roundRect(Math.min(stripX + stripW - 78, endX + 14), noteY - 41, 64, 28, 6);
            ctx.fill();
            ctx.fillStyle = releaseUrgent ? "#fff7d2" : "#171717";
            ctx.font = `600 14px ${CANVAS_FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(releaseUrgent ? "離す!" : "離す", Math.min(stripX + stripW - 46, endX + 46), noteY - 27);
            ctx.restore();
          }
        }
        ctx.fillStyle = color;
        ctx.strokeStyle = "#171717";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(noteX - tokenW / 2, noteY - tokenH / 2, tokenW, tokenH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = note.type === "mash" ? "#fff" : "#171717";
        ctx.font = `600 ${note.type === "tap" ? 15 : 13}px ${CANVAS_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(noteBlockLabel(note), noteX, noteY + 1);
      }
      ctx.restore();
    }

    const langCanvas = normalizeLang(state.uiLang);
    const denseGap = nextTapGapMs();
    const label =
      openingMs > 0
        ? "構えて待つ"
      : state.mashFeedback
          ? `連打 ${state.mashFeedback.count}/${state.mashFeedback.targetCount}`
      : state.hold
          ? "長押し中。白い「離す」が金の線に来たら離す"
        : next?.type === "hold"
          ? "金の「長押」で押し続け、白い「離す」で離す"
        : next?.type === "mash"
            ? t(langCanvas, "sync.inputMash")
        : next?.type === "tap" && denseGap != null && denseGap < 300
              ? t(langCanvas, "sync.inputTapDense")
              : "金の線に来たらタップ";
    if (showRhythmGuide || state.mashFeedback) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#171717";
      ctx.font = `600 17px ${CANVAS_FONT}`;
      ctx.fillText(label, stripX + stripW / 2, panelY + panelH - 16);
    }

    if (state.mashFeedback) {
      const feedback = state.mashFeedback;
      const progress = Math.max(0, Math.min(1, feedback.count / Math.max(1, feedback.targetCount)));
      const alpha = Math.min(1, feedback.life / 140);
      const badgeW = 184;
      const badgeH = 42;
      const badgeX = stripX + stripW - badgeW - 18;
      const badgeY = panelY + panelH - 62;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = progress >= 1 ? "#f6d95f" : "#ef5b4f";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 7);
      ctx.fill();
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#171717";
      ctx.fillRect(badgeX + 12, badgeY + badgeH - 12, (badgeW - 24) * progress, 5);
      ctx.fillStyle = progress >= 1 ? "#171717" : "#fff7d2";
      ctx.font = `600 19px ${CANVAS_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`連打 ${feedback.count}/${feedback.targetCount}`, badgeX + badgeW / 2, badgeY + 20);
      ctx.restore();
    }

    if (openingMs > 0) {
      ctx.fillStyle = "rgba(23, 23, 23, 0.78)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 160, 94, 320, 86, 22);
      ctx.fill();
      ctx.fillStyle = "#fff7d2";
      ctx.textAlign = "center";
      ctx.font = `600 26px ${CANVAS_FONT}`;
      ctx.fillText("開幕の構え", W / 2, 137);
    }
    ctx.restore();
  }

  function drawEndingRhythmBar(targetCanvas, bonus) {
    if (!targetCanvas || !bonus) return;
    const targetCtx = targetCanvas.getContext("2d");
    if (!targetCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cssW = 960;
    const cssH = 170;
    const next = bonus.hold ? bonus.hold.note : bonus.noteStates?.[bonus.nextIndex]?.note;
    const timeMs = bonus.timeMs ?? 0;
    if (targetCanvas.width !== Math.round(cssW * dpr) || targetCanvas.height !== Math.round(cssH * dpr)) {
      targetCanvas.width = Math.round(cssW * dpr);
      targetCanvas.height = Math.round(cssH * dpr);
    }
    targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    targetCtx.clearRect(0, 0, cssW, cssH);
    targetCtx.imageSmoothingEnabled = false;

    const previousCtx = ctx;
    const previousState = {
      phase: state.phase,
      nextNote: state.nextNote,
      stageIndex: state.stageIndex,
      battleTimeMs: state.battleTimeMs,
      noteStates: state.noteStates,
      nextUnresolvedIndex: state.nextUnresolvedIndex,
      hold: state.hold,
      mashFeedback: state.mashFeedback,
      inputHint: state.inputHint,
    };
    state.phase = "battle";
    state.nextNote = next;
    state.stageIndex = 1;
    state.battleTimeMs = timeMs;
    state.noteStates = bonus.noteStates ?? [];
    state.nextUnresolvedIndex = bonus.nextIndex ?? 0;
    state.hold = bonus.hold ? { index: bonus.hold.index } : null;
    state.mashFeedback = null;
    state.inputHint = bonus.lastJudge ?? "金の線に来たらタップ";
    ctx = targetCtx;
    targetCtx.save();
    targetCtx.translate(0, -352);
    drawCanvasRhythmBar();
    targetCtx.restore();
    ctx = previousCtx;
    Object.assign(state, previousState);
  }

  function isDoodleLoopScreen() {
    return ENABLE_WEB_DOODLE_LOOP_SCREEN && normalizeLoop(state.runLoop) >= 2 && ["intro", "battle", "rest", "finalReveal"].includes(state.phase);
  }

  function doodleNoise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function doodleLine(points, color = "#111", width = 3, seed = 1, wobble = 3) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const ox = (doodleNoise(seed + index * 2.13) - 0.5) * wobble;
      const oy = (doodleNoise(seed + index * 3.71) - 0.5) * wobble;
      if (index === 0) ctx.moveTo(Math.round(x + ox), Math.round(y + oy));
      else ctx.lineTo(Math.round(x + ox), Math.round(y + oy));
    });
    ctx.stroke();
    ctx.restore();
  }

  function doodleCircle(x, y, rx, ry, color = "#111", width = 3, seed = 1) {
    const points = [];
    for (let i = 0; i <= 18; i += 1) {
      const a = (Math.PI * 2 * i) / 18;
      points.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
    }
    doodleLine(points, color, width, seed, 5);
  }

  function doodleText(text, x, y, size = 18, color = "#111", align = "center", seed = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (!state.reducedMotion) ctx.rotate((doodleNoise(seed) - 0.5) * 0.08);
    ctx.fillStyle = color;
    ctx.font = `${size}px "Comic Sans MS", "MS PGothic", ${CANVAS_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function drawDoodleBackground(stage) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-48, -48, W + 96, H + 96);
    ctx.fillStyle = "#f7f7f7";
    for (let y = 0; y < H; y += 12) {
      for (let x = 0; x < W; x += 12) {
        if (doodleNoise(x * 0.13 + y * 0.17 + stage.id.length) > 0.88) ctx.fillRect(x, y, 4, 4);
      }
    }
    doodleText(`${normalizeLoop(state.runLoop)}しゅうめ ${stage.title} たぶん`, 28, 30, 22, "#111", "left", 4);
    doodleLine([[0, 335], [128, 327], [280, 342], [466, 329], [650, 338], [822, 330], [960, 341]], "#2b2b2b", 4, 10, 10);
    doodleLine([[0, 382], [160, 376], [310, 391], [500, 379], [720, 389], [960, 377]], "#777", 2, 13, 12);

    const bgWord = stage.id === "warehouse" ? "そうこ?" : stage.id === "riverside" ? "どじょう" : stage.id === "garage" ? "くるま" : stage.id === "redgate" ? "あかいもん" : stage.id === "finalhideout" ? "Xのへや" : "こうえん";
    doodleText(bgWord, 762, 108, 24, "#333", "center", 18);
    doodleLine([[706, 92], [833, 96], [820, 136], [700, 128], [706, 92]], "#333", 3, 20, 8);

    for (let i = 0; i < 6; i += 1) {
      const x = 72 + i * 148;
      const h = 32 + (i % 3) * 18;
      doodleLine([[x, 332], [x + 20, 332 - h], [x + 48, 337], [x + 34, 334 - h / 2], [x, 332]], i % 2 ? "#b66" : "#6b8", 3, 40 + i, 9);
    }
    ctx.strokeStyle = "#d7d7d7";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDoodleHero(x, y, pose = 0) {
    const bob = state.reducedMotion ? 0 : Math.sin(state.elapsed / 210) * 2;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    doodleCircle(0, -126, 42, 52, "#111", 5, 51);
    doodleLine([[-16, -152], [-4, -136], [12, -151]], "#111", 3, 52, 4);
    doodleLine([[-15, -123], [-4, -119]], "#111", 3, 53, 3);
    doodleLine([[15, -123], [24, -119]], "#111", 3, 54, 3);
    doodleLine([[-5, -104], [18, -99], [27, -108]], "#a33", 3, 55, 4);
    doodleLine([[-36, -70], [-70, -30], [-54, 5], [-20, -48]], "#5b2a86", 10, 56, 8);
    doodleLine([[36, -70], [76, -45], [58, -18], [18, -48]], "#5b2a86", 10, 57, 8);
    doodleLine([[-34, -72], [0, -8], [34, -72], [42, 35], [-42, 35], [-34, -72]], "#5b2a86", 6, 58, 8);
    doodleLine([[-18, -70], [0, -8], [20, -70]], "#fff", 12, 59, 5);
    doodleLine([[-40, 38], [-46, 88], [-18, 88], [-12, 38]], "#111", 8, 60, 4);
    doodleLine([[40, 38], [46, 88], [18, 88], [12, 38]], "#111", 8, 61, 4);
    doodleLine([[-28, 2], [28, 2]], "#d9a72e", 5, 62, 4);
    doodleText("じじい", -6, -184, 18, "#111", "center", 64);
    if (state.phase === "battle" && pose) {
      doodleText("えい", 76, -118, 24, "#f00", "left", 65);
    }
    ctx.restore();
  }

  function drawDoodleEnemy(x, y, stage) {
    const hit = state.enemyHit > 0 ? -12 : 0;
    const bob = state.reducedMotion ? 0 : Math.sin(state.elapsed / 240 + 1.7) * 2;
    ctx.save();
    ctx.translate(Math.round(x + hit), Math.round(y + bob));
    const revealedFinalBoss = state.finalRevealUnmasked && stage.enemy.kind === "steroidBoss";
    if (revealedFinalBoss) {
      doodleCircle(0, -120, 38, 45, "#111", 5, 80);
      doodleLine([[-20, -148], [-6, -158], [12, -158], [28, -145]], "#666", 5, 81, 5);
      doodleLine([[-16, -126], [-5, -123]], "#111", 3, 82, 3);
      doodleLine([[11, -123], [23, -126]], "#111", 3, 83, 3);
      doodleLine([[-2, -105], [12, -100], [24, -108]], "#a33", 3, 84, 4);
      doodleLine([[-38, -78], [-55, -8], [-32, 42], [28, 42], [50, -8], [36, -78], [-38, -78]], "#6f5846", 7, 85, 10);
      doodleLine([[-55, -54], [-88, -28]], "#111", 7, 86, 7);
      doodleLine([[50, -50], [84, -20]], "#111", 7, 87, 7);
      doodleLine([[-24, 44], [-28, 88]], "#111", 8, 88, 5);
      doodleLine([[22, 44], [28, 88]], "#111", 8, 89, 5);
      doodleCircle(-86, 66, 30, 20, "#ddd", 4, 90);
      doodleLine([[-104, 50], [-122, 28], [-96, 40]], "#ddd", 4, 91, 5);
      doodleLine([[-72, 50], [-48, 30], [-62, 56]], "#ddd", 4, 92, 5);
      doodleText("はせがわ", -8, -184, 16, "#111", "center", 93);
      ctx.restore();
      return;
    }
    const color = stage.enemy.kind === "steroidBoss" ? "#7aa7ff" : stage.enemy.kind === "maskedHeavy" ? "#888" : "#222";
    doodleCircle(0, -120, 44, 44, color, 6, 80);
    doodleLine([[-42, -78], [-64, -12], [-30, 42], [34, 42], [62, -12], [38, -78], [-42, -78]], color, 7, 81, 10);
    doodleLine([[-18, -128], [-4, -120], [14, -128]], "#f3c24b", 5, 82, 5);
    doodleLine([[-54, -50], [-96, -22]], "#111", 7, 83, 7);
    doodleLine([[54, -50], [98, -30]], "#111", 7, 84, 7);
    doodleLine([[-26, 44], [-32, 88]], "#111", 8, 85, 5);
    doodleLine([[26, 44], [34, 88]], "#111", 8, 86, 5);
    doodleText(stage.enemy.name.replace("X結社 ", "").slice(0, 7), -10, -184, 16, "#111", "center", 87);
    if (state.enemyAttack) doodleText("なんか攻撃", -92, -98, 18, "#c00", "left", 88);
    ctx.restore();
  }

  function drawDoodleRhythmBar() {
    if (state.phase !== "battle") return;
    const panelX = 38;
    const panelY = 358;
    const panelW = W - 76;
    const panelH = 158;
    const hitX = panelX + panelW * 0.475;
    const laneY = panelY + 80;
    const markerRange = 2500;
    const trackXForTime = (timeMs) => hitX + ((timeMs - state.battleTimeMs) / markerRange) * (panelW * 0.66);

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    doodleLine([[panelX, panelY], [panelX + panelW, panelY + 4], [panelX + panelW - 5, panelY + panelH], [panelX + 4, panelY + panelH - 6], [panelX, panelY]], "#111", 4, 100, 9);
    doodleText("ここらへんで おす", hitX - 18, panelY + 28, 22, "#111", "center", 101);
    doodleLine([[panelX + 18, laneY], [panelX + panelW - 18, laneY + 8]], "#777", 5, 102, 7);
    doodleLine([[hitX, panelY + 18], [hitX - 6, panelY + panelH - 18]], "#f00", 5, 103, 5);

    for (let i = state.nextUnresolvedIndex; i < state.noteStates.length; i += 1) {
      const note = state.noteStates[i]?.note;
      if (!note) continue;
      const end = note.timeMs + (note.durationMs ?? 0);
      if (note.timeMs - state.battleTimeMs > markerRange || end - state.battleTimeMs < -220) continue;
      const x = trackXForTime(note.timeMs);
      if (x < panelX || x > panelX + panelW) continue;
      const label = note.type === "hold" ? "なが" : note.type === "mash" ? "れん" : "た";
      const fill = note.type === "hold" ? "#f7df6e" : note.type === "mash" ? "#ff7777" : "#d8f0ff";
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x - 18), Math.round(laneY - 17), 38, 28);
      doodleLine([[x - 18, laneY - 17], [x + 20, laneY - 14], [x + 16, laneY + 12], [x - 20, laneY + 10], [x - 18, laneY - 17]], "#111", 3, i + 120, 4);
      doodleText(label, x, laneY - 1, 16, "#111", "center", i + 180);
      if (note.type === "hold") {
        const endX = trackXForTime(end);
        doodleLine([[x + 21, laneY - 3], [endX, laneY - 3]], "#f7df6e", 8, i + 220, 4);
        doodleText("はなす", endX, laneY + 30, 13, "#111", "center", i + 240);
      }
    }
    doodleText(state.judgeText || "？？？", panelX + 24, panelY + panelH - 30, 18, "#111", "left", 280);
    ctx.restore();
  }

  function drawDoodleLoopScene(stage, heroX, heroY, enemyX, enemyY, heroPose = 0) {
    drawDoodleBackground(stage);
    drawDoodleHero(heroX, heroY, heroPose);
    drawDoodleEnemy(enemyX, enemyY, stage);
    if (state.phase === "battle") drawDoodleRhythmBar();
    drawEffects();
  }

  function drawMenuBackdrop() {
    ctx.save();
    ctx.fillStyle = "#17110d";
    ctx.fillRect(-48, -48, W + 96, H + 96);
    ctx.fillStyle = "rgba(255, 236, 170, 0.08)";
    ctx.fillRect(0, Math.round(H * 0.68), W, Math.round(H * 0.32));
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    for (let y = 0; y < H; y += 18) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();
  }

  function draw() {
    const stage = state.stage;
    const travelRatio = state.stageIndex * 0.25;
    const shake = state.reducedMotion ? 0 : state.shake;
    const idleBob = (phase = 0, amplitude = 1.5) => {
      if (state.reducedMotion) return 0;
      const t = state.elapsed / 520 + phase;
      return Math.sin(t) * amplitude + Math.sin(t * 2 + 0.7) * amplitude * 0.18;
    };
    ctx.save();
    ctx.translate(shake ? (Math.random() - 0.5) * shake : 0, shake ? (Math.random() - 0.5) * shake : 0);

    if (state.phase === "opening" || state.phase === "title") {
      drawMenuBackdrop();
      ctx.restore();
      return;
    }

    const walk = state.reducedMotion ? 0 : Math.sin(state.elapsed / 140) * 3;
    const heroBattleBob = idleBob(0.05, 3.0);
    const enemyBattleBob = idleBob(2.15, 2.8);
    const novelScene = state.phase === "intro" || state.phase === "finalReveal";
    const heroIntroBob = novelScene ? idleBob(0.05, 3.4) : 0;
    const enemyIntroBob = novelScene ? idleBob(2.15, 3.2) : 0;
    const heroStrikePulse = state.phase === "battle" ? motionPulse(state.heroStrike) : 0;
    const enemyAttackPulse = state.phase === "battle" ? motionPulse(state.enemyAttack) : 0;
    const heroGuardPulse = state.phase === "battle" ? motionPulse(state.heroGuard) : 0;
    const combatHeroAdvance = state.reducedMotion ? 0 : heroStrikePulse * (state.heroStrike?.heavy ? 48 : 34);
    const combatEnemyAdvance = state.reducedMotion ? 0 : -enemyAttackPulse * (state.enemyAttack?.pressure ? 18 : 46);
    let heroX = novelScene ? 270 : 244;
    const portraitScale = novelScene ? 1.32 : 1.22;
    const sharedFootLineY = novelScene ? 336 : 334;
    const enemyY = sharedFootLineY + (novelScene ? enemyIntroBob : state.phase === "battle" ? enemyBattleBob : 0);
    const heroY = sharedFootLineY + (novelScene ? heroIntroBob : state.phase === "battle" ? heroBattleBob : walk);
    let enemyX =
      state.phase === "battle"
        ? 686
        : novelScene
          ? 704
          : 820 - travelRatio * 160;
    if (state.phase === "battle") {
      heroX += combatHeroAdvance - (state.reducedMotion ? 0 : heroGuardPulse * 5);
      enemyX += combatEnemyAdvance;
    }

    if (isDoodleLoopScreen()) {
      drawDoodleLoopScene(stage, heroX, heroY, enemyX, enemyY, walk);
      ctx.restore();
      return;
    }

    drawBackground(stage, travelRatio);
    drawDuelLighting(stage);

    const shadowY = sharedFootLineY + 5;
    drawGroundShadow(heroX, shadowY, novelScene ? 82 : 72, novelScene ? 13 : 11, 0.24);
    drawGroundShadow(enemyX, shadowY, novelScene ? 76 : 66, novelScene ? 12 : 10, 0.24);
    drawCharacter(heroX, heroY, HERO_PALETTE, 1, walk, true, 0, "hero", portraitScale);

    const revealedFinalBoss = state.finalRevealUnmasked && stage.enemy.kind === "steroidBoss";
    drawCharacter(enemyX, enemyY, {
      coat: revealedFinalBoss ? "#f5f0dc" : stage.enemy.coat ?? "#24384d",
      face: "#c28a62",
      hat: revealedFinalBoss ? "#6f5846" : "#111827",
      accent: revealedFinalBoss ? "#7a3f2c" : stage.enemy.accent ?? "#7fb0d6",
    }, -1, -walk, false, state.enemyHit, revealedFinalBoss ? "hasegawaReveal" : stage.enemy.kind, portraitScale);
    drawCombatMotion(heroX, heroY, enemyX, enemyY);
    drawHitBurst(enemyX, enemyY);

    drawPetals();
    drawFocusEffect();
    drawCanvasRhythmBar();
    drawEffects();
    drawSpecialCutin();
    ctx.restore();
  }

  function syncDom(dom) {
    const cache = syncDom.cache ?? (syncDom.cache = new WeakMap());
    const stateFor = (el) => {
      let item = cache.get(el);
      if (!item) {
        item = {};
        cache.set(el, item);
      }
      return item;
    };
    const setCached = (el, key, value, apply, force = false) => {
      if (!el) return;
      const item = stateFor(el);
      if (!force && item[key] === value) return;
      item[key] = value;
      apply(el, value);
    };
    const setText = (el, value, force = false) => setCached(el, "text", String(value), (node, next) => {
      node.textContent = next;
    }, force);
    const setData = (el, key, value, force = false) => setCached(el, `data:${key}`, String(value), (node, next) => {
      node.dataset[key] = next;
    }, force);
    const setHidden = (el, value, force = false) => setCached(el, "hidden", Boolean(value), (node, next) => {
      node.hidden = next;
    }, force);
    const setStyle = (el, key, value, force = false) => setCached(el, `style:${key}`, String(value), (node, next) => {
      node.style[key] = next;
    }, force);
    const setClass = (el, name, value, force = false) => setCached(el, `class:${name}`, Boolean(value), (node, next) => {
      node.classList.toggle(name, next);
    }, force);

    return syncDomInner(dom, {
      setClass,
      setData,
      setHidden,
      setStyle,
      setText,
    });
  }

  function syncDomInner(dom, ui) {
    const lang = normalizeLang(state.uiLang);
    const next = state.phase === "battle" ? state.nextNote : null;
    ui.setData(document.documentElement, "phase", state.phase);
    const currentLoop =
      (state.phase === "ending" || state.phase === "results") && state.results?.loop
        ? normalizeLoop(state.results.loop)
        : normalizeLoop(state.runLoop);
    const doodleLoopUi = ENABLE_WEB_DOODLE_LOOP_SCREEN && currentLoop >= 2 && ["intro", "battle", "rest", "finalReveal"].includes(state.phase);
    ui.setClass(document.documentElement, "doodle-loop", doodleLoopUi);
    const loopPart = currentLoop > 1 ? ` / ${loopLabel(currentLoop)}` : "";
    ui.setText(dom.stageLabel, `${state.stage.title} / ${DIFFICULTY_LABELS[state.difficulty] ?? "ノーマル"}${loopPart}`);
    ui.setText(dom.scoreLabel, String(state.totalScore));
    if (dom.phaseBadge) {
      ui.setText(dom.phaseBadge, phaseBadgeLabel(lang, state.phase));
      ui.setData(dom.phaseBadge, "phase", state.phase);
    }
    if (dom.pauseButton) {
      ui.setHidden(dom.pauseButton, state.phase !== "battle" || state.paused);
    }
    ui.setClass(dom.gameSurface, "hasPauseButton", state.phase === "battle" && !state.paused);
    if (dom.quickSaveButton) {
      ui.setHidden(dom.quickSaveButton, state.phase === "opening" || state.phase === "title" || state.paused);
    }
    ui.setClass(dom.gameSurface, "novelActive", (state.phase === "intro" || state.phase === "finalReveal") && !dom.overlay.classList.contains("hidden"));
    const openingMs = state.phase === "battle" ? Math.max(0, -state.battleTimeMs) : 0;
    ui.setText(dom.modeLabel, openingMs > 0 ? t(lang, "sync.openingMode") : state.phaseLabel);
    ui.setText(dom.nextNoteLabel, nextNoteLabel(next));
    ui.setText(dom.judgeLabel, state.judgeText);
    ui.setStyle(dom.hpMeter, "width", `${Math.max(0, state.hp / state.maxHp) * 100}%`);
    if (dom.enemyHpMeter && state.enemyMaxHp > 0) {
      ui.setStyle(dom.enemyHpMeter, "width", `${Math.max(0, Math.min(1, state.enemyHp / state.enemyMaxHp)) * 100}%`);
    } else if (dom.enemyHpMeter) {
      ui.setStyle(dom.enemyHpMeter, "width", "0%");
    }
    ui.setStyle(dom.spiritMeter, "width", `${Math.max(0, Math.min(100, state.spirit))}%`);
    if (dom.spiritLabel) {
      const focusSeconds = state.spiritFocusMs > 0 ? Math.ceil(state.spiritFocusMs / 1000) : 0;
      ui.setText(dom.spiritLabel, focusSeconds > 0 ? `見切り ${focusSeconds}s` : t(lang, "hud.spirit"));
    }
    if (dom.playerHpValue) {
      ui.setText(dom.playerHpValue, `${Math.max(0, Math.round(state.hp))} / ${Math.max(0, Math.round(state.maxHp))}`);
    }
    if (dom.enemyHpValue) {
      ui.setText(dom.enemyHpValue, `${Math.max(0, Math.round(state.enemyHp))} / ${Math.max(0, Math.round(state.enemyMaxHp))}`);
    }
    if (dom.enemyNameLabel) {
      const enemyName = state.stage?.enemy?.name ?? t(lang, "hud.enemyFallback");
      const comboPart = state.phase === "battle" && state.combo > 0 ? ` ${state.combo}連` : "";
      ui.setText(dom.enemyNameLabel, `${enemyName}${comboPart}`);
    }
    const syncHtmlRhythm = Boolean(dom.inputZone?.offsetParent || dom.beatFill?.offsetParent || dom.timingReadout?.offsetParent);
    if (!syncHtmlRhythm) return;
    const markerRange = 2500;
    if (next) {
      const dt = next.timeMs - state.battleTimeMs;
      const fill = ((markerRange - Math.max(0, dt)) / markerRange) * 100;
      ui.setStyle(dom.beatFill, "width", `${Math.max(0, Math.min(100, fill))}%`);
    } else {
      ui.setStyle(dom.beatFill, "width", "0");
    }
    if (dom.noteMarker) {
      if (next) {
        const dt = next.timeMs - state.battleTimeMs;
        const left = Math.max(4, Math.min(96, 50 + (dt / markerRange) * 46));
        ui.setHidden(dom.noteMarker, false);
        ui.setStyle(dom.noteMarker, "left", `${left}%`);
        ui.setText(dom.noteMarker, nextNoteLabel(next).slice(0, 1));
        ui.setData(dom.noteMarker, "type", next.type);
      } else {
        ui.setHidden(dom.noteMarker, true);
      }
    }
    ui.setData(dom.inputZone, "note", next?.type ?? state.phase);
    ui.setText(dom.inputIcon, next ? nextNoteLabel(next).slice(0, 1) : "拍");
    if (dom.timingReadout) {
      if (state.comfortHud && next && state.phase === "battle" && state.battleClockReady) {
        const dt = next.timeMs - state.battleTimeMs;
        ui.setHidden(dom.timingReadout, false);
        ui.setText(dom.timingReadout, `${t(lang, "timing.nextMs")} ${Math.round(dt)}ms`);
      } else {
        ui.setHidden(dom.timingReadout, true);
        ui.setText(dom.timingReadout, t(lang, "timing.na"));
      }
    }
    if (openingMs > 0) {
      ui.setText(dom.inputText, t(lang, "sync.openingInput"));
      ui.setText(dom.judgeLabel, t(lang, "sync.openingJudge"));
    } else if (next?.type === "tap") {
      ui.setText(dom.inputText, t(lang, "sync.inputTap"));
      const gap = nextTapGapMs();
      ui.setText(
        dom.judgeLabel,
        gap != null && gap < 300 ? `${t(lang, "sync.inputTapDense")} / ${t(lang, "sync.judgeTapBar")}` : t(lang, "sync.judgeTapBar"),
      );
    } else if (next?.type === "hold") {
      ui.setText(dom.inputText, t(lang, "sync.inputHold"));
      ui.setText(dom.judgeLabel, t(lang, "sync.judgeHoldLong"));
    } else if (next?.type === "mash") {
      ui.setText(dom.inputText, t(lang, "sync.inputMash"));
      ui.setText(dom.judgeLabel, t(lang, "sync.judgeMash"));
    } else {
      ui.setText(dom.inputText, state.inputHint);
    }
  }

  return { draw, drawEndingRhythmBar, preloadCutinImage: requestCutinImage, retainStageBackgrounds, syncDom };
}
