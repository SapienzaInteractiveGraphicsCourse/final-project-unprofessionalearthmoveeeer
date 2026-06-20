// Lights and the surrounding ground for the Astana exam scene.
// The marked exam pad and cones live in examGround.js; the car in car.js.

import * as THREE from 'three';
import { makeAsphaltMaps } from './textures.js';

export function buildEnvironment(scene) {
  // --- Sky & fog ---------------------------------------------------------
  scene.background = new THREE.Color(0x8fb8db);
  scene.fog = new THREE.Fog(0x8fb8db, 80, 320);

  // --- Lights ------------------------------------------------------------
  // Hemisphere fill so shadowed faces keep some sky/ground colour.
  scene.add(new THREE.HemisphereLight(0xbcd6ef, 0x55503f, 0.7));

  // Sun: directional key light, casts the scene shadows.
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.3);
  sun.position.set(35, 50, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  const s = 40;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // --- Surrounding ground ------------------------------------------------
  const { map, normalMap, roughnessMap } = makeAsphaltMaps();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  return { sun, ground };
}
