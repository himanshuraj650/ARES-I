# ARES-I: Journey to Mars

Interactive hackathon web experience built with HTML, CSS, and vanilla JavaScript.

## Features

- 10 mission chapters: Hero, Crew, Launch, Deep Space, Approach, Control, Landing, Explore, Lab, Results
- Cinematic loader, starfield background, live HUD progress, section reveals
- Crew biometrics animation (heart rate, O2, stress)
- Pre-launch checklist mini game (pressure, battery sequence, pattern lock)
- Crisis event engine with branching outcomes
- Landing simulation, telemetry gauges, mission lab simulator
- Final analytics dashboard with mission outcome and crew grades
- Mission Replay Timeline with scrubber, previous/next, and auto-play
- Responsive layout for mobile, tablet, and desktop
- Accessibility support: ARIA labels, keyboard navigation, reduced motion mode

## Run Locally

Option 1 (recommended)

1. Open terminal in project folder
2. Run: python -m http.server 8000
3. Open: http://localhost:8000

Option 2

- Run launch.bat

## Deploy

Static site compatible with:

- GitHub Pages
- Vercel
- Netlify

## Project Structure

- index.html
- assets/css/main.css
- assets/js/main.js
- favicon.svg

## Notes

- Use hard refresh (Ctrl+Shift+R) if browser caches old CSS/JS.
- If a duplicate nested folder exists (ares-mars-final/ares-mars-final), it can be removed safely when no process is locking it.
