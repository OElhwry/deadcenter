import { useEffect, useRef, useState, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BAR_W = 360;
const SQ    = 240;
const DOT   = 13;
const CX    = BAR_W / 2 - DOT / 2;

// ─── DIFFICULTY ──────────────────────────────────────────────────────────────
const DIFF = {
  easy:       { label: "I",          color: "#4ade80", dim: "#1a3d26" },
  medium:     { label: "II",         color: "#f59e0b", dim: "#3d2800" },
  hard:       { label: "III",        color: "#ef4444", dim: "#3d0a0a" },
  impossible: { label: "∞",          color: "#9b1c1c", dim: "#2a0505" },
};

// ─── LEVEL DEFINITIONS ───────────────────────────────────────────────────────
// types: h, diag, circle, 2d, chaos, blind, movingtarget, ghost, vortex,
// sway, countercircle, eclipse, phasecircle, swaymt, ghost2d, overload, vdrop
const WARMUP = { id: 0, label: "warm up", type: "h", speed: 2.8, diff: "easy",
  hint: "stop on the circle", warmup: true };

const POOL = [
  // ── EASY (5 levels) ──
  { id:1,  label: "steady",        type: "h",           speed: 6.5,   diff: "easy",
    hint: "center — a little faster" },
  { id:11, label: "sway",          type: "sway",        speed: 0.05,  diff: "easy",
    hint: "smooth sine drift — release at center" },
  { id:15, label: "float",         type: "circle",      speed: 0.018, diff: "easy",
    hint: "slow orbit — stop at 12 o'clock" },
  { id:16, label: "cruise",        type: "2d",          speed: 1.5,   diff: "easy",
    hint: "slow bounce — hit the bullseye" },
  { id:17, label: "drop",          type: "vdrop",       speed: 0.20,  diff: "easy",
    hint: "straight fall — stop at the bottom" },

  // ── MEDIUM (5 levels) ──
  { id:2,  label: "diagonal",      type: "diag",        speed: 0.9,   diff: "medium",
    hint: "gravity builds — momentum hurts you" },
  { id:3,  label: "orbit",         type: "circle",      speed: 0.042, diff: "medium",
    hint: "momentum builds — stop at 12 o'clock" },
  { id:4,  label: "2d bounce",     type: "2d",          speed: 4.5,   diff: "medium",
    hint: "random path, gains speed — hit the bullseye" },
  { id:12, label: "counter orbit", type: "countercircle", speed: 0.038, diff: "medium",
    hint: "the target loops back — meet it at the top" },
  { id:18, label: "ripple",        type: "swaymt",      speed: 0.05,  diff: "medium",
    hint: "both drift — find the overlap" },

  // ── HARD (5 levels) ──
  { id:5,  label: "chaos",         type: "chaos",       speed: 7,     diff: "hard",
    hint: "direction snaps randomly — speed compounds" },
  { id:6,  label: "crossfire",     type: "movingtarget",speed: 14,    diff: "hard",
    precision: true, hint: "tiny moving target — track and stop" },
  { id:7,  label: "blind",         type: "blind",       speed: 8,     diff: "hard",
    hint: "gone in the dark — feel the rhythm" },
  { id:8,  label: "moving target", type: "movingtarget",speed: 9,     diff: "hard",
    hint: "the target drifts — read its path" },
  { id:13, label: "eclipse",       type: "eclipse",     speed: 10.5,  diff: "hard",
    hint: "the target drifts while the dot blinks" },

  // ── IMPOSSIBLE (5 levels) ──
  { id:9,  label: "ghost",         type: "ghost",       speed: 11,    diff: "impossible",
    hint: "fully invisible — trust instinct" },
  { id:10, label: "vortex",        type: "vortex",      speed: 0.052, diff: "impossible",
    hint: "spiral orbit + rotating target" },
  { id:14, label: "phase orbit",   type: "phasecircle", speed: 0.056, diff: "impossible",
    hint: "phasing orbit + live target — commit on instinct" },
  { id:19, label: "abyss",         type: "ghost2d",     speed: 6.0,   diff: "impossible",
    hint: "invisible in 2d — aim blind" },
  { id:20, label: "collapse",      type: "overload",    speed: 12,    diff: "impossible",
    precision: true, hint: "chaos overloaded — precision on instinct" },
];

function pickLevels(count, skipWarmup) {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const n = skipWarmup ? count : count - 1;
  const picked = shuffled.slice(0, n);
  return skipWarmup ? picked : [WARMUP, ...picked];
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
// All scoring uses dot-center vs target-center, plus a small tolerance
// so 100 is achievable even when dot steps don't land exactly on target.
function scoreH(x, precision, targetX = CX) {
  const dotCenter = x + DOT / 2;
  const tgtCenter = targetX + DOT / 2;
  const dist = Math.abs(dotCenter - tgtCenter);
  const tolerance = precision ? 0.4 : 2.25; // px dead-zone → score 100
  const mul = precision ? 220 : 125;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, dist - tolerance) / (BAR_W / 2) * mul)));
}
function scoreDiag(t) {
  const end = SQ - DOT;
  const dist = Math.abs(t - end);
  const tolerance = 3;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, dist - tolerance) / end * 140)));
}
function scoreCircle(angle, targetAngle = -Math.PI / 2) {
  let diff = angle - targetAngle;
  while (diff >  Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const tolerance = 0.028; // radians dead-zone
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, Math.abs(diff) - tolerance) / Math.PI * 150)));
}
function score2D(x, y) {
  const dx = (x + DOT / 2) - SQ / 2;
  const dy = (y + DOT / 2) - SQ / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tolerance = 2;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, dist - tolerance) / (SQ / 2) * 150)));
}

function grade(avg) {
  if (avg >= 90) return { label: "DEAD CENTER", color: "#00ffcc" };
  if (avg >= 75) return { label: "SHARP",       color: "#4ade80" };
  if (avg >= 55) return { label: "DECENT",      color: "#f59e0b" };
  if (avg >= 35) return { label: "SHAKY",       color: "#ef4444" };
  return               { label: "NEEDS WORK",   color: "#9b1c1c" };
}

// ─── THEMES ──────────────────────────────────────────────────────────────────
const DARK  = { bg:"#141414", fg:"#e0e0e0", sub:"#555", track:"#1e1e1e", border:"#252525", hint:"#2a2a2a", card:"#1a1a1a" };
const LIGHT = { bg:"#ccc8be", fg:"#1a1a1a", sub:"#666", track:"#b8b4aa", border:"#a8a49a", hint:"#888",   card:"#bab6ac" };

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function makeCtx() { try { return new (window.AudioContext||window.webkitAudioContext)(); } catch { return null; } }

