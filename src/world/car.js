// Hierarchical category-B car, built entirely in code (no imported model/animation).
//
// Scene-graph hierarchy (this is the "complex hierarchical model" requirement):
//
//   root (position + heading set by the driver)
//   ├─ body
//   │   ├─ lower body, cabin, windshield, bumpers, hood line
//   │   ├─ headlight lenses (emissive)        ── brighten when lights on
//   │   ├─ tail/brake lenses (emissive)       ── brighten when braking
//   │   ├─ doorL / doorR  (hinged groups)     ── swing open/closed
//   │   └─ steeringYaw → steeringTilt → wheel ── turns with steering input
//   ├─ frontLeftPivot  → wheel   (pivot yaws = steering; wheel spins = rolling)
//   ├─ frontRightPivot → wheel
//   ├─ rearLeft wheel  (spins)
//   ├─ rearRight wheel (spins)
//   └─ headlightL / headlightR (SpotLights) + targets
//
// Car-local forward is +X. All animations are driven from update()/setters below.

import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

const WHEEL_RADIUS = 0.42;
const WHEEL_WIDTH = 0.34;
const HALF_WHEELBASE = 1.45; // front axle x = +, rear axle x = -
const HALF_TRACK = 0.82;     // wheel z offset
export const MAX_STEER = 0.52; // radians (~30°)

