// A traffic light for the controlled-intersection exercise.
// Hierarchical model (post → housing → three lamps) with a green→yellow→red
// cycle. The active lamp glows; `signal` exposes the current state.

import * as THREE from 'three';

const CYCLE = [
  { state: 'green', dur: 7 },
  { state: 'yellow', dur: 2.5 },
  { state: 'red', dur: 7 },
];

export function buildTrafficLight() {
  const group = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.5 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 12), metal);
  post.position.y = 1.6;
  post.castShadow = true;
  group.add(post);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.45), metal);
  housing.position.set(0, 3.4, 0);
  housing.castShadow = true;
  group.add(housing);

  const lampMat = (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, roughness: 0.4 });
  const matRed = lampMat(0xff2222);
  const matYellow = lampMat(0xffcc22);
  const matGreen = lampMat(0x22dd44);
  const lamps = { red: matRed, yellow: matYellow, green: matGreen };

  const lampGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
  lampGeo.rotateX(Math.PI / 2); // face +Z disc
  for (const [i, mat] of [matRed, matYellow, matGreen].entries()) {
    const lamp = new THREE.Mesh(lampGeo, mat);
    lamp.position.set(0, 3.4 + 0.45 - i * 0.45, 0.24); // red top → green bottom, on +Z face
    group.add(lamp);
  }

  let t = 0;
  let idx = 0;
  let signal = CYCLE[0].state;

  return {
    group,
    get signal() { return signal; },
    /** True while the signal forbids entering (red or yellow). */
    get restrictive() { return signal === 'red' || signal === 'yellow'; },
    update(dt) {
      t += dt;
      if (t >= CYCLE[idx].dur) { t = 0; idx = (idx + 1) % CYCLE.length; signal = CYCLE[idx].state; }
      for (const [name, mat] of Object.entries(lamps)) {
        mat.emissiveIntensity = name === signal ? 1.4 : 0.12;
      }
    },
  };
}
