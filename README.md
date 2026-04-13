# Deadcenter

[![Deployed](https://img.shields.io/badge/Deployed-Live-brightgreen)](https://deadcenter.fun/)

Deadcenter is a fast, minimal browser timing game built with React and Vite. The goal is simple: stop the moving dot as close to the target as possible. The patterns start readable, then get mean.

## Features

- One-input gameplay: click/tap or press `Space` to stop.
- Press `Space` on the menu to instantly launch your selected run.
- Unified run builder: click a difficulty to grab the full set, or click individual levels to build a custom run.
- 20 levels across 4 difficulty tiers — 5 levels per tier.
- Warmup support with optional skip toggle.
- Day mode and mute controls in settings.
- Momentum system that ramps up on harder levels (up to 4× speed on impossible).
- Score feedback, difficulty badges, and end-of-run grading.
- Built-in synth/chiptune-style music that intensifies with difficulty.

## Levels

### I — Easy
| Level | Mechanic |
|---|---|
| warm up | slow horizontal bounce, stop on the circle |
| steady | faster horizontal bounce, center it |
| sway | smooth sine drift, release at center |
| float | very slow circular orbit, stop at 12 o'clock |
| cruise | slow 2D bounce, hit the bullseye |
| drop | straight vertical fall with gentle gravity, stop at the bottom |

### II — Medium
| Level | Mechanic |
|---|---|
| diagonal | diagonal travel with gravity buildup |
| orbit | circular orbit, momentum ramps |
| 2d bounce | random 2D path, gains speed |
| counter orbit | orbit with a counter-rotating target |
| ripple | dot and target both sway at different rates — find the overlap |

### III — Hard
| Level | Mechanic |
|---|---|
| chaos | direction snaps randomly, speed compounds |
| crossfire | tiny precision moving target, fast dot |
| blind | dot goes dark — feel the rhythm |
| moving target | dot and target both move independently |
| eclipse | moving target + blinking dot |

### ∞ — Impossible
| Level | Mechanic |
|---|---|
| ghost | nearly invisible — trust instinct |
| vortex | pulsing spiral orbit + rotating target |
| phase orbit | orbital dot phases in and out + live rotating target |
| abyss | 2D bounce but nearly invisible — aim blind in 2D |
| collapse | extreme chaos (snaps every 2–6 frames) + precision moving target |

## Scoring

Each level scores 0–100 based on how close to the target you stopped. End-of-run grades:

| Average | Grade |
|---|---|
| 90–100 | DEAD CENTER |
| 75–89 | SHARP |
| 55–74 | DECENT |
| 35–54 | SHAKY |
| 0–34 | NEEDS WORK |

## How To Play

1. Open the game.
2. Click a difficulty to select the full tier, or click individual levels to build your run.
3. Press `Space` or click **PLAY** to start.
4. Stop the dot on the target with a click, tap, or `Space`.
5. Survive all levels and check your grade.

## Tech Stack

- React 19
- Vite 8
- Plain component-level styling in `App.jsx`
- Web Audio API for synth music and sound effects
- GitHub Pages deployment via the `docs/` output

## Development

From the `deadcenter` folder:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project Structure

- `deadcenter/src/App.jsx` — game logic, level definitions, audio, scoring, UI
- `deadcenter/src/main.jsx` — React entry point
- `deadcenter/package.json` — scripts and dependencies
- `deadcenter/public/` — static assets
- `docs/` — built output used for GitHub Pages deployment

## Notes

- Audio can be muted from settings (⚙ icon top-right).
- The game works on both desktop and mobile browsers.
- `docs/` is the production build — do not edit it directly.