function playTone(ctx, freq, type="sine", dur=0.12, vol=0.15) {
  if (!ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
  o.start(); o.stop(ctx.currentTime+dur);
}

function playScore(ctx, score) {
  if (!ctx) return;
  if (score >= 90) {
    // Perfect shot — ascending fanfare
    [880, 1108, 1320, 1760].forEach((f, i) => setTimeout(() => playTone(ctx, f, "sine", 0.18, 0.12), i * 60));
  } else if (score >= 80) {
    playTone(ctx, 660,"sine",0.07,0.13);
    setTimeout(()=>playTone(ctx,990,"sine",0.14,0.13),75);
    setTimeout(()=>playTone(ctx,1320,"sine",0.18,0.1),150);
  } else if (score >= 50) {
    playTone(ctx, 440,"sine",0.13,0.1);
  } else {
    playTone(ctx, 160,"sawtooth",0.2,0.08);
    setTimeout(()=>playTone(ctx,130,"sawtooth",0.15,0.06),80);
  }
}

// Button click: quick snappy tick
function playClick(ctx) {
  if (!ctx) return;
  playTone(ctx, 800, "square", 0.04, 0.06);
  setTimeout(() => playTone(ctx, 1000, "square", 0.03, 0.04), 30);
}

// Hover sound: subtle softer click
function playHover(ctx) { playTone(ctx, 600, "sine", 0.03, 0.03); }

function playThreatSelect(ctx, tier = "hard") {
  if (!ctx) return;
  const seq = tier === "impossible"
    ? [[240, "sawtooth", 0.11, 0.08], [180, "square", 0.12, 0.07], [120, "sawtooth", 0.18, 0.06]]
    : [[320, "square", 0.08, 0.07], [240, "sawtooth", 0.1, 0.06], [180, "triangle", 0.12, 0.05]];
  seq.forEach(([freq, type, dur, vol], i) => {
    setTimeout(() => playTone(ctx, freq, type, dur, vol), i * 50);
  });
}

function playLaunch(ctx) {
  if (!ctx) return;
  [[130, "sawtooth", 0.08, 0.06], [196, "square", 0.1, 0.08], [293, "square", 0.12, 0.09], [440, "sine", 0.18, 0.1]]
    .forEach(([freq, type, dur, vol], i) => {
      setTimeout(() => playTone(ctx, freq, type, dur, vol), i * 55);
    });
}

// ── HOME SCREEN MUSIC ──────────────────────────────────────────────────────
// Chiptune-style arpeggiated loop using Web Audio scheduling
function startMenuMusic(ctx, volume = 0.1, intensity = 0) {
  if (!ctx) return { setVolume() {}, setIntensity() {}, stop() {} };
  const master = ctx.createGain();
  const baseGain = ctx.createGain();
  const accentGain = ctx.createGain();
  const pulseGain = ctx.createGain();
  master.gain.value = 0;
  baseGain.gain.value = 1;
  accentGain.gain.value = Math.max(0, Math.min(1, intensity));
  pulseGain.gain.value = Math.max(0, Math.min(1, intensity));
  baseGain.connect(master);
  accentGain.connect(master);
  pulseGain.connect(master);
  master.connect(ctx.destination);

  const scale = [110, 130.8, 146.8, 165, 195.9, 220, 261.6, 293.6, 330, 392];
  const melody = [4,6,7,6,4,2,0,2, 4,6,9,8,6,4,2,4];
  const bpm = 140;
  const step = 60 / bpm;
  let stopped = false;
  let timeoutIds = [];
  let currentVolume = volume;
  let currentIntensity = intensity;

  const targetGainFor = (nextVolume, nextIntensity) =>
    Math.max(0, Math.min(1, nextVolume)) * (0.68 + nextIntensity * 0.18);

  master.gain.linearRampToValueAtTime(targetGainFor(currentVolume, currentIntensity), ctx.currentTime + 1.5);

  const scheduleBar = (barStart) => {
    if (stopped) return;

    melody.forEach((deg, i) => {
      const t = barStart + i * step * 0.5;
      const freq = scale[deg % scale.length];

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = freq * 2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.45);
      o.connect(g); g.connect(baseGain);
      o.start(t); o.stop(t + step * 0.5);

      const ao = ctx.createOscillator();
      const ag = ctx.createGain();
      ao.type = "sawtooth";
      ao.frequency.value = freq * 4;
      ag.gain.setValueAtTime(0, t);
      ag.gain.linearRampToValueAtTime(0.018 + currentIntensity * 0.09, t + 0.01);
      ag.gain.exponentialRampToValueAtTime(0.001, t + step * 0.22);
      ao.connect(ag); ag.connect(accentGain);
      ao.start(t); ao.stop(t + step * 0.24);
    });

    // Extra sync pulse on harder levels to raise urgency without changing the song.
    [0, 2, 0, 3, 0, 2, 0, 4].forEach((deg, i) => {
      const t = barStart + i * step;
      const po = ctx.createOscillator();
      const pg = ctx.createGain();
      po.type = "square";
      po.frequency.value = scale[deg] * 2;
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(currentIntensity * 0.06, t + 0.005);
      pg.gain.exponentialRampToValueAtTime(0.001, t + step * 0.18);
      po.connect(pg); pg.connect(pulseGain);
      po.start(t); po.stop(t + step * 0.2);
    });

    [0, 0, 2, 0].forEach((deg, i) => {
      const t = barStart + i * step * 2;
      const freq = scale[deg];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.16 + currentIntensity * 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.8);
      o.connect(g); g.connect(baseGain);
      o.start(t); o.stop(t + step * 2);
    });

    const barLen = melody.length * step * 0.5;
    const id = setTimeout(() => scheduleBar(barStart + barLen), (barLen - 0.2) * 1000);
    timeoutIds.push(id);
  };

  scheduleBar(ctx.currentTime + 0.1);

  return {
    setVolume(nextVolume) {
      currentVolume = nextVolume;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetGainFor(currentVolume, currentIntensity), ctx.currentTime + 0.2);
    },
    setIntensity(nextIntensity) {
      currentIntensity = Math.max(0, Math.min(1, nextIntensity));
      accentGain.gain.cancelScheduledValues(ctx.currentTime);
      accentGain.gain.linearRampToValueAtTime(currentIntensity, ctx.currentTime + 0.35);
      pulseGain.gain.cancelScheduledValues(ctx.currentTime);
      pulseGain.gain.linearRampToValueAtTime(currentIntensity, ctx.currentTime + 0.35);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetGainFor(currentVolume, currentIntensity), ctx.currentTime + 0.35);
    },
    stop(immediate = false) {
      stopped = true;
      timeoutIds.forEach(clearTimeout);
      master.gain.cancelScheduledValues(ctx.currentTime);
      if (immediate) {
        master.gain.setValueAtTime(0, ctx.currentTime);
        try { master.disconnect(); } catch {}
        return;
      }
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => { try { master.disconnect(); } catch {} }, 1500);
    }
  };
}

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
const LS_SETTINGS = "deadcenter.settings.v1";
const LS_BESTS    = "deadcenter.bests.v1";
function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
// Derive a stable preset key for bests from the level set (sorted ids).
function presetKey(levelSet) {
  const ids = levelSet.filter(l => !l.warmup).map(l => l.id).sort((a,b)=>a-b);
  return ids.join(",");
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,       setScreen]       = useState("menu");
  const [settings,     setSettings]     = useState(() =>
    loadJSON(LS_SETTINGS, { day:false, skipWarmup:false, mute:false })
  );
  const [bestScores,   setBestScores]   = useState(() => loadJSON(LS_BESTS, {}));
  const [showSettings, setShowSettings] = useState(false);
  const [levels,       setLevels]       = useState([]);
  const [lvIdx,        setLvIdx]        = useState(0);
  const [scores,       setScores]       = useState([]);
  const [playing,      setPlaying]      = useState(false);
  const [lastScore,    setLastScore]    = useState(null);
  const [showScore,    setShowScore]    = useState(false);
  const [runMeta,      setRunMeta]      = useState({ previousBest: null, isNewBest: false });

  useEffect(() => { saveJSON(LS_SETTINGS, settings); }, [settings]);
  useEffect(() => { saveJSON(LS_BESTS, bestScores); }, [bestScores]);
  const musicVol = 0.1;
  const musicPaused = false;
  const [scoreWarmup,  setScoreWarmup]  = useState(false);
  const currentLevel = levels[lvIdx];
  const musicIntensity = screen !== "play"
    ? 0
    : ({ easy: 0.05, medium: 0.32, hard: 0.78, impossible: 1 }[currentLevel?.diff] ?? 0.22);

  const T = settings.day ? LIGHT : DARK;

  // animation state
  const posRef        = useRef({ x:0, y:0, t:0, angle:-Math.PI/2, x2:BAR_W-DOT, vortAngle:0 });
  const [posDraw, setPosDraw] = useState({ x:0, y:0, t:0, angle:-Math.PI/2, x2:BAR_W-DOT, vortAngle:0 });
  const targetXRef    = useRef(CX);   // for movingtarget
  const targetDirRef  = useRef(1);
  const [targetXDraw, setTargetXDraw] = useState(CX);
  const vortexTargAngleRef = useRef(0); // for vortex rotating target
  const [vortexTargAngleDraw, setVortexTargAngleDraw] = useState(0);
  const blindVisRef   = useRef(true);
  const [blindVis, setBlindVis]       = useState(true);
  const blindTimerRef = useRef(0);
  const rafRef        = useRef();
  const dirHRef       = useRef(1);
  const vel2dRef      = useRef({ vx: 1, vy: 1 });
  const diagSpRef     = useRef(0.9);
  const momentumRef   = useRef(1.0);
  const [momentumDraw, setMomentumDraw] = useState(1.0);
  const chaosSpRef    = useRef(7);
  const chaosDirRef   = useRef(1);
  const chaosTimerRef = useRef(0);
  const activeRef     = useRef(false);
  const lvIdxRef      = useRef(0);
  const levelsRef     = useRef([]);
  const audioCtx      = useRef(null);
  const audioUnlockedRef = useRef(false);
  const mutedRef      = useRef(false);
  const droneStopRef  = useRef(null);
  const musicLoopRef  = useRef(null);
  const frameRef      = useRef(0);
  const scoresRef     = useRef([]);
  const scoreWarmupRef = useRef(false);
  const bestScoresRef = useRef(bestScores);

  bestScoresRef.current = bestScores;
  scoreWarmupRef.current = scoreWarmup;
  mutedRef.current = settings.mute;

  const getCtx = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = makeCtx();
    return audioCtx.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    const ctx = getCtx();
    if (!ctx) return null;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    audioUnlockedRef.current = ctx.state === "running";
    if (audioUnlockedRef.current && !mutedRef.current && !musicPaused && (screen === "menu" || screen === "play") && !musicLoopRef.current) {
      musicLoopRef.current = startMenuMusic(ctx, musicVol, musicIntensity);
    }
    return ctx;
  }, [getCtx, musicIntensity, musicPaused, musicVol, screen]);

  const snd = useCallback((fn, ...args) => {
    if (mutedRef.current) return;
    const ctx = audioCtx.current;
    if (!ctx || ctx.state !== "running") return;
    fn(ctx, ...args);
  }, []);

  const stopMusicLoop = useCallback((immediate = false) => {
    if (!musicLoopRef.current) return;
    musicLoopRef.current.stop(immediate);
    musicLoopRef.current = null;
  }, []);

  const ensureMusicLoop = useCallback(() => {
    if (mutedRef.current || musicPaused || !audioUnlockedRef.current) return;
    stopMusicLoop(true);
    musicLoopRef.current = startMenuMusic(getCtx(), musicVol, musicIntensity);
  }, [getCtx, musicPaused, musicVol, musicIntensity, stopMusicLoop]);

  // When mute toggles, pause/resume music tracks too
  useEffect(() => {
    if (settings.mute) {
      stopMusicLoop(true);
    } else {
      if ((screen === "menu" || screen === "play") && !musicPaused && !musicLoopRef.current) {
        ensureMusicLoop();
      }
    }
  }, [settings.mute, screen, musicPaused, ensureMusicLoop, stopMusicLoop]);

  const animate = useCallback(() => {
    const lv = levelsRef.current[lvIdxRef.current];
    if (!lv) return;
    const p = posRef.current;
    frameRef.current++;

    // momentum: ramps over 7.5 s (450 frames), cap depends on difficulty
    // medium→2x, hard→3x, impossible→4x, easy/warmup→no momentum
    const MCAP = { medium: 1.0, hard: 2.0, impossible: 3.0 };
    const hasMomentum = !lv.warmup && lv.diff !== "easy";
    if (hasMomentum) {
      const cap = MCAP[lv.diff] ?? 1.0;
      momentumRef.current = 1 + cap * Math.min(1, frameRef.current / 450);
      if (frameRef.current % 30 === 0) setMomentumDraw(momentumRef.current);
    }
    const spd = lv.speed * (hasMomentum ? momentumRef.current : 1);

    if (lv.type === "h" || lv.type === "blind" || lv.type === "ghost") {
      let x = p.x + spd * dirHRef.current;
      if (x >= BAR_W-DOT) { dirHRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { dirHRef.current= 1; x=0; }
      posRef.current = { ...p, x };
      // blind: visible 6 frames, hidden 40 frames
      if (lv.type === "blind") {
        blindTimerRef.current--;
        if (blindTimerRef.current <= 0) {
          const v = !blindVisRef.current;
          blindVisRef.current = v;
          blindTimerRef.current = v ? 6 : 40;
          setBlindVis(v);
        }
      }
      // ghost: truly invisible when hidden
      if (lv.type === "ghost") {
        blindTimerRef.current--;
        if (blindTimerRef.current <= 0) {
          const v = !blindVisRef.current;
          blindVisRef.current = v;
          blindTimerRef.current = v ? 4 : 60;
          setBlindVis(v);
        }
      }

    } else if (lv.type === "movingtarget" || lv.type === "eclipse") {
      let x = p.x + spd * dirHRef.current;
      if (x >= BAR_W-DOT) { dirHRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { dirHRef.current= 1; x=0; }
      // crossfire (precision) target moves much faster
      const tSpeed = lv.precision ? 5.5 : lv.type === "eclipse" ? 3.6 : 2.5;
      let tx = targetXRef.current + tSpeed * targetDirRef.current;
      if (tx >= BAR_W - 30) { targetDirRef.current=-1; tx=BAR_W-30; }
      if (tx <= 20)          { targetDirRef.current= 1; tx=20; }
      targetXRef.current = tx;
      posRef.current = { ...p, x };
      setTargetXDraw(tx);
      if (lv.type === "eclipse") {
        blindTimerRef.current--;
        if (blindTimerRef.current <= 0) {
          const v = !blindVisRef.current;
          blindVisRef.current = v;
          blindTimerRef.current = v ? 7 : 24;
          setBlindVis(v);
        }
      }

    } else if (lv.type === "diag") {
      let t = p.t + diagSpRef.current;
      // gravity builds, amplified by momentum
      diagSpRef.current = Math.min(diagSpRef.current + 0.08 * momentumRef.current, 20);
      if (t >= SQ - DOT) { diagSpRef.current = 0.9; t = 0; }
      posRef.current = { ...p, x:t, y:t, t };

    } else if (lv.type === "vdrop") {
      // straight vertical drop — x locked to center, gravity builds gently (no momentum for easy)
      let t = p.t + diagSpRef.current;
      diagSpRef.current = Math.min(diagSpRef.current + 0.06, 18);
      if (t >= SQ - DOT) { diagSpRef.current = lv.speed; t = 0; }
      const x = SQ / 2 - DOT / 2;
      posRef.current = { ...p, x, y: t, t };

    } else if (lv.type === "circle") {
      let angle = p.angle + spd;
      if (angle > Math.PI) angle -= 2 * Math.PI;
      const r = SQ/2 - DOT - 2;
      posRef.current = { ...p, angle,
        x: SQ/2 + r*Math.cos(angle) - DOT/2,
        y: SQ/2 + r*Math.sin(angle) - DOT/2,
      };

    } else if (lv.type === "sway") {
      const t = p.t + spd;
      const amp = BAR_W / 2 - DOT / 2 - 10;
      const x = CX + amp * Math.sin(t);
      posRef.current = { ...p, t, x };

    } else if (lv.type === "countercircle" || lv.type === "phasecircle") {
      let angle = p.angle + spd;
      if (angle > Math.PI) angle -= 2 * Math.PI;
      const r = SQ/2 - DOT - 2;
      posRef.current = { ...p, angle,
        x: SQ/2 + r*Math.cos(angle) - DOT/2,
        y: SQ/2 + r*Math.sin(angle) - DOT/2,
      };
      const targetSpeed = lv.type === "phasecircle" ? 0.019 : 0.014;
      const ta = (vortexTargAngleRef.current - targetSpeed + 2*Math.PI) % (2*Math.PI);
      vortexTargAngleRef.current = ta;
      setVortexTargAngleDraw(ta);
      if (lv.type === "phasecircle") {
        blindTimerRef.current--;
        if (blindTimerRef.current <= 0) {
          const v = !blindVisRef.current;
          blindVisRef.current = v;
          blindTimerRef.current = v ? 5 : 26;
          setBlindVis(v);
        }
      }

    } else if (lv.type === "2d") {
      // random trajectory — bounces off all walls, gains speed via momentum
      let { vx, vy } = vel2dRef.current;
      let x = p.x + vx * spd;
      let y = p.y + vy * spd;
      if (x >= SQ-DOT) { vx = -Math.abs(vx); x = SQ-DOT; }
      if (x <= 0)       { vx =  Math.abs(vx); x = 0; }
      if (y >= SQ-DOT) { vy = -Math.abs(vy); y = SQ-DOT; }
      if (y <= 0)       { vy =  Math.abs(vy); y = 0; }
      vel2dRef.current = { vx, vy };
      posRef.current = { ...p, x, y };

    } else if (lv.type === "chaos") {
      chaosTimerRef.current--;
      if (chaosTimerRef.current <= 0) {
        chaosDirRef.current  = Math.random() < 0.5 ? 1 : -1;
        chaosSpRef.current   = 6 + Math.random() * 14;
        chaosTimerRef.current = 5 + Math.floor(Math.random()*15);
      }
      let x = p.x + chaosSpRef.current * momentumRef.current * chaosDirRef.current;
      if (x >= BAR_W-DOT) { chaosDirRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { chaosDirRef.current= 1; x=0; }
      posRef.current = { ...p, x };

    } else if (lv.type === "vortex") {
      let angle = p.angle + spd;
      if (angle > Math.PI) angle -= 2 * Math.PI;
      const t = (p.t + 0.004) % 2;
      const pulse = t <= 1 ? t : 2 - t;
      const r = (SQ/2 - DOT - 4) * pulse;
      posRef.current = { ...p, angle, t,
        x: SQ/2 + r*Math.cos(angle) - DOT/2,
        y: SQ/2 + r*Math.sin(angle) - DOT/2,
      };
      // target rotates faster and in opposite direction
      const ta = (vortexTargAngleRef.current - 0.014 + 2*Math.PI) % (2*Math.PI);
      vortexTargAngleRef.current = ta;
      setVortexTargAngleDraw(ta);

    } else if (lv.type === "swaymt") {
      // dot sways sinusoidally; target sways at a different rate + amplitude
      const t = p.t + spd;
      const amp = BAR_W / 2 - DOT / 2 - 10;
      const x = CX + amp * Math.sin(t);
      // target uses a separate phase stored in vortexTargAngleRef, fixed rate (no momentum)
      const tPhase = (vortexTargAngleRef.current + 0.031 + 2 * Math.PI) % (2 * Math.PI);
      vortexTargAngleRef.current = tPhase;
      const tAmp = BAR_W / 2 - DOT / 2 - 30;
      const tx = CX + tAmp * Math.sin(tPhase);
      targetXRef.current = tx;
      posRef.current = { ...p, t, x };
      setTargetXDraw(tx);

    } else if (lv.type === "ghost2d") {
      // 2D bounce but nearly invisible — same physics as 2d, ghost-level blink (4 on / 60 off)
      let { vx, vy } = vel2dRef.current;
      let x = p.x + vx * spd;
      let y = p.y + vy * spd;
      if (x >= SQ-DOT) { vx = -Math.abs(vx); x = SQ-DOT; }
      if (x <= 0)       { vx =  Math.abs(vx); x = 0; }
      if (y >= SQ-DOT) { vy = -Math.abs(vy); y = SQ-DOT; }
      if (y <= 0)       { vy =  Math.abs(vy); y = 0; }
      vel2dRef.current = { vx, vy };
      posRef.current = { ...p, x, y };
      blindTimerRef.current--;
      if (blindTimerRef.current <= 0) {
        const v = !blindVisRef.current;
        blindVisRef.current = v;
        blindTimerRef.current = v ? 4 : 60;
        setBlindVis(v);
      }

    } else if (lv.type === "overload") {
      // extreme chaos: snaps every 2–6 frames, speed 12–25 px/frame + precision moving target
      chaosTimerRef.current--;
      if (chaosTimerRef.current <= 0) {
        chaosDirRef.current  = Math.random() < 0.5 ? 1 : -1;
        chaosSpRef.current   = 12 + Math.random() * 13;
        chaosTimerRef.current = 2 + Math.floor(Math.random() * 5);
      }
      let x = p.x + chaosSpRef.current * momentumRef.current * chaosDirRef.current;
      if (x >= BAR_W-DOT) { chaosDirRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { chaosDirRef.current= 1; x=0; }
      posRef.current = { ...p, x };
      const tSpeed = 4.5;
      let tx = targetXRef.current + tSpeed * targetDirRef.current;
      if (tx >= BAR_W - 30) { targetDirRef.current=-1; tx=BAR_W-30; }
      if (tx <= 20)          { targetDirRef.current= 1; tx=20; }
      targetXRef.current = tx;
      setTargetXDraw(tx);
    }

    setPosDraw({ ...posRef.current });
    if (activeRef.current) rafRef.current = requestAnimationFrame(animate);
  }, []);

  const startLevel = useCallback((idx) => {
    posRef.current      = { x:0, y:0, t:0, angle:-Math.PI/2, x2:BAR_W-DOT, vortAngle:0 };
    dirHRef.current     = 1;
    diagSpRef.current   = 0.9; chaosSpRef.current=7; chaosDirRef.current=1; chaosTimerRef.current=30;
    if (levelsRef.current[idx]?.type === "vdrop") diagSpRef.current = levelsRef.current[idx].speed;
    momentumRef.current = 1.0; setMomentumDraw(1.0);
    // random starting angle for 2d bounce — avoids purely axis-aligned paths
    const ang = Math.random() * Math.PI * 2;
    vel2dRef.current = { vx: Math.cos(ang), vy: Math.sin(ang) };
    targetXRef.current  = CX; targetDirRef.current=1;
    vortexTargAngleRef.current = -Math.PI/2;
    blindVisRef.current = true; blindTimerRef.current=8; setBlindVis(true);
    lvIdxRef.current    = idx;
    activeRef.current   = true;
    frameRef.current    = 0;
    setLvIdx(idx);
    setPlaying(true);
    setShowScore(false);
    setLastScore(null);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleStop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);

    const lv  = levelsRef.current[lvIdxRef.current];
    const pos = posRef.current;
    let sc = 0;
    const type = lv.type;
    if (type==="h"||type==="blind"||type==="ghost"||type==="chaos"||type==="sway") sc=scoreH(pos.x, lv.precision);
    if (type==="movingtarget"||type==="eclipse") sc=scoreH(pos.x, false, targetXRef.current);
    if (type==="diag")   sc=scoreDiag(pos.t);
    if (type==="circle") sc=scoreCircle(pos.angle);
    if (type==="countercircle"||type==="phasecircle") sc=scoreCircle(pos.angle, vortexTargAngleRef.current);
    if (type==="2d")     sc=score2D(pos.x, pos.y);
    if (type==="vortex") sc=scoreCircle(pos.angle, vortexTargAngleRef.current);
    if (type==="vdrop")   sc=scoreDiag(pos.t);
    if (type==="swaymt")  sc=scoreH(pos.x, false, targetXRef.current);
    if (type==="ghost2d") sc=score2D(pos.x, pos.y);
    if (type==="overload") sc=scoreH(pos.x, true, targetXRef.current);

    snd(playScore, sc);
    setLastScore(sc);
    setShowScore(true);
    scoresRef.current = [...scoresRef.current, sc];
    setScores(scoresRef.current);

    setTimeout(() => {
      const next = lvIdxRef.current + 1;
      if (next < levelsRef.current.length) startLevel(next);
      else {
        if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current=null; }
        // Compute final avg (excluding warmup unless this run counts warmup) and update bests.
        const finalScores = scoresRef.current;
        const scoredPairs = finalScores
          .map((s, i) => ({ s, lv: levelsRef.current[i] }))
          .filter(({ lv }) => scoreWarmupRef.current || !lv?.warmup);
        const finalAvg = scoredPairs.length
          ? Math.round(scoredPairs.reduce((a, { s }) => a + s, 0) / scoredPairs.length)
          : 0;
        const key = presetKey(levelsRef.current);
        const prevBest = bestScoresRef.current[key] ?? null;
        const isNew = finalAvg > 0 && (prevBest == null || finalAvg > prevBest);
        if (isNew) {
          const nextBests = { ...bestScoresRef.current, [key]: finalAvg };
          bestScoresRef.current = nextBests;
          setBestScores(nextBests);
        }
        setRunMeta({ previousBest: prevBest, isNewBest: isNew });
        setScreen("result");
      }
    }, 750);
  }, [startLevel, snd]);

  useEffect(() => {
    const onKey = (e) => { if (e.code==="Space") { e.preventDefault(); if (screen==="play") handleStop(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, handleStop]);

  // Start/stop menu music when screen changes
  useEffect(() => {
    const shouldPlayLoop = (screen === "menu" || screen === "play") && !mutedRef.current && !musicPaused;
    if (shouldPlayLoop) {
      if (!musicLoopRef.current) ensureMusicLoop();
      if (musicLoopRef.current) {
        musicLoopRef.current.setVolume(musicVol);
        musicLoopRef.current.setIntensity?.(musicIntensity);
      }
    } else {
      stopMusicLoop(true);
    }
  }, [screen, musicPaused, musicVol, musicIntensity, ensureMusicLoop, stopMusicLoop]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    activeRef.current = false;
    if (droneStopRef.current) droneStopRef.current();
    stopMusicLoop(true);
  }, [stopMusicLoop]);

  const startGame = useCallback((countOrLevels, opts = {}) => {
    const chosen = Array.isArray(countOrLevels)
      ? countOrLevels
      : pickLevels(countOrLevels, settings.skipWarmup);
    levelsRef.current = chosen;
    setLevels(chosen);
    scoresRef.current = [];
    setScores([]);
    setScoreWarmup(opts.countWarmup ?? false);
    setShowSettings(false);
    setScreen("play");
    if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
    setTimeout(() => startLevel(0), 200);
  }, [settings.skipWarmup, startLevel]);

  useEffect(() => {
    const onFirstGesture = () => { unlockAudio(); };
    window.addEventListener("pointerdown", onFirstGesture, { passive: true });
    window.addEventListener("keydown", onFirstGesture);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, [unlockAudio]);

  const goMenu = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    activeRef.current = false;
    if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
    setScreen("menu");
  }, []);

  // ── GAME SCREEN ──
  if (screen === "menu") return (
    <LegacyMenu T={T} onStart={startGame} onUnlockAudio={unlockAudio} settings={settings} showSettings={showSettings}
      setShowSettings={setShowSettings} setSettings={setSettings}
      bestScores={bestScores}
      sndClick={() => snd(playClick)}
      sndHover={() => snd(playHover)}
      sndThreat={(tier) => snd(playThreatSelect, tier)}
      sndLaunch={() => snd(playLaunch)} />
  );

  if (screen === "result") return (
    <Result T={T} scores={scores} levels={levels} scoreWarmup={scoreWarmup}
      previousBest={runMeta.previousBest} isNewBest={runMeta.isNewBest}
      onReplay={() => startGame(levels, { countWarmup: scoreWarmup })} onMenu={goMenu} />
  );

  const lv = currentLevel;
  if (!lv) return null;
  const dc = DIFF[lv.diff];

  return (
    <div onClick={playing ? handleStop : undefined} style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:T.bg, cursor: playing ? "crosshair" : "default",
      userSelect:"none", fontFamily:"'Courier New', monospace",
      transition:"background 0.4s",
      padding:"72px 16px 32px",
      touchAction:"manipulation",
    }}>
      {/* top bar — swallow clicks so mid-run taps near the top don't end the round */}
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", top:0, left:0, right:0,
        display:"flex", alignItems:"center", padding:"6px 10px",
        background:`${T.bg}ee`, backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)", zIndex:10,
        borderBottom:`1px solid ${T.border}`,
      }}>
        {/* back arrow */}
        <button onClick={e => { e.stopPropagation(); goMenu(); }}
          style={{ background:"none", border:`1px solid ${T.border}`, color:T.sub, cursor:"pointer",
            fontSize:13, lineHeight:1, padding:"10px 14px", borderRadius:4,
            fontFamily:"'Courier New', monospace", opacity:0.65, minHeight:44,
            transition:"opacity 0.15s, color 0.15s, border-color 0.15s" }}
          onMouseEnter={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.color="#00ffcc"; e.currentTarget.style.borderColor="#00ffcc"; }}
          onMouseLeave={e=>{ e.currentTarget.style.opacity="0.65"; e.currentTarget.style.color=T.sub; e.currentTarget.style.borderColor=T.border; }}>
          ←
        </button>
        {/* level progress dots — centred */}
        <div style={{ flex:1, display:"flex", justifyContent:"center", gap:8 }}>
          {levels.map((_,i) => (
            <div key={i} style={{ width:6, height:6, borderRadius:"50%",
              background: i<lvIdx ? "#00ffcc" : i===lvIdx ? T.fg : T.hint,
              transition:"background 0.3s" }} />
          ))}
        </div>
        {/* spacer matches button width so dots stay centred */}
        <div style={{ width:48 }} />
      </div>

      {/* difficulty badge */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ color: dc.color, fontSize:10, letterSpacing:3, border:`1px solid ${dc.color}`, padding:"2px 8px", opacity:0.7 }}>
          {dc.label}
        </span>
      </div>
      <p style={{ color:T.fg, fontSize:15, letterSpacing:3, textTransform:"uppercase", marginBottom:4, opacity:0.9 }}>
        {lv.warmup ? "warm up" : lv.label}
      </p>
      <div style={{ marginBottom:18, height:1, width:120, background:`linear-gradient(90deg, transparent, ${dc.color}99, transparent)` }} />

      {/* level renderer */}
      {(lv.type==="h"||lv.type==="chaos"||lv.type==="blind"||lv.type==="ghost"||lv.type==="sway") && (
        <ScaledHBar pos={posDraw} playing={playing} lv={lv} T={T} blindVis={blindVis} targetX={CX} />
      )}
      {(lv.type==="movingtarget" || lv.type==="eclipse") && (
        <ScaledHBar pos={posDraw} playing={playing} lv={lv} T={T} blindVis={lv.type==="eclipse" ? blindVis : true} targetX={targetXDraw} moving />
      )}
      {lv.type==="diag"   && <DiagBox      pos={posDraw} playing={playing} T={T} />}
      {lv.type==="vdrop"  && <VDropBox     pos={posDraw} playing={playing} T={T} />}
      {lv.type==="circle" && <CircleBox   pos={posDraw} playing={playing} T={T} />}
      {(lv.type==="countercircle" || lv.type==="phasecircle") && (
        <CircleBox pos={posDraw} playing={playing} T={T} targetAngle={vortexTargAngleDraw} blindVis={lv.type==="phasecircle" ? blindVis : true} />
      )}
      {lv.type==="2d"     && <Box2D       pos={posDraw} playing={playing} T={T} />}
      {lv.type==="vortex" && <VortexBox   pos={posDraw} playing={playing} T={T} targetAngle={vortexTargAngleDraw} />}
      {lv.type==="swaymt" && (
        <ScaledHBar pos={posDraw} playing={playing} lv={lv} T={T} blindVis={true} targetX={targetXDraw} moving />
      )}
      {lv.type==="ghost2d" && (
        <Box2D pos={posDraw} playing={playing} T={T} blindVis={blindVis} />
      )}
      {lv.type==="overload" && (
        <ScaledHBar pos={posDraw} playing={playing} lv={lv} T={T} blindVis={true} targetX={targetXDraw} moving />
      )}

      {/* score / hint */}
      <div style={{ marginTop:28, height:52, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {showScore && lastScore !== null
          ? <ScoreFlash score={lastScore} T={T} />
          : playing
            ? <p style={{ color:T.fg, fontSize:14, letterSpacing:4, textTransform:"uppercase", margin:0, opacity:0.8 }}>tap · space</p>
            : null}
      </div>
      <p style={{ color:T.fg, fontSize:13, marginTop:4, letterSpacing:1, opacity:0.75 }}>{lv.hint}</p>
      {/* momentum warning */}
      {lv.diff !== "easy" && !lv.warmup && momentumDraw > 1.2 && playing && (
        <p style={{
          color: momentumDraw > 2 ? "#ef4444" : "#f59e0b",
          fontSize: 10, letterSpacing: 3, textTransform:"uppercase",
          marginTop: 8, opacity: 0.9, margin:"8px 0 0"
        }}>
          {momentumDraw > 2 ? "⚡ momentum critical" : "↑ momentum building"}
        </p>
      )}

    </div>
  );
}

