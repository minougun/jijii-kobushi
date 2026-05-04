export const BGM_TRACKS = {
  koiwazurai: { src: "./assets/audio/koiwazurai.mp3", volume: 0.78 },
  oboro: { src: "./assets/audio/oboro.mp3", volume: 0.78 },
  hanagoyomi: { src: "./assets/audio/hanagoyomi2.mp3", volume: 0.76 },
  harvestFestival: { src: "./assets/audio/harvest-festival.mp3", volume: 0.78 },
  taishoroman: { src: "./assets/audio/taishoroman-battle.mp3", volume: 0.8 },
  shizima: { src: "./assets/audio/shizima4.mp3", volume: 0.78 },
  retroromanBattle: { src: "./assets/audio/retroroman-battle3.mp3", volume: 0.8 },
  retroromanCity: { src: "./assets/audio/retroroman-city.mp3", volume: 0.78 },
  amenoshita: { src: "./assets/audio/amenoshita3.mp3", volume: 0.76 },
  epicbattle: { src: "./assets/audio/epicbattle-j.mp3", volume: 0.78 },
};

const DEFAULT_BGM_ID = "koiwazurai";
const MAX_BGM_CORRECTION_MS = 500;
const CUE_LOOKAHEAD_SECONDS = 3.6;
const CUE_SCHEDULE_INTERVAL_MS = 550;

