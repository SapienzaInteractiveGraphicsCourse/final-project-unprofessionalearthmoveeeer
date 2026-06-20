// The exam ground is simply the autodrome image laid flat on a plane.
// Nothing else is placed on it (no procedural cones/curbs/props) — the map is
// just the PNG. Exam elements will be rebuilt later, aligned to the real image.

import * as THREE from 'three';
import { AUTO_W, AUTO_H, LAYOUT } from './autodromeMap.js';

export { AUTO_W, AUTO_H } from './autodromeMap.js';

// Drop your autodrome image here (PNG or JPG).
const MAP_IMAGE = 'assets/textures/autodrome.png';

export function buildExamGround(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Ground map: starts neutral grey, swaps in the image once it loads.
  // Oriented so the image top = north (−Z) and right = east (+X).
  const mapMat = new THREE.MeshStandardMaterial({ color: 0x70747a, roughness: 0.97, metalness: 0.0 });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(AUTO_W, AUTO_H), mapMat);
  map.rotation.x = -Math.PI / 2;
  map.position.y = 0.02;
  map.receiveShadow = true;
  group.add(map);

  new THREE.TextureLoader().load(
    MAP_IMAGE,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      mapMat.map = tex;
      mapMat.color.set(0xffffff);
      mapMat.needsUpdate = true;
    },
    undefined,
    () => console.warn(`[examGround] map image not found at ${MAP_IMAGE} — using grey ground.`)
  );

  return { group, map, start: LAYOUT.start };
}
