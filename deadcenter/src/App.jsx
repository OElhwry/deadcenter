import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";

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
  hint: "stop the dot on the target", warmup: true };

const POOL = [
  // ── EASY (3 levels) ──
  { id:1,  label: "steady",        type: "h",           speed: 6.5,   diff: "easy",
    hint: "stop the dot on the target" },
  { id:11, label: "sway",          type: "sway",        speed: 0.05,  diff: "easy",
    hint: "dot sways. stop it in the center" },
  { id:17, label: "drop",          type: "vdrop",       speed: 0.20,  diff: "easy",
    hint: "stop the dot at the bottom" },

  // ── MEDIUM (3 levels) ──
  { id:2,  label: "diagonal",      type: "diag",        speed: 0.9,   diff: "medium",
    hint: "stop the dot at the bottom right. it speeds up" },
  { id:12, label: "counter orbit", type: "countercircle", speed: 0.038, diff: "medium",
    hint: "target orbits too. stop on it" },
  { id:18, label: "ripple",        type: "swaymt",      speed: 0.05,  diff: "medium",
    hint: "both sway. stop the dot on the target" },

  // ── HARD (3 levels) ──
  { id:6,  label: "crossfire",     type: "movingtarget",speed: 14,    diff: "hard",
    precision: true, hint: "tiny target moves fast. track and stop" },
  { id:7,  label: "blind",         type: "blind",       speed: 8,     diff: "hard",
    hint: "dot blinks out. time the rhythm" },
  { id:13, label: "eclipse",       type: "eclipse",     speed: 10.5,  diff: "hard",
    hint: "target drifts, dot blinks. stop on the target" },

  // ── IMPOSSIBLE (3 levels) ──
  { id:10, label: "vortex",        type: "vortex",      speed: 0.052, diff: "impossible",
    hint: "orbit pulses, target rotates. stop on it" },
  { id:14, label: "phase orbit",   type: "phasecircle", speed: 0.056, diff: "impossible",
    hint: "orbit phases, target orbits. stop on it" },
  { id:20, label: "collapse",      type: "overload",    speed: 12,    diff: "impossible",
    precision: true, hint: "chaos plus moving target. stop on the target" },
];

function pickLevels(count, skipWarmup) {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const n = skipWarmup ? count : count - 1;
  const picked = shuffled.slice(0, n);
  return skipWarmup ? picked : [WARMUP, ...picked];
}

// Warmup auto-skips once the user has any best ≥60. Beginners always get it.
function shouldSkipWarmup(bestScores) {
  return Object.values(bestScores || {}).some(s => typeof s === "number" && s >= 60);
}

// ─── DAILY RUN ────────────────────────────────────────────────────────────────
// Same 5-level run for everyone on a given calendar day, derived from the date.
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function pickDailyLevels(dateKey = todayKey()) {
  const rng = seededRng(hashStr(dateKey));
  const arr = [...POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Sort easy → impossible so difficulty ramps up like a normal run.
  const order = { easy:0, medium:1, hard:2, impossible:3 };
  return arr.slice(0, 5).sort((a, b) => order[a.diff] - order[b.diff]);
}
function dailyKey(dateKey = todayKey()) { return `daily:${dateKey}`; }

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

// Unified score ladder used by grade(), playScore(), and ScoreFlash.
// DEAD CENTER 90+ · SHARP 75–89 · DECENT 50–74 · SHAKY 30–49 · NEEDS WORK <30
const SCORE_TIER = (s) =>
  s >= 90 ? "perfect" :
  s >= 75 ? "sharp"   :
  s >= 50 ? "decent"  :
  s >= 30 ? "shaky"   : "miss";
const TIER_COLOR = {
  perfect: "#00ffcc",
  sharp:   "#4ade80",
  decent:  "#f59e0b",
  shaky:   "#ef4444",
  miss:    "#9b1c1c",
};
function grade(avg) {
  const t = SCORE_TIER(avg);
  return {
    label: { perfect:"DEAD CENTER", sharp:"SHARP", decent:"DECENT", shaky:"SHAKY", miss:"NEEDS WORK" }[t],
    color: TIER_COLOR[t],
  };
}

// ─── THEMES ──────────────────────────────────────────────────────────────────
const DARK  = { bg:"#141414", fg:"#e0e0e0", sub:"#555", track:"#1e1e1e", border:"#252525", hint:"#2a2a2a", card:"#1a1a1a" };
const LIGHT = { bg:"#e6e3dc", fg:"#1f1f1f", sub:"#5e5e5e", track:"#cfcbc2", border:"#b8b4ac", hint:"#888", card:"#dad6cd" };

// ─── AUDIO ───────────────────────────────────────────────────────────────────
// Tier-based score chimes still use Web Audio (cheap synth, scales with score).
// All UI clicks and the music loop now use the bundled mp3s in /public.
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
  const tier = SCORE_TIER(score);
  if (tier === "perfect") {
    // 90+ — ascending fanfare
    [880, 1108, 1320, 1760].forEach((f, i) => setTimeout(() => playTone(ctx, f, "sine", 0.18, 0.12), i * 60));
  } else if (tier === "sharp") {
    // 75–89 — bright triad
    playTone(ctx, 660,"sine",0.07,0.13);
    setTimeout(()=>playTone(ctx,990,"sine",0.14,0.13),75);
    setTimeout(()=>playTone(ctx,1320,"sine",0.18,0.1),150);
  } else if (tier === "decent") {
    // 50–74 — single warm tone
    playTone(ctx, 440,"sine",0.13,0.1);
  } else {
    // <50 — sour thud, toned ~40% so learning a level isn't punishing.
    playTone(ctx, 160,"sawtooth",0.18,0.045);
    setTimeout(()=>playTone(ctx,130,"sawtooth",0.13,0.035),80);
  }
}

// ── HTML5 audio: short SFX + looping music ────────────────────────────────
// Lazy-init on first call so we don't construct Audio objects before user gesture.
const SFX_FILES = {
  select: "/sfx-select.mp3",
  enter:  "/sfx-enter.mp3",
  back:   "/sfx-back.mp3",
  tally:  "/sfx-tally.mp3",
};
const SFX_VOL = { select: 0.45, enter: 0.55, back: 0.45, tally: 0.6 };
let _sfxCache = null;
function getSfx(name) {
  if (!_sfxCache) {
    _sfxCache = {};
    for (const [k, src] of Object.entries(SFX_FILES)) {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = SFX_VOL[k] ?? 0.5;
      _sfxCache[k] = a;
    }
  }
  return _sfxCache[name];
}
let _audioMuted = false;
function setAudioMuted(v) { _audioMuted = !!v; }
function playSfx(name) {
  if (_audioMuted) return;
  const a = getSfx(name);
  if (!a) return;
  try {
    // Clone for overlapping plays so rapid taps don't cut each other off.
    const node = a.cloneNode(true);
    node.volume = a.volume;
    node.play().catch(() => {});
  } catch {}
}

