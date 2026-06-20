// Renders the course markings on the ground and the intersection traffic lights.
// Returns the traffic-signal source (read by the exam) and an update() to cycle it.
//
// There are exactly four traffic lights, placed by image pixel and aimed at a
// cardinal direction, and they are all driven by ONE shared signal so they stay
// synchronised. By default only the required black penalty lines and the red
// stop-lines are drawn; { debug: true } also draws the invisible rule lines.

import * as THREE from 'three';
import { px2world } from './mapCoords.js';
import { buildTrafficLight, makeSignal } from './trafficLight.js';
import { COURSE } from '../exam/course.js';

// Lamps face local +Z; rotate the group to aim the light at a cardinal direction.
const FACE = { north: Math.PI, south: 0, east: Math.PI / 2, west: -Math.PI / 2 };

// The four intersection lights (image pixels + facing).
const TRAFFIC_LIGHTS = [
  { px: 563, py: 380, face: 'north' },
  { px: 559, py: 487, face: 'west' },
  { px: 679, py: 497, face: 'south' },
  { px: 689, py: 375, face: 'east' },
];

export function buildCourseMarks(scene, { debug = false } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  const line = (s, color, width = 0.25, y = 0.05) => {
    const A = px2world(s.a[0], s.a[1]), B = px2world(s.b[0], s.b[1]);
    const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz) || 0.1;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.05, width),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    m.position.set((A.x + B.x) / 2, y, (A.z + B.z) / 2);
    m.rotation.y = -Math.atan2(dz, dx);
    group.add(m);
  };

  // Required: penalty "buttons" as thin black lines.
  for (const s of COURSE.penaltyLines) line(s, 0x0e0e10, 0.16);

  // Red stop-line strips at the traffic-light fail lines.
  for (const e of COURSE.lightLines) line(e, 0xd83030, 0.5);

  // One shared signal drives all four lights (kept in sync).
  const signal = makeSignal();
  const lights = [];
  for (const def of TRAFFIC_LIGHTS) {
    const tl = buildTrafficLight();
    const w = px2world(def.px, def.py);
    tl.group.position.set(w.x, 0, w.z);
    tl.group.rotation.y = FACE[def.face];
    group.add(tl.group);
    lights.push(tl);
  }

  // Every light-line reads the same synced signal.
  const signals = {};
  for (const e of COURSE.lightLines) signals[e.id] = signal;

  if (debug) {
    for (const s of COURSE.signalLines) line(s, s.dir === 'left' ? 0x2f7fd0 : 0xffa53b, 0.4);
    for (const s of COURSE.stopLines) line(s, 0xf0f0f2, 0.5);
    for (const p of COURSE.parkings) { line(p.trigger, 0xffd166, 0.4); line(p.target, 0xff7b2b, 0.4); }
    line(COURSE.finishLine, 0x3cd070, 0.6);
  }

  function update(dt) {
    // Advance the shared signal and mirror it onto every light.
    signal.update(dt);
    for (const l of lights) l.setState(signal.signal);
  }

  return { group, signals, update };
}
