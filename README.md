# deadcenter.gg

## Overview

Deadcenter is a fast-paced browser game built with React and Vite. Players tap or press Space to stop a moving dot on a target across a variety of level types. The app is designed as a compact, polished skill challenge with animated visuals, subtle audio feedback, and a responsive game loop.

## Live Demo

- https://deadcenter.fun/

## Key Features

- Quickstart gameplay with one-click launch
- Multiple level types including:
  - Horizontal slider
  - Diagonal run
  - Circular orbit
  - 2D bounce
  - Chaos motion
  - Moving target
  - Blind mode
  - Ghost mode
  - Vortex mode
- Warmup level option with skip-warmup setting
- Dynamic scoring system with precision and momentum mechanics
- Day/night theme toggle
- Sound effects and mute support
- Playlist mode for custom level selection
- Animated game UI with score flash and progress indicators

## How to Run Locally

From the `deadcenter` folder:

```bash
npm install
npm run dev
```

Open the local Vite server URL shown in the terminal to play the app.

## Production Build

From the `deadcenter` folder, run:

```bash
npm run build
npm run preview
```

This generates an optimized production build in `dist` and previews it locally.

## Project Structure

- `deadcenter/src/App.jsx` — main game logic, rendering, and UI
- `deadcenter/package.json` — project scripts and dependencies
- `deadcenter/public/` — static assets and deployment files
- `docs/` — built deployment output for documentation or hosted site

## Technology Stack

- React 19
- Vite 4+ for development and build tooling
- Vanilla CSS-in-JS styling inside components

## Gameplay Details

The game cycles through selected levels and awards performance-based scores from 0 to 100. Each level uses a different movement pattern and scoring rule, encouraging players to adapt:

- Stop a sliding dot on a center target
- Time diagonal and circular moves precisely
- Track a moving target in `movingtarget` levels
- React to hidden movement in `blind` and `ghost` modes
- Match an orbiting target in `vortex` mode

The final result screen shows average score, custom badges, and per-level breakdown.

## Notes

- The app currently lives in the `deadcenter` subfolder as a self-contained React/Vite project.
- Sound is optional and can be muted in the settings panel.
- The app is optimized for desktop browser play and tap/keyboard control.

