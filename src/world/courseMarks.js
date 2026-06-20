// Renders the course markings on the ground and builds the traffic lights for
// the light-lines. Returns the traffic-signal controllers (read by the exam) and
// an update() to cycle them.
//
// By default only the required black penalty lines and the traffic lights are
// shown (the map PNG already has its own paint). Pass { debug: true } to also
// draw the invisible rule lines (signal/stop/light/parking/finish) for checking.

import * as THREE from 'three';
import { px2world } from './mapCoords.js';
import { buildTrafficLight } from './trafficLight.js';
import { COURSE } from '../exam/course.js';

export function buildCourseMarks(scene, { debug = false } = {}) {
  const group = new THREE.Group();
  scene.add(group);
  const lights = [];
  const signals = {};

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
    return { A, B };
  };

  // Required: penalty "buttons" as thin black lines.
  for (const s of COURSE.penaltyLines) line(s, 0x0e0e10, 0.16);

  // Traffic lights at each light-line (+ a red stop line so it's visible).
  for (const e of COURSE.lightLines) {
    const { A, B } = line(e, 0xd83030, 0.5);
    const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len; // perpendicular
    const tl = buildTrafficLight();
    tl.group.position.set((A.x + B.x) / 2 + nx * 2.5, 0, (A.z + B.z) / 2 + nz * 2.5);
    tl.group.rotation.y = Math.atan2(-(nz), nx); // face back toward the line
    for (let i = 0, n = (Math.random() * 160) | 0; i < n; i++) tl.update(0.1); // desync
    scene.add(tl.group);
    lights.push(tl);
    signals[e.id] = tl;
  }

  // Debug guide lines (off by default).
  if (debug) {
    for (const s of COURSE.signalLines) line(s, s.dir === 'left' ? 0x2f7fd0 : 0xffa53b, 0.4);
    for (const s of COURSE.stopLines) line(s, 0xf0f0f2, 0.5);
    for (const p of COURSE.parkings) { line(p.trigger, 0xffd166, 0.4); line(p.target, 0xff7b2b, 0.4); }
    line(COURSE.finishLine, 0x3cd070, 0.6);
  }

  function update(dt) { for (const tl of lights) tl.update(dt); }
  return { group, signals, update };
}
