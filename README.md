# Deadcenter

[![Deployed](https://img.shields.io/badge/Deployed-Live-brightgreen)](https://deadcenter.fun/)

**Stop the dot. Beat the target.** A fast-paced browser game built with React and Vite, Deadcenter challenges players to time a moving dot on a target across dynamic levels.

## ✨ Features

- **One-tap gameplay**: Tap or press Space to stop the moving dot
- **Multiple level types**:
  - Horizontal slider
  - Diagonal run
  - Circular orbit
  - 2D bounce
  - Chaos motion
  - Moving target
  - Blind mode
  - Ghost mode
  - Vortex mode
- **Warmup & skip options**: Start with a warmup or jump straight into the action
- **Dynamic scoring**: Precision- and momentum-based scoring system
- **Theme controls**: Day/night mode with subtle visual polish
- **Audio support**: Sound effects with mute control
- **Playlist mode**: Custom level selection for quick replay
- **Responsive UI**: Compact visuals with animated score flashes and progress indicators

## 🚀 Live Demo

Try it now: **https://deadcenter.fun/**

## 🎮 How to Play

1. Launch the game in your browser
2. Watch the dot move across the target
3. Tap or press `Space` to stop the dot
4. Score is based on how close you land to the center
5. Progress through different level types and modes

## 🛠️ Tech Stack

- **Frontend**: React 19
- **Build tool**: Vite 4+
- **Styling**: Custom CSS and component-based styling
- **Deployment**: GitHub Pages

## 💻 Development

From the `deadcenter` folder:

```bash
npm install
npm run dev
```

Then open the local Vite server URL shown in the terminal.

### Build for Production

```bash
npm run build
npm run preview
```

This generates an optimized production build in `dist` and lets you preview the production output locally.

## 📦 Project Structure

- `deadcenter/src/App.jsx` — main game logic, rendering, and UI
- `deadcenter/src/main.jsx` — React entry point
- `deadcenter/package.json` — project scripts and dependencies
- `deadcenter/vite.config.js` — Vite configuration
- `deadcenter/public/` — static assets and deployment files
- `docs/` — built deployment output for the hosted site

## 🎨 Design Philosophy

Deadcenter focuses on polished, lightweight gameplay with clear visuals and fast feedback. The UI is built to feel responsive on both desktop and mobile while keeping controls simple and intuitive.

## 📄 Notes

- The app lives inside the `deadcenter` subfolder as a self-contained React/Vite project.
- Audio is optional and can be muted in the settings panel.
- The game is optimized for browser play with both tap and keyboard controls.

