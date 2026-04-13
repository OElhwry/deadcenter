# Deadcenter

[![Deployed](https://img.shields.io/badge/Deployed-Live-brightgreen)](https://deadcenter.fun/)

Deadcenter is a fast, minimal browser timing game built with React and Vite. The goal is simple: stop the moving dot as close to the target as possible. The patterns start readable, then get mean.

## Features

- One-input gameplay: click/tap or press `Space` to stop.
- Unified run builder on the main menu:
  click a difficulty to grab a full set, or click individual levels to build a custom run.
- Warmup support with optional skip toggle.
- Day mode and mute controls in settings.
- Momentum system that ramps up on harder levels.
- Score feedback, difficulty badges, and end-of-run grading.
- Built-in synth/chiptune-style music loop and sound effects.

## Level Types

Current set includes:

- `warm up`
- `steady`
- `sway`
- `diagonal`
- `orbit`
- `counter orbit`
- `2d bounce`
- `chaos`
- `crossfire`
- `blind`
- `moving target`
- `eclipse`
- `ghost`
- `vortex`
- `phase orbit`

These cover horizontal timing, diagonal travel, circular timing, moving targets, visibility disruption, compounded speed, and orbit-based target matching.

## How To Play

1. Open the game.
2. Pick a full difficulty or build your own run from the level list.
3. Start the run.
4. Stop the dot on the target with a click/tap or `Space`.
5. Try to average as close to `100` as you can.

## Tech Stack

- React 19
- Vite 8
- Plain component-level styling in `App.jsx`
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

- `deadcenter/src/App.jsx` - main game logic, audio, UI, level definitions, scoring
- `deadcenter/src/main.jsx` - React entry
- `deadcenter/package.json` - scripts and dependencies
- `deadcenter/public/` - static public assets
- `docs/` - generated deployment output

## Notes

- The playable app lives in the `deadcenter/` subfolder.
- Audio can be muted from settings.
- The game is designed for both desktop and mobile browser play.
- `docs/` is the built output used for deployment.
