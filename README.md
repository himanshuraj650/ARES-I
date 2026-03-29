# ARES-I: Journey to Mars

An immersive, story-driven mission simulator that turns a static webpage into a cinematic space odyssey.

Built for hackathon judging, ARES-I combines technical depth, visual craft, and interactive decision-making in a single seamless experience.

## Why This Project Stands Out

- Narrative + Engineering: Not just animations. Users make mission-critical choices and see measurable outcomes.
- System Design: Multiple interconnected systems (crew vitals, launch prep, crisis engine, analytics, replay).
- Presentation Quality: Built as a demo-ready experience with polished motion, typography, and mission storytelling.
- Replayability: Every run can differ based on crisis outcomes and user decisions.

## Core Experience

ARES-I is structured as a 10-chapter mission arc:

1. Hero Briefing
2. Crew Readiness
3. Launch Operations
4. Deep Space Transit
5. Mars Approach
6. Mission Control Telemetry
7. Entry, Descent, Landing
8. Surface Exploration
9. Mission Lab (simulation)
10. Final Analytics + Replay

## Signature Features

- Cinematic mission loader and fixed starfield background
- Real-time Mission HUD with progress, mission-day interpolation, and velocity updates
- Crew biometrics engine (heart rate, O2, stress) with live updates
- Pre-launch checklist mini-games (calibration + sequence + pattern validation)
- Crisis event engine with branching outcomes and risk consequences
- Orbital visualization and telemetry dashboards
- Landing simulation with staged sequence progression
- Mission Lab scenario runner (10,000 simulations)
- Final mission analytics and achievement badges
- Mission Replay Timeline with scrubber, event chips, and autoplay
- Fully responsive layout across mobile, tablet, and desktop
- Accessibility support: ARIA labels, keyboard controls, reduced-motion compatibility

## Mission Replay Timeline

The replay panel captures key moments during a run:

- Chapter transitions
- Launch ignition and liftoff
- Crisis response outcomes
- Landing completion
- Lab simulation outcome
- Final analytics computation

Judges can scrub through mission events and replay the story of a run in seconds.

## Tech Stack

- HTML5
- CSS3 (custom design system, advanced responsive behavior, motion)
- Vanilla JavaScript (state-driven interaction engine)
- Canvas API (orbital + landing + telemetry visuals)
- Web Audio API (ambient and event-driven sound)
- Local browser APIs (sharing, clipboard, intersection observers)

## Judging Criteria Mapping

### Innovation
- Blends narrative design, simulation systems, and event replay into one cohesive product.

### Technical Implementation
- Complex client-side state orchestration across multiple interactive subsystems.
- Canvas rendering, observers, progressive UI updates, and dynamic analytics.

### UX / UI Excellence
- Cinematic, intentional visual language with consistent mission-themed components.
- Smooth guided flow from onboarding to mission debrief.

### Impact / Storytelling
- Converts abstract space concepts into decisions users can feel and measure.

## Quick Start

### Recommended (Local Server)
1. Open terminal in project root
2. Run: `python -m http.server 8000`
3. Open: `http://localhost:8000`

### One-Click Option
- Run `launch.bat`

## Deployment

This is a static project and can be deployed instantly to:

- GitHub Pages
- Netlify

## Project Structure

- `index.html` - Full mission page and sections
- `assets/css/main.css` - Design system, motion, responsive styles
- `assets/js/main.js` - Mission logic, state, interactions, simulations
- `favicon.svg` - Mission icon

## Demo Flow (Suggested for Judges)

1. Start at Hero and trigger mission launch sequence
2. Show crew biometrics and pre-launch checks
3. Trigger or explain crisis handling logic
4. Jump to Mission Lab and run 10,000 scenario simulation
5. Open Final Results and showcase Replay Timeline scrubber

## Performance and Accessibility Notes

- Responsive optimizations for compact and large screens
- Reduced motion support for accessibility preferences
- Keyboard-friendly interaction in key sections

## Summary

ARES-I is not a static story page. It is a compact, interactive mission system that demonstrates product thinking, front-end engineering, and narrative experience design in one polished hackathon submission.
