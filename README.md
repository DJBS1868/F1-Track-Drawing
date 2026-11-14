# 🚀 APEX INK — Draw it. Race it.

A browser-based track builder racer. Sketch a closed circuit with a mouse or a fingertip, and APEX INK paves it into a 3D world with kerbs, run-off, scenery, and a full grid of AI rivals. Then race it.

## Play

```bash
npm install
npm start          # http://localhost:3000
```

Any static file server works too — the game ships with its own copy of Three.js in `vendor/`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | `A` / `D` or `←` / `→` | Left / right pads |
| Throttle / brake override | `W` / `S` | GAS / BRAKE |
| Handbrake | `SPACE` | — |
| Camera | `C` | — |
| Recover to track | `R` | — |
| Pause | `ESC` | Pause button |

The car drives its own throttle and brakes; you focus on the racing line unless you override with `W` / `S`.

## Features

- Freehand circuit drawing with live length, corner, straight, and run-off analysis.
- Closed-loop validation that rejects self-intersecting scribbles.
- Procedural 3D world, kerbs, scenery, start gantry, and dynamic lighting.
- One to ten laps, zero to nine AI racers, three rival difficulty levels.
- Randomised team-radio pit calls, a working pit lane, a timed tyre stop, and tyre wear that resets on fresh rubber.
- Livery studio with per-part paint, presets, colour wheel, hex input, and stickers.
- Chase and onboard cameras, live standings, sector map, DRS, lap timing, and a full classification screen.
- Responsive desktop, phone, tablet, and landscape layouts with on-screen touch controls.
- Synthesised engine and UI audio, saved circuits, and best-lap records.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/DJBS1868/F1-Track-Drawing)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/DJBS1868/F1-Track-Drawing)

- 🎮 [Open the project](https://go.ondev.store/DJBS1868/F1-Track-Drawing).
- ✨ [Remix this project](https://go.ondev.store/DJBS1868/F1-Track-Drawing?remix=1).
- 💻 [Explore the source](https://github.com/DJBS1868/F1-Track-Drawing).
- 🛠️ [Check build runs](https://github.com/DJBS1868/F1-Track-Drawing/actions).
- 🐛 [Report an issue](https://github.com/DJBS1868/F1-Track-Drawing/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/DJBS1868).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
- 🧬 [Explore the remix source](https://github.com/DJBS1868/F1-Track-Drawing).
<!-- omgithub:readme:end -->
