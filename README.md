# Kazakhstan Driving Exam Simulator - B Category (Astana)

Interactive Graphics course project. An in-browser
training site and simulation of the **practical driving test of Kazakhstan**,
starting from a **category-B car** on the **Astana** exam ground.

Built with **Three.js** and **tween.js**. 

## Live demo

[> _GitHub Pages link._](https://sapienzainteractivegraphicscourse.github.io/final-project-unprofessionalearthmoveeeer/)

## Run locally

The app uses ES modules, so it must be served over HTTP (not opened from
`file://`). Any static server works. With Python:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Input | Action |
| --- | --- |
| **W / ↑** | Accelerate · **S / ↓** brake & reverse |
| **A / ←** · **D / →** | Steer left / right |
| **C** | Cycle camera (chase → cockpit → top-down → orbit) |
| **L** | Headlights · **O** doors · **R** reset |
| Mouse | Orbit / zoom (in orbit camera mode) |

The HUD shows speed, gear, camera, headlights and the cone penalty count.

## Project structure

```
index.html              # entry point + import map (no bundler)
src/
  main.js               # renderer, scene, main loop; wires everything together
  vehicle.js            # kinematic bicycle driving model
  input.js              # keyboard state
  cameras.js            # chase / cockpit / top-down / orbit camera manager
  world/
    car.js              # hierarchical car model + its animations
    environment.js      # sky, lights, surrounding textured ground
    examGround.js       # marked exam pad, curbs, slalom cones + scoring
    textures.js         # procedural asphalt (color/normal/roughness) + markings
lib/                    # vendored libraries (committed, per course rules)
  three/                #   Three.js r160 + addons (OrbitControls, GLTFLoader, ...)
  tween/                #   tween.js (smooth hand-written animations)
assets/                 # reserved for optional future models/textures
docs/                   # technical document / user manual (technical-report.md)
```

Full write-up: [docs/technical-report.md](docs/technical-report.md).

## Requirements coverage (course rubric)

| Requirement | Plan |
| --- | --- |
| Hierarchical model | Category-B car: body then wheels (steer + roll), steering wheel, doors, suspension |
| Lights & textures | Sun + headlights; asphalt color/normal/roughness maps, road markings, signs |
| User interaction | Drive (keyboard), switch cameras, toggle headlights, restart maneuver, difficulty |
| Animations (hand-written) | All in JS via Three.js and tween.js — **no imported animations** |

## Libraries used

- [Three.js](https://threejs.org/) r160 — rendering, scene graph, loaders
- [tween.js](https://github.com/tweenjs/tween.js/) — interpolation / easing for smooth animation
