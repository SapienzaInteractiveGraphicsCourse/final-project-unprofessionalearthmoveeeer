// The overpass / hill-start element ("estakada"), placed on the start road.
// Positioned from image pixels: it spans image x = 550 (east, where the
// west-bound car arrives) to x = 210 (west). The car rides up a ramp, over a
// flat crest (STOP line + STOP sign), and down the far side.
//
// Only X was given, so the road row is taken as the start row (image y ≈ 45).

import * as THREE from 'three';
import { pxX, pxZ } from './mapCoords.js';

const EAST = pxX(550);   // up-ramp bottom (car arrives here first, driving −X)
const WEST = pxX(210);   // down-ramp bottom
const RAMP = 11;         // ramp run (m)
const ZC = pxZ(45);      // road centre row (= START row)
const HALFW = 4.2;       // road half-width

export const OVERPASS = {
  xA: EAST, xB: EAST - RAMP, xC: WEST + RAMP, xD: WEST,
  H: 2.0,                       // crest height
  z0: ZC - HALFW, z1: ZC + HALFW,
  stopX: EAST - RAMP,           // crest entry — where the west-bound car stops
};

export function buildOverpass(scene) {
  const { xA, xB, xC, xD, H, z0, z1, stopX } = OVERPASS;
  const group = new THREE.Group();
  scene.add(group);

  // Bridge body: extrude the side profile across the road width.
  const shape = new THREE.Shape();
  shape.moveTo(xA, 0);
  shape.lineTo(xB, H);
  shape.lineTo(xC, H);
  shape.lineTo(xD, 0);
  shape.lineTo(xA, 0);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
  geo.translate(0, 0, z0);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, roughness: 0.85 });
  const bridge = new THREE.Mesh(geo, concrete);
  bridge.castShadow = true; bridge.receiveShadow = true;
  group.add(bridge);

  // Side parapets along both deck edges.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d9dc, roughness: 0.8 });
  for (const z of [z0 + 0.15, z1 - 0.15]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(xA - xD, 0.35, 0.2), wallMat);
    w.position.set((xA + xD) / 2, H + 0.18, z);
    w.castShadow = true;
    group.add(w);
  }

  // STOP line painted across the crest entry.
  const stop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, z1 - z0 - 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f2, roughness: 0.9 })
  );
  stop.position.set(stopX, H + 0.03, (z0 + z1) / 2);
  group.add(stop);

  // STOP sign beside the crest.
  group.add(makeStopSign(stopX + 0.2, z1 + 0.4, H));

  // Deck height at (x, z); 0 elsewhere.
  function heightAt(x, z) {
    if (z < z0 || z > z1 || x > xA || x < xD) return 0;
    if (x >= xB) return H * (xA - x) / (xA - xB); // up ramp
    if (x <= xC) return H * (x - xD) / (xC - xD); // down ramp
    return H;                                     // crest
  }

  return { group, heightAt, stopX, crestY: H };
}

function makeStopSign(x, z, baseY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, baseY + 2.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x9298a1, metalness: 0.6, roughness: 0.5 })
  );
  post.position.y = (baseY + 2.2) / 2;
  post.castShadow = true;
  g.add(post);

  const signGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8);
  signGeo.rotateZ(Math.PI / 2);
  signGeo.rotateX(Math.PI / 8);
  const sign = new THREE.Mesh(
    signGeo,
    new THREE.MeshStandardMaterial({ color: 0xcc1f1f, emissive: 0x3a0000, roughness: 0.5 })
  );
  sign.position.set(0, baseY + 2.0, 0);
  sign.castShadow = true;
  g.add(sign);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.6 })
  );
  bar.position.set(0.32, baseY + 2.0, 0);
  g.add(bar);

  return g;
}
