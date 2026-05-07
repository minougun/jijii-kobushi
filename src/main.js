import { createAudioEngine } from "./audio.js?v=20260430-1125";
import { createRenderer } from "./renderer.js?v=20260504-centerlayout2";
import {
  DIFFICULTIES,
  STAGES,
  damageScaleForDifficulty,
  getEnemyHp,
  getStage,
  getStageChart,
  loopEnemyAttackMultiplier,
  loopEnemyHpMultiplier,
  loopLabel,
  loopPlayerDamageMultiplier,
  normalizeLoop,
  nextNoteLabel,
} from "./stages.js?v=20260504-stage3bgm1";
import { normalizeLang, t } from "./i18n.js?v=20260504-openingcopy1";
import {
  ENDING_BONUS_FALLBACK_DURATION_MS,
  createEndingBonusChart,
  endingBonusDifficultyConfig,
  endingBonusScoreValue,
} from "./ending-bonus.js?v=20260502-1315";
import {
  MASH_INPUT_GRACE_MS,
  SPIRIT_FOCUS_DURATION_MS,
  SPIRIT_FOCUS_WINDOW_BONUS_MS,
  WINDOWS_MS,
  calculateStageScore,
  judgeHold,
  judgeMash,
  judgeTap,
  mashStrikeMultiplier,
  comboBonusDamage,
  comboHitMultiplier,
  finisherBonusDamage,
  noteDamage,
  noteSpirit,
  rankScore,
} from "./rhythm.js?v=20260430-1532";

const STORAGE_KEY = "jiiKobushi:v1";
const RUN_SAVE_SLOTS = {
  firstLoop: "firstLoop",
  loopPlus: "loopPlus",
};
const CANVAS_FONT_READY_TIMEOUT_MS = 1800;
const QUICK_SAVE_LOCK_MS = 1400;
const LOGICAL_CANVAS_WIDTH = 960;
const LOGICAL_CANVAS_HEIGHT = 540;
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const settingsRoot = document.querySelector(".settings");

const dom = {
  shell: document.querySelector(".shell"),
  gameSurface: document.querySelector(".gameSurface"),
  hpMeter: document.querySelector("#hpMeter"),
  enemyHpMeter: document.querySelector("#enemyHpMeter"),
  spiritMeter: document.querySelector("#spiritMeter"),
  playerHpLabel: document.querySelector("#playerHpLabel"),
  playerHpValue: document.querySelector("#playerHpValue"),
  enemyNameLabel: document.querySelector("#enemyNameLabel"),
  enemyHpValue: document.querySelector("#enemyHpValue"),
  spiritLabel: document.querySelector("#spiritLabel"),
  stageLabel: document.querySelector("#stageLabel"),
  scoreLabel: document.querySelector("#scoreLabel"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector(".overlayKicker"),
  openingArtwork: document.querySelector("#openingArtwork"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  srGameNarration: document.querySelector("#srGameNarration"),
  srJudgeStatus: document.querySelector("#srJudgeStatus"),
  resultSummary: document.querySelector("#resultSummary"),
  difficultySelect: document.querySelector("#difficultySelect"),
  primaryButton: document.querySelector("#primaryButton"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  openHelpButton: document.querySelector("#openHelpButton"),
  skipButton: document.querySelector("#skipButton"),
  quickSaveButton: document.querySelector("#quickSaveButton"),
  pauseButton: document.querySelector("#pauseButton"),
  pauseMenu: document.querySelector("#pauseMenu"),
  endingVideoLayer: document.querySelector("#endingVideoLayer"),
  endingVideo: document.querySelector("#endingVideo"),
  endingVideoStatus: document.querySelector("#endingVideoStatus"),
  endingVideoSkip: document.querySelector("#endingVideoSkip"),
  endingVideoChrome: document.querySelector(".endingVideoChrome"),
  endingBonusPanel: document.querySelector("#endingBonusPanel"),
  pauseTitle: document.querySelector("#pauseTitle"),
  pauseText: document.querySelector("#pauseText"),
  resumeButton: document.querySelector("#resumeButton"),
  pauseOffsetButton: document.querySelector("#pauseOffsetButton"),
  pauseHelpButton: document.querySelector("#pauseHelpButton"),
  pauseSettingsButton: document.querySelector("#pauseSettingsButton"),
  saveRunButton: document.querySelector("#saveRunButton"),
  returnTitleButton: document.querySelector("#returnTitleButton"),
  titleSaveSlots: document.querySelector("#titleSaveSlots"),
  loadFirstButton: document.querySelector("#loadFirstButton"),
  loadLoopPlusButton: document.querySelector("#loadLoopPlusButton"),
  pauseLoadFirstButton: document.querySelector("#pauseLoadFirstButton"),
  pauseLoadLoopPlusButton: document.querySelector("#pauseLoadLoopPlusButton"),
  muteButton: document.querySelector("#muteButton"),
  offsetRange: document.querySelector("#offsetRange"),
  offsetLabel: document.querySelector("#offsetLabel"),
  motionButton: document.querySelector("#motionButton"),
  resetButton: document.querySelector("#resetButton"),
  phaseBadge: document.querySelector("#phaseBadge"),
  langJaButton: document.querySelector("#langJaButton"),
  langEnButton: document.querySelector("#langEnButton"),
  portraitHint: document.querySelector("#portraitHint"),
  portraitDismiss: document.querySelector("#portraitDismiss"),
  mobileTapPad: document.querySelector("#mobileTapPad"),
  helpGuide: document.querySelector("#helpGuide"),
  settingsRoot,
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let nativeReducedMotion = reducedMotionQuery.matches;
const audio = createAudioEngine();
let quickSaveFeedbackTimer = 0;
let quickSaveLockedUntil = 0;
const INPUT_GRACE_MS = WINDOWS_MS.bad + 60;
const COUNT_IN_LEAD_SECONDS = 3.0;
const DEFAULT_DIFFICULTY = "normal";
const PLAYER_MAX_HP = 12;
const MOBILE_DPR_CAP = 1.35;
const DESKTOP_DPR_CAP = 1.5;
const STATIC_RENDER_INTERVAL_MS = 250;
const INTRO_RENDER_INTERVAL_MS = 1000 / 15;
const MOBILE_BATTLE_RENDER_INTERVAL_MS = 1000 / 60;
const DESKTOP_BATTLE_RENDER_INTERVAL_MS = 1000 / 60;
const REDUCED_BATTLE_RENDER_INTERVAL_MS = 1000 / 30;
const RENDER_INTERVAL_EPSILON_MS = 0.75;
const ENDING_VIDEO_FIRST_LOOP_SRC = "./assets/video/ending.mp4?v=20260504-anime1";
const ENDING_VIDEO_LOOP_PLUS_SRC = "./assets/video/ending-loop2.mp4?v=20260504-doodle-readable2-lite1";
const ENDING_BONUS_CLOCK_RESET_MS = 240;
const ENDING_BONUS_CLOCK_PULL = 0.16;
let stateReady = false;

function storageFailureMessage(action, lang = "ja") {
  if (lang === "en") {
    if (action === "remove") return "Could not delete saved data. The game can continue.";
    if (action === "load") return "Could not read saved data. Starting without it.";
    return "Could not save. The game can continue.";
  }
  if (action === "remove") return "記録を削除できませんでした。ゲームは続行できます。";
  if (action === "load") return "保存データを読めませんでした。初期状態で続行します。";
  return "保存できませんでした。ゲームは続行できます。";
}

function currentStorageLang() {
  return stateReady ? normalizeLang(state.uiLang) : "ja";
}

function notifyStorageFailure(action, error) {
  const lang = currentStorageLang();
  const message = storageFailureMessage(action, lang);
  console.warn(`[storage] ${action} failed`, error);
  syncSrJudge(message);
  if (stateReady) {
    state.judgeText = message;
    requestRender();
  }
  return message;
}

function safeGetStorage(key, action = "load") {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    notifyStorageFailure(action, error);
    return null;
  }
}

function safeSetStorage(key, value, action = "save") {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    notifyStorageFailure(action, error);
    return false;
  }
}

function safeRemoveStorage(key, action = "remove") {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    notifyStorageFailure(action, error);
    return false;
  }
}

function loadSave() {
  try {
    const raw = safeGetStorage(STORAGE_KEY, "load");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === 1 ? parsed : null;
  } catch (error) {
    notifyStorageFailure("load", error);
    return null;
  }
}

let battleSession = 0;
let renderDirty = true;
let lastRenderAt = 0;
let lastSrNarration = "";
let lastSrJudge = "";
const focusTrapState = {
  element: null,
  previous: null,
};
const saved = loadSave();

function setSrText(element, text, cacheName) {
  if (!element) return;
  const normalized = String(text ?? "").trim();
  if (!normalized) return;
  if (cacheName === "judge") {
    if (lastSrJudge === normalized) return;
    lastSrJudge = normalized;
  } else {
    if (lastSrNarration === normalized) return;
    lastSrNarration = normalized;
  }
  element.textContent = normalized;
}

function syncSrJudge(text = state.judgeText) {
  setSrText(dom.srJudgeStatus, text, "judge");
}

function syncSrNarration(text) {
  setSrText(dom.srGameNarration, text, "narration");
}

function focusableElements(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => element.offsetParent !== null || element === document.activeElement);
}

