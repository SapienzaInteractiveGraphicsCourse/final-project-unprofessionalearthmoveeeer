// Traffic lights for the controlled-intersection exercise.
//
// The signal cycle is separated from the visual model so that several lights can
// share ONE signal and stay perfectly synchronised: makeSignal() owns the
// green->yellow->red timing, and each buildTrafficLight() is just a model whose
// displayed colour is set externally with setState().

import * as THREE from 'three';

const CYCLE = [
  ['green', 7],
  ['yellow', 2.5],
  ['red', 7],
];

/** A standalone signal cycle. Share one instance to keep lights in sync. */
export function makeSignal() {
  let t = 0, i = 0, state = CYCLE[0][0];
  return {
    get signal() { return state; },
    get restrictive() { return state === 'red' || state === 'yellow'; },
    update(dt) {
      t += dt;
      while (t >= CYCLE[i][1]) { t -= CYCLE[i][1]; i = (i + 1) % CYCLE.length; }
      state = CYCLE[i][0];
    },
  };
}

/**
 * A traffic-light model (post + housing + three lamps). The lamps face local
 * +Z, so rotate the returned group about Y to aim it. The shown colour is driven
 * externally with setState() (so a group of lights can share one signal).
 */
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

  const lampMat = (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.4 });
  const lamps = { red: lampMat(0xff2222), yellow: lampMat(0xffcc22), green: lampMat(0x22dd44) };

  const lampGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
  lampGeo.rotateX(Math.PI / 2); // disc faces +Z
  [lamps.red, lamps.yellow, lamps.green].forEach((mat, i) => {
    const lamp = new THREE.Mesh(lampGeo, mat);
    lamp.position.set(0, 3.4 + 0.45 - i * 0.45, 0.24); // red top -> green bottom, +Z face
    group.add(lamp);
  });

  function setState(name) {
    for (const [n, mat] of Object.entries(lamps)) mat.emissiveIntensity = n === name ? 1.4 : 0.12;
  }
  setState('green');

  return { group, setState };
}