// ─── LOGO ────────────────────────────────────────────────────────────────────
function DeadcenterLogo({ T, size = 22 }) {
  const c = size / 2;
  const r = size / 2 - 1.5;
  const gap = size * 0.2;
  const sw = Math.max(1, size * 0.06);
  const fontSize = Math.round(size * 1);
  const dotR = Math.max(2, size * 0.09);
  return (
    <div style={{ display:"flex", alignItems:"center", gap: Math.round(size * 0.4) }}>
      <svg width={size} height={size} style={{ display:"block", flexShrink:0 }}>
        {/* outer ring */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="#00ffcc" strokeWidth={sw * 1.2} opacity="0.95" />
        {/* crosshair ticks — gaps around center dot */}
        <line x1={c}        y1={1.5}       x2={c}        y2={c-gap}     stroke="#00ffcc" strokeWidth={sw} opacity="0.85" />
        <line x1={c}        y1={c+gap}     x2={c}        y2={size-1.5}  stroke="#00ffcc" strokeWidth={sw} opacity="0.85" />
        <line x1={1.5}      y1={c}         x2={c-gap}    y2={c}         stroke="#00ffcc" strokeWidth={sw} opacity="0.85" />
        <line x1={c+gap}    y1={c}         x2={size-1.5} y2={c}         stroke="#00ffcc" strokeWidth={sw} opacity="0.85" />
        {/* center dot */}
        <circle cx={c} cy={c} r={dotR} fill="#00ffcc" opacity="1" />
      </svg>
      <span style={{ color:T.fg, fontSize, letterSpacing: Math.max(3, Math.round(size * 0.1)),
        fontWeight:"bold", opacity:0.9, fontFamily:"'Courier New', monospace" }}>deadcenter</span>
    </div>
  );
}

// ─── LEVEL RENDERERS ─────────────────────────────────────────────────────────

function HBar({ pos, playing, lv, T, blindVis, targetX, moving }) {
  const isPrecision = lv.precision;
  const tW  = isPrecision ? 4 : 18;
  const tCol = moving ? "#f59e0b" : isPrecision ? "#ef4444" : T.fg;
  const dotOpacity = blindVis ? 1 : 0;

  return (
    <div style={{ position:"relative", width:BAR_W, height:32 }}>
      {/* track */}
      <div style={{ position:"absolute", top:9, left:0, right:0, height:14, background:T.track, borderRadius:20 }} />
      {/* target circle */}
      <svg style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }} width={BAR_W} height={32}>
        <circle cx={targetX + DOT/2} cy={16} r={tW/2 + 4}
          fill="none" stroke={tCol} strokeWidth="1.5" opacity="0.6" />
        <circle cx={targetX + DOT/2} cy={16} r={2}
          fill={tCol} opacity="0.5" />
      </svg>
      {/* dot */}
      <div style={{
        position:"absolute", top:9, left:pos.x,
        width:DOT, height:DOT, borderRadius:"50%",
        background: playing ? "#00ffcc" : T.sub,
        opacity: dotOpacity,
        boxShadow: playing && blindVis ? "0 0 10px #00ffccaa" : "none",
        transition: "background 0.2s",
      }} />
    </div>
  );
}

