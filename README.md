# Kazakhstan Driving Exam Simulator — B Category (Astana)

Interactive Graphics course project (Sapienza University of Rome). An in-browser
training site and simulation of the **practical driving test of Kazakhstan**,
starting from a **category-B car** on the **Astana** exam ground.

Built with **Three.js** and **tween.js**. No build step — it runs as a static
site directly on GitHub Pages.

## Live demo

> _GitHub Pages link goes here once Pages is enabled (see below)._

## Run locally

The app uses ES modules, so it must be served over HTTP (not opened from
`file://`). Any static server works. With Python:

```bash
# from the repository root
python -m http.server 8000
# then open http://localhost:8000
```

Controls (skeleton): drag to orbit the camera, scroll to zoom.

## Project structure

```
index.html              # entry point + import map (no bundler)
src/
  main.js               # renderer, camera, controls, main loop
  world/
    environment.js      # ground, lights, placeholder vehicle (grows into the Astana site)
lib/                    # vendored libraries (committed, per course rules)
  three/                #   Three.js r160 + addons (OrbitControls, GLTFLoader, ...)
  tween/                #   tween.js (smooth hand-written animations)
assets/                 # textures + models (added per milestone)
docs/                   # technical document / user manual
slides/                 # course slides + project requirements (reference)
```

## Requirements coverage (course rubric)

| Requirement | Plan |
| --- | --- |
| Hierarchical model | Category-B car: body → wheels (steer + roll), steering wheel, doors, suspension |
| Lights & textures | Sun + headlights; asphalt color/normal/roughness maps, road markings, signs |
| User interaction | Drive (keyboard), switch cameras, toggle headlights, restart maneuver, difficulty |
| Animations (hand-written) | All in JS via Three.js + tween.js — **no imported animations** |

## Libraries used (not developed by the team)

- [Three.js](https://threejs.org/) r160 — rendering, scene graph, loaders
- [tween.js](https://github.com/tweenjs/tween.js/) — interpolation / easing for smooth animation

## Enabling GitHub Pages

1. Push to the GitHub Classroom repository.
2. Settings → Pages → deploy from `main`, root (`/`).
3. Paste the published URL into the "Live demo" section above.

## Status

Milestone 1 — project skeleton: running scene with lit/shadowed textured
ground, orbit camera, and a tween-driven placeholder vehicle. The car hierarchy
and Astana exam-ground layout come next.