function handleFocusTrapKeydown(event) {
  if (event.key !== "Tab" || !focusTrapState.element) return;
  const focusable = focusableElements(focusTrapState.element);
  if (!focusable.length) {
    event.preventDefault();
    focusTrapState.element.focus?.();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setFocusTrap(element, active) {
  if (!element) return;
  if (active) {
    if (focusTrapState.element === element) return;
    setFocusTrap(focusTrapState.element, false);
    focusTrapState.element = element;
    focusTrapState.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.addEventListener("keydown", handleFocusTrapKeydown);
    window.setTimeout(() => {
      const first = focusableElements(element)[0];
      (first ?? element).focus?.();
    }, 0);
    return;
  }
  if (focusTrapState.element !== element) return;
  element.removeEventListener("keydown", handleFocusTrapKeydown);
  const previous = focusTrapState.previous;
  focusTrapState.element = null;
  focusTrapState.previous = null;
  if (previous && document.contains(previous)) previous.focus?.();
}

function loadRunLoops(savedData) {
  const fallback = normalizeLoop(savedData?.runLoop);
  return Object.fromEntries(
    Object.keys(DIFFICULTIES).map((difficulty) => [difficulty, normalizeLoop(savedData?.runLoops?.[difficulty] ?? fallback)]),
  );
}

function loadRunSaves(savedData) {
  return {
    firstLoop: savedData?.runSaves?.firstLoop ?? null,
    loopPlus: savedData?.runSaves?.loopPlus ?? null,
  };
}

const state = {
  phase: "opening",
  phaseLabel: "開幕",
  elapsed: 0,
  phaseStartedAt: performance.now(),
  phaseElapsed: 0,
  stageIndex: 0,
  stage: getStage(0),
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  spirit: 0,
  totalScore: 0,
  stageScores: [],
  enemyHp: getStage(0).enemy.hp,
  enemyMaxHp: getStage(0).enemy.hp,
  damageScale: 1,
  battleStartAt: 0,
  battleTimeMs: -1,
  battleClockReady: false,
  bgmDriftMs: 0,
  bgmCorrectionMs: 0,
  paused: false,
  pausedAt: 0,
  pausedPhaseStartedAt: 0,
  noteStates: [],
  nextUnresolvedIndex: 0,
  resolvedNoteCount: 0,
  nextNote: null,
  hold: null,
  spaceHeld: false,
  combo: 0,
  maxCombo: 0,
  comboBonusDamage: 0,
  spiritFocusMs: 0,
  spiritFocusCount: 0,
  spiritGuardCharges: 0,
  spiritGuardUsedCount: 0,
  stageClearedByHp: false,
  specialCutin: null,
  mashFeedback: null,
  focusEffect: null,
  heroStrike: null,
  enemyAttack: null,
  heroGuard: null,
  enemyHit: 0,
  lastEnemyCueIndex: -1,
  petals: [],
  judgeText: "合図を聞いて拍に乗る",
  inputHint: "ノーツが判定線に重なったら押す",
  effects: [],
  shake: 0,
  audioEnabled: saved?.settings?.audioEnabled ?? true,
  inputOffsetMs: saved?.settings?.inputOffsetMs ?? 0,
  reducedMotionOverride: saved?.settings?.reducedMotionOverride ?? "auto",
  difficulty: DIFFICULTIES[saved?.settings?.difficulty] ? saved.settings.difficulty : DEFAULT_DIFFICULTY,
  runLoops: loadRunLoops(saved),
  runLoop: normalizeLoop(loadRunLoops(saved)[DIFFICULTIES[saved?.settings?.difficulty] ? saved.settings.difficulty : DEFAULT_DIFFICULTY]),
  uiLang: normalizeLang(saved?.settings?.uiLang),
  portraitHintDismissed: Boolean(saved?.settings?.portraitHintDismissed),
  bestScores: saved?.bestScores ?? {},
  clearedStages: saved?.clearedStages ?? [],
  runSaves: loadRunSaves(saved),
  lineIndex: 0,
  overlaySpeaker: "",
  results: null,
  finalRevealUnmasked: false,
  endingBonus: null,
  pixelRatio: 1,
};
stateReady = true;

function requestRender() {
  renderDirty = true;
}

function isMobileLikeViewport() {
  return window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
}

function resetNoteProgress() {
  state.nextUnresolvedIndex = 0;
  state.resolvedNoteCount = 0;
  state.nextNote = state.noteStates[0]?.note ?? null;
}

function advanceNoteCursor() {
  while (state.nextUnresolvedIndex < state.noteStates.length && state.noteStates[state.nextUnresolvedIndex]?.resolved) {
    state.nextUnresolvedIndex += 1;
  }
  state.nextNote = state.noteStates[state.nextUnresolvedIndex]?.note ?? null;
  return state.nextUnresolvedIndex;
}

function isReducedMotion() {
  if (state.reducedMotionOverride === "on") return true;
  if (state.reducedMotionOverride === "off") return false;
  return nativeReducedMotion;
}

Object.defineProperty(state, "reducedMotion", { get: isReducedMotion });

function resizeCanvasForDpr() {
  const mobileLike = isMobileLikeViewport();
  const dprCap = mobileLike ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP;
  const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
  const width = Math.round(LOGICAL_CANVAS_WIDTH * dpr);
  const height = Math.round(LOGICAL_CANVAS_HEIGHT * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    requestRender();
  }
  state.pixelRatio = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

resizeCanvasForDpr();
const renderer = createRenderer(canvas, ctx, state);

function preloadStageVisuals(stageIndex = state.stageIndex) {
  const ids = [getStage(stageIndex)?.id, getStage(stageIndex + 1)?.id].filter(Boolean);
  renderer.preloadCutinImage?.();
  renderer.retainStageBackgrounds(ids);
}
preloadStageVisuals(0);

function refreshTitleOverlay() {
  if (state.phase !== "title") return;
  const lang = normalizeLang(state.uiLang);
  const hasRunSave = Boolean(state.runSaves.firstLoop || state.runSaves.loopPlus);
  setOverlay(
    true,
    t(lang, "overlay.openingTitle"),
    t(lang, "overlay.titleBoot"),
    hasRunSave ? (lang === "en" ? "New game" : "ニューゲーム") : lang === "en" ? "Start game" : "ゲーム開始",
  );
}

function refreshOpeningOverlay() {
  if (state.phase !== "opening") return;
  const lang = normalizeLang(state.uiLang);
  setOverlay(true, t(lang, "overlay.openingTitle"), t(lang, "overlay.openingBody"), t(lang, "overlay.openingAction"));
}

function updatePortraitHint() {
  if (!dom.portraitHint) return;
  const shouldShow =
    !state.portraitHintDismissed &&
    window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches &&
    !window.matchMedia("(display-mode: fullscreen)").matches;
  dom.portraitHint.hidden = !shouldShow;
  requestRender();
}

function syncViewportVars() {
  document.documentElement.style.setProperty("--app-vw", `${window.innerWidth}px`);
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
}

function requestLandscapeOrientation() {
  const phoneLike = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
  const lock = window.screen?.orientation?.lock;
  if (!phoneLike || typeof lock !== "function") return;
  lock.call(window.screen.orientation, "landscape").catch(() => {
  });
}

function save() {
  const payload = JSON.stringify({
    version: 1,
    runLoop: normalizeLoop(state.runLoop),
    runLoops: state.runLoops,
    runSaves: state.runSaves,
    clearedStages: state.clearedStages,
    bestScores: state.bestScores,
    settings: {
      audioEnabled: state.audioEnabled,
      inputOffsetMs: state.inputOffsetMs,
      reducedMotionOverride: state.reducedMotionOverride,
      difficulty: state.difficulty,
      uiLang: state.uiLang,
      portraitHintDismissed: state.portraitHintDismissed,
    },
  });
  return safeSetStorage(STORAGE_KEY, payload, "save");
}

function runSaveSlotForLoop(loop = state.runLoop) {
  return normalizeLoop(loop) === 1 ? RUN_SAVE_SLOTS.firstLoop : RUN_SAVE_SLOTS.loopPlus;
}

function compactStageScore(score) {
  if (!score) return null;
  return {
    stageId: score.stageId,
    title: score.title,
    score: score.score,
    rank: score.rank,
    stats: score.stats,
    maxCombo: score.maxCombo,
    comboBonusDamage: score.comboBonusDamage ?? 0,
    hp: score.hp,
    maxHp: score.maxHp,
    loop: normalizeLoop(score.loop),
    inputOffsetMs: score.inputOffsetMs,
    spiritFocusCount: score.spiritFocusCount ?? 0,
    spiritGuardUsedCount: score.spiritGuardUsedCount ?? 0,
    phraseGrade: score.phraseGrade ?? "",
    stageClearedByHp: Boolean(score.stageClearedByHp),
    notesTotal: score.notesTotal ?? 0,
    notesResolved: score.notesResolved ?? 0,
    skipped: Boolean(score.skipped),
    sourceLabel: score.sourceLabel ?? "",
  };
}

function createRunSnapshot(pendingRestResult = state.phase === "rest" ? buildCurrentStageResult() : null) {
  const restStageScores = pendingRestResult ? [...state.stageScores, pendingRestResult] : state.stageScores;
  const restTotalScore = pendingRestResult ? state.totalScore + pendingRestResult.score : state.totalScore;
  const restNextStageIndex = pendingRestResult ? state.stageIndex + 1 : state.stageIndex;
  const restCompletesRun = pendingRestResult && restNextStageIndex >= STAGES.length;
  const completedRunPhase = state.phase === "ending" || state.phase === "endingVideo" || state.phase === "results" || state.phase === "finalReveal" || restCompletesRun;
  const nextLoopSnapshot = state.phase === "finalReveal" || restCompletesRun;
  const defeatedRunPhase = state.phase === "defeat";
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    difficulty: state.difficulty,
    runLoop: normalizeLoop(nextLoopSnapshot ? state.runLoop + 1 : state.runLoop),
    stageIndex: completedRunPhase ? 0 : Math.max(0, Math.min(STAGES.length - 1, pendingRestResult ? restNextStageIndex : state.stageIndex)),
    hp: completedRunPhase || defeatedRunPhase ? PLAYER_MAX_HP : Math.max(1, Math.round(state.hp)),
    maxHp: state.maxHp,
    spirit: completedRunPhase || defeatedRunPhase ? 0 : Math.max(0, Math.min(100, Math.round(state.spirit))),
    totalScore: completedRunPhase ? 0 : restTotalScore,
    stageScores: completedRunPhase ? [] : restStageScores.map(compactStageScore).filter(Boolean),
  };
}

function saveCurrentRunSnapshot() {
  const pendingRestResult = state.phase === "rest" ? buildCurrentStageResult() : null;
  const snapshot = createRunSnapshot(pendingRestResult);
  const slot = runSaveSlotForLoop(snapshot.runLoop);
  state.runSaves[slot] = snapshot;
  if (pendingRestResult) persistStageClearRecord(pendingRestResult);
  const stored = save();
  syncSaveSlotUi();
  return { slot, snapshot, stored };
}

function isQuickSaveLocked() {
  return performance.now() < quickSaveLockedUntil;
}

function clearQuickSaveFeedback() {
  if (quickSaveFeedbackTimer) {
    window.clearTimeout(quickSaveFeedbackTimer);
    quickSaveFeedbackTimer = 0;
  }
  quickSaveLockedUntil = 0;
  if (dom.quickSaveButton) {
    dom.quickSaveButton.disabled = false;
    dom.quickSaveButton.textContent = t(normalizeLang(state.uiLang), "chrome.quickSave");
    dom.quickSaveButton.setAttribute("aria-label", t(normalizeLang(state.uiLang), "a11y.save"));
  }
}

function showQuickSaveFeedback() {
  clearQuickSaveFeedback();
  quickSaveLockedUntil = performance.now() + QUICK_SAVE_LOCK_MS;
  if (dom.quickSaveButton) {
    const lang = normalizeLang(state.uiLang);
    dom.quickSaveButton.disabled = true;
    dom.quickSaveButton.textContent = t(lang, "chrome.savedShort");
    dom.quickSaveButton.setAttribute("aria-label", t(lang, "overlay.savedRun"));
  }
  quickSaveFeedbackTimer = window.setTimeout(clearQuickSaveFeedback, QUICK_SAVE_LOCK_MS);
}

function saveCurrentRunFromUi(messageTarget = null, { quick = false } = {}) {
  const { slot, stored } = saveCurrentRunSnapshot();
  const lang = normalizeLang(state.uiLang);
  const message = stored ? `${t(lang, "overlay.savedRun")}（${slotLabel(slot)}）` : storageFailureMessage("save", lang);
  if (messageTarget) messageTarget.textContent = message;
  if (state.phase !== "battle") {
    state.judgeText = message;
  }
  syncSrJudge(message);
  if (quick && stored) showQuickSaveFeedback();
  requestRender();
  return { slot, stored };
}

function slotLabel(slot) {
  return slot === RUN_SAVE_SLOTS.firstLoop ? "1周目" : "2周目以降";
}

function saveSummary(snapshot) {
  if (!snapshot) return "セーブなし";
  const stage = getStage(snapshot.stageIndex);
  const savedAt = new Date(snapshot.savedAt);
  const date = Number.isNaN(savedAt.getTime())
    ? ""
    : `${savedAt.getMonth() + 1}/${savedAt.getDate()} ${String(savedAt.getHours()).padStart(2, "0")}:${String(savedAt.getMinutes()).padStart(2, "0")}`;
  return `${DIFFICULTIES[snapshot.difficulty]?.label ?? "ノーマル"} / ${loopLabel(snapshot.runLoop)} / ${stage?.title ?? "ステージ"}${date ? ` / ${date}` : ""}`;
}

function syncSaveSlotUi() {
  const first = state.runSaves.firstLoop;
  const loopPlus = state.runSaves.loopPlus;
  for (const button of [dom.loadFirstButton, dom.pauseLoadFirstButton]) {
    if (!button) continue;
    button.disabled = !first;
    button.textContent = first ? `1周目: ${saveSummary(first)}` : "1周目セーブなし";
  }
  for (const button of [dom.loadLoopPlusButton, dom.pauseLoadLoopPlusButton]) {
    if (!button) continue;
    button.disabled = !loopPlus;
    button.textContent = loopPlus ? `2周目以降: ${saveSummary(loopPlus)}` : "2周目以降セーブなし";
  }
  if (dom.titleSaveSlots) {
    dom.titleSaveSlots.hidden = state.phase !== "title" || (!first && !loopPlus);
  }
}

function hasPanelPopout() {
  return document.documentElement.classList.contains("show-settings-popout") ||
    document.documentElement.classList.contains("show-help-popout");
}

function closePanelPopouts() {
  document.documentElement.classList.remove("show-settings-popout", "show-help-popout");
}

function enablePanelForPopout(element) {
  if (!element) return;
  element.inert = false;
  element.setAttribute("aria-hidden", "false");
  element.open = true;
}

function openSettingsPanel({ focusOffset = true } = {}) {
  if (!dom.settingsRoot) return;
  document.documentElement.classList.remove("show-help-popout");
  document.documentElement.classList.add("show-settings-popout");
  enablePanelForPopout(dom.settingsRoot);
  if (dom.helpGuide) dom.helpGuide.open = false;
  setFocusTrap(dom.pauseMenu, false);
  window.setTimeout(() => {
    const target = focusOffset ? dom.offsetRange : dom.settingsRoot.querySelector("summary");
    target?.focus?.();
  }, 0);
}

function openHelpPanel() {
  if (!dom.helpGuide) return;
  document.documentElement.classList.remove("show-settings-popout");
  document.documentElement.classList.add("show-help-popout");
  enablePanelForPopout(dom.helpGuide);
  if (dom.settingsRoot) dom.settingsRoot.open = false;
  setFocusTrap(dom.pauseMenu, false);
  window.setTimeout(() => {
    dom.helpGuide.querySelector("summary")?.focus?.();
  }, 0);
}

function setOverlay(show, title = "", text = "", action = "進む") {
  const canSkipCleared = state.phase === "intro" && isCurrentStageCleared();
  const novelMode = state.phase === "intro" || state.phase === "finalReveal";
  const resultMode = state.phase === "results";
  const openingMode = state.phase === "opening";
  const titleMode = state.phase === "title";
  const openingArtworkMode = openingMode || titleMode;
  dom.overlay.classList.toggle("hidden", !show);
  dom.overlay.classList.toggle("novelOverlay", novelMode);
  dom.overlay.classList.toggle("resultOverlay", resultMode);
  dom.overlay.classList.toggle("openingOverlay", openingArtworkMode);
  dom.overlay.classList.toggle("titleOverlay", titleMode);
  const lockSidePanels = show && state.phase !== "defeat" && !hasPanelPopout();
  for (const element of [dom.settingsRoot, dom.helpGuide]) {
    if (!element) continue;
    element.inert = lockSidePanels;
    element.setAttribute("aria-hidden", String(lockSidePanels));
  }
  if (dom.openingArtwork) dom.openingArtwork.hidden = !openingArtworkMode;
  dom.gameSurface?.classList.toggle("novelActive", show && novelMode);
  dom.difficultySelect.hidden = state.phase !== "title";
  const lang = normalizeLang(state.uiLang);
  setSpeakerLabel(
    novelMode ? state.overlaySpeaker || (lang === "en" ? "Narrator" : "語り") : t(lang, "meta.kicker"),
    novelMode,
  );
  dom.overlayTitle.textContent = title;
  dom.overlayText.textContent = text;
  dom.overlayText.hidden = text.length === 0;
  if (show) syncSrNarration([title, text].filter(Boolean).join("。"));
  if (!resultMode) clearResultSummary();
  dom.primaryButton.textContent = action;
  const canOpenTitleHelp = state.phase === "title" || state.phase === "defeat";
  if (dom.openSettingsButton) dom.openSettingsButton.hidden = !canOpenTitleHelp;
  if (dom.openHelpButton) dom.openHelpButton.hidden = !canOpenTitleHelp;
  dom.skipButton.hidden = state.phase === "finalReveal" ? true : state.phase !== "intro" && state.phase !== "rest" && !canSkipCleared;
  dom.skipButton.textContent = canSkipCleared ? "クリア済みなのでスキップ" : "会話を送る";
  syncSaveSlotUi();
  requestRender();
}

function clearResultSummary() {
  if (!dom.resultSummary) return;
  dom.resultSummary.hidden = true;
  dom.resultSummary.replaceChildren();
}

function resultNode(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function resultStat(label, value, sub = "") {
  const item = resultNode("div", "resultStat");
  item.append(resultNode("span", "resultStatLabel", label));
  item.append(resultNode("strong", "resultStatValue", value));
  if (sub) item.append(resultNode("small", "resultStatSub", sub));
  return item;
}

function resultAccuracy(stats = {}) {
  const total = (stats.perfect ?? 0) + (stats.good ?? 0) + (stats.bad ?? 0) + (stats.miss ?? 0);
  if (!total) return 0;
  const weighted = (stats.perfect ?? 0) + (stats.good ?? 0) * 0.72 + (stats.bad ?? 0) * 0.34;
  return Math.max(0, Math.min(100, Math.round((weighted / total) * 100)));
}

function summarizeStageResult(item) {
  const notesTotal = Math.max(0, item.notesTotal ?? 0);
  const notesResolved = Math.max(0, item.notesResolved ?? 0);
  const noteText = !notesTotal
    ? "保存済み"
    : notesResolved >= notesTotal
      ? `${notesTotal}/${notesTotal}`
      : `${notesResolved}/${notesTotal}`;
  const source = item.skipped ? "保存済みベスト" : item.stageClearedByHp ? "撃破" : "完走";
  return {
    title: item.title,
    score: `${item.score}点`,
    rank: item.rank,
    combo: `${item.maxCombo}連`,
    phrase: item.phraseGrade ? `節回し ${item.phraseGrade}` : "節回し -",
    notes: noteText,
    source,
    accuracy: `${resultAccuracy(item.stats)}%`,
  };
}

function renderResultSummary({ mode, title, rank, subtitle, stats = [], stages = [], bonus = null, note = "" }) {
  if (!dom.resultSummary) return;
  dom.resultSummary.hidden = false;
  dom.resultSummary.replaceChildren();

  const card = resultNode("section", `resultCard resultCard--${mode}`);
  const head = resultNode("div", "resultCardHead");
  const rankBadge = resultNode("div", `resultRank resultRank--${rank}`, rank);
  const titleBlock = resultNode("div", "resultTitleBlock");
  titleBlock.append(resultNode("span", "resultKicker", mode === "bonus" ? "ENDING BONUS" : "STAGE CLEAR"));
  titleBlock.append(resultNode("strong", "resultTitle", title));
  if (subtitle) titleBlock.append(resultNode("small", "resultSubtitle", subtitle));
  head.append(rankBadge, titleBlock);
  card.append(head);

  if (stats.length) {
    const statGrid = resultNode("div", "resultStatGrid");
    for (const stat of stats) statGrid.append(resultStat(stat.label, stat.value, stat.sub));
    card.append(statGrid);
  }

  if (stages.length) {
    const list = resultNode("div", "resultStageList");
    list.append(resultNode("div", "resultStageListHead", "ステージ別成績"));
    stages.forEach((stage, index) => {
      const row = resultNode("div", "resultStageRow");
      row.append(resultNode("span", "resultStageNo", String(index + 1).padStart(2, "0")));
      const main = resultNode("span", "resultStageMain");
      main.append(resultNode("strong", "", stage.title));
      main.append(resultNode("small", "", `${stage.source} / ${stage.phrase} / 精度 ${stage.accuracy}`));
      row.append(main);
      row.append(resultNode("span", `resultStageRank resultStageRank--${stage.rank}`, stage.rank));
      row.append(resultNode("span", "resultStageScore", stage.score));
      row.append(resultNode("span", "resultStageCombo", stage.combo));
      row.append(resultNode("span", "resultStageNotes", stage.notes));
      list.append(row);
    });
    card.append(list);
  }

  if (bonus) {
    const bonusPanel = resultNode("div", "resultBonusPanel");
    bonusPanel.append(resultNode("span", "resultBonusLabel", "ED拍ボーナス"));
    bonusPanel.append(resultNode("strong", "resultBonusScore", `${bonus.score}点`));
    bonusPanel.append(resultNode("small", "resultBonusText", `成功 ${bonus.hits}/${bonus.total} / 精度 ${bonus.accuracy}% / 最大 ${bonus.bestCombo}連 / ${bonus.missText}`));
    card.append(bonusPanel);
  }

  if (note) card.append(resultNode("p", "resultNote", note));
  dom.resultSummary.append(card);
}

function setSpeakerLabel(label, splitChars = false) {
  if (!splitChars) {
    dom.overlayKicker.textContent = label;
    return;
  }
  dom.overlayKicker.replaceChildren(
    ...Array.from(label).map((char) => {
      const span = document.createElement("span");
      span.textContent = char;
      return span;
    }),
  );
}

function setPhase(phase) {
  state.phase = phase;
  closePanelPopouts();
  if (phase !== "battle") state.paused = false;
  document.documentElement.dataset.phase = phase;
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
  state.phaseStartedAt = performance.now();
  state.phaseElapsed = 0;
  state.battleTimeMs = -1;
  state.battleClockReady = false;
  state.nextNote = null;
  state.mashFeedback = null;
  state.spaceHeld = false;
  state.judgeText = "";
  state.inputHint = "ノーツが判定線に重なったら押す";
  if (phase !== "finalReveal") state.finalRevealUnmasked = false;
  requestRender();
}

function clearCombatMotions() {
  state.heroStrike = null;
  state.enemyAttack = null;
  state.heroGuard = null;
}

function hasInternalDestruction() {
  return state.stageIndex >= 3;
}

function syncRunLoopForDifficulty() {
  state.runLoop = normalizeLoop(state.runLoops?.[state.difficulty]);
  state.runLoops[state.difficulty] = state.runLoop;
}

function startGame({ continueLoop = false } = {}) {
  if (continueLoop) syncRunLoopForDifficulty();
  else {
    state.runLoop = 1;
    state.runLoops[state.difficulty] = 1;
  }
  state.stageIndex = 0;
  state.stage = getStage(0);
  state.maxHp = PLAYER_MAX_HP;
  state.hp = state.maxHp;
  state.spirit = 0;
  state.spiritFocusMs = 0;
  state.spiritFocusCount = 0;
  state.spiritGuardCharges = 0;
  state.spiritGuardUsedCount = 0;
  state.totalScore = 0;
  state.stageScores = [];
  state.results = null;
  state.focusEffect = null;
  clearCombatMotions();
  state.lineIndex = 0;
  beginIntro();
}

function showTitleFromOpening() {
  setPhase("title");
  state.phaseLabel = "聞いて押す";
  state.judgeText = "合図を聞いて拍に乗る";
  state.inputHint = t(normalizeLang(state.uiLang), "overlay.tapStart");
  refreshTitleOverlay();
}

async function retryCurrentStage() {
  battleSession += 1;
  audio.stopBgm({ stopCues: true });
  state.stage = getStage(state.stageIndex);
  state.maxHp = PLAYER_MAX_HP;
  state.hp = state.maxHp;
  state.spirit = 0;
  state.noteStates = [];
  resetNoteProgress();
  state.hold = null;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboBonusDamage = 0;
  state.spiritFocusMs = 0;
  state.spiritFocusCount = 0;
  state.spiritGuardCharges = 0;
  state.spiritGuardUsedCount = 0;
  state.damageScale = 1;
  state.stageClearedByHp = false;
  state.specialCutin = null;
  state.mashFeedback = null;
  state.focusEffect = null;
  clearCombatMotions();
  state.enemyHit = 0;
  state.petals = [];
  state.effects = [];
  state.shake = 0;
  state.overlaySpeaker = "";
  preloadStageVisuals(state.stageIndex);
  preloadStageAudio(state.stageIndex);
  if (state.audioEnabled) {
    await audio.prepareBgm(state.stage.bgm);
  }
  await beginBattle();
}

function canPause() {
  return state.phase === "battle";
}

async function pauseGame() {
  if (!canPause() || state.paused) return;
  state.paused = true;
  state.pausedAt = performance.now();
  state.pausedPhaseStartedAt = state.phaseStartedAt;
  state.spaceHeld = false;
  await audio.suspend();
  syncPauseUi();
  requestRender();
}

async function resumeGame() {
  if (!state.paused) return;
  const now = performance.now();
  const pausedFor = Math.max(0, now - state.pausedAt);
  state.phaseStartedAt += pausedFor;
  state.elapsed = now;
  state.paused = false;
  state.pausedAt = 0;
  await audio.resume();
  syncPauseUi();
  requestRender();
}

function syncPauseUi() {
  const lang = normalizeLang(state.uiLang);
  if (dom.pauseMenu) dom.pauseMenu.hidden = !state.paused;
  setFocusTrap(dom.pauseMenu, state.paused && !hasPanelPopout());
  if (dom.pauseTitle) dom.pauseTitle.textContent = t(lang, "overlay.paused");
  if (dom.pauseText) dom.pauseText.textContent = t(lang, "overlay.pauseBody");
  if (dom.resumeButton) dom.resumeButton.textContent = t(lang, "chrome.resume");
  if (dom.pauseOffsetButton) dom.pauseOffsetButton.textContent = t(lang, "chrome.inputOffsetShort");
  if (dom.pauseHelpButton) dom.pauseHelpButton.textContent = t(lang, "chrome.openHelp");
  if (dom.pauseSettingsButton) dom.pauseSettingsButton.textContent = t(lang, "chrome.settingsShort");
  if (dom.saveRunButton) dom.saveRunButton.textContent = t(lang, "chrome.saveRun");
  if (dom.quickSaveButton) {
    if (!isQuickSaveLocked()) {
      dom.quickSaveButton.disabled = false;
      dom.quickSaveButton.textContent = t(lang, "chrome.quickSave");
      dom.quickSaveButton.setAttribute("aria-label", t(lang, "a11y.save"));
    } else {
      dom.quickSaveButton.textContent = t(lang, "chrome.savedShort");
      dom.quickSaveButton.setAttribute("aria-label", t(lang, "overlay.savedRun"));
    }
  }
  if (dom.returnTitleButton) dom.returnTitleButton.textContent = t(lang, "chrome.returnTitle");
  if (dom.pauseButton) {
    dom.pauseButton.textContent = t(lang, "chrome.pauseShort");
    dom.pauseButton.setAttribute("aria-label", t(lang, "a11y.pause"));
  }
  if (dom.openSettingsButton) dom.openSettingsButton.textContent = t(lang, "chrome.openSettings");
  if (dom.openHelpButton) dom.openHelpButton.textContent = t(lang, "chrome.openHelp");
  syncSaveSlotUi();
}

function clearActiveRunStateForTitle(lang = normalizeLang(state.uiLang)) {
  battleSession += 1;
  audio.stopBgm({ stopCues: true });
  state.stageIndex = 0;
  state.stage = getStage(0);
  state.maxHp = PLAYER_MAX_HP;
  state.hp = state.maxHp;
  state.spirit = 0;
  state.totalScore = 0;
  state.stageScores = [];
  state.noteStates = [];
  resetNoteProgress();
  state.hold = null;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboBonusDamage = 0;
  state.spiritFocusMs = 0;
  state.spiritFocusCount = 0;
  state.spiritGuardCharges = 0;
  state.spiritGuardUsedCount = 0;
  state.damageScale = 1;
  state.stageClearedByHp = false;
  state.specialCutin = null;
  state.mashFeedback = null;
  state.focusEffect = null;
  clearCombatMotions();
  state.enemyHit = 0;
  state.petals = [];
  state.effects = [];
  state.results = null;
  state.overlaySpeaker = "";
  setPhase("title");
  state.phaseLabel = "聞いて押す";
  state.judgeText = t(lang, "overlay.returnedTitle");
  state.inputHint = t(lang, "overlay.tapStart");
  const hasRunSave = Boolean(state.runSaves.firstLoop || state.runSaves.loopPlus);
  setOverlay(
    true,
    t(lang, "overlay.openingTitle"),
    t(lang, "overlay.afterReturnTitle"),
    hasRunSave ? (lang === "en" ? "New game" : "ニューゲーム") : lang === "en" ? "Start game" : "ゲーム開始",
  );
  syncSaveSlotUi();
}

function returnToTitleFromPause() {
  if (!state.paused) return;
  const lang = normalizeLang(state.uiLang);
  if (!window.confirm(t(lang, "confirm.returnTitle"))) return;
  state.paused = false;
  syncPauseUi();
  clearActiveRunStateForTitle(lang);
}

function loadRunSnapshot(slot) {
  const snapshot = state.runSaves?.[slot];
  if (!snapshot) return false;
  state.paused = false;
  syncPauseUi();
  battleSession += 1;
  audio.stopBgm({ stopCues: true });
  state.difficulty = DIFFICULTIES[snapshot.difficulty] ? snapshot.difficulty : DEFAULT_DIFFICULTY;
  state.runLoop = normalizeLoop(snapshot.runLoop);
  state.runLoops[state.difficulty] = state.runLoop;
  state.stageIndex = Math.max(0, Math.min(STAGES.length - 1, Number(snapshot.stageIndex) || 0));
  state.stage = getStage(state.stageIndex);
  state.maxHp = snapshot.maxHp || PLAYER_MAX_HP;
  state.hp = Math.max(1, Math.min(state.maxHp, snapshot.hp || state.maxHp));
  state.spirit = Math.max(0, Math.min(100, snapshot.spirit || 0));
  state.totalScore = Number(snapshot.totalScore) || 0;
  state.stageScores = Array.isArray(snapshot.stageScores) ? snapshot.stageScores.map(compactStageScore).filter(Boolean) : [];
  state.noteStates = [];
  resetNoteProgress();
  state.hold = null;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboBonusDamage = 0;
  state.spiritFocusMs = 0;
  state.spiritFocusCount = 0;
  state.spiritGuardCharges = 0;
  state.spiritGuardUsedCount = 0;
  state.stageClearedByHp = false;
  state.specialCutin = null;
  state.mashFeedback = null;
  state.focusEffect = null;
  clearCombatMotions();
  state.enemyHit = 0;
  state.petals = [];
  state.effects = [];
  state.shake = 0;
  state.results = null;
  state.overlaySpeaker = "";
  state.lineIndex = 0;
  state.judgeText = t(normalizeLang(state.uiLang), "overlay.loadedRun");
  save();
  syncSettings();
  beginIntro();
  return true;
}

function scoreKey(stageId) {
  return `${state.difficulty}:loop${normalizeLoop(state.runLoop)}:${stageId}`;
}

function legacyScoreKey(stageId) {
  return `${state.difficulty}:${stageId}`;
}

function scoreKeyForStage(stageId) {
  const currentKey = scoreKey(stageId);
  if (normalizeLoop(state.runLoop) === 1 && state.bestScores[currentKey] == null && state.bestScores[legacyScoreKey(stageId)] != null) {
    return legacyScoreKey(stageId);
  }
  return currentKey;
}

function isStageClearedKey(stageId) {
  if (!stageId) return false;
  if (state.clearedStages.includes(scoreKey(stageId))) return true;
  return normalizeLoop(state.runLoop) === 1 && state.clearedStages.includes(legacyScoreKey(stageId));
}
async function ensureAudioReady() {
  if (!state.audioEnabled) {
    audio.setEnabled(false);
    return false;
  }
  const ready = await audio.unlock();
  audio.setEnabled(true);
  return ready;
}

async function resumeAudioForInput() {
  if (!state.audioEnabled) return false;
  const ready = await audio.resume();
  audio.setEnabled(true);
  return ready;
}

function beginIntro() {
  setPhase("intro");
  state.phaseLabel = "会話";
  state.lineIndex = 0;
  preloadStageVisuals(state.stageIndex);
  preloadStageAudio(state.stageIndex);
  showCurrentLine();
}

function currentIntroLines() {
  const lines = state.stage.introLines ?? [];
  if (normalizeLoop(state.runLoop) < 2 || state.stageIndex !== 0) return lines;
  return [
    `${loopLabel(state.runLoop)}。小次郎の記憶は、なぜか安いペイントで塗りつぶしたように崩れはじめた。それでも裕太を救う道筋だけは、妙に覚えている。`,
    ...lines,
  ];
}

function preloadStageAudio(stageIndex = state.stageIndex) {
  if (!state.audioEnabled) return;
  const stage = getStage(stageIndex);
  const nextStage = getStage(stageIndex + 1);
  audio.releaseBgmExcept([stage?.bgm?.track, nextStage?.bgm?.track]);
  if (stage?.bgm) void audio.prepareBgm(stage.bgm);
  if (nextStage?.bgm) void audio.prepareBgm(nextStage.bgm);
}

function showCurrentLine() {
  const lines = currentIntroLines();
  const line = lines[state.lineIndex] ?? "";
  state.overlaySpeaker = speakerForIntroLine(line);
  setOverlay(true, state.stage.title, line, state.lineIndex === lines.length - 1 ? "出発" : "次へ");
}

function speakerForIntroLine(line) {
  if (state.stageIndex === 0) return "語り";
  if (line.includes("立石小次郎") || line.includes("拍を見ろ") || line.includes("溜めて") || line.includes("全力で節")) return "立石小次郎";
  const enemyWords = [
    "B-boy",
    "パンク",
    "ファンク",
    "ロック",
    "スケーター",
    "メタル",
    "DJ",
    "ロカビリー",
    "グラムロック",
    "敵",
    "用心棒",
    "刺客",
    "番人",
    "門番",
    "総帥",
    "構成員",
    "腕章",
    "覆面",
    "X結社",
    "白衣",
    "研究員",
    "改造員",
    "巨漢",
    "鉄仮面",
    "実行班長",
    "偵察兵",
    "装甲",
    "通信兵",
    "親衛隊長",
    "スーパーステロイドX",
  ];
  if (enemyWords.some((word) => line.includes(word))) return state.stage.enemy.name;
  return "語り";
}

function speakerForFinalRevealLine(line) {
  if (line.includes("長谷川「")) return "長谷川";
  if (line.includes("小次郎「") || line.includes("茶でも")) return "立石小次郎";
  if (line.includes("裕太") || line.includes("じいちゃん")) return "裕太";
  return "語り";
}

function advanceIntro() {
  state.lineIndex += 1;
  if (state.lineIndex < currentIntroLines().length) {
    showCurrentLine();
    return;
  }
  beginBattle();
}

function currentFinalRevealLines() {
  return state.stage.finalRevealLines ?? [];
}

function showFinalRevealLine() {
  const lines = currentFinalRevealLines();
  const line = lines[state.lineIndex] ?? "";
  state.finalRevealUnmasked = state.lineIndex >= 1;
  state.overlaySpeaker = speakerForFinalRevealLine(line);
  setOverlay(true, "白馬の被り物", line, state.lineIndex === lines.length - 1 ? "裕太のもとへ" : "次へ");
}

function beginFinalReveal() {
  setPhase("finalReveal");
  state.phaseLabel = "正体";
  state.lineIndex = 0;
  state.finalRevealUnmasked = false;
  showFinalRevealLine();
}

function advanceFinalReveal() {
  state.lineIndex += 1;
  if (state.lineIndex < currentFinalRevealLines().length) {
    showFinalRevealLine();
    return;
  }
  beginEnding();
}

async function beginBattle() {
  const session = ++battleSession;
  setPhase("battle");
  setOverlay(false);
  state.overlaySpeaker = "";
  state.phaseLabel = "コブシ戦";
  state.enemyMaxHp = Math.round(getEnemyHp(state.stage) * loopEnemyHpMultiplier(state.runLoop, state.stage, state.difficulty));
  state.enemyHp = state.enemyMaxHp;
  state.activeChart = getStageChart(state.stage, state.difficulty, state.runLoop);
  state.damageScale = damageScaleForDifficulty(state.stage, state.difficulty, state.runLoop) * loopPlayerDamageMultiplier(state.runLoop, state.stage, state.difficulty);
  state.noteStates = state.activeChart.map((note) => ({
    note,
    rank: null,
    resolved: false,
    mashTaps: note.type === "mash" ? [] : undefined,
    enemyCueShown: false,
  }));
  resetNoteProgress();
  state.hold = null;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboBonusDamage = 0;
  state.spiritFocusMs = 0;
  state.spiritFocusCount = 0;
  state.spiritGuardCharges = 0;
  state.spiritGuardUsedCount = 0;
  state.stageClearedByHp = false;
  state.specialCutin = null;
  state.mashFeedback = null;
  state.focusEffect = null;
  clearCombatMotions();
  state.enemyHit = 0;
  state.lastEnemyCueIndex = -1;
  state.petals = [];
  const bgmStarted = await startBattleClock(
    state.activeChart,
    state.stage.bpm,
    stageBattleDuration(state.stage, state.activeChart) + 1800,
    state.stage.bgm,
    session,
  );
  if (bgmStarted || !state.stage.bgm?.track || !state.audioEnabled) {
    state.judgeText = "金の判定線を見る";
    state.inputHint = "ノーツが判定線に重なったら押す";
  }
}

async function startBattleClock(chart, bpm, durationMs, bgmProfile = {}, session = battleSession) {
  state.battleClockReady = false;
  state.battleStartAt = audio.now() + COUNT_IN_LEAD_SECONDS;
  if (state.audioEnabled) {
    await audio.resume();
    audio.setEnabled(true);
  }
  if (session !== battleSession || state.phase !== "battle") return false;
  state.battleStartAt = audio.now() + COUNT_IN_LEAD_SECONDS;
  if (bgmProfile?.track && state.audioEnabled) {
    state.judgeText = "BGM準備中";
    state.inputHint = "構えて待つ";
    await audio.prepareBgm(bgmProfile);
  }
  if (session !== battleSession || state.phase !== "battle") return false;
  const startAt = audio.now() + COUNT_IN_LEAD_SECONDS;
  state.battleStartAt = startAt;
  const bgmStarted = await audio.scheduleChart(startAt, bpm, chart, durationMs, bgmProfile);
  if (session !== battleSession || state.phase !== "battle") {
    audio.stopBgm({ stopCues: true });
    return false;
  }
  if (state.phase === "battle") state.battleClockReady = true;
  if (bgmProfile?.track && state.audioEnabled && !bgmStarted) {
    state.judgeText = "BGM読み込み失敗";
    state.inputHint = "効果音で続行";
  }
  return bgmStarted;
}

function stageBattleDuration(stage, chart = getStageChart(stage, state.difficulty, state.runLoop)) {
  const last = chart.at(-1);
  return last.timeMs + (last.durationMs ?? 0);
}

function beginRest() {
  battleSession += 1;
  audio.stopBgm();
  preloadStageAudio(state.stageIndex + 1);
  setPhase("rest");
  state.phaseLabel = "小休止";
  state.overlaySpeaker = "語り";
  setOverlay(true, "小休止", state.stage.restLine, state.stageIndex === STAGES.length - 1 ? "親分と対峙" : "次へ");
}

function clearStageByEnemyHp() {
  if (state.phase !== "battle") return;
  state.enemyHp = 0;
  state.stageClearedByHp = true;
  state.judgeText = "撃破";
  state.inputHint = "ステージクリア";
  audio.kobushiVoice("clear");
  addEffect("撃破", 440, 150, "#f6d95f", 1100);
  beginRest();
}

function advanceRest() {
  setOverlay(false);
  state.overlaySpeaker = "";
  finishStage();
}

function buildCurrentStageResult() {
  const scoringEntries = state.stageClearedByHp ? state.noteStates.filter((entry) => entry.resolved) : state.noteStates;
  const resolved = scoringEntries.map((entry) => ({ rank: entry.rank ?? "miss" }));
  const stats = countStats(resolved);
  const phraseGrade = phraseRating({ stats, maxCombo: state.maxCombo, notesTotal: state.noteStates.length, hp: state.hp, maxHp: state.maxHp });
  const notesTotal = state.noteStates.length;
  const notesResolved = state.noteStates.filter((entry) => entry.resolved).length;
  const score = calculateStageScore({
    notes: resolved,
    totalNotes: notesTotal,
    maxCombo: state.maxCombo,
    comboBonusDamage: state.comboBonusDamage,
    hp: state.hp,
    maxHp: state.maxHp,
  });
  const rank = rankScore(score);
  return {
    stageId: state.stage.id,
    title: state.stage.title,
    score,
    rank,
    stats,
    maxCombo: state.maxCombo,
    comboBonusDamage: state.comboBonusDamage,
    hp: state.hp,
    maxHp: state.maxHp,
    loop: normalizeLoop(state.runLoop),
    inputOffsetMs: state.inputOffsetMs,
    spiritFocusCount: state.spiritFocusCount,
    spiritGuardUsedCount: state.spiritGuardUsedCount,
    phraseGrade,
    stageClearedByHp: state.stageClearedByHp,
    notesTotal,
    notesResolved,
  };
}

function finishStage() {
  const stageResult = buildCurrentStageResult();
  state.stageScores.push(stageResult);
  state.totalScore += stageResult.score;
  persistStageClearRecord(stageResult);
  save();

  state.stageIndex += 1;
  if (state.stageIndex >= STAGES.length) {
    if (state.stage.finalRevealLines?.length) beginFinalReveal();
    else beginEnding();
  } else {
    state.stage = getStage(state.stageIndex);
    beginIntro();
  }
}

function persistStageClearRecord(stageResult) {
  const currentScoreKey = scoreKey(stageResult.stageId);
  state.bestScores[currentScoreKey] = bestOf(state.bestScores[currentScoreKey], stageResult);
  if (!state.clearedStages.includes(currentScoreKey)) state.clearedStages.push(currentScoreKey);
}

function isCurrentStageCleared() {
  return isStageClearedKey(state.stage?.id);
}

function skippedStageResult(stage) {
  const best = state.bestScores[scoreKeyForStage(stage.id)];
  const chartLen = getStageChart(stage, state.difficulty, state.runLoop).length;
  return {
    stageId: stage.id,
    title: stage.title,
    score: best?.score ?? 0,
    rank: best?.rank ?? "C",
    stats: { perfect: 0, good: 0, bad: 0, miss: 0 },
    maxCombo: best?.maxCombo ?? 0,
    comboBonusDamage: best?.comboBonusDamage ?? 0,
    spiritFocusCount: best?.spiritFocusCount ?? 0,
    spiritGuardUsedCount: best?.spiritGuardUsedCount ?? 0,
    phraseGrade: best?.phraseGrade ?? "",
    hp: state.maxHp,
    maxHp: state.maxHp,
    loop: normalizeLoop(state.runLoop),
    inputOffsetMs: state.inputOffsetMs,
    skipped: true,
    sourceLabel: "保存済みベスト",
    stageClearedByHp: true,
    notesTotal: chartLen,
    notesResolved: chartLen,
  };
}

function skipClearedStage() {
  if (!isCurrentStageCleared()) return;
  const result = skippedStageResult(state.stage);
  state.stageScores.push(result);
  state.totalScore += result.score;
  state.stageIndex += 1;
  if (state.stageIndex >= STAGES.length) {
    if (state.stage.finalRevealLines?.length) beginFinalReveal();
    else beginEnding();
    return;
  }
  state.stage = getStage(state.stageIndex);
  beginIntro();
}

function beginEnding() {
  setPhase("ending");
  state.phaseLabel = "救出";
  const completedLoop = normalizeLoop(state.runLoop);
  const completedLoopLabel = loopLabel(completedLoop);
  const total = state.stageScores.reduce((sum, item) => sum + item.score, 0);
  const average = Math.round(total / state.stageScores.length);
  const finalRank = rankScore(average);
  const skippedCount = state.stageScores.filter((item) => item.skipped).length;
  const resultScope = skippedCount ? `保存済みベスト${skippedCount}件を含む` : "今回プレイのみ";
  const stageSummaries = state.stageScores.map(summarizeStageResult);
  state.results = { average, total, finalRank, stageSummaries, skippedCount, resultScope, loop: completedLoop, loopLabel: completedLoopLabel };
  state.runLoop = completedLoop + 1;
  state.runLoops[state.difficulty] = state.runLoop;
  save();
  setOverlay(
    true,
    "裕太救出",
    "",
    "EDボーナスへ",
  );
}

function showResults() {
  stopEndingVideo();
  setPhase("results");
  state.phaseLabel = "ED結果";
  const bonus = state.results?.endingBonus ?? endingBonusSnapshot();
  const total = Math.max(1, bonus.totalNotes ?? bonus.hits + bonus.misses);
  const judged = bonus.hits + bonus.misses;
  const accuracy = Math.round((bonus.hits / total) * 100);
  const missText = judged === 0 ? "入力なし" : bonus.misses ? `Miss ${bonus.misses}回` : "Missなし";
  const nextLoopLabel = loopLabel(state.runLoop);
  const results = state.results ?? {};
  const finalRank = results.finalRank ?? "S";
  const average = results.average ?? 0;
  const stageTotal = results.total ?? 0;
  const completedLoopLabel = results.loopLabel ?? loopLabel(1);
  setOverlay(
    true,
    `救出成功 ${completedLoopLabel} 総合${finalRank}`,
    "",
    `${nextLoopLabel}に進む`,
  );
  renderResultSummary({
    mode: "clear",
    title: `総合ランク ${finalRank}`,
    rank: finalRank,
    subtitle: `${DIFFICULTIES[state.difficulty].label} / ${completedLoopLabel} / ${results.resultScope ?? "今回プレイのみ"}`,
    stats: [
      { label: "平均スコア", value: `${average}点`, sub: "7ステージ総合" },
      { label: "総合得点", value: `${stageTotal}点`, sub: "ステージ合計" },
      { label: "EDボーナス", value: `${bonus.score}点`, sub: `成功 ${bonus.hits}/${total}` },
      { label: "次の挑戦", value: nextLoopLabel, sub: "結果確定済み" },
    ],
    stages: results.stageSummaries ?? [],
    bonus: { score: bonus.score, hits: bonus.hits, total, accuracy, bestCombo: bonus.bestCombo, missText },
    note: getStage(STAGES.length - 1).clearLine,
  });
}

function resetEndingBonus() {
  const durationMs = Number.isFinite(dom.endingVideo?.duration) && dom.endingVideo.duration > 0
    ? dom.endingVideo.duration * 1000
    : ENDING_BONUS_FALLBACK_DURATION_MS;
  const loop = normalizeLoop(state.results?.loop ?? state.runLoop);
  const tuning = endingBonusDifficultyConfig(state.difficulty, loop);
  const chart = createEndingBonusChart(durationMs, state.difficulty, loop);
  state.endingBonus = {
    active: false,
    difficulty: state.difficulty,
    loop,
    tuning,
    noteStates: chart.map((note) => ({ note, resolved: false, rank: null, mashTaps: [] })),
    nextIndex: 0,
    hold: null,
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    lastJudge: "ED譜面を待つ",
    lastOffsetMs: 0,
    pulseUntil: 0,
    clockVideoMs: 0,
    clockPerfMs: 0,
    lastRawVideoMs: 0,
    lastStatusText: "",
  };
  syncEndingBonusUi();
}

function endingBonusSnapshot() {
  const bonus = state.endingBonus;
  return {
    score: bonus?.score ?? 0,
    hits: bonus?.hits ?? 0,
    misses: bonus?.misses ?? 0,
    bestCombo: bonus?.bestCombo ?? 0,
    totalNotes: bonus?.noteStates?.length ?? 0,
  };
}

function endingBonusRawTimeMs() {
  return (dom.endingVideo?.currentTime ?? 0) * 1000;
}

function resetEndingBonusClock(rawMs = endingBonusRawTimeMs()) {
  const bonus = state.endingBonus;
  if (!bonus) return rawMs;
  bonus.clockVideoMs = rawMs;
  bonus.clockPerfMs = performance.now();
  bonus.lastRawVideoMs = rawMs;
  return rawMs;
}

function endingBonusTimeMs() {
  const video = dom.endingVideo;
  const bonus = state.endingBonus;
  const rawMs = endingBonusRawTimeMs();
  if (!video || !bonus || !Number.isFinite(rawMs)) return 0;
  const now = performance.now();
  const rate = Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1;
  if (!bonus.active || video.paused || video.ended || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return resetEndingBonusClock(rawMs);
  }
  if (!Number.isFinite(bonus.clockPerfMs) || bonus.clockPerfMs <= 0) {
    return resetEndingBonusClock(rawMs);
  }

  let estimatedMs = bonus.clockVideoMs + (now - bonus.clockPerfMs) * rate;
  const rawStepMs = rawMs - bonus.lastRawVideoMs;
  const driftMs = rawMs - estimatedMs;
  if (rawStepMs < -80 || Math.abs(driftMs) > ENDING_BONUS_CLOCK_RESET_MS) {
    return resetEndingBonusClock(rawMs);
  }

  if (rawStepMs > 0) {
    const correctionMs = driftMs * ENDING_BONUS_CLOCK_PULL;
    bonus.clockVideoMs += correctionMs;
    estimatedMs += correctionMs;
    bonus.lastRawVideoMs = rawMs;
  }

  const durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : Infinity;
  return Math.max(0, Math.min(durationMs, estimatedMs));
}

function advanceEndingBonusCursor() {
  const bonus = state.endingBonus;
  if (!bonus) return;
  while (bonus.nextIndex < bonus.noteStates.length && bonus.noteStates[bonus.nextIndex].resolved) {
    bonus.nextIndex += 1;
  }
}

function endingBonusFindNote(videoMs, type) {
  const bonus = state.endingBonus;
  if (!bonus) return null;
  const rangeStart = Math.max(0, bonus.nextIndex - 2);
  let best = null;
  let bestDistance = Infinity;
  for (let i = rangeStart; i < bonus.noteStates.length; i += 1) {
    const entry = bonus.noteStates[i];
    if (entry.resolved || entry.note.type !== type) continue;
    if (type === "mash") {
      const start = entry.note.timeMs - MASH_INPUT_GRACE_MS;
      const end = entry.note.timeMs + entry.note.durationMs + MASH_INPUT_GRACE_MS;
      if (videoMs >= start && videoMs <= end) return { entry, index: i };
      if (entry.note.timeMs - videoMs > INPUT_GRACE_MS) break;
      continue;
    }
    const distance = Math.abs(videoMs + state.inputOffsetMs - entry.note.timeMs);
    if (distance <= INPUT_GRACE_MS && distance < bestDistance) {
      best = { entry, index: i };
      bestDistance = distance;
    }
    if (entry.note.timeMs - videoMs > INPUT_GRACE_MS) break;
  }
  return best;
}

function resolveEndingBonusNote(index, result, detail = "") {
  const bonus = state.endingBonus;
  if (!bonus) return;
  const entry = bonus.noteStates[index];
  if (!entry || entry.resolved) return;
  entry.resolved = true;
  entry.rank = result.rank;
  bonus.lastOffsetMs = result.offsetMs ?? 0;
  if (result.rank === "miss") {
    bonus.combo = 0;
    bonus.misses += 1;
  } else {
    bonus.combo += 1;
    bonus.hits += 1;
    bonus.score += endingBonusScoreValue(result.rank, bonus.combo);
  }
  bonus.bestCombo = Math.max(bonus.bestCombo, bonus.combo);
  bonus.lastJudge = `${result.rank.toUpperCase()}${detail ? ` ${detail}` : ""}`;
  bonus.pulseUntil = performance.now() + (state.reducedMotion ? 0 : 130);
  advanceEndingBonusCursor();
}

function syncEndingBonusUi() {
  if (!dom.endingBonusPanel || !state.endingBonus) return;
  const bonus = state.endingBonus;
  advanceEndingBonusCursor();
  const videoMs = endingBonusTimeMs();
  const next = bonus.hold ? bonus.hold.entry : bonus.noteStates[bonus.nextIndex];
  const noteType = bonus.hold ? "hold" : next?.note.type ?? "done";
  dom.endingBonusPanel.hidden = state.phase !== "endingVideo";
  dom.endingBonusPanel.dataset.note = noteType;
  if (dom.endingVideoStatus) {
    const label = noteType === "hold" ? (bonus.hold ? "離す" : "長押") : noteType === "mash" ? "連打" : "タップ";
    const statusText = `${label}: ${bonus.lastJudge} / ${bonus.score}点 / ${bonus.combo}連`;
    if (bonus.lastStatusText !== statusText) {
      dom.endingVideoStatus.textContent = statusText;
      bonus.lastStatusText = statusText;
    }
  }
  bonus.timeMs = videoMs;
  renderer.drawEndingRhythmBar(dom.endingBonusPanel, bonus);
}

function updateEndingBonus() {
  if (state.phase !== "endingVideo" || !state.endingBonus || !dom.endingVideo) return;
  const bonus = state.endingBonus;
  if (!bonus.active || dom.endingVideo.paused || dom.endingVideo.ended) {
    syncEndingBonusUi();
    return;
  }
  const videoMs = endingBonusTimeMs();
  for (let i = bonus.nextIndex; i < bonus.noteStates.length; i += 1) {
    const entry = bonus.noteStates[i];
    if (entry.resolved) continue;
    const endMs = entry.note.timeMs + (entry.note.durationMs ?? 0);
    const missAt = endMs + (entry.note.type === "mash" ? MASH_INPUT_GRACE_MS : INPUT_GRACE_MS);
    if (entry.note.type === "mash" && videoMs > missAt) {
      const result = judgeMash(entry.note, entry.mashTaps);
      resolveEndingBonusNote(i, result, `${result.count}/${result.targetCount}`);
      continue;
    }
    if (bonus.hold?.index === i) {
      if (videoMs > missAt) {
        bonus.hold = null;
        resolveEndingBonusNote(i, { rank: "miss", offsetMs: 0 });
      }
      break;
    }
    if (videoMs > missAt) {
      resolveEndingBonusNote(i, { rank: "miss", offsetMs: 0 });
      continue;
    }
    break;
  }
  syncEndingBonusUi();
}

function tapEndingBonus(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase !== "endingVideo" || !state.endingBonus || !dom.endingVideo || dom.endingVideo.paused) return;
  const bonus = state.endingBonus;
  const found = endingBonusFindNote(endingBonusTimeMs(), "tap");
  if (!found) {
    bonus.lastJudge = "TAP待ち";
    bonus.lastOffsetMs = 0;
    syncEndingBonusUi();
    return;
  }
  resolveEndingBonusNote(found.index, judgeTap(found.entry.note, endingBonusTimeMs(), state.inputOffsetMs));
  syncEndingBonusUi();
}

function startEndingBonusHold(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase !== "endingVideo" || !state.endingBonus || !dom.endingVideo || dom.endingVideo.paused) return;
  const bonus = state.endingBonus;
  if (bonus.hold) return;
  const videoMs = endingBonusTimeMs();
  const found = endingBonusFindNote(videoMs, "hold");
  if (!found) {
    bonus.lastJudge = "長押待ち";
    bonus.lastOffsetMs = 0;
    syncEndingBonusUi();
    return;
  }
  bonus.hold = { index: found.index, entry: found.entry, note: found.entry.note, downAtMs: videoMs };
  bonus.lastJudge = "離す";
  bonus.lastOffsetMs = Math.round(videoMs + state.inputOffsetMs - found.entry.note.timeMs);
  event?.currentTarget?.setPointerCapture?.(event.pointerId);
  syncEndingBonusUi();
}

function endEndingBonusHold(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const bonus = state.endingBonus;
  if (state.phase !== "endingVideo" || !bonus?.hold || !dom.endingVideo) return;
  const hold = bonus.hold;
  bonus.hold = null;
  const result = judgeHold(hold.note, hold.downAtMs, endingBonusTimeMs(), state.inputOffsetMs);
  resolveEndingBonusNote(hold.index, result);
  syncEndingBonusUi();
}

function mashEndingBonus(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase !== "endingVideo" || !state.endingBonus || !dom.endingVideo || dom.endingVideo.paused) return;
  const bonus = state.endingBonus;
  const videoMs = endingBonusTimeMs();
  const found = endingBonusFindNote(videoMs, "mash");
  if (!found) {
    bonus.lastJudge = "連打待ち";
    bonus.lastOffsetMs = 0;
    syncEndingBonusUi();
    return;
  }
  found.entry.mashTaps.push(videoMs);
  const count = judgeMash(found.entry.note, found.entry.mashTaps).count;
  bonus.lastJudge = `連打 ${count}/${found.entry.note.targetCount}`;
  bonus.lastOffsetMs = 0;
  bonus.pulseUntil = performance.now() + (state.reducedMotion ? 0 : 80);
  syncEndingBonusUi();
}