function ScaledHBar(props) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const avail = window.innerWidth - 32;
      setScale(avail < BAR_W ? avail / BAR_W : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <div style={{ width: Math.round(BAR_W * scale), height: Math.round(32 * scale) }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:"top left", width:BAR_W, height:32 }}>
        <HBar {...props} />
      </div>
    </div>
  );
}

function DiagBox({ pos, playing, T }) {
  const end = SQ - DOT;
  const ex = end + DOT/2, ey = end + DOT/2;
  return (
    <svg viewBox={`0 0 ${SQ} ${SQ}`} style={{ display:"block", width:`min(${SQ}px, calc(100vw - 32px))`, height:"auto" }}>
      <circle cx={SQ/2} cy={SQ/2} r={SQ/2-3} fill="none" stroke={T.border} strokeWidth="1" strokeDasharray="2 8" />
      <line x1={DOT/2} y1={DOT/2} x2={ex} y2={ey} stroke={T.track} strokeWidth="2" strokeDasharray="6 5" />
      <circle cx={DOT/2} cy={DOT/2} r={3} fill={T.border} />
      {/* target ring */}
      <circle cx={ex} cy={ey} r={14} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.4" />
      <circle cx={ex} cy={ey} r={6}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
      <circle cx={ex} cy={ey} r={2}  fill={T.fg} opacity="0.6" />
      {/* dot */}
      <circle cx={pos.x+DOT/2} cy={pos.y+DOT/2} r={DOT/2}
        fill={playing?"#00ffcc":T.sub}
        style={{ filter: playing?"drop-shadow(0 0 5px #00ffcc)":"none", transition:"fill 0.2s" }} />
    </svg>
  );
}