export function createAudioEngine() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const engine = {
    ctx: null,
    enabled: true,
    master: null,
    cueGain: null,
    bgmGain: null,
    bgmSource: null,
    bgmToneFilter: null,
    bgmBuffers: new Map(),
    bgmBufferPromises: new Map(),
    bgmBufferKept: null,
    bgmTrackId: DEFAULT_BGM_ID,
    bgmTrackGain: null,
    bgmTimers: [],
    cueScheduleTimer: null,
    cueScheduleToken: 0,
    bgmSync: null,
    bgmStartToken: 0,
    lastBgmError: "",
    startAt: 0,
  };

  function ensure() {
    if (!AudioContextClass) return null;
    if (!engine.ctx) {
      engine.ctx = new AudioContextClass();
      engine.master = engine.ctx.createGain();
      engine.master.gain.value = engine.enabled ? 0.55 : 0.0001;
      engine.master.connect(engine.ctx.destination);
      engine.bgmGain = engine.ctx.createGain();
      engine.bgmGain.gain.value = 0.62;
      engine.bgmGain.connect(engine.master);
      const initialTrack = BGM_TRACKS[DEFAULT_BGM_ID];
      engine.bgmTrackGain = engine.ctx.createGain();
      engine.bgmTrackGain.gain.value = initialTrack.volume;
      engine.bgmToneFilter = engine.ctx.createBiquadFilter();
      engine.bgmToneFilter.type = "peaking";
      engine.bgmToneFilter.frequency.value = 900;
      engine.bgmToneFilter.Q.value = 0.8;
      engine.bgmToneFilter.gain.value = 0;
      engine.bgmToneFilter.connect(engine.bgmTrackGain);
      engine.bgmTrackGain.connect(engine.bgmGain);
    }
    if (!engine.cueGain) {
      engine.cueGain = engine.ctx.createGain();
      engine.cueGain.gain.value = 1;
      engine.cueGain.connect(engine.master);
    }
    return engine.ctx;
  }

  async function resume() {
    const ctx = ensure();
    if (!ctx) return false;
    if (ctx.state !== "running") {
      await ctx.resume().catch(() => {});
    }
    return ctx.state === "running";
  }

  async function suspend() {
    const ctx = ensure();
    if (!ctx) return false;
    if (ctx.state === "running") {
      await ctx.suspend().catch(() => {});
    }
    return ctx.state === "suspended";
  }

  async function unlock() {
    const ctx = ensure();
    if (!ctx) return false;
    const running = await resume();
    if (!running) return false;
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    silent.connect(engine.master);
    silent.start(ctx.currentTime);
    return true;
  }

  function setEnabled(enabled) {
    engine.enabled = enabled;
    if (engine.master) {
      engine.master.gain.setTargetAtTime(enabled ? 0.55 : 0.0001, engine.ctx.currentTime, 0.02);
    }
    if (!enabled) stopBgm();
  }

  function stopScheduledCues() {
    engine.cueScheduleToken += 1;
    if (engine.cueScheduleTimer) {
      window.clearTimeout(engine.cueScheduleTimer);
      engine.cueScheduleTimer = null;
    }
    if (engine.cueGain) {
      try {
        engine.cueGain.disconnect();
      } catch {
      }
      engine.cueGain = null;
    }
  }

  function stopBgm({ stopCues = false } = {}) {
    for (const timer of engine.bgmTimers) window.clearTimeout(timer);
    engine.bgmTimers = [];
    engine.bgmStartToken += 1;
    engine.bgmSync = null;
    if (stopCues) stopScheduledCues();
    if (!engine.bgmSource) return;
    try {
      engine.bgmSource.stop();
    } catch {
    }
    engine.bgmSource.disconnect();
    engine.bgmSource = null;
  }

  function resetBgmSync(startAt, mediaStartSeconds, trackId) {
    engine.bgmSync = {
      trackId,
      startAt,
      mediaStartSeconds,
      playRequestedAt: null,
      playResolvedAt: null,
      playing: false,
      rawDriftMs: 0,
      correctionMs: 0,
      correctionLocked: false,
      samples: 0,
    };
  }

  function measureBgmDrift() {
    const sync = engine.bgmSync;
    if (!sync) return 0;
    sync.rawDriftMs = 0;
    sync.correctionMs = 0;
    sync.correctionLocked = true;
    sync.samples = Math.max(sync.samples, 1);
    return sync.correctionMs;
  }

  function trackFor(profile = {}) {
    const selectedId = profile.track ?? DEFAULT_BGM_ID;
    return {
      id: BGM_TRACKS[selectedId] ? selectedId : DEFAULT_BGM_ID,
      track: BGM_TRACKS[selectedId] ?? BGM_TRACKS[DEFAULT_BGM_ID],
    };
  }

  function applyBgmTone(profile = {}) {
    const filter = engine.bgmToneFilter;
    const ctx = engine.ctx;
    if (!filter || !ctx) return;
    const tone = profile.tone ?? "neutral";
    const set = ({ type, frequency, q = 0.8, gain = 0 }) => {
      filter.type = type;
      filter.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.02);
      filter.Q.setTargetAtTime(q, ctx.currentTime, 0.02);
      filter.gain.setTargetAtTime(gain, ctx.currentTime, 0.02);
    };
    if (tone === "warm") set({ type: "lowshelf", frequency: 360, gain: 2.4 });
    else if (tone === "night") set({ type: "lowpass", frequency: 5200, q: 0.72 });
    else if (tone === "bright") set({ type: "highshelf", frequency: 2400, gain: 2 });
    else if (tone === "battle") set({ type: "peaking", frequency: 1180, q: 1.1, gain: 2.8 });
    else if (tone === "final") set({ type: "lowshelf", frequency: 280, gain: 3.2 });
    else if (tone === "boss") set({ type: "peaking", frequency: 760, q: 0.9, gain: 3.5 });
    else set({ type: "peaking", frequency: 900, q: 0.8, gain: 0 });
  }

  async function loadBgmBuffer(trackId) {
    const ctx = ensure();
    if (!ctx) return null;
    if (engine.bgmBuffers.has(trackId)) return engine.bgmBuffers.get(trackId);
    if (engine.bgmBufferPromises.has(trackId)) return engine.bgmBufferPromises.get(trackId);
    const track = BGM_TRACKS[trackId] ?? BGM_TRACKS[DEFAULT_BGM_ID];
    const promise = fetch(track.src)
      .then((response) => {
        if (!response.ok) throw new Error(`BGM fetch failed: ${track.src}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        if (engine.bgmBufferKept && !engine.bgmBufferKept.has(trackId)) {
          engine.bgmBufferPromises.delete(trackId);
          return null;
        }
        engine.bgmBuffers.set(trackId, buffer);
        engine.bgmBufferPromises.delete(trackId);
        return buffer;
      })
      .catch((error) => {
        engine.bgmBufferPromises.delete(trackId);
        throw error;
      });
    engine.bgmBufferPromises.set(trackId, promise);
    return promise;
  }

  async function prepareBgm(profile = {}) {
    if (profile.gain === 0) return null;
    const { id } = trackFor(profile);
    return loadBgmBuffer(id).catch(() => null);
  }

  function releaseBgmExcept(trackIds = []) {
    const keep = new Set(trackIds.filter((trackId) => BGM_TRACKS[trackId]));
    keep.add(DEFAULT_BGM_ID);
    engine.bgmBufferKept = keep;
    for (const trackId of engine.bgmBuffers.keys()) {
      if (!keep.has(trackId)) engine.bgmBuffers.delete(trackId);
    }
  }

  async function startBgmAt(startAt, durationMs, profile = {}) {
    const ctx = ensure();
    if (!ctx || !engine.enabled) return false;
    stopBgm();
    if (durationMs < 60000) return false;
    const token = engine.bgmStartToken + 1;
    engine.bgmStartToken = token;
    const { id: selectedId, track } = trackFor(profile);
    const mediaStartSeconds = profile.startSeconds ?? 0;
    resetBgmSync(startAt, mediaStartSeconds, selectedId);
    if (engine.bgmGain) {
      engine.bgmGain.gain.setTargetAtTime(profile.gain ?? 0.62, ctx.currentTime, 0.02);
    }
    applyBgmTone(profile);
    if (engine.bgmTrackGain) engine.bgmTrackGain.gain.setTargetAtTime(track.volume, ctx.currentTime, 0.02);
    let activeTrackId = selectedId;
    let activeTrack = track;
    let buffer = await loadBgmBuffer(selectedId).catch((error) => {
      engine.lastBgmError = `${selectedId}: ${error?.message ?? error}`;
      return null;
    });
    if (!buffer && selectedId !== DEFAULT_BGM_ID) {
      activeTrackId = DEFAULT_BGM_ID;
      activeTrack = BGM_TRACKS[DEFAULT_BGM_ID];
      buffer = await loadBgmBuffer(DEFAULT_BGM_ID).catch((error) => {
        engine.lastBgmError = `${DEFAULT_BGM_ID}: ${error?.message ?? error}`;
        return null;
      });
      resetBgmSync(startAt, mediaStartSeconds, activeTrackId);
    }
    if (!buffer || token !== engine.bgmStartToken || !engine.enabled) {
      if (engine.bgmSync?.trackId === activeTrackId) engine.bgmSync.playing = false;
      return false;
    }
    await resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1;
    source.connect(engine.bgmToneFilter ?? engine.bgmTrackGain);
    const actualStartAt = Math.max(startAt, ctx.currentTime + 0.035);
    const playable = Math.max(0.1, buffer.duration - mediaStartSeconds);
    const requested = durationMs / 1000 + 0.9;
    if (playable < requested) {
      source.loop = true;
      source.loopStart = mediaStartSeconds;
      source.loopEnd = buffer.duration;
    }
    engine.bgmSource = source;
    engine.bgmTrackId = activeTrackId;
    if (engine.bgmTrackGain) engine.bgmTrackGain.gain.setTargetAtTime(activeTrack.volume, ctx.currentTime, 0.02);
    if (engine.bgmSync) {
      engine.bgmSync.startAt = actualStartAt;
      engine.bgmSync.playRequestedAt = ctx.currentTime;
      engine.bgmSync.playResolvedAt = actualStartAt;
      engine.bgmSync.playing = true;
    }
    source.onended = () => {
      if (engine.bgmSource === source) engine.bgmSource = null;
      if (engine.bgmSync?.trackId === activeTrackId) engine.bgmSync.playing = false;
    };
    try {
      source.start(actualStartAt, mediaStartSeconds);
    } catch (error) {
      engine.lastBgmError = `${activeTrackId}: ${error?.message ?? error}`;
      source.disconnect();
      if (engine.bgmSource === source) engine.bgmSource = null;
      if (engine.bgmSync?.trackId === activeTrackId) engine.bgmSync.playing = false;
      return false;
    }
    const stopTimer = window.setTimeout(() => stopBgm(), Math.max(0, (actualStartAt - ctx.currentTime) * 1000) + durationMs + 900);
    engine.bgmTimers = [stopTimer];
    measureBgmDrift();
    engine.lastBgmError = "";
    return true;
  }

  function pluck(time, freq, duration = 0.16, gain = 0.14) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.992, time + duration);
    mod.type = "square";
    mod.frequency.setValueAtTime(freq * 2, time);
    modGain.gain.setValueAtTime(11, time);
    modGain.gain.exponentialRampToValueAtTime(0.1, time + duration);
    filter.type = "bandpass";
    filter.frequency.value = Math.max(380, freq * 2.3);
    filter.Q.value = 7;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    osc.start(time);
    mod.start(time);
    osc.stop(time + duration + 0.04);
    mod.stop(time + duration + 0.04);
  }

  function wood(time, gain = 0.13) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "square";
    osc.frequency.setValueAtTime(820, time);
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 9;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  function kane(time, gain = 0.07) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1480, time);
    filter.type = "bandpass";
    filter.frequency.value = 1850;
    filter.Q.value = 11;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  function bassHit(time, freq = 92, gain = 0.12, duration = 0.18) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.25, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, time);
    filter.Q.value = 0.5;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.014);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    osc.start(time);
    osc.stop(time + duration + 0.04);
  }

  function noiseSnap(time, gain = 0.055, duration = 0.06, frequency = 2200) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 3.5;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    source.start(time);
  }

  function phrasePlucks(time, freqs, gap = 0.12, gain = 0.036) {
    freqs.forEach((freq, index) => {
      pluck(time + gap * index, freq, 0.12, gain * (index === freqs.length - 1 ? 1.18 : 1));
    });
  }

  function enkaLead(time, freq, duration = 0.62, gain = 0.052, grace = 0.94) {
    const ctx = ensure();
    if (!ctx || !engine.master) return;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq * grace, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.09);
    osc.frequency.setValueAtTime(freq, time + Math.max(0.1, duration * 0.55));
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(6.2, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + Math.max(0.1, duration * 0.55));
    lfoGain.gain.linearRampToValueAtTime(18, time + Math.max(0.16, duration * 0.72));
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(920, time);
    filter.Q.value = 2.8;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.045);
    amp.gain.setValueAtTime(gain, time + Math.max(0.09, duration - 0.14));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    osc.start(time);
    lfo.start(time);
    osc.stop(time + duration + 0.04);
    lfo.stop(time + duration + 0.04);
  }

  function voiceFormant(source, time, duration, frequency, q, gainValue) {
    const ctx = ensure();
    if (!ctx || !engine.cueGain) return null;
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.setValueAtTime(q, time);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(gainValue, time + 0.035);
    amp.gain.setValueAtTime(gainValue, time + Math.max(0.055, duration * 0.62));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(engine.cueGain);
    return amp;
  }

  function kobushiVoice(kind = "special") {
    const ctx = ensure();
    if (!ctx || !engine.enabled || !engine.cueGain) return;
    const presets = {
      mash: { base: 146.83, end: 174.61, duration: 0.34, gain: 0.035, formants: [560, 960, 2140] },
      special: { base: 130.81, end: 185, duration: 0.66, gain: 0.049, formants: [620, 1080, 2320] },
      spirit: { base: 138.59, end: 196, duration: 0.54, gain: 0.041, formants: [520, 900, 1980] },
      clear: { base: 174.61, end: 233.08, duration: 0.68, gain: 0.038, formants: [640, 1140, 2360] },
    };
    const preset = presets[kind] ?? presets.special;
    const time = ctx.currentTime + 0.02;
    const duration = preset.duration;
    const voice = ctx.createOscillator();
    const breath = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const body = ctx.createGain();
    const breathFilter = ctx.createBiquadFilter();

    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(preset.base * 0.92, time);
    voice.frequency.exponentialRampToValueAtTime(preset.base, time + duration * 0.18);
    voice.frequency.setValueAtTime(preset.base, time + duration * 0.5);
    voice.frequency.exponentialRampToValueAtTime(preset.end, time + duration * 0.78);
    voice.frequency.exponentialRampToValueAtTime(preset.end * 0.965, time + duration);

    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(5.2, time);
    vibrato.frequency.linearRampToValueAtTime(7.4, time + duration);
    vibratoGain.gain.setValueAtTime(0, time);
    vibratoGain.gain.setValueAtTime(0, time + duration * 0.42);
    vibratoGain.gain.linearRampToValueAtTime(kind === "special" ? 24 : 16, time + duration * 0.75);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(voice.detune);

    body.gain.setValueAtTime(0.78, time);
    voice.connect(body);
    for (const [index, formant] of preset.formants.entries()) {
      voiceFormant(body, time, duration, formant, index === 0 ? 2.8 : 3.8, preset.gain / (index + 1.2));
    }

    breath.type = "triangle";
    breath.frequency.setValueAtTime(preset.base * 2.01, time);
    breath.frequency.exponentialRampToValueAtTime(preset.end * 1.92, time + duration);
    breathFilter.type = "highpass";
    breathFilter.frequency.setValueAtTime(1400, time);
    voiceFormant(breathFilter, time, duration * 0.9, 2100, 1.4, preset.gain * 0.28);
    breath.connect(breathFilter);

    voice.start(time);
    breath.start(time + 0.012);
    vibrato.start(time);
    voice.stop(time + duration + 0.04);
    breath.stop(time + duration + 0.02);
    vibrato.stop(time + duration + 0.04);
  }

  function countTick(time, strong = false) {
    wood(time, strong ? 0.22 : 0.13);
    if (strong) kane(time + 0.025, 0.07);
  }

  function scheduleRemixLayer(startAt, bpm, durationMs, profile = {}, fromBeat = 0, toBeat = Infinity) {
    const ctx = ensure();
    if (!ctx || !profile.remix) return fromBeat;
    const remixGain = profile.remixGain ?? 1.05;
    const beat = 60 / bpm;
    const totalBeats = Math.ceil(durationMs / 1000 / beat);
    const startBeat = Math.max(0, Math.floor(fromBeat));
    const endBeat = Math.max(startBeat, Math.min(totalBeats, Math.ceil(toBeat)));
    const leadRoot = profile.lead ?? 220;
    const notes = profile.remixScale ?? [leadRoot * 0.75, leadRoot, leadRoot * 1.125, leadRoot * 1.25, leadRoot * 1.5];
    const t = (beatIndex, offsetBeats = 0) => startAt + (beatIndex + offsetBeats) * beat;
    const nearFuture = (time) => time > ctx.currentTime + 0.025;

    for (let i = startBeat; i < endBeat; i += 1) {
      const time = t(i);
      if (!nearFuture(time)) continue;

      if (profile.remix === "yatai") {
        if (i % 4 === 0) {
          kane(time, 0.105 * remixGain);
          bassHit(time + beat * 0.02, 96, 0.06 * remixGain, 0.14);
        }
        if (i % 2 === 1) wood(time + beat * 0.5, 0.08 * remixGain);
        if (i % 8 === 4) enkaLead(time + beat * 0.26, notes[(i / 4) % notes.length], beat * 0.9, 0.052 * remixGain, 0.9);
        if (i % 16 === 10) phrasePlucks(time + beat * 0.12, [notes[1], notes[2], notes[3], notes[2]], beat * 0.18, 0.035 * remixGain);
      } else if (profile.remix === "toge") {
        if (i % 4 === 0) {
          bassHit(time, 72, 0.11 * remixGain, 0.34);
          wood(time + beat * 0.12, 0.105 * remixGain);
        }
        if (i % 4 === 2) wood(time + beat * 0.5, 0.055 * remixGain);
        if (i % 8 === 6) enkaLead(time + beat * 0.16, notes[(i / 2) % notes.length] * 0.72, beat * 1.35, 0.046 * remixGain, 0.88);
        if (i % 16 === 8) phrasePlucks(time + beat * 0.18, [notes[0] * 0.75, notes[1] * 0.75, notes[0]], beat * 0.24, 0.028 * remixGain);
      } else if (profile.remix === "garage") {
        if (i % 2 === 0) {
          bassHit(time, 86, 0.13 * remixGain, 0.18);
          wood(time + beat * 0.05, 0.115 * remixGain);
        }
        if (i % 2 === 1) noiseSnap(time + beat * 0.48, 0.05 * remixGain, 0.055, 2600);
        if (i % 4 === 2) pluck(time + beat * 0.42, notes[(i / 2) % notes.length] * 0.92, 0.13, 0.06 * remixGain);
        if (i % 8 === 6) phrasePlucks(time + beat * 0.2, [notes[2], notes[1], notes[0]], beat * 0.14, 0.046 * remixGain);
        if (i % 16 === 12) kane(time + beat * 0.2, 0.11 * remixGain);
      } else if (profile.remix === "highway") {
        if (i % 2 === 0) {
          bassHit(time + beat * 0.04, 98, 0.095 * remixGain, 0.14);
          wood(time + beat * 0.08, 0.095 * remixGain);
        }
        if (i % 2 === 1) wood(time + beat * 0.58, 0.07 * remixGain);
        if (i % 4 === 1) pluck(time + beat * 0.46, notes[(i + 2) % notes.length] * 1.125, 0.12, 0.058 * remixGain);
        if (i % 8 === 3) phrasePlucks(time + beat * 0.14, [notes[1], notes[3], notes[4], notes[3]], beat * 0.12, 0.04 * remixGain);
        if (i % 8 === 7) enkaLead(time + beat * 0.18, notes[(i / 2) % notes.length] * 1.1, beat * 0.72, 0.044 * remixGain, 0.94);
      } else if (profile.remix === "boss") {
        if (i % 2 === 0) {
          bassHit(time, 65, 0.16 * remixGain, 0.28);
          wood(time, 0.14 * remixGain);
        }
        if (i % 4 === 0) kane(time + beat * 0.12, 0.12 * remixGain);
        if (i % 4 === 2) noiseSnap(time + beat * 0.48, 0.07 * remixGain, 0.06, 1900);
        if (i % 8 === 4) enkaLead(time + beat * 0.22, notes[(i / 4) % notes.length] * 0.8, beat * 1.05, 0.052 * remixGain, 0.88);
        if (i % 16 === 14) {
          pluck(time + beat * 0.18, 130.81, 0.16, 0.066 * remixGain);
          pluck(time + beat * 0.34, 196, 0.14, 0.056 * remixGain);
        }
      }
    }
    return endBeat;
  }

  function scheduleNoteCue(note, startAt, bpm) {
    const t = startAt + note.timeMs / 1000;
    const beat = 60 / bpm;
    const pickup = Math.max(0.22, beat * 0.75);
    if (note.type === "tap") {
      countTick(t - pickup, false);
      return;
    }
    if (note.type === "hold") {
      countTick(t - pickup, false);
      wood(t, 0.16);
      wood(t + note.durationMs / 1000, 0.2);
      return;
    }
    if (note.type === "mash") {
      countTick(t - pickup, false);
      const durS = note.durationMs / 1000;
      const steps = Math.min(14, Math.max(4, Math.floor(note.durationMs / 130)));
      for (let s = 0; s <= steps; s += 1) {
        const g = 0.085 + (s / steps) * 0.06;
        wood(t + durS * (s / steps), g);
      }
    }
  }

  function scheduleCountIn(startAt, bpm, chart) {
    const ctx = ensure();
    if (!ctx) return;
    const first = chart[0]?.timeMs ?? 1000;
    const beat = 60 / bpm;
    const firstAt = startAt + first / 1000;
    for (let i = 4; i >= 1; i -= 1) {
      const tickAt = firstAt - beat * i;
      if (tickAt >= startAt && tickAt > ctx.currentTime + 0.025) countTick(tickAt, i === 1);
    }
  }

  async function scheduleChart(startAt, bpm, chart, durationMs, profile = {}) {
    stopScheduledCues();
    const bgmStartedPromise = startBgmAt(startAt, durationMs, profile);
    const ctx = ensure();
    if (!ctx) return bgmStartedPromise;
    const token = engine.cueScheduleToken;
    const beat = 60 / bpm;
    const cueState = {
      countInScheduled: false,
      nextNoteIndex: 0,
      nextRemixBeat: 0,
    };
    const scheduleWindow = () => {
      if (token !== engine.cueScheduleToken || !engine.enabled) return;
      const now = ctx.currentTime;
      const horizon = now + CUE_LOOKAHEAD_SECONDS;
      if (!cueState.countInScheduled) {
        scheduleCountIn(startAt, bpm, chart);
        cueState.countInScheduled = true;
      }
      const horizonBeat = Math.ceil((horizon - startAt) / beat) + 1;
      cueState.nextRemixBeat = scheduleRemixLayer(startAt, bpm, durationMs, profile, cueState.nextRemixBeat, horizonBeat);
      while (cueState.nextNoteIndex < chart.length) {
        const note = chart[cueState.nextNoteIndex];
        const noteStart = startAt + note.timeMs / 1000;
        if (noteStart > horizon) break;
        scheduleNoteCue(note, startAt, bpm);
        cueState.nextNoteIndex += 1;
      }
      const doneAt = startAt + durationMs / 1000 + 1.2;
      if (now < doneAt && (cueState.nextNoteIndex < chart.length || cueState.nextRemixBeat * beat < durationMs / 1000)) {
        engine.cueScheduleTimer = window.setTimeout(scheduleWindow, CUE_SCHEDULE_INTERVAL_MS);
      } else {
        engine.cueScheduleTimer = null;
      }
    };
    scheduleWindow();
    return bgmStartedPromise;
  }

  function cheer() {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    pluck(now, 293.66, 0.13, 0.18);
    pluck(now + 0.08, 349.23, 0.13, 0.16);
    pluck(now + 0.16, 392, 0.2, 0.16);
  }

  function comboCue(combo) {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const top = combo % 10 === 0;
    wood(now, top ? 0.24 : 0.18);
    kane(now + 0.055, top ? 0.12 : 0.08);
    pluck(now + 0.08, top ? 392 : 329.63, 0.12, 0.13);
    pluck(now + 0.18, top ? 493.88 : 392, 0.18, 0.12);
  }

  function menuCue() {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    wood(now, 0.14);
    enkaLead(now + 0.08, 261.63, 0.32, 0.052, 0.94);
  }

  return {
    engine,
    ensure,
    unlock,
    resume,
    suspend,
    prepareBgm,
    releaseBgmExcept,
    setEnabled,
    scheduleChart,
    cheer,
    comboCue,
    kobushiVoice,
    menuCue,
    stopBgm,
    bgmCorrectionMs() {
      return measureBgmDrift();
    },
    bgmSyncStatus() {
      const sync = engine.bgmSync;
      if (!sync) return null;
      return {
        trackId: sync.trackId,
        playing: sync.playing,
        rawDriftMs: Math.round(sync.rawDriftMs),
        correctionMs: Math.round(sync.correctionMs),
        correctionLocked: sync.correctionLocked,
        samples: sync.samples,
        lastError: engine.lastBgmError,
      };
    },
    now() {
      const ctx = ensure();
      return ctx ? ctx.currentTime : performance.now() / 1000;
    },
  };
}
