# Kazakhstan Driving Exam Simulator — Technical Document & User Manual

**Course:** Interactive Graphics (Prof. Marco Schaerf), Sapienza University of Rome
**Theme:** In-browser training site and simulation of the *practical driving
test of Kazakhstan*, category B, on the Astana exam ground.

This document is both a technical presentation and a user manual, as required by
the project brief. It describes the environment, the external libraries used,
all technical aspects of the implementation, and the interactions available to
the user.

---

## 1. Overview

The application is a real-time 3D scene rendered in the browser with **WebGL via
Three.js**. The user drives a category-B car around the Astana practical-exam
pad and performs a slalom ("snake") maneuver between traffic cones. The scene
demonstrates the four mandatory pillars of the course project:

| Requirement | Where it is satisfied |
| --- | --- |
| **Hierarchical model** | The car: a multi-level scene graph whose children (wheels, steering wheel, doors) are animated through their parent–child transforms (§4). |
| **Lights & textures** | A sun (directional, shadow-casting) + hemisphere fill + two car headlights; asphalt with **colour, normal and roughness** maps, plus a painted markings texture (§7, §8). |
| **User interaction** | Keyboard driving, four camera modes, headlight toggle, door toggle, reset (§10). |
| **Animations** | All motion is computed in JavaScript every frame — wheel roll/steer, steering-wheel rotation, doors (tween.js), cone knock-over, full vehicle motion. **No animation is imported** (§9). |

Everything (including the car model) is generated procedurally in code; no 3D
model files and no animation clips are imported, which keeps the project well
within the rule that *animations cannot be imported*.

---

## 2. Environment used