function VDropBox({ pos, playing, T }) {
  const cx = SQ / 2;
  const ty = SQ - DOT / 2; // target center y (bottom)
  return (
    <svg viewBox={`0 0 ${SQ} ${SQ}`} style={{ display:"block", width:`min(${SQ}px, calc(100vw - 32px))`, height:"auto" }}>
      <circle cx={cx} cy={SQ/2} r={SQ/2-3} fill="none" stroke={T.border} strokeWidth="1" strokeDasharray="2 8" />
      <line x1={cx} y1={DOT/2} x2={cx} y2={ty} stroke={T.track} strokeWidth="2" strokeDasharray="6 5" />
      <circle cx={cx} cy={DOT/2} r={3} fill={T.border} />
      {/* target ring at bottom */}
      <circle cx={cx} cy={ty} r={14} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.4" />
      <circle cx={cx} cy={ty} r={6}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
      <circle cx={cx} cy={ty} r={2}  fill={T.fg} opacity="0.6" />
      {/* dot */}
      <circle cx={pos.x+DOT/2} cy={pos.y+DOT/2} r={DOT/2}
        fill={playing?"#00ffcc":T.sub}
        style={{ filter:playing?"drop-shadow(0 0 5px #00ffcc)":"none", transition:"fill 0.2s" }} />
    </svg>
  );
}