export function buildCar({ color = 0xc62828, tweens } = {}) {
  const root = new THREE.Group();
  root.name = 'car';

  // --- Materials ---------------------------------------------------------
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 });
  const darkPaint = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.4, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x16242e, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb9bcc4, metalness: 0.95, roughness: 0.25 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.9, metalness: 0.0 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xced3da, metalness: 0.9, roughness: 0.3 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6da, emissive: 0xfff2c4, emissiveIntensity: 0.0, roughness: 0.2 });
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x5a0d0d, emissive: 0xff2b2b, emissiveIntensity: 0.25, roughness: 0.3 });

  // --- Body --------------------------------------------------------------
  const body = new THREE.Group();
  root.add(body);

  const lower = box(4.2, 0.62, 1.78, paint);
  lower.position.set(0, 0.78, 0);
  body.add(lower);

  // Slightly narrower sill skirt for a bit of shape.
  const sill = box(4.0, 0.22, 1.84, darkPaint);
  sill.position.set(0, 0.5, 0);
  body.add(sill);

  const cabin = box(2.05, 0.66, 1.56, paint);
  cabin.position.set(-0.25, 1.36, 0);
  body.add(cabin);

  // Greenhouse / windows (glass band around the cabin).
  const windshield = box(0.08, 0.5, 1.4, glass);
  windshield.position.set(0.83, 1.34, 0);
  windshield.rotation.z = 0.5;
  body.add(windshield);

  const rearGlass = box(0.08, 0.48, 1.4, glass);
  rearGlass.position.set(-1.32, 1.34, 0);
  rearGlass.rotation.z = -0.5;
  body.add(rearGlass);

  const sideGlassL = box(1.7, 0.42, 0.06, glass);
  sideGlassL.position.set(-0.25, 1.42, 0.79);
  body.add(sideGlassL);
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.z = -0.79;
  body.add(sideGlassR);

  // Bumpers.
  const frontBumper = box(0.25, 0.3, 1.7, chrome);
  frontBumper.position.set(2.12, 0.62, 0);
  body.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.x = -2.12;
  body.add(rearBumper);

  // Head/brake light lenses.
  const headL = box(0.1, 0.22, 0.42, headMat);
  headL.position.set(2.16, 0.85, 0.55);
  body.add(headL);
  const headR = headL.clone();
  headR.position.z = -0.55;
  body.add(headR);

  const brakeL = box(0.1, 0.22, 0.42, brakeMat);
  brakeL.position.set(-2.16, 0.9, 0.55);
  body.add(brakeL);
  const brakeR = brakeL.clone();
  brakeR.position.z = -0.55;
  body.add(brakeR);

  // Amber turn indicators (front + rear, both sides). Materials are per-side so
  // we can blink left/right/hazard independently.
  const amberMat = () => new THREE.MeshStandardMaterial({ color: 0x7a4a00, emissive: 0xff9500, emissiveIntensity: 0.0, roughness: 0.4 });
  const indLeftMat = amberMat();
  const indRightMat = amberMat();
  const indFL = box(0.1, 0.16, 0.22, indLeftMat);  indFL.position.set(2.16, 0.7, 0.82);
  const indRL = box(0.12, 0.16, 0.22, indLeftMat); indRL.position.set(-2.16, 0.78, 0.82);
  const indFR = box(0.1, 0.16, 0.22, indRightMat); indFR.position.set(2.16, 0.7, -0.82);
  const indRR = box(0.12, 0.16, 0.22, indRightMat); indRR.position.set(-2.16, 0.78, -0.82);
  body.add(indFL, indRL, indFR, indRR);

  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // --- Doors (hinged at the front edge, swing outward) -------------------
  const doorL = hingedDoor(paint, glass, +1);
  doorL.position.set(0.55, 0.95, 0.9); // hinge near B-pillar, left side (+Z)
  body.add(doorL);
  const doorR = hingedDoor(paint, glass, -1);
  doorR.position.set(0.55, 0.95, -0.9);
  body.add(doorR);

  // --- Interior: seats + steering wheel ----------------------------------
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.8 });
  const seatL = box(0.55, 0.6, 0.5, seatMat);
  seatL.position.set(-0.2, 1.18, 0.38); // driver (left-hand drive)
  body.add(seatL);
  const seatR = seatL.clone();
  seatR.position.z = -0.38;
  body.add(seatR);

  // Steering column/wheel: nested groups so we can spin it cleanly about its
  // own axle regardless of the tilt that makes it face the driver.
  const steeringYaw = new THREE.Group();
  steeringYaw.position.set(0.5, 1.2, 0.38);
  steeringYaw.rotation.y = -Math.PI / 2; // face the driver (−X)
  const steeringTilt = new THREE.Group();
  steeringTilt.rotation.x = -0.5; // lean back
  steeringYaw.add(steeringTilt);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.035, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6 })
  );
  steeringTilt.add(steeringWheel);
  const spoke = box(0.34, 0.03, 0.03, darkPaint);
  steeringWheel.add(spoke);
  body.add(steeringYaw);

  // --- Wheels ------------------------------------------------------------
  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(HALF_WHEELBASE, WHEEL_RADIUS, HALF_TRACK);
  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(HALF_WHEELBASE, WHEEL_RADIUS, -HALF_TRACK);

  const wheelFL = makeWheel(tire, hubMat);
  const wheelFR = makeWheel(tire, hubMat);
  frontLeftPivot.add(wheelFL);
  frontRightPivot.add(wheelFR);
  root.add(frontLeftPivot, frontRightPivot);

  const wheelRL = makeWheel(tire, hubMat);
  wheelRL.position.set(-HALF_WHEELBASE, WHEEL_RADIUS, HALF_TRACK);
  const wheelRR = makeWheel(tire, hubMat);
  wheelRR.position.set(-HALF_WHEELBASE, WHEEL_RADIUS, -HALF_TRACK);
  root.add(wheelRL, wheelRR);

  const wheels = [wheelFL, wheelFR, wheelRL, wheelRR];

  // --- Headlight beams (SpotLights, no shadows for performance) ----------
  const headlightL = makeHeadlight();
  headlightL.position.set(2.16, 0.85, 0.55);
  headlightL.target.position.set(12, -1, 0.55);
  const headlightR = makeHeadlight();
  headlightR.position.set(2.16, 0.85, -0.55);
  headlightR.target.position.set(12, -1, -0.55);
  root.add(headlightL, headlightL.target, headlightR, headlightR.target);

  // --- Animation state ---------------------------------------------------
  let rollAngle = 0;
  let steer = 0;          // current visual steer angle
  const doorState = { open: 0 }; // 0 closed .. 1 open (tweened)
  let doorTarget = 0;
  let headOn = 0;         // 0..1 animated
  let headTarget = 0;
  let brake = 0;          // 0..1 animated
  let indicator = 'off';  // 'off' | 'left' | 'right' | 'hazard'
  let blinkT = 0;

  const applyDoors = () => {
    // +Z-side door swings toward +Z (outward); −Z-side door mirrors it.
    doorL.rotation.y = doorState.open;
    doorR.rotation.y = -doorState.open;
  };

  return {
    group: root,
    MAX_STEER,

    /** Advance wheel spin by the distance travelled this frame (metres). */
    addRoll(distance) {
      rollAngle -= distance / WHEEL_RADIUS;
    },

    /** Set the steering angle (radians). Front wheels + steering wheel follow. */
    setSteering(angle) {
      steer = THREE.MathUtils.clamp(angle, -MAX_STEER, MAX_STEER);
    },

    setHeadlights(on) { headTarget = on ? 1 : 0; },
    setBrake(on) { brake = on ? 1 : 0; },

    // Turn indicators: 'off' | 'left' | 'right' | 'hazard'.
    setIndicator(mode) { indicator = mode; if (mode === 'off') blinkT = 0; },
    get indicator() { return indicator; },

    // Smooth door swing via tween.js (eased, exploits the hinge hierarchy).
    toggleDoors() {
      doorTarget = doorTarget > 0.5 ? 0 : 1;
      new TWEEN.Tween(doorState, tweens)
        .to({ open: doorTarget }, 650)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(applyDoors)
        .start();
    },
    get doorsOpen() { return doorTarget > 0.5; },

    reset() {
      rollAngle = 0; steer = 0;
      doorTarget = 0; doorState.open = 0; applyDoors();
    },

    update(dt) {
      // Wheels: roll all, steer the fronts (pivots) + the steering wheel.
      for (const w of wheels) w.rotation.z = rollAngle;
      frontLeftPivot.rotation.y = steer;
      frontRightPivot.rotation.y = steer;
      steeringWheel.rotation.z = -steer * 4.5;

      // Headlights: fade intensity + lens emissive.
      headOn += (headTarget - headOn) * Math.min(1, dt * 6);
      headlightL.intensity = headlightR.intensity = headOn * 6;
      headMat.emissiveIntensity = headOn * 1.2;

      // Brake lenses glow harder while braking/reversing.
      brakeMat.emissiveIntensity = 0.2 + brake * 1.4;

      // Turn indicators blink at ~2 Hz.
      blinkT += dt;
      const lit = indicator !== 'off' && (blinkT % 0.5) < 0.25 ? 1.5 : 0.0;
      indLeftMat.emissiveIntensity = (indicator === 'left' || indicator === 'hazard') ? lit : 0.0;
      indRightMat.emissiveIntensity = (indicator === 'right' || indicator === 'hazard') ? lit : 0.0;
    },
  };
}

// --- helpers --------------------------------------------------------------
function box(x, y, z, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(x, y, z), material);
}

function makeWheel(tireMat, hubMat) {
  const g = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 22);
  tireGeo.rotateX(Math.PI / 2); // axle along local Z
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  g.add(tireMesh);

  // Hub cap so the spin is clearly visible.
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, WHEEL_WIDTH + 0.02, 12);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  g.add(hub);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, WHEEL_WIDTH + 0.03), hubMat);
  g.add(spoke);
  return g;
}

function hingedDoor(paint, glass, side) {
  // Hinge group with origin at the front edge; door extends backward (−X).
  const door = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.78, 0.07), paint);
  panel.position.set(-0.52, 0, 0); // back from the hinge
  panel.castShadow = true;
  door.add(panel);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.34, 0.04), glass);
  win.position.set(-0.5, 0.5, 0.0);
  door.add(win);
  return door;
}

function makeHeadlight() {
  const s = new THREE.SpotLight(0xfff3d0, 0, 45, Math.PI / 7, 0.4, 1.2);
  s.castShadow = false;
  return s;
}