- **Rendering:** [Three.js](https://threejs.org/) r160 (WebGL renderer).
- **No build step / no bundler.** The app is plain ES modules loaded through an
  `<script type="importmap">` in `index.html`. All libraries are vendored under
  `lib/`, so the repository contains *all* source code and runs directly on
  GitHub Pages or any static file server.
- **Language:** modern JavaScript (ES2020 modules), no transpilation.

Because there is no build pipeline, deployment is just "serve the folder."

---

## 3. External libraries, tools and assets (not developed by the team)

| Item | Version | Purpose |
| --- | --- | --- |
| [Three.js](https://threejs.org/) | r160 | Scene graph, WebGL rendering, materials, lights, shadow maps |
| Three.js `OrbitControls` addon | r160 | Free-orbit camera mode |
| Three.js `GLTFLoader` (+ `BufferGeometryUtils`) | r160 | Vendored for optional future model import; the submitted scene is fully procedural |
| [tween.js](https://github.com/tweenjs/tween.js/) | 23.1.3 | Eased interpolation for the smooth door open/close animation |

- **Models:** none imported. The car, cones, curbs and ground are built from
  Three.js primitives in code.
- **Textures:** none imported. Asphalt (colour/normal/roughness) and the exam-pad
  markings are generated procedurally on an HTML `<canvas>` at runtime
  (`src/world/textures.js`).

---

## 4. The hierarchical car model

The car (`src/world/car.js`) is the project's complex hierarchical model. Its
scene graph is:

```
root  (THREE.Group)                     ← position + heading set by the driver
├── body  (THREE.Group)
│   ├── lower body, sill, cabin          ← box primitives, the painted shell
│   ├── windshield / rear / side glass   ← transparent MeshStandardMaterial
│   ├── front & rear bumpers             ← chrome (metalness ≈ 0.95)
│   ├── headlight lenses (×2)            ← emissive, brighten when lights on
│   ├── tail/brake lenses (×2)           ← emissive, brighten when braking
│   ├── seats (×2)
│   ├── steeringYaw → steeringTilt → steeringWheel (torus + spoke)
│   ├── doorL  (hinge group → panel + window)
│   └── doorR  (hinge group → panel + window)
├── frontLeftPivot  → wheel (group: tyre + hub + spoke)
├── frontRightPivot → wheel
├── rearLeft  wheel
├── rearRight wheel
└── headlightL / headlightR  (SpotLight + target)
```

**Local convention.** The car's forward direction is local **+X**, up is **+Y**.
The whole car is moved/rotated by setting `root.position` and `root.rotation.y`
(the heading); every child therefore follows automatically — the essence of a
hierarchical model.

**Animations exploiting the hierarchy.** Each frame `car.update(dt)`:

- **Wheel roll** — all four wheel groups spin about their local Z (the axle):
  `rotation.z = rollAngle`, where `rollAngle` advances by
  `distanceTravelled / wheelRadius`. The roll distance comes from the driving
  model, so the wheels always match the car's real speed.
- **Steering** — the two **front wheel pivot groups** yaw about Y by the
  steering angle. Because the wheel meshes are *children* of the pivots, they
  steer in place and still roll correctly. The cabin **steering wheel** rotates
  about its own axle proportionally to the steering angle (≈ 4.5×), nested in
  two helper groups (`steeringYaw`, `steeringTilt`) so it can spin cleanly
  regardless of the tilt that makes it face the driver.
- **Doors** — each door is a hinge group whose origin is at the front edge of
  the door; the panel hangs behind the hinge. Opening rotates the hinge group
  about Y. The two doors mirror each other. This animation is driven by
  **tween.js** with a `Quadratic.Out` easing for a smooth swing (§9).
- **Headlights & brake lights** — the emissive intensity of the lens materials
  and the intensity of the headlight `SpotLight`s are eased toward their target
  state each frame, so toggling lights or braking fades rather than snaps.

---

## 5. Driving model (kinematic, no physics engine)

`src/vehicle.js` implements a **kinematic bicycle model**. A physics engine was
intentionally avoided to keep the simulation light and predictable (the brief
explicitly allows skipping one).

State: position `(x, z)`, `heading`, signed `speed`, current `steer` angle.

Each frame:

1. **Longitudinal** — throttle accelerates; brake decelerates and, once stopped,
   engages reverse; releasing both applies rolling friction toward zero. Speed
   is clamped to `[-5, 15] m/s` (≈ −18 … 54 km/h).
2. **Steering** — the target steering angle eases in (so the wheels turn
   smoothly), and the maximum lock is reduced at higher speed for stability.
3. **Integration** — heading changes by `(speed / wheelbase) · tan(steer) · dt`;
   the car then advances along its forward vector
   `(cos heading, 0, −sin heading)`.
4. The resulting pose is written to the car node, and the travelled distance is
   fed to the wheels (`addRoll`) so visuals and motion stay consistent.

The frame `dt` is clamped to 50 ms so a tab losing focus cannot teleport the car.

---

## 6. Architecture & file structure

```
index.html              entry point + import map (no bundler)
src/
  main.js               renderer, scene, loop; wires world + input + cameras + HUD
  vehicle.js            kinematic bicycle driving model
  input.js              keyboard state (held keys + one-shot "tap" handlers)
  cameras.js            CameraManager: chase / cockpit / top / orbit
  world/
    environment.js      sky, fog, sun + hemisphere lights, surrounding ground
    examGround.js       marked exam pad, curbs, slalom cones, collision + scoring
    car.js              hierarchical car model + its animations
    textures.js         procedural asphalt (colour/normal/roughness) + markings
lib/                    vendored Three.js (+ addons) and tween.js
assets/                 reserved for optional future models/textures
docs/                   this document
```

The main loop in `main.js` runs, every frame: read input → update vehicle →
update car parts → cone collision test → update cones → update tweens → update
camera → update HUD → render.

---

## 7. Exam ground, textures and markings

`src/world/environment.js` builds a large tiling asphalt ground using three
procedural textures generated on a canvas (`textures.js`):

- **colour map** — dark grey with per-pixel noise and occasional light speckles;
- **normal map** — per-pixel perturbation of the X/Y normal channels for a rough
  micro-surface under the directional light;
- **roughness map** — patchy greyscale so reflections vary across the surface.

All three tile 30×30 across the ground and use anisotropic filtering.

`src/world/examGround.js` adds the **marked exam pad** on top: a single
high-resolution canvas texture drawn in world-proportional coordinates with a
**parallel-parking box**, a **start/finish line**, a dashed **centre lane**, a
**direction arrow** and the **"ASTANA — PRACTICAL EXAM (B)"** label. A light curb
borders the pad.

This satisfies the "textures of different kinds (colour, normal, specular/…)"
requirement: a colour map, a normal map, a roughness (specular-equivalent for
the metalness/roughness workflow) map, and a separate painted decal texture.

---

## 8. Lighting & shadows

- **HemisphereLight** — soft sky/ground fill so shadowed faces are not black.
- **DirectionalLight (the sun)** — the key light; casts real-time shadows via a
  2048² shadow map with a tuned orthographic frustum and depth bias.
- **Two SpotLights (headlights)** — children of the car, aimed forward; their
  intensity fades in/out when the user toggles the lights. They do not cast
  shadows (a deliberate performance choice).
- **Emissive materials** — headlight and brake-light lenses use emissive
  intensity to glow, brightening on light-toggle and braking respectively.

The renderer uses `PCFSoftShadowMap` and the sRGB output colour space for
correct tone.

---

## 9. Animations — all hand-written

Per the brief, **no animation is imported**; every animation is computed in
JavaScript:

- Full vehicle motion (position/heading) from the kinematic model.
- Wheel rolling and front-wheel steering, derived from real speed/steer.
- Steering-wheel rotation linked to the steering angle.
- Door open/close, eased with **tween.js** (`Quadratic.Out`) — the smooth
  interpolation the course recommends tween.js for.
- Cone knock-over and stand-up (§ below).
- Headlight and brake-light intensity fades.

tween.js is driven by a dedicated `TWEEN.Group` updated once per frame in
`main.js`, keeping our tweens isolated from any global state.

### Cones, collision and scoring

Each cone (`examGround.js`) is a small group whose origin is at its foot, so it
can **tip over about its base**. Every frame `main.js` transforms three sample
points along the car (front, centre, rear) into world space and calls
`examGround.hitTest()`; any standing cone within range is knocked over with a
fall axis perpendicular to the impact direction, animated by easing its tilt
angle toward ~90°. The HUD shows **cones hit / total** as a running penalty
count. Pressing **R** stands every cone back up and resets the car — cones ease
smoothly back upright.

---

## 10. User manual — interactions

Open the page; the car starts at the line facing the slalom.

| Input | Action |
| --- | --- |
| **W / ↑** | Accelerate forward |
| **S / ↓** | Brake, then reverse when stopped |
| **A / ←** | Steer left |
| **D / →** | Steer right |
| **C** | Cycle camera: chase → cockpit → top-down → free orbit |
| **L** | Toggle headlights |
| **O** | Open / close the doors |
| **R** | Reset the car to the start and stand the cones up |
| Mouse drag / scroll | Orbit / zoom (in the *orbit* camera mode) |

The HUD (top-left) shows speed (km/h), gear (D/R), current camera, headlight
state and the cone penalty count. The control legend is shown bottom-left.

**Camera modes** (`cameras.js`): *chase* follows behind and above; *cockpit*
sits at the driver's seat looking through the windshield; *top* is a map view
useful for the parking maneuver; *orbit* frees the camera around the car with
OrbitControls.

---

## 11. Performance notes

- A single shadow-casting light (the sun); headlights are shadowless.
- One tiling material for the whole surrounding ground; the pad is a single
  textured quad.
- Pixel ratio capped at 2; `dt` clamped to avoid post-stall jumps.
- All geometry is low-poly primitives, so the scene runs comfortably at 60 fps
  on integrated graphics.

---

## 12. How to run & deploy

**Locally** (ES modules require HTTP, not `file://`):

```bash
python -m http.server 8000     # from the repo root
# open http://localhost:8000
```

**GitHub Pages:** push to the classroom repository, then Settings → Pages →
deploy from `main` (root). A `.nojekyll` file is included so the `lib/` folder
is served verbatim. Put the published URL in the README.

---

## 13. Possible future work

- A scored parallel-parking phase using the painted box (box-bounds check).
- Hill-start and emergency-stop maneuvers.
- Optional Cannon.js integration for true cone physics, gated behind a toggle so
  it never slows the base experience.
- Imported (static) car/scenery models loaded via the already-vendored
  GLTFLoader, with animations still authored in code.