function CircleBox({ pos, playing, T, targetAngle = -Math.PI / 2, blindVis = true }) {
  const cx=SQ/2, cy=SQ/2, r=SQ/2-DOT-2;
  const tx=cx + r*Math.cos(targetAngle), ty=cy + r*Math.sin(targetAngle);
  return (
    <svg viewBox={`0 0 ${SQ} ${SQ}`} style={{ display:"block", width:`min(${SQ}px, calc(100vw - 32px))`, height:"auto" }}>
      {/* orbit track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.track} strokeWidth="2" strokeDasharray="3 6" />
      {/* cardinal ticks */}
      {[0,1,2,3].map(i => {
        const a=i*Math.PI/2 - Math.PI/2;
        return <circle key={i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r={2} fill={T.sub} opacity="0.25" />;
      })}
      {/* target ring at 12 o'clock */}
      <circle cx={tx} cy={ty} r={13} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.45" />
      <circle cx={tx} cy={ty} r={5}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.2" />
      <circle cx={tx} cy={ty} r={2}  fill={T.fg} opacity="0.55" />
      <circle cx={cx} cy={cy} r={2}  fill={T.border} />
      {/* dot */}
      <circle cx={pos.x+DOT/2} cy={pos.y+DOT/2} r={DOT/2}
        fill={playing?"#00ffcc":T.sub}
        opacity={blindVis ? 1 : 0}
        style={{ filter:playing && blindVis ? "drop-shadow(0 0 5px #00ffcc)" : "none", transition:"fill 0.2s, opacity 0.2s" }} />
    </svg>
  );
}

function Box2D({ pos, playing, T, blindVis = true }) {
  const cx=SQ/2, cy=SQ/2;
  return (
    <svg viewBox={`0 0 ${SQ} ${SQ}`} style={{ display:"block", width:`min(${SQ}px, calc(100vw - 32px))`, height:"auto" }}>
      <rect x={1} y={1} width={SQ-2} height={SQ-2} rx={10} fill="none" stroke={T.border} strokeWidth="1" />
      <line x1={cx} y1={4}    x2={cx} y2={SQ-4} stroke={T.track} strokeWidth="1" />
      <line x1={4}  y1={cy}   x2={SQ-4} y2={cy} stroke={T.track} strokeWidth="1" />
      <circle cx={cx} cy={cy} r={22} fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.15" />
      <circle cx={cx} cy={cy} r={13} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.35" />
      <circle cx={cx} cy={cy} r={5}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
      <circle cx={cx} cy={cy} r={2}  fill={T.fg} opacity="0.55" />
      <circle cx={pos.x+DOT/2} cy={pos.y+DOT/2} r={DOT/2}
        fill={playing?"#00ffcc":T.sub}
        opacity={blindVis ? 1 : 0}
        style={{ filter:playing && blindVis?"drop-shadow(0 0 6px #00ffcc)":"none", transition:"fill 0.2s, opacity 0.2s" }} />
    </svg>
  );
}

function VortexBox({ pos, playing, T, targetAngle }) {
  const cx=SQ/2, cy=SQ/2, r=SQ/2-DOT-4;
  const tx = cx + r*Math.cos(targetAngle) - DOT/2;
  const ty = cy + r*Math.sin(targetAngle) - DOT/2;
  return (
    <svg viewBox={`0 0 ${SQ} ${SQ}`} style={{ display:"block", width:`min(${SQ}px, calc(100vw - 32px))`, height:"auto" }}>
      {/* concentric rings */}
      {[0.25,0.5,0.75,1].map((frac,i) => (
        <circle key={i} cx={cx} cy={cy} r={(SQ/2-DOT-4)*frac}
          fill="none" stroke={T.track} strokeWidth="1" opacity={0.3+i*0.1} strokeDasharray="2 7" />
      ))}
      {/* rotating target ring */}
      <circle cx={tx+DOT/2} cy={ty+DOT/2} r={13} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
      <circle cx={tx+DOT/2} cy={ty+DOT/2} r={4}  fill="none" stroke="#f59e0b" strokeWidth="1"   opacity="0.3" />
      <circle cx={tx+DOT/2} cy={ty+DOT/2} r={2}  fill="#f59e0b" opacity="0.6" />
      <circle cx={cx} cy={cy} r={2} fill={T.border} />
      {/* dot */}
      <circle cx={pos.x+DOT/2} cy={pos.y+DOT/2} r={DOT/2}
        fill={playing?"#00ffcc":T.sub}
        style={{ filter:playing?"drop-shadow(0 0 5px #00ffcc)":"none", transition:"fill 0.2s" }} />
    </svg>
  );
}

// ─── SCORE FLASH ─────────────────────────────────────────────────────────────
function ScoreFlash({ score, T }) {
  const color = score>=80?"#00ffcc" : score>=55?"#f59e0b" : "#ef4444";
  return (
    <div style={{ textAlign:"center" }}>
      <span style={{ fontSize:44, fontWeight:"bold", color, fontFamily:"'Courier New', monospace", letterSpacing:-1 }}>{score}</span>
      <span style={{ color:T.sub, fontSize:12, marginLeft:6, opacity:0.5 }}>/ 100</span>
    </div>
  );
}

// ─── SETTINGS PANEL ──────────────────────────────────────────────────────────
function SettingsPanel({ T, settings, setSettings, onClose }) {
  const Toggle = ({ val, onChange, label }) => (
    <div onClick={onChange} style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 0", borderBottom:`1px solid ${T.border}`,
      cursor:"pointer", minHeight:48,
    }}>
      <span style={{ color:T.fg, fontSize:12, letterSpacing:2 }}>{label}</span>
      <div style={{ width:44, height:26, borderRadius:13, flexShrink:0,
        background: val?"#00ffcc":T.track, position:"relative", transition:"background 0.2s" }}>
        <div style={{ position:"absolute", top:4, left: val?22:4, width:18, height:18, borderRadius:"50%",
          background: val?"#000":T.sub, transition:"left 0.2s" }} />
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bg, border:`1px solid ${T.border}`, borderRadius:16,
        padding:"24px 24px 16px", width:"100%", maxWidth:300, fontFamily:"'Courier New', monospace" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ color:T.fg, fontSize:12, letterSpacing:4 }}>SETTINGS</span>
          <button onClick={onClose} style={{
            background:"none", border:"none", color:T.sub, cursor:"pointer", fontSize:18,
            padding:"4px 8px", minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>
        <Toggle label="DAY MODE"    val={settings.day}        onChange={()=>setSettings(s=>({...s,day:!s.day}))} />
        <Toggle label="SKIP WARMUP" val={settings.skipWarmup} onChange={()=>setSettings(s=>({...s,skipWarmup:!s.skipWarmup}))} />
        <Toggle label="MUTE SOUNDS" val={settings.mute}       onChange={()=>setSettings(s=>({...s,mute:!s.mute}))} />
      </div>
    </div>
  );
}