function pressSmartEndingBonus(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase !== "endingVideo" || !state.endingBonus) return;
  advanceEndingBonusCursor();
  const next = state.endingBonus.noteStates[state.endingBonus.nextIndex]?.note;
  if (next?.type === "hold") startEndingBonusHold(event);
  else if (next?.type === "mash") mashEndingBonus(event);
  else tapEndingBonus(event);
}

function releaseSmartEndingBonus(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase === "endingVideo" && state.endingBonus?.hold) endEndingBonusHold(event);
}

function cancelEndingBonusHold(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (state.phase === "endingVideo" && state.endingBonus?.hold) endEndingBonusHold(event);
}

function stopEndingVideo() {
  if (dom.endingVideo) {
    dom.endingVideo.pause();
    dom.endingVideo.currentTime = 0;
  }
  if (dom.endingVideoLayer) dom.endingVideoLayer.hidden = true;
  setFocusTrap(dom.endingVideoLayer, false);
  if (dom.endingBonusPanel) dom.endingBonusPanel.hidden = true;
}

function endingVideoSelection({ fallbackToFirstLoop = false } = {}) {
  const completedLoop = normalizeLoop(state.results?.loop ?? state.runLoop);
  const useLoopPlusVideo = !fallbackToFirstLoop && completedLoop >= 2;
  return {
    completedLoop,
    kind: useLoopPlusVideo ? "loopPlus" : "firstLoop",
    src: useLoopPlusVideo ? ENDING_VIDEO_LOOP_PLUS_SRC : ENDING_VIDEO_FIRST_LOOP_SRC,
  };
}

