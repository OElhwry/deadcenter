<h1 align="center">
  <img src="deadcenter\public\og-image.png" width="64" alt="Deadcenter">
  <br>
  Deadcenter
</h1>

<p align="center">
  <b>One input. One chance. Stop the dot.</b><br>
  A reflex timing game that starts forgiving and ends ruthless.<br>
  20 levels. 4 tiers. One question, are you dead center?
</p>

<p align="center">
  <a href="https://deadcenter.fun"><img src="https://img.shields.io/badge/play%20now-deadcenter.fun-ef4444?style=for-the-badge" alt="Play now"></a>
  <img src="https://img.shields.io/badge/version-1.0.1-f97316?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/license-private-525252?style=for-the-badge" alt="Private">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/web%20audio%20api-synth-22c55e?style=flat-square" alt="Web Audio API">
  <img src="https://img.shields.io/badge/github%20pages-deployed-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages">
</p>

<p align="center">
  <a href="#-how-to-play">How to play</a> ·
  <a href="#-levels">Levels</a> ·
  <a href="#-scoring--grades">Scoring</a> ·
  <a href="#-tech-stack">Tech stack</a> ·
  <a href="#-getting-started">Dev setup</a>
</p>

---

## ◎ What is Deadcenter?

A fast, brutal browser timing game. A dot moves across your screen — your job is to stop it as close to the target as possible using a single input: **click, tap, or Space**.

Easy levels ease you in. Hard levels punish hesitation. Impossible levels will make you question your senses.

No tutorial. No hand-holding. One shot per level.

---

## ▶ How to Play

```
1. Pick a difficulty tier — or cherry-pick individual levels to build a custom run.
2. Press Space or click PLAY to launch.
3. Watch the dot. Feel the rhythm.
4. Click / Tap / Space to stop it.
5. Land it dead center. Or don't.
```

> **Tip:** Press `Space` on the menu to instantly fire your selected run.

---

## ⚔ Levels

### Tier I — Easy
*Learn the feel. This won't last.*

| Level | Mechanic |
|---|---|
| warm up | slow horizontal bounce — the game's one free pass |
| steady | faster bounce, center it |
| sway | smooth sine drift, release at center |
| float | very slow circular orbit, stop at 12 o'clock |
| cruise | slow 2D bounce, hit the bullseye |
| drop | vertical fall with gentle gravity, stop at the bottom |

### Tier II — Medium
*The dot has opinions now.*

| Level | Mechanic |
|---|---|
| diagonal | diagonal travel with gravity buildup |
| orbit | circular orbit, momentum ramps |
| 2d bounce | random 2D path, gaining speed |
| counter orbit | orbit with a counter-rotating target |
| ripple | dot and target both sway at different rates — find the overlap |

### Tier III — Hard
*Patterns break. Trust erodes.*

| Level | Mechanic |
|---|---|
| chaos | direction snaps randomly, speed compounds |
| crossfire | tiny precision target, fast dot |
| blind | dot goes dark — feel the rhythm |
| moving target | dot and target both move independently |
| eclipse | moving target + blinking dot |

### Tier ∞ — Impossible
*There is no fair. There is only center.*

| Level | Mechanic |
|---|---|
| ghost | nearly invisible — trust instinct |
| vortex | pulsing spiral orbit + rotating target |
| phase orbit | orbital dot phases in and out + live rotating target |
| abyss | 2D bounce, nearly invisible — aim blind |
| collapse | extreme chaos (snaps every 2–6 frames) + precision moving target |

---

## 🏆 Scoring & Grades

Each level scores **0–100** based on proximity to center at the moment you stop. Your final grade is your average across the run.

| Average Score | Grade |
|:---:|:---:|
| 90 – 100 | **DEAD CENTER** |
| 75 – 89 | **SHARP** |
| 55 – 74 | **DECENT** |
| 35 – 54 | **SHAKY** |
| 0 – 34 | **NEEDS WORK** |

> Momentum compounds on harder levels — up to **4× speed** on Impossible. Your grade at the end earns the name.

---

## ⚙ Features

- **One-input gameplay** — click, tap, or Space. That's the whole game.
- **Custom run builder** — grab a full tier or handpick individual levels.
- **Warmup toggle** — skip it once you know what you're doing.
- **Synth/chiptune music** — procedural audio that intensifies with difficulty.
- **Day mode + mute** — in settings (⚙ top-right).
- **Difficulty badges + end-of-run grading** — know exactly how badly you failed.
- **Mobile-friendly** — works on desktop and touch.

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| UI | React 19 |
| Bundler | Vite 8 |
| Styling | Component-level CSS in `App.jsx` |
| Audio | Web Audio API (synth engine, sound effects) |
| Deploy | GitHub Pages via `docs/` output |

---

## 💻 Getting Started

```bash
cd deadcenter
npm install
npm run dev
```

**Build for production:**

```bash
npm run build
npm run preview
```

> `docs/` is the production build used by GitHub Pages — do not edit it directly.

---

## 📁 Project Structure

```
deadcenter.gg/
├── deadcenter/
│   ├── src/
│   │   ├── App.jsx        ← game logic, levels, audio, scoring, UI
│   │   └── main.jsx       ← React entry point
│   ├── public/            ← static assets
│   └── package.json
└── docs/                  ← production build (GitHub Pages)
```

---

<p align="center">
  <b>Stop the dot. Own the center.</b><br>
  <a href="https://deadcenter.fun">deadcenter.fun</a>
</p>