// ── BACKGROUND MUSIC LOOP ─────────────────────────────────────────────────
// Single mp3 looping via HTMLAudioElement. The signature stays compatible
// with the previous synth loop so call sites don't change.
function startMenuMusic(_ctx, volume = 0.3, intensity = 0) {
  const a = new Audio("/music-loop.mp3");
  a.loop = true;
  let currentVol = Math.max(0, Math.min(1, volume));
  // intensity nudges volume up on harder levels (no synth layers here).
  const effectiveVol = (v, i) => Math.max(0, Math.min(1, v * (0.85 + i * 0.25)));
  a.volume = effectiveVol(currentVol, intensity);
  a.play().catch(() => {});
  let stopped = false;
  let fadeId = null;

  return {
    setVolume(v) {
      if (stopped) return;
      currentVol = Math.max(0, Math.min(1, v));
      a.volume = effectiveVol(currentVol, intensity);
    },
    setIntensity(i) {
      if (stopped) return;
      intensity = Math.max(0, Math.min(1, i));
      a.volume = effectiveVol(currentVol, intensity);
    },
    // Pause without resetting position — used when the page/tab is hidden.
    pause() {
      if (stopped) return;
      try { a.pause(); } catch {}
    },
    resume() {
      if (stopped) return;
      a.play().catch(() => {});
    },
    stop(immediate = false) {
      stopped = true;
      if (fadeId) { clearInterval(fadeId); fadeId = null; }
      if (immediate) {
        try { a.pause(); a.currentTime = 0; } catch {}
        return;
      }
      const start = a.volume;
      const steps = 18;
      let i = 0;
      fadeId = setInterval(() => {
        i++;
        a.volume = Math.max(0, start * (1 - i / steps));
        if (i >= steps) { clearInterval(fadeId); fadeId = null; try { a.pause(); a.currentTime = 0; } catch {} }
      }, 35);
    },
  };
}

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
const LS_SETTINGS = "deadcenter.settings.v1";
const LS_BESTS    = "deadcenter.bests.v1";
const LS_SEEN     = "deadcenter.seenLevels.v1";
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
  const [screen,       setScreen]       = useState("landing");
  const [settings,     setSettings]     = useState(() =>
    loadJSON(LS_SETTINGS, { day:false, mute:false })
  );
  const [bestScores,   setBestScores]   = useState(() => loadJSON(LS_BESTS, {}));
  const [seenLevels,   setSeenLevels]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LS_SEEN) || "[]")); }
    catch { return new Set(); }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [levels,       setLevels]       = useState([]);
  const [lvIdx,        setLvIdx]        = useState(0);
  const [scores,       setScores]       = useState([]);
  const [playing,      setPlaying]      = useState(false);
  const [lastScore,    setLastScore]    = useState(null);
  const [showScore,    setShowScore]    = useState(false);
  const [runMeta,      setRunMeta]      = useState({ previousBest: null, isNewBest: false });
  const [backConfirm,  setBackConfirm]  = useState(false);
  const backConfirmRef = useRef(false);
  const [combo,        setCombo]        = useState(0);
  const comboRef       = useRef(0);
  const [hitFx,        setHitFx]        = useState(null); // "perfect" | "miss" | null
  const hitFxTimerRef  = useRef(null);
  const runKeyRef      = useRef(null); // overrides presetKey for daily/special runs

  useEffect(() => { saveJSON(LS_SETTINGS, settings); }, [settings]);
  useEffect(() => { saveJSON(LS_BESTS, bestScores); }, [bestScores]);
  useEffect(() => {
    try { localStorage.setItem(LS_SEEN, JSON.stringify([...seenLevels])); } catch {}
  }, [seenLevels]);
  const musicVol = 0.25;
  const musicPaused = false;
  const [scoreWarmup,  setScoreWarmup]  = useState(false);
  const currentLevel = levels[lvIdx];
  const musicIntensity = screen !== "play"
    ? 0
    : ({ easy: 0.05, medium: 0.32, hard: 0.78, impossible: 1 }[currentLevel?.diff] ?? 0.22);

  const T = settings.day ? LIGHT : DARK;

  // animation state
  const posRef        = useRef({ x:0, y:0, t:0, angle:-Math.PI/2, x2:BAR_W-DOT, vortAngle:0 });
  const targetXRef    = useRef(CX);   // for movingtarget
  const targetDirRef  = useRef(1);
  const vortexTargAngleRef = useRef(0); // for vortex rotating target
  const blindVisRef   = useRef(true);
  const blindTimerRef = useRef(0);
  // Element refs for ref-driven animation — avoids per-frame React re-renders.
  const dotElRef         = useRef(null); // the moving dot (div for HBar, SVG circle for boxes)
  const targetElRef      = useRef(null); // horizontal moving target (SVG circles inside HBar / swaymt / overload)
  const vortexTargElRef  = useRef(null); // circular rotating target group (vortex, countercircle, phasecircle)
  const rafRef        = useRef();
  const dirHRef       = useRef(1);
  const vel2dRef      = useRef({ vx: 1, vy: 1 });
  const diagSpRef     = useRef(0.9);
  const momentumRef   = useRef(1.0);
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
  setAudioMuted(settings.mute);

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
    if (audioUnlockedRef.current && !mutedRef.current && !musicPaused && (screen === "menu" || screen === "play" || screen === "result") && !musicLoopRef.current) {
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
      if ((screen === "menu" || screen === "play" || screen === "result") && !musicPaused && !musicLoopRef.current) {
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
    }
    const spd = lv.speed * (hasMomentum ? momentumRef.current : 1);

    // Helper: toggle a blind/ghost-style visibility timer. Mutates blindVisRef / blindTimerRef.
    const tickBlind = (onFrames, offFrames) => {
      blindTimerRef.current--;
      if (blindTimerRef.current <= 0) {
        const v = !blindVisRef.current;
        blindVisRef.current = v;
        blindTimerRef.current = v ? onFrames : offFrames;
      }
    };

    if (lv.type === "h" || lv.type === "blind" || lv.type === "ghost") {
      let x = p.x + spd * dirHRef.current;
      if (x >= BAR_W-DOT) { dirHRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { dirHRef.current= 1; x=0; }
      posRef.current = { ...p, x };
      if (lv.type === "blind") tickBlind(6, 40);
      if (lv.type === "ghost") tickBlind(4, 60);

    } else if (lv.type === "movingtarget" || lv.type === "eclipse") {
      let x = p.x + spd * dirHRef.current;
      if (x >= BAR_W-DOT) { dirHRef.current=-1; x=BAR_W-DOT; }
      if (x <= 0)          { dirHRef.current= 1; x=0; }
      const tSpeed = lv.precision ? 5.5 : lv.type === "eclipse" ? 3.6 : 2.5;
      let tx = targetXRef.current + tSpeed * targetDirRef.current;
      if (tx >= BAR_W - 30) { targetDirRef.current=-1; tx=BAR_W-30; }
      if (tx <= 20)          { targetDirRef.current= 1; tx=20; }
      targetXRef.current = tx;
      posRef.current = { ...p, x };
      if (lv.type === "eclipse") tickBlind(7, 24);

    } else if (lv.type === "diag") {
      let t = p.t + diagSpRef.current;
      diagSpRef.current = Math.min(diagSpRef.current + 0.08 * momentumRef.current, 20);
      if (t >= SQ - DOT) { diagSpRef.current = 0.9; t = 0; }
      posRef.current = { ...p, x:t, y:t, t };

    } else if (lv.type === "vdrop") {
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
      vortexTargAngleRef.current = (vortexTargAngleRef.current - targetSpeed + 2*Math.PI) % (2*Math.PI);
      if (lv.type === "phasecircle") tickBlind(5, 26);

    } else if (lv.type === "2d") {
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
      vortexTargAngleRef.current = (vortexTargAngleRef.current - 0.014 + 2*Math.PI) % (2*Math.PI);

    } else if (lv.type === "swaymt") {
      const t = p.t + spd;
      const amp = BAR_W / 2 - DOT / 2 - 10;
      const x = CX + amp * Math.sin(t);
      const tPhase = (vortexTargAngleRef.current + 0.031 + 2 * Math.PI) % (2 * Math.PI);
      vortexTargAngleRef.current = tPhase;
      const tAmp = BAR_W / 2 - DOT / 2 - 30;
      targetXRef.current = CX + tAmp * Math.sin(tPhase);
      posRef.current = { ...p, t, x };

    } else if (lv.type === "ghost2d") {
      let { vx, vy } = vel2dRef.current;
      let x = p.x + vx * spd;
      let y = p.y + vy * spd;
      if (x >= SQ-DOT) { vx = -Math.abs(vx); x = SQ-DOT; }
      if (x <= 0)       { vx =  Math.abs(vx); x = 0; }
      if (y >= SQ-DOT) { vy = -Math.abs(vy); y = SQ-DOT; }
      if (y <= 0)       { vy =  Math.abs(vy); y = 0; }
      vel2dRef.current = { vx, vy };
      posRef.current = { ...p, x, y };
      tickBlind(4, 60);

    } else if (lv.type === "overload") {
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
    }

    // ── Write transforms directly to DOM (no React re-render per frame) ──
    const q = posRef.current;
    if (dotElRef.current) {
      dotElRef.current.style.transform = `translate(${q.x}px, ${q.y}px)`;
      dotElRef.current.style.opacity = blindVisRef.current ? "1" : "0";
    }
    if (targetElRef.current) {
      // Horizontal moving target — only x matters, y stays on the bar centerline.
      targetElRef.current.style.transform = `translate(${targetXRef.current}px, 0)`;
    }
    if (vortexTargElRef.current) {
      // Rotating target on circular tracks — compute x,y from angle around center.
      const r = SQ/2 - DOT - (lv.type === "vortex" ? 4 : 2);
      const tx = SQ/2 + r*Math.cos(vortexTargAngleRef.current) - DOT/2;
      const ty = SQ/2 + r*Math.sin(vortexTargAngleRef.current) - DOT/2;
      vortexTargElRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
    }

    if (activeRef.current) rafRef.current = requestAnimationFrame(animate);
  }, []);

  const startLevel = useCallback((idx) => {
    posRef.current      = { x:0, y:0, t:0, angle:-Math.PI/2, x2:BAR_W-DOT, vortAngle:0 };
    dirHRef.current     = 1;
    diagSpRef.current   = 0.9; chaosSpRef.current=7; chaosDirRef.current=1; chaosTimerRef.current=30;
    if (levelsRef.current[idx]?.type === "vdrop") diagSpRef.current = levelsRef.current[idx].speed;
    momentumRef.current = 1.0;
    // random starting angle for 2d bounce — avoids purely axis-aligned paths
    const ang = Math.random() * Math.PI * 2;
    vel2dRef.current = { vx: Math.cos(ang), vy: Math.sin(ang) };
    targetXRef.current  = CX; targetDirRef.current=1;
    vortexTargAngleRef.current = -Math.PI/2;
    blindVisRef.current = true; blindTimerRef.current=8;
    lvIdxRef.current    = idx;
    activeRef.current   = true;
    frameRef.current    = 0;
    // Clear any stale transform on persistent element refs before the renderer swaps.
    if (dotElRef.current)        dotElRef.current.style.transform        = "translate(0, 0)";
    if (targetElRef.current)     targetElRef.current.style.transform     = "translate(0, 0)";
    if (vortexTargElRef.current) vortexTargElRef.current.style.transform = "translate(0, 0)";
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
    // Haptic tick on mobile. Fire-and-forget — no-op on desktop.
    try { navigator.vibrate?.(sc >= 90 ? [8, 30, 8] : sc < 30 ? 30 : 10); } catch {}
    setLastScore(sc);
    setShowScore(true);
    scoresRef.current = [...scoresRef.current, sc];
    setScores(scoresRef.current);

    // Mark this level as seen so its hint stops showing on future plays.
    if (lv?.id != null) {
      setSeenLevels(prev => prev.has(lv.id) ? prev : new Set([...prev, lv.id]));
    }

    // Combo: ≥80 extends, <80 resets.
    const nextCombo = sc >= 80 ? comboRef.current + 1 : 0;
    comboRef.current = nextCombo;
    setCombo(nextCombo);

    // Hit flash on ≥90, miss shake on <30.
    const fx = sc >= 90 ? "perfect" : sc < 30 ? "miss" : null;
    if (fx) {
      setHitFx(fx);
      clearTimeout(hitFxTimerRef.current);
      hitFxTimerRef.current = setTimeout(() => setHitFx(null), fx === "miss" ? 300 : 450);
    }

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
        const key = runKeyRef.current ?? presetKey(levelsRef.current);
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
    }, 500);
  }, [startLevel, snd]);

  useEffect(() => {
    const onKey = (e) => { if (e.code==="Space") { e.preventDefault(); if (screen==="play") handleStop(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, handleStop]);

  // Apply the initial transform for dot/target before the browser paints the new level renderer.
  // Without this, elements flash at their origin for one frame before animate() fires.
  useLayoutEffect(() => {
    if (screen !== "play") return;
    const p = posRef.current;
    if (dotElRef.current) {
      dotElRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      dotElRef.current.style.opacity = blindVisRef.current ? "1" : "0";
    }
    if (targetElRef.current) {
      targetElRef.current.style.transform = `translate(${targetXRef.current}px, 0)`;
    }
    if (vortexTargElRef.current) {
      const lv = levelsRef.current[lvIdx];
      const r = SQ/2 - DOT - (lv?.type === "vortex" ? 4 : 2);
      const tx = SQ/2 + r*Math.cos(vortexTargAngleRef.current) - DOT/2;
      const ty = SQ/2 + r*Math.sin(vortexTargAngleRef.current) - DOT/2;
      vortexTargElRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
    }
  }, [lvIdx, screen]);

  // Pause the RAF + music when the tab is hidden / phone screen is locked,
  // so frame timing doesn't drift and audio doesn't keep playing in the background.
  useEffect(() => {
    const onHide = () => {
      if (activeRef.current) {
        cancelAnimationFrame(rafRef.current);
        // leave activeRef true so resume knows to restart
      }
      if (musicLoopRef.current) musicLoopRef.current.pause?.();
    };
    const onShow = () => {
      if (screen === "play" && activeRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
      const shouldPlay = (screen === "menu" || screen === "play" || screen === "result")
        && !mutedRef.current && !musicPaused;
      if (shouldPlay && musicLoopRef.current) musicLoopRef.current.resume?.();
    };
    const onVis = () => { if (document.hidden) onHide(); else onShow(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [screen, animate, musicPaused]);

  // Start/stop menu music when screen changes
  useEffect(() => {
    const shouldPlayLoop = (screen === "menu" || screen === "play" || screen === "result") && !mutedRef.current && !musicPaused;
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
      : pickLevels(countOrLevels, shouldSkipWarmup(bestScoresRef.current));
    levelsRef.current = chosen;
    setLevels(chosen);
    scoresRef.current = [];
    setScores([]);
    comboRef.current = 0;
    setCombo(0);
    setHitFx(null);
    runKeyRef.current = opts.runKey ?? null;
    setScoreWarmup(opts.countWarmup ?? false);
    setShowSettings(false);
    setScreen("play");
    if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
    setTimeout(() => startLevel(0), 200);
  }, [startLevel]);

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
    backConfirmRef.current = false;
    setBackConfirm(false);
    if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
    setScreen("menu");
  }, []);

  // ── GAME SCREEN ──
  if (screen === "landing") return (
    <Landing T={T} onEnter={async () => {
      await unlockAudio();
      playSfx("enter");
      setScreen("menu");
    }} />
  );

  if (screen === "menu") return (
    <LegacyMenu T={T} onStart={startGame} onUnlockAudio={unlockAudio} settings={settings} showSettings={showSettings}
      setShowSettings={setShowSettings} setSettings={setSettings}
      bestScores={bestScores} />
  );

  if (screen === "result") return (
    <Result T={T} scores={scores} levels={levels} scoreWarmup={scoreWarmup}
      previousBest={runMeta.previousBest} isNewBest={runMeta.isNewBest}
      onReplay={() => startGame(levels, { countWarmup: scoreWarmup, runKey: runKeyRef.current })} onMenu={goMenu} />
  );

  const lv = currentLevel;
  if (!lv) return null;
  const dc = DIFF[lv.diff];

  return (
    <div onClick={playing ? handleStop : undefined} style={{
      minHeight:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:T.bg, cursor: playing ? "crosshair" : "default",
      userSelect:"none", fontFamily:"'Courier New', monospace",
      transition:"background 0.4s",
      padding:"calc(60px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))",
      touchAction:"manipulation",
      WebkitTapHighlightColor:"transparent",
      overscrollBehavior:"contain",
    }}>
      {/* combo badge — floating, hidden until streak ≥2, escalates with N */}
      <div style={{ position:"fixed", top:"calc(48px + env(safe-area-inset-top))", left:0, right:0, height:0, zIndex:11, pointerEvents:"none" }}>
        <div style={{ position:"relative", maxWidth:560, margin:"0 auto" }}>
          <ComboBadge combo={combo} />
        </div>
      </div>

      {/* top bar — swallow clicks so mid-run taps near the top don't end the round */}
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", top:0, left:0, right:0,
        display:"flex", alignItems:"center",
        padding:"calc(6px + env(safe-area-inset-top)) 10px 6px",
        background:`${T.bg}ee`, backdropFilter:"blur(8px)",
        WebkitBackdropFilter:"blur(8px)", zIndex:10,
        borderBottom:`1px solid ${T.border}`,
      }}>
        {/* back arrow — two-tap confirm during play so a mis-tap doesn't nuke the run */}
        <button onClick={e => {
            e.stopPropagation();
            if (backConfirmRef.current) { goMenu(); return; }
            backConfirmRef.current = true;
            setBackConfirm(true);
            setTimeout(() => { backConfirmRef.current = false; setBackConfirm(false); }, 2000);
          }}
          style={{ background: backConfirm ? "#ef4444" : "none",
            border:`1px solid ${backConfirm ? "#ef4444" : T.border}`,
            color: backConfirm ? "#000" : T.sub, cursor:"pointer",
            fontSize: backConfirm ? 10 : 13, letterSpacing: backConfirm ? 2 : 0,
            lineHeight:1, padding:"10px 14px", borderRadius:4,
            fontFamily:"'Courier New', monospace",
            opacity: backConfirm ? 1 : 0.65, minHeight:44,
            transition:"opacity 0.15s, color 0.15s, border-color 0.15s, background 0.15s" }}
          onMouseEnter={e=>{ if (!backConfirm) { e.currentTarget.style.opacity="1"; e.currentTarget.style.color="#00ffcc"; e.currentTarget.style.borderColor="#00ffcc"; } }}
          onMouseLeave={e=>{ if (!backConfirm) { e.currentTarget.style.opacity="0.65"; e.currentTarget.style.color=T.sub; e.currentTarget.style.borderColor=T.border; } }}>
          {backConfirm ? "QUIT?" : "←"}
        </button>
        {/* level progress dots — centred */}
        <div style={{ flex:1, display:"flex", justifyContent:"center", gap:8 }}>
          {levels.map((_,i) => (
            <div key={i} style={{ width:6, height:6, borderRadius:"50%",
              background: i<lvIdx ? "#00ffcc" : i===lvIdx ? T.fg : T.hint,
              transition:"background 0.3s" }} />
          ))}
        </div>
        {/* spacer matches back-button width so progress dots stay centred */}
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

      {/* level renderer — wrapper carries the hit-flash overlay and miss-shake */}
      <div className={hitFx === "miss" ? "dc-miss-shake" : undefined} style={{ position:"relative" }}>
        {hitFx === "perfect" && <div className="dc-hit-flash" />}
        {(lv.type==="h"||lv.type==="chaos"||lv.type==="blind"||lv.type==="ghost"||lv.type==="sway") && (
          <ScaledHBar playing={playing} lv={lv} T={T} dotRef={dotElRef} />
        )}
        {(lv.type==="movingtarget" || lv.type==="eclipse") && (
          <ScaledHBar playing={playing} lv={lv} T={T} dotRef={dotElRef} targetRef={targetElRef} moving />
        )}
        {lv.type==="diag"   && <DiagBox   playing={playing} T={T} dotRef={dotElRef} />}
        {lv.type==="vdrop"  && <VDropBox  playing={playing} T={T} dotRef={dotElRef} />}
        {lv.type==="circle" && <CircleBox playing={playing} T={T} dotRef={dotElRef} />}
        {(lv.type==="countercircle" || lv.type==="phasecircle") && (
          <CircleBox playing={playing} T={T} dotRef={dotElRef} vortexTargRef={vortexTargElRef} />
        )}
        {lv.type==="2d"     && <Box2D   playing={playing} T={T} dotRef={dotElRef} />}
        {lv.type==="vortex" && <VortexBox playing={playing} T={T} dotRef={dotElRef} vortexTargRef={vortexTargElRef} />}
        {lv.type==="swaymt" && (
          <ScaledHBar playing={playing} lv={lv} T={T} dotRef={dotElRef} targetRef={targetElRef} moving />
        )}
        {lv.type==="ghost2d" && (
          <Box2D playing={playing} T={T} dotRef={dotElRef} />
        )}
        {lv.type==="overload" && (
          <ScaledHBar playing={playing} lv={lv} T={T} dotRef={dotElRef} targetRef={targetElRef} moving />
        )}
      </div>

      {/* score slot — tap·space prompt only on the very first level of a run */}
      <div style={{ marginTop:28, height:52, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {showScore && lastScore !== null
          ? <ScoreFlash score={lastScore} T={T} />
          : playing && lvIdx === 0
            ? <p style={{ color:T.fg, fontSize:14, letterSpacing:4, textTransform:"uppercase", margin:0, opacity:0.8 }}>tap · space</p>
            : null}
      </div>
      {/* per-level hint — only shown until the player has scored this level once */}
      <div style={{ minHeight: 18, marginTop: 4 }}>
        {(lv.warmup || !seenLevels.has(lv.id)) && (
          <p style={{ color:T.fg, fontSize:13, margin:0, letterSpacing:1, opacity:0.7 }}>{lv.hint}</p>
        )}
      </div>

    </div>
  );
}

// ─── LOGO ────────────────────────────────────────────────────────────────────
function DeadcenterLogo({ T, size = 22 }) {
  const c = size / 2;
  const r = size / 2 - 1.5;
  const gap = size * 0.2;
  const sw = Math.max(1, size * 0.06);
  // Text fontSize must scale slower than the SVG or "deadcenter" overflows
  // narrow phones. ~0.5x keeps the wordmark proportional to the icon.
  const fontSize = Math.max(11, Math.round(size * 0.5));
  const dotR = Math.max(2, size * 0.09);
  return (
    <div style={{ display:"flex", alignItems:"center", gap: Math.round(size * 0.3),
      maxWidth:"100%", minWidth:0 }}>
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
      <span style={{ color:T.fg, fontSize,
        letterSpacing: Math.max(2, Math.round(size * 0.06)),
        fontWeight:"bold", opacity:0.9, fontFamily:"'Courier New', monospace",
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"clip", minWidth:0 }}>deadcenter</span>
    </div>
  );
}

// ─── LEVEL RENDERERS ─────────────────────────────────────────────────────────
// All renderers share one square frame (PlayField). Dots/targets are drawn at
// origin with ref-attached elements; animate() writes style.transform directly
// to move them — no React re-renders per frame.

const PLAY_W = 360;
function PlayField({ children }) {
  // Cap by width primarily; clamp height too but never below a usable min so
  // landscape orientation doesn't shrink the field to a sliver.
  return (
    <div style={{
      width: `max(220px, min(${PLAY_W}px, calc(100vw - 32px), calc(100dvh - 220px)))`,
      aspectRatio: "1 / 1",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// Shared SVG dot. Renders at origin — transform positions it.
function SvgDot({ playing, T, dotRef, glow = 5 }) {
  return (
    <circle cx={DOT/2} cy={DOT/2} r={DOT/2}
      ref={dotRef}
      fill={playing ? "#00ffcc" : T.sub}
      style={{
        filter: playing ? `drop-shadow(0 0 ${glow}px #00ffcc)` : "none",
        transition: "fill 0.2s, opacity 0.15s",
        willChange: "transform, opacity",
      }} />
  );
}

function HBar({ playing, lv, T, dotRef, targetRef, moving }) {
  const isPrecision = lv.precision;
  const tW  = isPrecision ? 4 : 18;
  const tCol = moving ? "#f59e0b" : isPrecision ? "#ef4444" : T.fg;
  // Static target is rendered at the bar center when not moving.
  return (
    <div style={{ position:"relative", width:BAR_W, height:32 }}>
      <div style={{ position:"absolute", top:9, left:0, right:0, height:14, background:T.track, borderRadius:20 }} />
      <svg style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }} width={BAR_W} height={32}>
        {moving ? (
          <g ref={targetRef} style={{ willChange: "transform" }}>
            <circle cx={DOT/2} cy={16} r={tW/2 + 4} fill="none" stroke={tCol} strokeWidth="1.5" opacity="0.6" />
            <circle cx={DOT/2} cy={16} r={2} fill={tCol} opacity="0.5" />
          </g>
        ) : (
          <g>
            <circle cx={CX + DOT/2} cy={16} r={tW/2 + 4} fill="none" stroke={tCol} strokeWidth="1.5" opacity="0.6" />
            <circle cx={CX + DOT/2} cy={16} r={2} fill={tCol} opacity="0.5" />
          </g>
        )}
      </svg>
      <div ref={dotRef} style={{
        position:"absolute", top:9, left:0,
        width:DOT, height:DOT, borderRadius:"50%",
        background: playing ? "#00ffcc" : T.sub,
        boxShadow: playing ? "0 0 10px #00ffccaa" : "none",
        transition: "background 0.2s, opacity 0.15s",
        willChange: "transform, opacity",
      }} />
    </div>
  );
}

function ScaledHBar(props) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const avail = Math.min(window.innerWidth - 32, PLAY_W);
      setScale(avail < BAR_W ? avail / BAR_W : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <PlayField>
      <div style={{ width: Math.round(BAR_W * scale), height: Math.round(32 * scale) }}>
        <div style={{ transform:`scale(${scale})`, transformOrigin:"top left", width:BAR_W, height:32 }}>
          <HBar {...props} />
        </div>
      </div>
    </PlayField>
  );
}

const SVG_STYLE = { display:"block", width:"100%", height:"100%" };

function DiagBox({ playing, T, dotRef }) {
  const end = SQ - DOT;
  const ex = end + DOT/2, ey = end + DOT/2;
  return (
    <PlayField>
      <svg viewBox={`0 0 ${SQ} ${SQ}`} style={SVG_STYLE}>
        <circle cx={SQ/2} cy={SQ/2} r={SQ/2-3} fill="none" stroke={T.border} strokeWidth="1" strokeDasharray="2 8" />
        <line x1={DOT/2} y1={DOT/2} x2={ex} y2={ey} stroke={T.track} strokeWidth="2" strokeDasharray="6 5" />
        <circle cx={DOT/2} cy={DOT/2} r={3} fill={T.border} />
        <circle cx={ex} cy={ey} r={14} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.4" />
        <circle cx={ex} cy={ey} r={6}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
        <circle cx={ex} cy={ey} r={2}  fill={T.fg} opacity="0.6" />
        <SvgDot playing={playing} T={T} dotRef={dotRef} />
      </svg>
    </PlayField>
  );
}

function VDropBox({ playing, T, dotRef }) {
  const cx = SQ / 2;
  const ty = SQ - DOT / 2;
  return (
    <PlayField>
      <svg viewBox={`0 0 ${SQ} ${SQ}`} style={SVG_STYLE}>
        <circle cx={cx} cy={SQ/2} r={SQ/2-3} fill="none" stroke={T.border} strokeWidth="1" strokeDasharray="2 8" />
        <line x1={cx} y1={DOT/2} x2={cx} y2={ty} stroke={T.track} strokeWidth="2" strokeDasharray="6 5" />
        <circle cx={cx} cy={DOT/2} r={3} fill={T.border} />
        <circle cx={cx} cy={ty} r={14} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.4" />
        <circle cx={cx} cy={ty} r={6}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
        <circle cx={cx} cy={ty} r={2}  fill={T.fg} opacity="0.6" />
        <SvgDot playing={playing} T={T} dotRef={dotRef} />
      </svg>
    </PlayField>
  );
}

function CircleBox({ playing, T, dotRef, vortexTargRef }) {
  const cx=SQ/2, cy=SQ/2, r=SQ/2-DOT-2;
  // Static target at 12 o'clock when vortexTargRef isn't supplied.
  const staticTx = cx, staticTy = cy - r;
  return (
    <PlayField>
      <svg viewBox={`0 0 ${SQ} ${SQ}`} style={SVG_STYLE}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.track} strokeWidth="2" strokeDasharray="3 6" />
        {[0,1,2,3].map(i => {
          const a=i*Math.PI/2 - Math.PI/2;
          return <circle key={i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r={2} fill={T.sub} opacity="0.25" />;
        })}
        {vortexTargRef ? (
          <g ref={vortexTargRef} style={{ willChange: "transform" }}>
            <circle cx={DOT/2} cy={DOT/2} r={13} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.45" />
            <circle cx={DOT/2} cy={DOT/2} r={5}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.2" />
            <circle cx={DOT/2} cy={DOT/2} r={2}  fill={T.fg} opacity="0.55" />
          </g>
        ) : (
          <g>
            <circle cx={staticTx} cy={staticTy} r={13} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.45" />
            <circle cx={staticTx} cy={staticTy} r={5}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.2" />
            <circle cx={staticTx} cy={staticTy} r={2}  fill={T.fg} opacity="0.55" />
          </g>
        )}
        <circle cx={cx} cy={cy} r={2}  fill={T.border} />
        <SvgDot playing={playing} T={T} dotRef={dotRef} />
      </svg>
    </PlayField>
  );
}

function Box2D({ playing, T, dotRef }) {
  const cx=SQ/2, cy=SQ/2;
  return (
    <PlayField>
      <svg viewBox={`0 0 ${SQ} ${SQ}`} style={SVG_STYLE}>
        <rect x={1} y={1} width={SQ-2} height={SQ-2} rx={10} fill="none" stroke={T.border} strokeWidth="1" />
        <line x1={cx} y1={4}    x2={cx} y2={SQ-4} stroke={T.track} strokeWidth="1" />
        <line x1={4}  y1={cy}   x2={SQ-4} y2={cy} stroke={T.track} strokeWidth="1" />
        <circle cx={cx} cy={cy} r={22} fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.15" />
        <circle cx={cx} cy={cy} r={13} fill="none" stroke={T.fg} strokeWidth="1.5" opacity="0.35" />
        <circle cx={cx} cy={cy} r={5}  fill="none" stroke={T.fg} strokeWidth="1"   opacity="0.25" />
        <circle cx={cx} cy={cy} r={2}  fill={T.fg} opacity="0.55" />
        <SvgDot playing={playing} T={T} dotRef={dotRef} glow={6} />
      </svg>
    </PlayField>
  );
}

function VortexBox({ playing, T, dotRef, vortexTargRef }) {
  const cx=SQ/2, cy=SQ/2;
  return (
    <PlayField>
      <svg viewBox={`0 0 ${SQ} ${SQ}`} style={SVG_STYLE}>
        {[0.25,0.5,0.75,1].map((frac,i) => (
          <circle key={i} cx={cx} cy={cy} r={(SQ/2-DOT-4)*frac}
            fill="none" stroke={T.track} strokeWidth="1" opacity={0.3+i*0.1} strokeDasharray="2 7" />
        ))}
        <g ref={vortexTargRef} style={{ willChange: "transform" }}>
          <circle cx={DOT/2} cy={DOT/2} r={13} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
          <circle cx={DOT/2} cy={DOT/2} r={4}  fill="none" stroke="#f59e0b" strokeWidth="1"   opacity="0.3" />
          <circle cx={DOT/2} cy={DOT/2} r={2}  fill="#f59e0b" opacity="0.6" />
        </g>
        <circle cx={cx} cy={cy} r={2} fill={T.border} />
        <SvgDot playing={playing} T={T} dotRef={dotRef} />
      </svg>
    </PlayField>
  );
}

// ─── SCORE FLASH ─────────────────────────────────────────────────────────────
function ScoreFlash({ score }) {
  const color = TIER_COLOR[SCORE_TIER(score)];
  return (
    <div style={{ textAlign:"center" }}>
      <span style={{ fontSize:44, fontWeight:"bold", color, fontFamily:"'Courier New', monospace", letterSpacing:-1 }}>{score}</span>
    </div>
  );
}

// ─── COMBO BADGE ─────────────────────────────────────────────────────────────
// Floats above the playfield once the player chains 2+ scores ≥80. Scales
// and shifts color as the streak grows so every increment feels louder.
function ComboBadge({ combo }) {
  if (combo < 2) return null;
  // Tiered styling — quietly cyan at low combos, hot/gold at high streaks.
  const tier = combo >= 6 ? "fire" : combo >= 4 ? "hot" : "warm";
  const color = tier === "fire" ? "#fbbf24" : tier === "hot" ? "#00ffcc" : "#00ffcc";
  const size  = tier === "fire" ? 52 : tier === "hot" ? 42 : 32;
  const sub   = tier === "fire" ? "STREAK" : tier === "hot" ? "ON FIRE" : "COMBO";
  return (
    <div key={combo} style={{
      position:"absolute", top: 6, left:"50%", transform:"translateX(-50%)",
      pointerEvents:"none", zIndex:5, textAlign:"center",
      color,
    }}>
      <div className={tier === "fire" || tier === "hot" ? "dc-combo-fire" : "dc-combo"}
        style={{ display:"inline-block", color }}>
        <div style={{
          fontFamily:"'Courier New', monospace",
          fontSize: size, fontWeight:"bold", lineHeight:1,
          letterSpacing: 2,
          textShadow:`0 0 12px ${color}, 0 0 24px ${color}88`,
        }}>×{combo}</div>
        <div style={{
          fontSize: 9, letterSpacing: 4, opacity: 0.85,
          marginTop: 2, fontFamily:"'Courier New', monospace",
        }}>{sub}</div>
      </div>
      <span className="dc-combo-floater" style={{
        color, fontSize: 14,
        textShadow:`0 0 8px ${color}`,
      }}>+1</span>
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
        <Toggle label="DAY MODE"    val={settings.day}  onChange={()=>setSettings(s=>({...s,day:!s.day}))} />
        <Toggle label="MUTE SOUNDS" val={settings.mute} onChange={()=>setSettings(s=>({...s,mute:!s.mute}))} />
      </div>
    </div>
  );
}

// ─── MENU ────────────────────────────────────────────────────────────────────
function LegacyMenu({ T, onStart, onUnlockAudio, settings, showSettings, setShowSettings, setSettings, bestScores = {} }) {
  // Start with no levels selected — Play falls back to a random pick of 5.
  const [playlistIds, setPlaylistIds] = useState([]);

  const toggleLevel = (id) => {
    setPlaylistIds(prev => {
      if (prev.includes(id)) { playSfx("back"); return prev.filter(x => x !== id); }
      playSfx("select"); return [...prev, id];
    });
  };

  const toggleDiff = (levels) => {
    const ids = levels.map(l => l.id);
    setPlaylistIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) { playSfx("back"); return prev.filter(id => !ids.includes(id)); }
      playSfx("select"); return [...new Set([...prev, ...ids])];
    });
  };

  const startDaily = async () => {
    await onUnlockAudio?.();
    playSfx("enter");
    const dateKey = todayKey();
    const dailyLevels = pickDailyLevels(dateKey);
    const skipWarmup = shouldSkipWarmup(bestScores);
    const chosen = [
      ...(skipWarmup ? [] : [WARMUP]),
      ...dailyLevels,
    ];
    const countWarmup = dailyLevels.some(l => l.diff === "easy");
    onStart(chosen, { countWarmup, runKey: dailyKey(dateKey) });
  };

  const startSelection = async () => {
    if (playlistIds.length === 0) return;
    await onUnlockAudio?.();
    playSfx("enter");
    const diffOrder = { easy:0, medium:1, hard:2, impossible:3 };
    const pickedLevels = POOL.filter(l => playlistIds.includes(l.id))
      .map(l => ({ l, k: Math.random() }))
      .sort((a, b) => (diffOrder[a.l.diff] - diffOrder[b.l.diff]) || (a.k - b.k))
      .map(({ l }) => l);
    const skipWarmup = shouldSkipWarmup(bestScores);
    const chosen = [
      ...(skipWarmup ? [] : [WARMUP]),
      ...pickedLevels,
    ];
    const countWarmup = pickedLevels.some(l => l.diff === "easy");
    onStart(chosen, { countWarmup });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      startSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playlistIds, startSelection]);

  const maxSpeedLabel = { easy:"none", medium:"2x", hard:"3x", impossible:"4x" };
  const diffSections = [
    { key:"easy", label:"I  EASY", levels:[WARMUP, ...POOL.filter(l => l.diff === "easy")] },
    { key:"medium", label:"II  MEDIUM", levels:POOL.filter(l => l.diff === "medium") },
    { key:"hard", label:"III  HARD", levels:POOL.filter(l => l.diff === "hard") },
    { key:"impossible", label:"INF  IMPOSSIBLE", levels:POOL.filter(l => l.diff === "impossible") },
  ];
  const btnBase = {
    fontFamily:"'Courier New', monospace",
    cursor:"pointer",
    transition:"all 0.15s",
    letterSpacing:3,
    fontSize:11,
  };

  const hasSelection = playlistIds.length > 0;

  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"flex-start",
      background:T.bg, fontFamily:"'Courier New', monospace",
      color:T.fg, textAlign:"center", transition:"background 0.4s",
      padding:"calc(40px + env(safe-area-inset-top)) 16px calc(150px + env(safe-area-inset-bottom))",
      WebkitTapHighlightColor:"transparent" }}>

      <button onClick={async ()=>{ await onUnlockAudio?.(); playSfx("select"); setShowSettings(true); }}
        style={{ position:"fixed", top:"calc(8px + env(safe-area-inset-top))", right:8, background:"transparent",
          border:"none", cursor:"pointer", color:T.sub, fontSize:20,
          minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center",
          padding:0, zIndex:31 }}>⚙</button>

      {showSettings && <SettingsPanel T={T} settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)} />}

      <div style={{ marginBottom:18, maxWidth:"100%" }}>
        <DeadcenterLogo T={T} size={42} />
      </div>

      {/* Daily run — same 5 levels for everyone today, separate persisted best */}
      {(() => {
        const todayK = todayKey();
        const dailyBest = bestScores[dailyKey(todayK)];
        return (
          <button onClick={startDaily}
            style={{ ...btnBase,
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background:`${T.card}`,
              border:`1px solid ${T.border}`,
              color:T.fg,
              padding:"12px 22px", marginBottom:22, minHeight:56, minWidth:220,
              borderRadius:6 }}>
            <span style={{ fontSize:13, letterSpacing:5, fontWeight:"bold" }}>★ DAILY RUN</span>
            <span style={{ fontSize:9, letterSpacing:1.5, opacity:0.7, color:T.sub }}>
              {todayK} · 5 levels{dailyBest != null ? ` · best ${dailyBest}` : ""}
            </span>
          </button>
        );
      })()}

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
                <div onClick={async ()=>{ await onUnlockAudio?.(); toggleDiff(sec.levels); }}
                  style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", minHeight:44 }}>
                  <span style={{ color:dc.color, fontSize:12, opacity:allTicked ? 1 : 0.45, userSelect:"none", lineHeight:1 }}>
                    {allTicked ? "[x]" : "[ ]"}
                  </span>
                  <span style={{ fontSize:11, letterSpacing:3, color:dc.color, opacity:0.85 }}>
                    {sec.label}
                  </span>
                </div>
                <span style={{ fontSize:9, letterSpacing:2, color:dc.color, opacity:0.5, flexShrink:0 }}>
                  max {maxSpeedLabel[sec.key]}
                </span>
              </div>

              {sec.levels.map(lv => {
                const selected = playlistIds.includes(lv.id);
                return (
                  <div key={lv.id} onClick={async ()=>{ await onUnlockAudio?.(); toggleLevel(lv.id); }}
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

      <p style={{ color:T.fg, fontSize:10, letterSpacing:2, marginTop:6, opacity:0.56 }}>
        {shouldSkipWarmup(bestScores) ? "warm up skipped" : "first round is always warm up"}
      </p>

      {/* sticky bottom Play bar — greyed when nothing selected, lit when 1+ */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background:`${T.bg}f0`, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
        borderTop:`1px solid ${T.border}`,
        padding:"12px 16px calc(12px + env(safe-area-inset-bottom))",
        display:"flex", flexDirection:"column", alignItems:"center", gap:6,
        zIndex:30,
      }}>
        <p style={{ color:T.fg, fontSize:9, letterSpacing:2, margin:0, opacity:0.55 }}>
          {hasSelection ? `${playlistIds.length} level${playlistIds.length>1?"s":""} selected` : "pick a difficulty or tap levels above"}
        </p>
        <button onClick={startSelection}
          disabled={!hasSelection}
          style={{
            background: hasSelection ? "#00ffcc" : `${T.border}55`,
            border:"none",
            color: hasSelection ? "#000" : T.sub,
            padding:"13px 0", fontSize:13, letterSpacing:5, textTransform:"uppercase",
            cursor: hasSelection ? "pointer" : "not-allowed",
            fontFamily:"'Courier New', monospace", fontWeight:"bold", borderRadius:4,
            width:"100%", maxWidth:340, minHeight:48,
            opacity: hasSelection ? 1 : 0.55,
            transition:"background 0.18s, color 0.18s, opacity 0.18s, transform 0.15s, box-shadow 0.18s",
            boxShadow: hasSelection ? "0 10px 24px rgba(0,255,204,0.18)" : "none",
          }}
          onMouseEnter={hasSelection ? e=>{ e.currentTarget.style.background="#00e6b8"; e.currentTarget.style.transform="translateY(-1px)"; } : undefined}
          onMouseLeave={hasSelection ? e=>{ e.currentTarget.style.background="#00ffcc"; e.currentTarget.style.transform="translateY(0)"; } : undefined}>
          PLAY
        </button>
      </div>
    </div>
  );
}

// ─── LANDING SCREEN ──────────────────────────────────────────────────────────
// First thing a user sees on cold load. ASCII field animates behind a giant
// crosshair logo. Click / tap / any key advances to the menu.
function Landing({ T, onEnter }) {
  const preRef = useRef(null);
  const tickRef = useRef(0);
  const dimsRef = useRef({ cols: 80, rows: 30, fontSize: 12 });
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 360);
  const PALETTE = " ·.:+*×•◦○●";

  // Resize the grid to fill the viewport. Char width is roughly 0.6em for
  // Courier; letter-spacing 0.1em adds ~10% per char.
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setVw(w);
      // Slightly larger min font on tiny screens so the field doesn't look pixely.
      const fontSize = Math.max(10, Math.min(15, Math.round(w * 0.014)));
      const charW = fontSize * 0.66; // 0.6 monospace + 0.06 letter-spacing margin
      const lineH = fontSize * 1.15;
      dimsRef.current = {
        cols: Math.ceil(w / charW) + 2,
        rows: Math.ceil(h / lineH) + 2,
        fontSize,
      };
      if (preRef.current) {
        preRef.current.style.fontSize = `${fontSize}px`;
        preRef.current.style.lineHeight = "1.15";
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    let raf;
    let lastFrame = 0;
    const loop = (ts) => {
      // ~12 fps is plenty for a drifting field, keeps CPU near zero.
      if (ts - lastFrame > 80) {
        lastFrame = ts;
        tickRef.current += 1;
        const t = tickRef.current;
        const { cols, rows } = dimsRef.current;
        const lines = [];
        for (let y = 0; y < rows; y++) {
          let row = "";
          for (let x = 0; x < cols; x++) {
            const dx = x - cols / 2;
            const dy = (y - rows / 2) * 2.2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist * 0.18 - t * 0.18) * 0.5
                       + Math.sin((x + y) * 0.12 + t * 0.09) * 0.5;
            const idx = Math.floor(((wave + 1) / 2) * (PALETTE.length - 0.001));
            row += PALETTE[Math.max(0, Math.min(PALETTE.length - 1, idx))];
          }
          lines.push(row);
        }
        if (preRef.current) preRef.current.textContent = lines.join("\n");
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); onEnter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnter]);

  return (
    <div onClick={onEnter} style={{
      // Pin to viewport so the page can't be scrolled — otherwise on mobile
      // the user can drag past the artwork and reveal the body background.
      position:"fixed", inset:0, overflow:"hidden",
      background:T.bg, color:T.fg, fontFamily:"'Courier New', monospace",
      cursor:"pointer", userSelect:"none", WebkitTapHighlightColor:"transparent",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))",
      touchAction:"none",
    }}>
      {/* drifting ASCII field — covers the whole viewport */}
      <pre ref={preRef} aria-hidden="true" style={{
        position:"absolute", inset:0, margin:0, padding:0,
        whiteSpace:"pre", overflow:"hidden",
        color:"#00ffcc", opacity:0.22,
        pointerEvents:"none",
        fontFamily:"'Courier New', monospace",
        letterSpacing:"0.06em",
      }} />

      {/* soft radial darken behind the logo so foreground stays legible */}
      <div aria-hidden="true" style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:`radial-gradient(circle at 50% 50%, ${T.bg}d8 0%, ${T.bg}88 35%, transparent 65%)`,
      }} />

      {/* foreground */}
      <div style={{
        position:"relative", zIndex:1, textAlign:"center",
        display:"flex", flexDirection:"column", alignItems:"center",
        gap:"clamp(12px, 3vw, 18px)",
        maxWidth:"100%",
      }}>
        <div style={{ fontSize:"clamp(10px, 2.4vw, 12px)", letterSpacing:"clamp(3px, 1.4vw, 6px)", color:"#00ffcc", opacity:0.7 }}>
          [ INCOMING ]
        </div>

        <DeadcenterLogo T={T} size={Math.min(72, Math.max(48, Math.round(vw * 0.16)))} />

        <div style={{
          color:T.fg, opacity:0.55,
          fontSize:"clamp(10px, 2.6vw, 12px)",
          letterSpacing:"clamp(2px, 1vw, 4px)",
          fontFamily:"'Courier New', monospace",
          textTransform:"uppercase",
        }}>stop · the · dot</div>

        <div style={{
          marginTop:"clamp(8px, 2vw, 14px)",
          padding:"clamp(11px, 2.6vw, 14px) clamp(20px, 6vw, 32px)",
          border:"1px solid #00ffcc", color:"#00ffcc",
          fontSize:"clamp(12px, 3.2vw, 13px)",
          letterSpacing:"clamp(4px, 1.8vw, 8px)", fontWeight:"bold",
          background:"#00ffcc11",
          boxShadow:"0 0 24px #00ffcc33",
          animation:"dc-combo-pop 600ms ease-out",
        }}>
          ENTER →
        </div>

        <div style={{ fontSize:10, letterSpacing:3, color:T.sub, opacity:0.7, marginTop:2 }}>
          tap to start
        </div>
      </div>
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

  // Count-up animation. The tally mp3 plays once at start and covers the
  // ramp + end ding; we just sync the number to its duration.
  const [displayed, setDisplayed] = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [tallyDone, setTallyDone] = useState(false);
  useEffect(() => {
    playSfx("tally");
    const duration = 1400;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplayed(Math.round(avg * eased));
      setRevealCount(Math.floor(eased * scores.length + 0.5));
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setDisplayed(avg); setRevealCount(scores.length); setTallyDone(true); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wordle-style emoji grid for share — one square per level matching its tier.
  // Warmup runs always show as a grey square so the layout stays consistent.
  const TIER_EMOJI = { perfect:"🎯", sharp:"🟩", decent:"🟨", shaky:"🟧", miss:"🟥" };
  const emojiGrid = scores
    .map((s, i) => levels[i]?.warmup && !scoreWarmup ? "⬜" : TIER_EMOJI[SCORE_TIER(s)])
    .join("");
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
  const shareTitle = "deadcenter";
  const gradeLower = label.toLowerCase();
  const shareText = `i scored ${avg}/100 on deadcenter\n${emojiGrid} ${gradeLower}\ncan you beat it?`;
  const shareTextWithUrl = `${shareText}\n${shareUrl}`.trim();

  const [shareState, setShareState] = useState("idle"); // idle | shared | copied | failed

  const handleShare = async () => {
    playSfx("select");
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(shareTextWithUrl);
        setShareState("copied");
      }
    } catch (err) {
      // User canceling native share throws AbortError — don't show "failed" for that.
      if (err && err.name === "AbortError") { setShareState("idle"); return; }
      setShareState("failed");
    }
    setTimeout(() => setShareState("idle"), 1800);
  };

  const handleCopy = async () => {
    playSfx("select");
    try {
      await navigator.clipboard.writeText(shareTextWithUrl);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
    setTimeout(() => setShareState("idle"), 1800);
  };

  const handleTweet = () => {
    playSfx("select");
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleReplay = () => { playSfx("enter"); onReplay(); };
  const handleMenu = () => { playSfx("back"); onMenu(); };

  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"'Courier New', monospace",
      color:T.fg, textAlign:"center", transition:"background 0.4s",
      padding:"calc(40px + env(safe-area-inset-top)) 16px calc(56px + env(safe-area-inset-bottom))",
      WebkitTapHighlightColor:"transparent" }}>

      <p style={{ color:T.sub, fontSize:12, letterSpacing:5, marginBottom:10, opacity:0.7 }}>FINAL SCORE</p>
      <div className={tallyDone ? "dc-combo-pop" : undefined} style={{
        fontSize:"clamp(52px, 22vw, 112px)", fontWeight:"bold",
        color, lineHeight:1, letterSpacing:-2,
        textShadow: tallyDone ? `0 0 24px ${color}66` : "none",
        transition:"text-shadow 0.4s",
      }}>{displayed}</div>
      <div style={{
        fontSize:"clamp(12px, 3.5vw, 16px)", letterSpacing:6, color, marginTop:14, marginBottom:36,
        textTransform:"uppercase",
        opacity: tallyDone ? 1 : 0,
        transform: tallyDone ? "translateY(0)" : "translateY(6px)",
        transition:"opacity 0.4s, transform 0.4s",
      }}>{label}</div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginBottom:36, width:"100%", maxWidth:680 }}>
        {scores.map((s,i) => {
          const lv = levels[i];
          const dc = lv ? DIFF[lv.diff] : DIFF.easy;
          const excluded = !scoreWarmup && lv?.warmup;
          const revealed = i < revealCount;
          return (
            <div key={i} style={{
              textAlign:"center",
              flex:"1 0 80px",
              maxWidth:112,
              minHeight:80,
              opacity: revealed ? (excluded ? 0.3 : 1) : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transition:"opacity 0.25s, transform 0.25s",
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
              <div style={{ fontSize:26, color: excluded ? T.sub : TIER_COLOR[SCORE_TIER(s)] }}>{s}</div>
              {excluded && <div style={{ fontSize:7, letterSpacing:1, color:T.sub, opacity:0.6, marginTop:2 }}>not scored</div>}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize:12, marginBottom:32, opacity:0.7,
        color: isNewBest ? "#00ffcc" : T.sub, letterSpacing: isNewBest ? 4 : 1,
        textTransform: isNewBest ? "uppercase" : "none" }}>
        {isNewBest ? "new personal best" : previousBest != null ? `best: ${previousBest}` : "first run. set the bar"}
      </p>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
        {[["retry",handleReplay],["menu",handleMenu]].map(([lbl,fn])=>(
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

      {/* shareable card — preview of what gets sent / copied. Looks like a
          Wordle-style result so it reads at a glance in chat threads. */}
      {tallyDone && (
        <div style={{ marginTop:24, width:"100%", maxWidth:340,
          padding:"16px 18px", borderRadius:10,
          background:`${T.card}`, border:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", alignItems:"center", gap:10,
          fontFamily:"'Courier New', monospace",
          animation:"dc-combo-pop 360ms ease-out both",
        }}>
          <div style={{ fontSize:10, letterSpacing:4, color:T.sub, opacity:0.7, textTransform:"uppercase" }}>
            shareable
          </div>
          <div style={{ fontSize:13, letterSpacing:2, color:T.fg, fontWeight:"bold" }}>
            deadcenter — {avg}/100 · {label}
          </div>
          <div style={{ fontSize:"clamp(18px, 5vw, 22px)", letterSpacing:"clamp(2px, 1vw, 4px)", lineHeight:1 }}>
            {emojiGrid}
          </div>
          <div style={{ fontSize:9, letterSpacing:2, color:T.sub, opacity:0.55 }}>
            {(shareUrl || "deadcenter.gg").replace(/^https?:\/\//, "")}
          </div>

          <div style={{ display:"flex", gap:8, marginTop:6, width:"100%", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={handleShare}
              style={{
                background: shareState === "shared" || shareState === "copied" ? "#00ffcc" : "#00ffcc",
                color:"#000", border:"none",
                padding:"11px 18px", fontSize:11, letterSpacing:3, textTransform:"uppercase",
                cursor:"pointer", fontFamily:"'Courier New', monospace", fontWeight:"bold",
                minHeight:44, borderRadius:4, flex:"1 1 120px",
                transition:"background 0.18s, transform 0.15s",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#00e6b8"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#00ffcc"; }}>
              {shareState === "shared" ? "shared ✓"
               : shareState === "copied" ? "copied ✓"
               : shareState === "failed" ? "try again"
               : (typeof navigator !== "undefined" && navigator.share ? "share" : "copy")}
            </button>

            <button onClick={handleTweet}
              aria-label="Post to X / Twitter"
              style={{
                background:"transparent", color:T.sub,
                border:`1px solid ${T.border}`,
                padding:"11px 14px", fontSize:11, letterSpacing:3, textTransform:"uppercase",
                cursor:"pointer", fontFamily:"'Courier New', monospace",
                minHeight:44, minWidth:48, borderRadius:4,
                transition:"border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.color="#00ffcc"; e.currentTarget.style.borderColor="#00ffcc"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color=T.sub; e.currentTarget.style.borderColor=T.border; }}>
              𝕏 post
            </button>

            {/* On native-share platforms, expose copy as a separate action so users
                can grab text without invoking the OS share sheet. */}
            {typeof navigator !== "undefined" && navigator.share && (
              <button onClick={handleCopy}
                aria-label="Copy score to clipboard"
                style={{
                  background:"transparent", color:T.sub,
                  border:`1px solid ${T.border}`,
                  padding:"11px 14px", fontSize:11, letterSpacing:3, textTransform:"uppercase",
                  cursor:"pointer", fontFamily:"'Courier New', monospace",
                  minHeight:44, minWidth:48, borderRadius:4,
                  transition:"border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={e=>{ e.currentTarget.style.color="#00ffcc"; e.currentTarget.style.borderColor="#00ffcc"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color=T.sub; e.currentTarget.style.borderColor=T.border; }}>
                copy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