function applyEndingVideoSource(options) {
  if (!dom.endingVideo) return null;
  const selection = endingVideoSelection(options);
  if (dom.endingVideo.getAttribute("src") !== selection.src) {
    dom.endingVideo.setAttribute("src", selection.src);
  }
  dom.endingVideo.dataset.endingKind = selection.kind;
  dom.endingVideo.dataset.completedLoop = String(selection.completedLoop);
  return selection;
}

function finishEndingVideo() {
  if (state.phase !== "endingVideo") return;
  if (state.results) state.results.endingBonus = endingBonusSnapshot();
  showResults();
}

async function playEndingVideo() {
  if (!dom.endingVideo || !dom.endingVideoLayer) {
    showResults();
    return;
  }
  audio.stopBgm({ stopCues: true });
  setPhase("endingVideo");
  state.phaseLabel = "ED";
  setOverlay(false, "", "", "");
  const selection = applyEndingVideoSource();
  resetEndingBonus();
  dom.endingVideoLayer.hidden = false;
  setFocusTrap(dom.endingVideoLayer, true);
  if (dom.endingVideoStatus) dom.endingVideoStatus.textContent = selection?.kind === "loopPlus" ? "2周目ED読込中" : "ED読込中";
  dom.endingVideo.currentTime = 0;
  dom.endingVideo.load();
  requestRender();
  try {
    await dom.endingVideo.play();
    if (state.endingBonus) {
      state.endingBonus.active = true;
      resetEndingBonusClock();
    }
    if (dom.endingVideoStatus) dom.endingVideoStatus.textContent = "ED再生中";
  } catch (error) {
    console.warn("Ending video playback failed", error);
    if (dom.endingVideoStatus) dom.endingVideoStatus.textContent = "ED動画なし。結果へ進みます";
    window.setTimeout(() => {
      if (state.phase === "endingVideo") showResults();
    }, 900);
  }
}

