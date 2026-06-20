# Kazakhstan Driving Exam Simulator - B Category (Astana)

Interactive Graphics course project: an in-browser simulation of the **Kazakhstan
practical driving test**, driving a **category-B car** around the **Astana** exam
autodrome. An automated examiner watches the car against the real test rules and
issues penalties live, ending in a **PASS / FAIL** verdict.

Built with **Three.js** (r160) and **tween.js**, with **no build step** - ES
modules and an import map load everything straight from the repo, so it runs on
GitHub Pages or any static server.

## Live demo

**https://sapienzainteractivegraphicscourse.github.io/final-project-unprofessionalearthmoveeeer/**

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
| **W / ↑** | Accelerate &nbsp;·&nbsp; **S / ↓** brake & reverse |
| **A / ←** &nbsp;·&nbsp; **D / →** | Steer left / right |
| **Space** | Handbrake (full stop) |
| **Q** / **E** | Left / right turn signal &nbsp;·&nbsp; **H** hazards |
| **C** | Cycle camera (chase - cockpit - top-down - orbit) |
| **L** | Headlights &nbsp;·&nbsp; **O** doors &nbsp;·&nbsp; **R** reset exam |
| Mouse | Orbit / zoom (in orbit camera mode) |

The HUD (top-left) shows speed, gear, camera, headlights and signal. The
**Examiner** panel (top-right) shows the running penalty total and the most
recent violation; reaching the fail threshold or committing a critical error
ends the run with a verdict overlay.

## How the examiner works

The exam is **data-driven**: the course is defined as line segments in image-pixel
coordinates ([src/exam/course.js](src/exam/course.js)) and converted to world
space at build time. Each frame the engine checks the car against those lines:

- **Signal lines** - crossing requires the correct turn indicator (else −5)
- **Stop lines** - must come to a full stop before crossing (else −25)
- **Traffic-light lines** - crossing on red/yellow - instant fail
- **Penalty lines** - a wheel touching the line - 20
- **Parking zones** - timed; wheels must be stationary inside the target
- **Finish line** - crossing it ends the exam

Penalties accumulate in [src/exam/scoring.js](src/exam/scoring.js); the run fails
the moment a critical (100-pt) error fires or the total reaches **100**. The
implemented "core subset" of the official spec covers the start sequence, slalom
cone scoring, the controlled-intersection traffic light, and the global rules
(time limit, off-circuit, emergency stop, abrupt braking).

## Project structure

```
index.html              # entry point + import map (no bundler)
src/
  main.js               # renderer, scene, main loop; wires everything together
  vehicle.js            # kinematic bicycle driving model (no physics engine)
  input.js              # keyboard state
  cameras.js            # chase / cockpit / top-down / orbit camera manager
  exam/
    exam.js             # data-driven exam engine (lines - live rule checks)
    examiner.js         # automated examiner: inspects state, issues penalties
    course.js           # course definition (rule lines in image pixels)
    scoring.js          # penalty accumulation + pass/fail (threshold 100)
  world/
    car.js              # hierarchical category-B car model + its animations
    environment.js      # sky, lights, surrounding ground
    examGround.js       # marked exam pad and start point
    autodromeMap.js     # procedural top-down autodrome texture (Astana style)
    mapCoords.js        # image-pixel - world coordinate mapping
    courseMarks.js      # ground markings + synchronised intersection lights
    overpass.js         # hill-start element ("estakada") ramp
    trafficLight.js     # traffic-light model + shared signal cycle
    textures.js         # procedural asphalt color/normal/roughness + markings
lib/                    # vendored libraries (committed, per course rules)
  three/                #   Three.js r160 + addons (OrbitControls, GLTFLoader, ...)
  tween/                #   tween.js (easing for hand-written animations)
assets/                 # textures (autodrome map image)
docs/                   # technical report (report.tex - report.pdf)
```

Full write-up: [docs/report.pdf](docs/report.pdf) (source: [docs/report.tex](docs/report.tex)).

## Requirements coverage (course rubric)

| Requirement | How it is met |
| --- | --- |
| Complex hierarchical model | Category-B car built in code: body - wheels (steer + roll), steering wheel, doors, suspension, lights |
| Lights & textures | Sun + headlights; procedural asphalt color/normal/roughness maps, painted road markings and autodrome map |
| User interaction | Keyboard driving, camera switching, headlights/doors/signals, exam reset |
| Animations (hand-written) | All motion in JS via Three.js and tween.js - **no imported animations** |

## Libraries used

- [Three.js](https://threejs.org/) r160 - rendering, scene graph, loaders, OrbitControls
- [tween.js](https://github.com/tweenjs/tween.js/) - interpolation / easing for smooth animation