// ─── MENU ────────────────────────────────────────────────────────────────────
function LegacyMenu({ T, onStart, onUnlockAudio, settings, showSettings, setShowSettings, setSettings, sndClick, sndHover, sndThreat, sndLaunch, bestScores = {} }) {
  // Default-select EASY so there's always a live PLAY button for first-timers.
  const [playlistIds, setPlaylistIds] = useState(() =>
    POOL.filter(l => l.diff === "easy").map(l => l.id)
  );

  const toggleLevel = (id) => {
    setPlaylistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleDiff = (levels) => {
    const ids = levels.map(l => l.id);
    const allSelected = ids.every(id => playlistIds.includes(id));
    setPlaylistIds(prev =>
      allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const startSelection = async () => {
    if (playlistIds.length === 0) return;
    await onUnlockAudio?.();
    // Sort picked levels easy → medium → hard → impossible, light shuffle within each tier.
    const diffOrder = { easy:0, medium:1, hard:2, impossible:3 };
    const pickedLevels = POOL.filter(l => playlistIds.includes(l.id))
      .map(l => ({ l, k: Math.random() }))
      .sort((a, b) => (diffOrder[a.l.diff] - diffOrder[b.l.diff]) || (a.k - b.k))
      .map(({ l }) => l);
    const chosen = [
      ...(settings.skipWarmup ? [] : [WARMUP]),
      ...pickedLevels,
    ];
    const allImpossibleRun = pickedLevels.length > 0 && pickedLevels.every(l => l.diff === "impossible");
    if (allImpossibleRun) sndLaunch();
    else sndClick();
    // Warmup counts toward average only for pure easy runs or mixed runs that start at easy.
    const countWarmup = pickedLevels.some(l => l.diff === "easy");
    onStart(chosen, { countWarmup });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space" || playlistIds.length === 0) return;
      e.preventDefault();
      startSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playlistIds, startSelection]);

  const playSelectSound = (levels) => {
    if (levels.some(l => l.diff === "impossible")) {
      sndThreat("impossible");
      return;
    }
    if (levels.some(l => l.diff === "hard")) {
      sndThreat("hard");
      return;
    }
    sndClick();
  };

  const maxSpeedLabel = { easy:"none", medium:"2x", hard:"3x", impossible:"4x" };
  const diffSections = [
    { key:"easy", label:"I - EASY", levels:[WARMUP, ...POOL.filter(l => l.diff === "easy")] },
    { key:"medium", label:"II - MEDIUM", levels:POOL.filter(l => l.diff === "medium") },
    { key:"hard", label:"III - HARD", levels:POOL.filter(l => l.diff === "hard") },
    { key:"impossible", label:"INF - IMPOSSIBLE", levels:POOL.filter(l => l.diff === "impossible") },
  ];
  const quickPicks = [
    { key:"easy", label:"EASY", color:DIFF.easy.color, levels:diffSections[0].levels },
    { key:"medium", label:"MEDIUM", color:DIFF.medium.color, levels:diffSections[1].levels },
    { key:"hard", label:"HARD", color:DIFF.hard.color, levels:diffSections[2].levels },
    { key:"impossible", label:"IMPOSSIBLE", color:DIFF.impossible.color, levels:diffSections[3].levels },
    { key:"all", label:"ALL", color:"#00ffcc", levels:[WARMUP, ...POOL] },
  ];
  const btnBase = {
    fontFamily:"'Courier New', monospace",
    cursor:"pointer",
    transition:"all 0.15s",
    letterSpacing:3,
    fontSize:11,
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"'Courier New', monospace",
      color:T.fg, textAlign:"center", transition:"background 0.4s",
      padding:"56px 16px 48px" }}>

      <button onClick={async ()=>{ await onUnlockAudio?.(); sndClick(); setShowSettings(true); }}
        onMouseEnter={sndHover}
        style={{ position:"fixed", top:8, right:8, background:"transparent",
          border:"none", cursor:"pointer", color:T.sub, fontSize:18,
          minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center",
          padding:0 }}>⚙</button>

      {showSettings && <SettingsPanel T={T} settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)} />}

      <div style={{ marginBottom:10 }}>
        <DeadcenterLogo T={T} size={52} />
      </div>
      <p style={{ color:T.fg, fontSize:13, letterSpacing:4, margin:"0 0 8px", opacity:0.88, textShadow:"0 0 10px rgba(0,0,0,0.18)" }}>stop the dot on the target</p>
      <p style={{ color:T.fg, fontSize:10, letterSpacing:2, margin:"0 0 22px", opacity:0.65 }}>
        tap a difficulty to select, or pick individual levels below
      </p>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24, width:"100%", maxWidth:560 }}>
        {quickPicks.map(pick => {
          const ids = pick.levels.map(l => l.id);
          const allSelected = ids.every(id => playlistIds.includes(id));
          const presetIds = pick.levels.filter(l => !l.warmup).map(l => l.id).sort((a,b)=>a-b).join(",");
          const best = bestScores[presetIds];
          return (
            <button key={pick.key}
              onClick={async () => { await onUnlockAudio?.(); playSelectSound(pick.levels); toggleDiff(pick.levels); }}
              onMouseEnter={sndHover}
              style={{ ...btnBase,
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                background: allSelected ? `${pick.color}18` : "transparent",
                border:`1px solid ${allSelected ? pick.color : T.border}`,
                color: allSelected ? pick.color : T.sub,
                padding:"10px 14px", minWidth:80, minHeight:48,
                borderRadius:4,
                transform: allSelected ? "translateY(-1px)" : "translateY(0)",
                boxShadow: allSelected ? `0 8px 20px ${pick.color}15` : "none" }}>
              <span>{pick.label}</span>
              {best != null && (
                <span style={{ fontSize:8, letterSpacing:1.5, opacity:0.75, color:pick.color }}>
                  best {best}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ width:"100%", maxWidth:560, textAlign:"left", marginBottom:22 }}>
        {diffSections.map(sec => {
          const dc = DIFF[sec.key];
          const secIds = sec.levels.map(l => l.id);
          const allTicked = secIds.length > 0 && secIds.every(id => playlistIds.includes(id));
          return (
            <div key={sec.key} style={{ marginBottom:18,
              borderRadius:6,
              background: allTicked ? `${dc.color}09` : "transparent",
              border:`1px solid ${allTicked ? `${dc.color}33` : "transparent"}`,
              transition:"background 0.2s, border-color 0.2s",
              padding:"0 8px 6px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:6, paddingBottom:4,
                borderBottom:`1px solid ${allTicked ? dc.color + "55" : dc.dim}`,
                transition:"border-color 0.2s" }}>
                <div onClick={async ()=>{ await onUnlockAudio?.(); playSelectSound(sec.levels); toggleDiff(sec.levels); }}
                  onMouseEnter={sndHover}
                  style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", minHeight:44 }}>
                  <span style={{ color:dc.color, fontSize:12, opacity:allTicked ? 1 : 0.45, userSelect:"none", lineHeight:1 }}>
                    {allTicked ? "[x]" : "[ ]"}
                  </span>
                  <span style={{ fontSize:11, letterSpacing:3, color:dc.color, opacity:0.85 }}>
                    {sec.label}
                  </span>
                  <span style={{ fontSize:9, letterSpacing:1, color:T.fg, opacity:0.5 }}>
                    tap to select all
                  </span>
                </div>
                <span style={{ fontSize:9, letterSpacing:2, color:dc.color, opacity:0.5, flexShrink:0 }}>
                  max {maxSpeedLabel[sec.key]}
                </span>
              </div>

              {sec.levels.map(lv => {
                const selected = playlistIds.includes(lv.id);
                return (
                  <div key={lv.id} onClick={async ()=>{ await onUnlockAudio?.(); playSelectSound([lv]); toggleLevel(lv.id); }}
                    onMouseEnter={sndHover}
                    style={{ display:"grid", gridTemplateColumns:"18px minmax(80px, 140px) 1fr",
                      alignItems:"center", gap:"0 10px",
                      padding:"11px 0", borderBottom:`1px solid ${T.border}`,
                      cursor:"pointer",
                      background:selected ? `${dc.color}11` : "transparent",
                      transition:"background 0.15s, transform 0.15s",
                      transform:selected ? "translateX(2px)" : "translateX(0)" }}>
                    <span style={{ color:dc.color, fontSize:10, opacity:selected ? 1 : 0.5 }}>
                      {selected ? "✓" : (lv.warmup ? "*" : "○")}
                    </span>
                    <span style={{ color:selected ? T.fg : T.sub, fontSize:12, letterSpacing:1,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      transition:"color 0.2s" }}>{lv.label}</span>
                    <span style={{ color:T.fg, fontSize:10,
                      opacity:selected ? 0.72 : 0.42,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      transition:"opacity 0.2s" }}>{lv.hint}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%", maxWidth:320 }}>
        <p style={{ color:T.fg, fontSize:10, letterSpacing:2, margin:0, opacity:0.62 }}>
          {playlistIds.length === 0 ? "pick a difficulty or tap levels above" : `${playlistIds.length} level${playlistIds.length>1?"s":""} selected`}
        </p>
        <button onClick={startSelection}
          disabled={playlistIds.length === 0}
          style={{ background:playlistIds.length > 0 ? "#00ffcc" : `${T.border}55`, border:"none",
            color:playlistIds.length > 0 ? "#000" : T.sub,
            padding:"14px 0", fontSize:13, letterSpacing:5, textTransform:"uppercase",
            cursor:playlistIds.length > 0 ? "pointer" : "not-allowed", fontFamily:"'Courier New', monospace",
            fontWeight:"bold", borderRadius:4, opacity:playlistIds.length > 0 ? 1 : 0.6,
            width:"100%", minHeight:48,
            transition:"background 0.15s, transform 0.15s, box-shadow 0.15s",
            boxShadow:playlistIds.length > 0 ? "0 10px 24px rgba(0,255,204,0.12)" : "none" }}
          onMouseEnter={playlistIds.length > 0 ? e=>{ sndHover(); e.currentTarget.style.background="#00e6b8"; e.currentTarget.style.transform="translateY(-1px)"; } : undefined}
          onMouseLeave={playlistIds.length > 0 ? e=>{ e.currentTarget.style.background="#00ffcc"; e.currentTarget.style.transform="translateY(0)"; } : undefined}>
          PLAY
        </button>
      </div>

      <p style={{ color:T.fg, fontSize:10, letterSpacing:2, marginTop:14, opacity:0.56 }}>
        {settings.skipWarmup ? "warm up skipped" : "first round is always warm up"}
      </p>

      <div style={{ position:"fixed", bottom:12, left:"50%", transform:"translateX(-50%)",
        fontSize:10, letterSpacing:6, color:"#00ffcc", opacity:0.45, pointerEvents:"none" }}>DEADCENTER</div>
    </div>
  );
}

function Result({ T, scores, levels, scoreWarmup, onReplay, onMenu, previousBest, isNewBest }) {
  // exclude warmup from average unless scoreWarmup is true
  const scoredPairs = scores
    .map((s, i) => ({ s, lv: levels[i] }))
    .filter(({ lv }) => scoreWarmup || !lv?.warmup);
  const avg = scoredPairs.length
    ? Math.round(scoredPairs.reduce((a, { s }) => a + s, 0) / scoredPairs.length)
    : 0;
  const { label, color } = grade(avg);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"'Courier New', monospace",
      color:T.fg, textAlign:"center", transition:"background 0.4s",
      padding:"40px 16px 56px" }}>

      <p style={{ color:T.sub, fontSize:12, letterSpacing:5, marginBottom:10, opacity:0.7 }}>FINAL SCORE</p>
      <div style={{ fontSize:"clamp(52px, 22vw, 112px)", fontWeight:"bold", color, lineHeight:1, letterSpacing:-2 }}>{avg}</div>
      <div style={{ fontSize:"clamp(12px, 3.5vw, 16px)", letterSpacing:6, color, marginTop:14, marginBottom:36, textTransform:"uppercase" }}>{label}</div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginBottom:36, width:"100%", maxWidth:680 }}>
        {scores.map((s,i) => {
          const lv = levels[i];
          const dc = lv ? DIFF[lv.diff] : DIFF.easy;
          const excluded = !scoreWarmup && lv?.warmup;
          return (
            <div key={i} style={{
              textAlign:"center",
              flex:"1 0 80px",
              maxWidth:112,
              minHeight:80,
              opacity: excluded ? 0.3 : 1,
              transition:"opacity 0.2s, transform 0.2s",
              padding:"8px 6px",
              border:`1px solid ${excluded ? T.border : `${dc.color}22`}`,
              borderRadius:8,
              background: excluded ? "transparent" : `${dc.color}08`,
            }}>
              <div style={{
                color:dc.color,
                fontSize:9,
                letterSpacing:1,
                marginBottom:6,
                opacity:0.82,
                lineHeight:1.35,
                minHeight:22,
                whiteSpace:"normal",
                wordBreak:"break-word",
                textTransform:"uppercase",
              }}>
                {lv?.label ?? `L${i+1}`}
              </div>
              <div style={{ fontSize:26, color: excluded ? T.sub : s>=80?"#00ffcc":s>=55?"#f59e0b":"#ef4444" }}>{s}</div>
              {excluded && <div style={{ fontSize:7, letterSpacing:1, color:T.sub, opacity:0.6, marginTop:2 }}>not scored</div>}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize:12, marginBottom:32, opacity:0.7,
        color: isNewBest ? "#00ffcc" : T.sub, letterSpacing: isNewBest ? 4 : 1,
        textTransform: isNewBest ? "uppercase" : "none" }}>
        {isNewBest ? "new personal best" : previousBest != null ? `best: ${previousBest}` : "first run — set the bar"}
      </p>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
        {[["retry",onReplay],["menu",onMenu]].map(([lbl,fn])=>(
          <button key={lbl} onClick={fn}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#00ffcc";e.currentTarget.style.color="#00ffcc";e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;e.currentTarget.style.transform="translateY(0)";}}
            style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.sub,
              padding:"13px 36px", fontSize:12, letterSpacing:4, textTransform:"uppercase",
              cursor:"pointer", fontFamily:"'Courier New', monospace",
              minHeight:48, minWidth:120,
              transition:"border-color 0.2s, color 0.2s, transform 0.2s" }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ position:"fixed", bottom:12, left:"50%", transform:"translateX(-50%)",
        fontSize:10, letterSpacing:6, color:"#00ffcc", opacity:0.45, pointerEvents:"none" }}>DEADCENTER</div>
    </div>
  );
}