function bestOf(previous, current) {
  if (!previous || current.score > previous.score) {
    return {
      score: current.score,
      rank: current.rank,
      maxCombo: current.maxCombo,
      comboBonusDamage: current.comboBonusDamage ?? 0,
      spiritFocusCount: current.spiritFocusCount ?? 0,
      spiritGuardUsedCount: current.spiritGuardUsedCount ?? 0,
      phraseGrade: current.phraseGrade ?? "",
      accuracy: accuracyFromStats(current.stats),
      clearedAt: new Date().toISOString(),
    };
  }
  return previous;
}

function accuracyFromStats(stats) {
  const total = stats.perfect + stats.good + stats.bad + stats.miss || 1;
  return Math.round(((stats.perfect + stats.good * 0.7 + stats.bad * 0.3) / total) * 1000) / 10;
}

function countStats(notes) {
  return notes.reduce(
    (acc, note) => {
      acc[note.rank] += 1;
      return acc;
    },
    { perfect: 0, good: 0, bad: 0, miss: 0 },
  );
}

function phraseRating({ stats, maxCombo, notesTotal, hp, maxHp }) {
  const total = stats.perfect + stats.good + stats.bad + stats.miss || 1;
  const accuracy = (stats.perfect + stats.good * 0.72 + stats.bad * 0.35) / total;
  const comboRate = notesTotal ? maxCombo / notesTotal : 0;
  const hpRate = maxHp ? Math.max(0, hp) / maxHp : 0;
  const phraseScore = accuracy * 72 + Math.min(1, comboRate * 1.8) * 18 + hpRate * 10 - stats.miss * 0.9;
  if (phraseScore >= 92) return "名人";
  if (phraseScore >= 82) return "泣き節";
  if (phraseScore >= 70) return "流し";
  if (phraseScore >= 56) return "稽古中";
  return "乱れ節";
}

function failGame() {
  battleSession += 1;
  audio.stopBgm({ stopCues: true });
  setPhase("defeat");
  state.phaseLabel = "敗北";
  const lang = normalizeLang(state.uiLang);
  setOverlay(true, t(lang, "overlay.defeatTitle"), t(lang, "overlay.defeatBody"), t(lang, "overlay.retry"));
}

function currentMs() {
  if (state.phase !== "battle" || state.paused) return -1;
  if (!state.battleClockReady) return -COUNT_IN_LEAD_SECONDS * 1000;
  state.bgmCorrectionMs = audio.bgmCorrectionMs();
  state.bgmDriftMs = audio.bgmSyncStatus()?.rawDriftMs ?? 0;
  return (audio.now() - state.battleStartAt) * 1000 + state.bgmCorrectionMs;
}

function findActiveMash(timeMs) {
  const adj = timeMs + state.inputOffsetMs;
  for (let i = Math.max(0, state.nextUnresolvedIndex - 2); i < state.noteStates.length; i += 1) {
    const entry = state.noteStates[i];
    const note = entry.note;
    if (note.timeMs - MASH_INPUT_GRACE_MS > adj) break;
    if (entry.resolved || note.type !== "mash") continue;
    if (adj <= note.timeMs + note.durationMs + MASH_INPUT_GRACE_MS) return { entry, index: i };
  }
  return null;
}

function appendMashTapIfActive(timeMs) {
  const mash = findActiveMash(timeMs);
  if (!mash) return false;
  if (!mash.entry.mashTaps) mash.entry.mashTaps = [];
  const before = judgeMash(mash.entry.note, mash.entry.mashTaps);
  mash.entry.mashTaps.push(timeMs + state.inputOffsetMs);
  const after = judgeMash(mash.entry.note, mash.entry.mashTaps);
  const lang = normalizeLang(state.uiLang);
  const progress = `${after.count}/${after.targetCount}`;
  mash.entry.mashLiveCount = after.count;
  state.mashFeedback = {
    count: after.count,
    targetCount: after.targetCount,
    life: 360,
    maxLife: 360,
  };
  state.inputHint = `${t(lang, "sync.inputMashActive")} ${progress}`;
  state.judgeText = `連打 ${progress}`;
  if (after.count > before.count) {
    addEffect(progress, 548, 236, after.count >= after.targetCount ? "#f6d95f" : "#ef5b4f", 360);
  }
  requestRender();
  return true;
}

function findActiveNote(timeMs, types) {
  const adj = timeMs + state.inputOffsetMs;
  const windowMs = INPUT_GRACE_MS + activeJudgementBonusMs();
  let best = null;
  for (let i = Math.max(0, state.nextUnresolvedIndex - 2); i < state.noteStates.length; i += 1) {
    const entry = state.noteStates[i];
    const note = entry.note;
    if (note.timeMs - adj > windowMs) break;
    if (entry.resolved || !types.includes(note.type)) continue;
    const distance = Math.abs(note.timeMs - adj);
    if (distance > windowMs) continue;
    const nextPriority = note === state.nextNote ? 0 : 1;
    if (!best || nextPriority < best.nextPriority || (nextPriority === best.nextPriority && distance < best.distance)) {
      best = { entry, index: i, nextPriority, distance };
    }
  }
  return best;
}

function applyEnemyDamage(rawDamage) {
  const damage = Math.max(0, rawDamage * state.damageScale);
  state.enemyHp -= damage;
  return damage;
}

function displayDamage(damage) {
  return Math.max(1, Math.round(damage));
}

function triggerHeroCombatAction(rank, noteType, damage = 0) {
  const heavy = rank === "perfect" || noteType === "mash" || damage >= 5;
  state.heroStrike = {
    life: heavy ? 620 : 460,
    maxLife: heavy ? 620 : 460,
    heavy,
    noteType,
  };
  state.enemyHit = Math.max(state.enemyHit, heavy ? 520 : 360);
}

function triggerEnemyAttack(pressure = false) {
  const life = pressure ? 620 : 500;
  state.enemyAttack = { life, maxLife: life, pressure };
  state.heroGuard = { life: 360, maxLife: 360, pressure };
  state.shake = Math.max(state.shake, pressure ? 6 : 4);
}

function triggerEnemyCallCue(entry, index) {
  if (!entry?.note?.enemyCue || entry.enemyCueShown || state.lastEnemyCueIndex === index) return;
  entry.enemyCueShown = true;
  state.lastEnemyCueIndex = index;
  const life = 430;
  state.enemyAttack = { life, maxLife: life, pressure: true, callOnly: true };
  addEffect(entry.note.callText ?? "敵の節", 602, 164, "#ef5b4f", 760);
  requestRender();
}

function resolveNote(index, rank, offsetMs = 0, detail = "", mashJudge = null) {
  const entry = state.noteStates[index];
  if (!entry || entry.resolved) return;
  if (rank === "miss" && state.spiritGuardCharges > 0) {
    state.spiritGuardCharges -= 1;
    state.spiritGuardUsedCount += 1;
    rank = "bad";
    detail = detail ? `${detail} 見切り` : "見切り";
    addEffect("見切り救済", 450, 188, "#8fd8ff", 920);
    audio.kobushiVoice("spirit");
  }
  entry.rank = rank;
  entry.resolved = true;
  state.resolvedNoteCount += 1;
  if (index === state.nextUnresolvedIndex) advanceNoteCursor();
  requestRender();

  if (rank === "miss") {
    state.combo = 0;
    const mashMiss = entry.note.type === "mash";
    if (mashMiss) {
      state.spirit = Math.max(0, state.spirit - 18);
      triggerEnemyAttack(true);
      addEffect("押し負け", 516, 238, "#ef5b4f", 760);
    } else {
      state.hp -= (state.stage.enemy?.attackPower ?? 1) * loopEnemyAttackMultiplier(state.runLoop, state.stage, state.difficulty);
      triggerEnemyAttack(entry.note.type === "hold");
    }
    state.judgeText = mashMiss ? `Miss${detail ? ` ${detail}` : ""}` : "Miss";
    syncSrJudge();
    addEffect(mashMiss ? "届かず" : "ズレた", 450, 210, mashMiss ? "#8a7a72" : "#d04b36");
    if (!state.reducedMotion) state.shake = mashMiss ? 4 : 10;
  } else {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const baseDamage = noteDamage(rank);
    const hitMultiplier = comboHitMultiplier(state.combo);
    const mashMul =
      entry.note.type === "mash" && mashJudge
        ? mashStrikeMultiplier(rank, mashJudge.count, mashJudge.targetCount)
        : 1;
    const hitRawDamage = baseDamage * hitMultiplier * mashMul;
    const scaledHitDamage = applyEnemyDamage(hitRawDamage);
    triggerHeroCombatAction(rank, entry.note.type, scaledHitDamage);
    const hitBonusDamage = Math.max(0, scaledHitDamage - baseDamage * state.damageScale);
    state.comboBonusDamage += hitBonusDamage;
    if (mashMul > 1.02) {
      addEffect(`連打 ×${mashMul.toFixed(2)}`, 520, 228, "#ef5b4f", 720);
      if (mashMul >= 1.45 && state.combo % 10 !== 0) audio.kobushiVoice("mash");
    }
    if (hitMultiplier > 1) {
      if (hitBonusDamage > 0 && state.combo % 5 !== 0) {
        addEffect(`連撃 x${hitMultiplier.toFixed(2)}`, 574, 250, "#ffefe0", 620);
      }
    }
    const comboBonus = comboBonusDamage(state.combo, baseDamage);
    if (comboBonus > 0) {
      const scaledComboBonus = applyEnemyDamage(comboBonus * mashMul);
      state.comboBonusDamage += scaledComboBonus;
      state.enemyHit = Math.max(state.enemyHit, state.combo % 10 === 0 ? 960 : 620);
      audio.comboCue(state.combo);
      if (state.combo % 10 === 0) {
        triggerSpecialMove(displayDamage(scaledComboBonus));
      } else {
        spawnPetals(36);
        addEffect(`コブシ${state.combo}連`, 354, 150, "#f6d95f", 980);
        addEffect(`追撃 +${displayDamage(scaledComboBonus)}`, 626, 214, "#ff8f70", 820);
        if (!state.reducedMotion) state.shake = Math.max(state.shake, 14);
      }
    }
    const finisherBonus = finisherBonusDamage(entry.note, rank);
    if (finisherBonus > 0) {
      const scaledFinisherBonus = applyEnemyDamage(finisherBonus * mashMul);
      state.comboBonusDamage += scaledFinisherBonus;
      state.enemyHit = Math.max(state.enemyHit, 720);
      spawnPetals(state.combo >= 10 ? 70 : 42);
      addEffect("決着節", 386, 176, "#f6d95f", 920);
      addEffect(`追撃 +${displayDamage(scaledFinisherBonus)}`, 632, 236, "#ff8f70", 760);
      if (!state.reducedMotion) state.shake = Math.max(state.shake, 12);
    }
    state.spirit = Math.max(0, Math.min(100, state.spirit + noteSpirit(rank)));
    state.judgeText = `${rank.toUpperCase()} ${offsetMs ? `${offsetMs}ms` : detail}`;
    syncSrJudge();
    addEffect(rank.toUpperCase(), 430, 210, rank === "perfect" ? "#f6d95f" : "#ffffff");
    if (state.spirit >= 100) {
      state.spirit = 0;
      triggerSpiritFocus();
    }
    if (state.enemyHp <= 0) {
      clearStageByEnemyHp();
      return;
    }
  }

  if (state.hp <= 0) failGame();
}

function addEffect(text, x, y, color, life = 760) {
  state.effects.push({ text, x, y, color, life, maxLife: life });
}

function triggerSpecialMove(damage) {
  const internalDestruction = hasInternalDestruction();
  renderer.preloadCutinImage?.();
  state.specialCutin = { life: 1650, maxLife: 1650, damage, internalDestruction };
  audio.kobushiVoice("special");
  spawnPetals(140, true);
  addEffect(`${internalDestruction ? "奥義 内部破壊" : "大追撃"} ${state.combo}連`, 210, 104, "#f6d95f", 1350);
  addEffect(`大追撃 +${damage}`, 600, 172, "#ffefe0", 1100);
  if (!state.reducedMotion) state.shake = Math.max(state.shake, 26);
}

function activeJudgementBonusMs() {
  return state.spiritFocusMs > 0 ? SPIRIT_FOCUS_WINDOW_BONUS_MS : 0;
}

function triggerSpiritFocus() {
  state.spiritFocusMs = SPIRIT_FOCUS_DURATION_MS;
  state.spiritFocusCount += 1;
  state.spiritGuardCharges = 1;
  audio.cheer();
  audio.kobushiVoice("spirit");
  state.focusEffect = {
    life: 1500,
    maxLife: 1500,
    text: "見切り節",
  };
  spawnPetals(70, true);
  addEffect("見切り節", 312, 168, "#8fd8ff", 1350);
  addEffect(`判定+${SPIRIT_FOCUS_WINDOW_BONUS_MS}ms`, 604, 214, "#f6d95f", 1100);
  if (!state.reducedMotion) state.shake = Math.max(state.shake, 10);
}

function spawnPetals(count, burst = false) {
  const actualCount = state.reducedMotion ? Math.ceil(count * 0.25) : count;
  for (let i = 0; i < actualCount; i += 1) {
    const layer = Math.random();
    const fromTop = !state.reducedMotion && burst && Math.random() < 0.45;
    state.petals.push({
      x: fromTop ? Math.random() * 980 : 860 + Math.random() * 260,
      y: fromTop ? -30 - Math.random() * 90 : 10 + Math.random() * 490,
      vx: state.reducedMotion ? 0 : -1.8 - Math.random() * (burst ? 5.2 : 3.2) - layer * 1.2,
      vy: state.reducedMotion ? 0 : (fromTop ? 1.4 : 0.18) + Math.random() * (burst ? 1.9 : 1.1),
      spin: Math.random() * Math.PI,
      rotSpeed: state.reducedMotion ? 0 : (Math.random() * 0.18 + 0.06) * (Math.random() < 0.5 ? -1 : 1),
      sway: state.reducedMotion ? 0 : 0.5 + Math.random() * 2.8,
      wave: Math.random() * Math.PI * 2,
      layer,
      size: 5 + Math.random() * (burst ? 14 : 10),
      life: (burst ? 3100 : 2400) + Math.random() * 1500,
      maxLife: burst ? 4600 : 3900,
    });
  }
  if (state.petals.length > 260) state.petals.splice(0, state.petals.length - 260);
}

function onInputDown(event) {
  event.preventDefault();
  if (state.paused) return;
  void resumeAudioForInput();
  if (event.pointerId !== undefined && event.currentTarget?.setPointerCapture) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  if (state.phase !== "battle") return;
  if (!state.battleClockReady) return;
  const timeMs = currentMs();
  if (appendMashTapIfActive(timeMs)) return;

  const hold = findActiveNote(timeMs, ["hold"]);
  if (hold && Math.abs(timeMs + state.inputOffsetMs - hold.entry.note.timeMs) <= INPUT_GRACE_MS) {
    state.hold = {
      index: hold.index,
      note: hold.entry.note,
      downAtMs: timeMs,
    };
    state.inputHint = "白い「離す」が判定線に来たら離す";
    return;
  }

  const tap = findActiveNote(timeMs, ["tap"]);
  if (tap && tap.distance <= INPUT_GRACE_MS) {
    const result = judgeTap(tap.entry.note, timeMs, state.inputOffsetMs, activeJudgementBonusMs());
    resolveNote(tap.index, result.rank, result.offsetMs);
  }
}

function onInputUp(event) {
  event.preventDefault();
  if (state.paused) return;
  if (event.pointerId !== undefined && event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  if (!state.hold || state.phase !== "battle") return;
  if (!state.battleClockReady) return;
  const result = judgeHold(state.hold.note, state.hold.downAtMs, currentMs(), state.inputOffsetMs, activeJudgementBonusMs());
  resolveNote(state.hold.index, result.rank, result.offsetMs);
  state.hold = null;
  state.inputHint = "次の拍へ";
}

function isMobileBattleViewport() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches
  );
}

function shouldUseMobileBlankTapArea(event) {
  if (state.phase !== "battle" || state.paused || !isMobileBattleViewport()) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return !target.closest(".topbar, .gameSurface, .settings, .helpGuide, .overlay, .pauseMenu, button, input, select, textarea, a");
}

function onMobileBlankTapDown(event) {
  if (!shouldUseMobileBlankTapArea(event)) return;
  onInputDown(event);
}

function onMobileBlankTapUp(event) {
  if (!shouldUseMobileBlankTapArea(event)) return;
  onInputUp(event);
}

function updateNotes() {
  if (state.phase !== "battle" || state.paused) return;
  if (!state.battleClockReady) {
    state.battleTimeMs = -COUNT_IN_LEAD_SECONDS * 1000;
    return;
  }
  const timeMs = currentMs();
  if (state.spaceHeld) appendMashTapIfActive(timeMs);
  state.battleTimeMs = timeMs;
  advanceNoteCursor();
  const langHint = normalizeLang(state.uiLang);
  const activeMash = findActiveMash(timeMs);
  if (activeMash) {
    state.inputHint = t(langHint, "sync.inputMashActive");
  } else if (state.nextNote) {
    state.inputHint = state.nextNote.enemyCue ? `${state.nextNote.callText ?? "敵の節"}を返す` : `${nextNoteLabel(state.nextNote)} を待つ`;
  }

  const nextEntry = state.noteStates[state.nextUnresolvedIndex];
  if (nextEntry?.note?.enemyCue && timeMs >= nextEntry.note.timeMs - 900 && timeMs <= nextEntry.note.timeMs + 140) {
    triggerEnemyCallCue(nextEntry, state.nextUnresolvedIndex);
  }

  for (let i = state.nextUnresolvedIndex; i < state.noteStates.length; i += 1) {
    const entry = state.noteStates[i];
    if (entry.resolved) {
      if (i === state.nextUnresolvedIndex) advanceNoteCursor();
      continue;
    }
    const note = entry.note;
    const missAt =
      note.type === "mash"
        ? note.timeMs + note.durationMs + MASH_INPUT_GRACE_MS
        : note.timeMs + (note.durationMs ?? 0) + INPUT_GRACE_MS + activeJudgementBonusMs();
    if (state.hold?.index === i && timeMs <= missAt) break;
    if (timeMs <= missAt) break;
    if (timeMs > missAt) {
      if (state.hold?.index === i) state.hold = null;
      if (note.type === "mash") {
        const judged = judgeMash(note, entry.mashTaps ?? []);
        resolveNote(i, judged.rank, 0, `${judged.count}/${judged.targetCount}`, judged);
      } else {
        resolveNote(i, "miss");
      }
      if (state.phase !== "battle") return;
    }
  }

  const chartDoneAt = state.noteStates.at(-1)?.note.timeMs + (state.noteStates.at(-1)?.note.durationMs ?? 0) + 1400;
  if (timeMs > chartDoneAt && state.resolvedNoteCount >= state.noteStates.length) {
    beginRest();
  }
}

function updateTimedEffects(dt) {
  let write = 0;
  for (const fx of state.effects) {
    fx.y -= dt * 0.025;
    fx.life -= dt;
    if (fx.life > 0) {
      state.effects[write] = fx;
      write += 1;
    }
  }
  state.effects.length = write;
}

function updatePetals(dt) {
  let write = 0;
  const motionScale = dt / 16.67;
  for (const petal of state.petals) {
    if (!state.reducedMotion) {
      petal.x += (petal.vx + Math.sin(state.elapsed / 210 + petal.wave) * petal.sway) * motionScale;
      petal.y += petal.vy * motionScale;
      petal.spin += petal.rotSpeed * motionScale;
    }
    petal.life -= dt;
    if (petal.life > 0 && petal.x > -110 && petal.y < 650) {
      state.petals[write] = petal;
      write += 1;
    }
  }
  state.petals.length = write;
}

function hasActiveVisualMotion() {
  return Boolean(
    state.effects.length ||
      state.petals.length ||
      state.specialCutin ||
      state.mashFeedback ||
      state.focusEffect ||
      state.heroStrike ||
      state.enemyAttack ||
      state.heroGuard ||
      state.enemyHit > 0 ||
      state.shake > 0,
  );
}

function renderIntervalForPhase() {
  if (state.phase === "battle") {
    if (isMobileLikeViewport()) return MOBILE_BATTLE_RENDER_INTERVAL_MS;
    if (state.reducedMotion) return REDUCED_BATTLE_RENDER_INTERVAL_MS;
    return DESKTOP_BATTLE_RENDER_INTERVAL_MS;
  }
  if (state.phase === "intro") return INTRO_RENDER_INTERVAL_MS;
  return STATIC_RENDER_INTERVAL_MS;
}

function update(now) {
  if (state.paused) {
    requestAnimationFrame(update);
    return;
  }
  const dt = Math.min(40, now - state.elapsed);
  state.elapsed = now;
  state.phaseElapsed = now - state.phaseStartedAt;
  state.spiritFocusMs = Math.max(0, state.spiritFocusMs - dt);
  if (state.spiritFocusMs <= 0) state.spiritGuardCharges = 0;
  updateNotes();
  updateEndingBonus();
  updateTimedEffects(dt);
  if (state.specialCutin) {
    state.specialCutin.life -= dt;
    if (state.specialCutin.life <= 0) state.specialCutin = null;
  }
  if (state.mashFeedback) {
    state.mashFeedback.life -= dt;
    if (state.mashFeedback.life <= 0) state.mashFeedback = null;
  }
  if (state.focusEffect) {
    state.focusEffect.life -= dt;
    if (state.focusEffect.life <= 0) state.focusEffect = null;
  }
  if (state.heroStrike) {
    state.heroStrike.life -= dt;
    if (state.heroStrike.life <= 0) state.heroStrike = null;
  }
  if (state.enemyAttack) {
    state.enemyAttack.life -= dt;
    if (state.enemyAttack.life <= 0) state.enemyAttack = null;
  }
  if (state.heroGuard) {
    state.heroGuard.life -= dt;
    if (state.heroGuard.life <= 0) state.heroGuard = null;
  }
  state.enemyHit = Math.max(0, state.enemyHit - dt);
  updatePetals(dt);
  state.shake = Math.max(0, state.shake - dt * 0.06);
  const interval = renderIntervalForPhase();
  const dynamicPhase = state.phase === "battle" || state.phase === "intro" || state.phase === "endingVideo" || hasActiveVisualMotion();
  const elapsedSinceRender = now - lastRenderAt;
  const shouldRender =
    renderDirty ||
    (dynamicPhase && elapsedSinceRender + RENDER_INTERVAL_EPSILON_MS >= interval) ||
    elapsedSinceRender >= STATIC_RENDER_INTERVAL_MS;
  if (shouldRender) {
    renderer.syncDom(dom, renderDirty);
    ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    renderer.draw();
    renderDirty = false;
    lastRenderAt = now;
  }
  requestAnimationFrame(update);
}

function syncSettings() {
  const lang = normalizeLang(state.uiLang);
  document.documentElement.lang = lang === "en" ? "en" : "ja";
  document.documentElement.dataset.uiLang = lang;
  document.documentElement.dataset.phase = state.phase;
  audio.setEnabled(state.audioEnabled);
  dom.muteButton.textContent = state.audioEnabled ? t(lang, "settings.muteOn") : t(lang, "settings.muteOff");
  dom.offsetRange.value = String(state.inputOffsetMs);
  dom.offsetLabel.textContent = `${state.inputOffsetMs}ms`;
  dom.motionButton.textContent =
    state.reducedMotionOverride === "auto"
      ? t(lang, "settings.motionAuto")
      : state.reducedMotionOverride === "on"
        ? t(lang, "settings.motionOn")
        : t(lang, "settings.motionOff");
  dom.resetButton.textContent = t(lang, "settings.reset");
  const sum = dom.settingsRoot?.querySelector("summary");
  if (sum) sum.textContent = t(lang, "settings.summary");
  if (dom.langJaButton) {
    dom.langJaButton.setAttribute("aria-pressed", String(lang === "ja"));
    dom.langJaButton.textContent = t(lang, "settings.langJa");
  }
  if (dom.langEnButton) {
    dom.langEnButton.setAttribute("aria-pressed", String(lang === "en"));
    dom.langEnButton.textContent = t(lang, "settings.langEn");
  }
  if (dom.portraitDismiss) dom.portraitDismiss.textContent = t(lang, "portrait.dismiss");
  const ph = dom.portraitHint?.querySelector(".portraitHintText");
  if (ph) ph.textContent = t(lang, "portrait.text");
  const helpSum = dom.helpGuide?.querySelector("summary");
  if (helpSum) helpSum.textContent = t(lang, "help.summary");
  if (dom.playerHpLabel) dom.playerHpLabel.textContent = t(lang, "hud.playerName");
  if (dom.spiritLabel) dom.spiritLabel.textContent = t(lang, "hud.spirit");
  syncPauseUi();
  for (const button of dom.difficultySelect.querySelectorAll("button[data-difficulty]")) {
    const selected = button.dataset.difficulty === state.difficulty;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-checked", String(selected));
  }
  document.documentElement.classList.toggle("muted", !state.audioEnabled);
  if (state.phase === "opening") refreshOpeningOverlay();
  if (state.phase === "title") refreshTitleOverlay();
  requestRender();
}

async function waitForCanvasFonts() {
  if (!document.fonts?.ready) return;
  const timeout = new Promise((resolve) => {
    window.setTimeout(resolve, CANVAS_FONT_READY_TIMEOUT_MS);
  });
  await Promise.race([
    Promise.all([
      document.fonts.load('700 20px "JiiKobushiNotoSansJP"'),
      document.fonts.ready,
    ]).catch(() => {}),
    timeout,
  ]);
}

dom.difficultySelect.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-difficulty]");
  if (!button || !DIFFICULTIES[button.dataset.difficulty]) return;
  state.difficulty = button.dataset.difficulty;
  syncRunLoopForDifficulty();
  syncSettings();
  save();
});

dom.primaryButton.addEventListener("click", async () => {
  if (dom.primaryButton.disabled) return;
  requestLandscapeOrientation();
  dom.primaryButton.disabled = true;
  try {
    await ensureAudioReady();
    if (state.phase === "opening") {
      if (state.audioEnabled) audio.menuCue();
      showTitleFromOpening();
    } else if (state.phase === "title") {
      if (state.audioEnabled) audio.menuCue();
      startGame();
    } else if (state.phase === "intro") {
      advanceIntro();
    } else if (state.phase === "rest") {
      advanceRest();
    } else if (state.phase === "finalReveal") {
      advanceFinalReveal();
    } else if (state.phase === "ending") {
      await playEndingVideo();
    } else if (state.phase === "results") {
      if (state.audioEnabled) audio.menuCue();
      startGame({ continueLoop: true });
    } else if (state.phase === "defeat") {
      await retryCurrentStage();
    }
  } finally {
    dom.primaryButton.disabled = false;
  }
});

dom.endingVideo?.addEventListener("ended", finishEndingVideo);
dom.endingVideo?.addEventListener("error", async () => {
  if (state.phase !== "endingVideo") return;
  if (dom.endingVideo.dataset.endingKind === "loopPlus") {
    if (dom.endingVideoStatus) dom.endingVideoStatus.textContent = "2周目ED読込失敗。通常EDへ切替";
    applyEndingVideoSource({ fallbackToFirstLoop: true });
    dom.endingVideo.load();
    try {
      await dom.endingVideo.play();
      if (state.endingBonus) {
        state.endingBonus.active = true;
        resetEndingBonusClock();
      }
      return;
    } catch (error) {
      console.warn("Ending fallback video playback failed", error);
    }
  }
  if (dom.endingVideoStatus) dom.endingVideoStatus.textContent = "ED読込失敗";
  window.setTimeout(() => {
    if (state.phase === "endingVideo") showResults();
  }, 900);
});

dom.endingVideoSkip?.addEventListener("click", finishEndingVideo);
dom.endingBonusPanel?.addEventListener("pointerdown", pressSmartEndingBonus);
dom.endingBonusPanel?.addEventListener("pointerup", releaseSmartEndingBonus);
dom.endingBonusPanel?.addEventListener("pointercancel", cancelEndingBonusHold);
dom.endingVideoChrome?.addEventListener("pointerdown", (event) => {
  if (event.target?.closest?.("#endingVideoSkip")) return;
  pressSmartEndingBonus(event);
});
dom.endingVideoChrome?.addEventListener("pointerup", (event) => {
  if (event.target?.closest?.("#endingVideoSkip")) return;
  releaseSmartEndingBonus(event);
});
dom.endingVideoChrome?.addEventListener("pointercancel", (event) => {
  if (event.target?.closest?.("#endingVideoSkip")) return;
  cancelEndingBonusHold(event);
});

dom.skipButton.addEventListener("click", async () => {
  await ensureAudioReady();
  if (state.phase === "intro") {
    if (isCurrentStageCleared()) {
      skipClearedStage();
      return;
    }
    state.lineIndex = state.stage.introLines.length;
    advanceIntro();
  } else if (state.phase === "rest") {
    advanceRest();
  }
});

dom.openSettingsButton?.addEventListener("click", () => {
  openSettingsPanel({ focusOffset: true });
});
dom.openHelpButton?.addEventListener("click", openHelpPanel);
dom.settingsRoot?.addEventListener("toggle", () => {
  if (dom.settingsRoot.open) return;
  document.documentElement.classList.remove("show-settings-popout");
  syncPauseUi();
});
dom.helpGuide?.addEventListener("toggle", () => {
  if (dom.helpGuide.open) return;
  document.documentElement.classList.remove("show-help-popout");
  syncPauseUi();
});

dom.pauseButton?.addEventListener("click", () => {
  void pauseGame();
});
dom.resumeButton?.addEventListener("click", () => {
  void resumeGame();
});
dom.pauseOffsetButton?.addEventListener("click", () => {
  openSettingsPanel({ focusOffset: true });
});
dom.pauseHelpButton?.addEventListener("click", openHelpPanel);
dom.pauseSettingsButton?.addEventListener("click", () => {
  openSettingsPanel({ focusOffset: false });
});
dom.saveRunButton?.addEventListener("click", () => {
  saveCurrentRunFromUi(dom.pauseText);
});
dom.quickSaveButton?.addEventListener("click", () => {
  if (isQuickSaveLocked()) return;
  saveCurrentRunFromUi(null, { quick: true });
});
dom.returnTitleButton?.addEventListener("click", returnToTitleFromPause);
dom.loadFirstButton?.addEventListener("click", () => loadRunSnapshot(RUN_SAVE_SLOTS.firstLoop));
dom.loadLoopPlusButton?.addEventListener("click", () => loadRunSnapshot(RUN_SAVE_SLOTS.loopPlus));
dom.pauseLoadFirstButton?.addEventListener("click", () => loadRunSnapshot(RUN_SAVE_SLOTS.firstLoop));
dom.pauseLoadLoopPlusButton?.addEventListener("click", () => loadRunSnapshot(RUN_SAVE_SLOTS.loopPlus));
canvas.addEventListener("pointerdown", onInputDown);
canvas.addEventListener("pointerup", onInputUp);
canvas.addEventListener("pointercancel", onInputUp);
dom.mobileTapPad?.addEventListener("pointerdown", onInputDown);
dom.mobileTapPad?.addEventListener("pointerup", onInputUp);
dom.mobileTapPad?.addEventListener("pointercancel", onInputUp);
dom.shell.addEventListener("pointerdown", onMobileBlankTapDown);
dom.shell.addEventListener("pointerup", onMobileBlankTapUp);
dom.shell.addEventListener("pointercancel", onMobileBlankTapUp);
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (state.paused) void resumeGame();
    else void pauseGame();
    return;
  }
  if (event.code === "Space") {
    state.spaceHeld = true;
    if (state.phase === "endingVideo") {
      if (!event.repeat) pressSmartEndingBonus(event);
      return;
    }
    if (event.repeat) {
      if (state.phase === "battle" && state.battleClockReady) {
        void resumeAudioForInput();
        appendMashTapIfActive(currentMs());
      }
      return;
    }
    onInputDown(event);
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    state.spaceHeld = false;
    if (state.phase === "endingVideo") {
      releaseSmartEndingBonus(event);
      return;
    }
    onInputUp(event);
  }
});

dom.muteButton.addEventListener("click", () => {
  state.audioEnabled = !state.audioEnabled;
  syncSettings();
  save();
});

dom.offsetRange.addEventListener("input", () => {
  state.inputOffsetMs = Number(dom.offsetRange.value);
  syncSettings();
  save();
});

dom.motionButton.addEventListener("click", () => {
  state.reducedMotionOverride =
    state.reducedMotionOverride === "auto" ? "on" : state.reducedMotionOverride === "on" ? "off" : "auto";
  syncSettings();
  save();
});

dom.resetButton.addEventListener("click", () => {
  if (!window.confirm(t(normalizeLang(state.uiLang), "confirm.reset"))) return;
  safeRemoveStorage(STORAGE_KEY, "remove");
  state.bestScores = {};
  state.clearedStages = [];
  state.runSaves = loadRunSaves(null);
  state.inputOffsetMs = 0;
  state.audioEnabled = true;
  state.reducedMotionOverride = "auto";
  state.difficulty = DEFAULT_DIFFICULTY;
  state.runLoops = loadRunLoops(null);
  state.runLoop = 1;
  state.uiLang = "ja";
  state.portraitHintDismissed = false;
  syncSettings();
  save();
});

const handleReducedMotionChange = (event) => {
  nativeReducedMotion = event.matches;
  syncSettings();
};
if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
else reducedMotionQuery.addListener?.(handleReducedMotionChange);
window.addEventListener("resize", () => {
  syncViewportVars();
  resizeCanvasForDpr();
  updatePortraitHint();
});
window.visualViewport?.addEventListener("resize", () => {
  syncViewportVars();
  resizeCanvasForDpr();
  updatePortraitHint();
});
window.addEventListener("orientationchange", () => {
  syncViewportVars();
  resizeCanvasForDpr();
  updatePortraitHint();
});

dom.langJaButton?.addEventListener("click", () => {
  state.uiLang = "ja";
  save();
  syncSettings();
});
dom.langEnButton?.addEventListener("click", () => {
  state.uiLang = "en";
  save();
  syncSettings();
});
dom.portraitDismiss?.addEventListener("click", () => {
  state.portraitHintDismissed = true;
  save();
  updatePortraitHint();
});

async function boot() {
  syncViewportVars();
  syncSettings();
  updatePortraitHint();
  if (dom.helpGuide && !safeGetStorage("jiiKobushi:onboarding:v1", "load")) {
    dom.helpGuide.open = true;
    safeSetStorage("jiiKobushi:onboarding:v1", "1", "save");
  }
  await waitForCanvasFonts();
  requestAnimationFrame(update);
}

boot();
