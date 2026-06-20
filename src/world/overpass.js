// The overpass / hill-start element ("estakada"). Placed from image pixels:
// it spans image x = 550 (east, where the west-bound car arrives) to x = 210
// (west), and image y = 30 .. 95 across the road. The car rides up a ramp, over
// a flat crest (STOP line + STOP sign), and down the far side.

import * as THREE from 'three';
import { pxX, pxZ } from './mapCoords.js';

const EAST = pxX(550);   // up-ramp bottom (car arrives here first, driving −X)
const WEST = pxX(210);   // down-ramp bottom
const RAMP = 11;         // ramp run (m)
const Z0 = pxZ(30);      // north edge of the deck (image y = 30)
const Z1 = pxZ(95);      // south edge of the deck (image y = 95)

export const OVERPASS = {
  xA: EAST, xB: EAST - RAMP, xC: WEST + RAMP, xD: WEST,
  H: 2.0,                       // crest height
  z0: Z0, z1: Z1,
  stopX: EAST - RAMP,           // crest entry — where the west-bound car stops
};

export function buildOverpass(scene) {
  const { xA, xB, xC, xD, H, z0, z1, stopX } = OVERPASS;
  const group = new THREE.Group();
  scene.add(group);

  // Bridge body: extrude the side profile across the road width (no parapets).
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

  // STOP line painted across the crest entry.
  const stop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, z1 - z0 - 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f2, roughness: 0.9 })
  );
  stop.position.set(stopX, H + 0.03, (z0 + z1) / 2);
  group.add(stop);

  // STOP sign on the RIGHT edge (z0 side = driver's right when heading west).
  group.add(makeStopSign(stopX, z0 - 0.2, H));

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

  // Red octagon facing the approaching (east-bound view) driver: normal ±X.
  const signGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 8);
  signGeo.rotateZ(Math.PI / 2);
  signGeo.rotateX(Math.PI / 8);
  const sign = new THREE.Mesh(
    signGeo,
    new THREE.MeshStandardMaterial({ color: 0xcc1f1f, emissive: 0x3a0000, roughness: 0.5 })
  );
  sign.position.set(0, baseY + 2.0, 0);
  sign.castShadow = true;
  g.add(sign);

  // "STOP" text plate on the +X face (toward the oncoming car).
  const tex = makeStopTexture();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.82),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  plate.position.set(0.05, baseY + 2.0, 0);
  plate.rotation.y = Math.PI / 2; // face +X
  g.add(plate);

  return g;
}

function makeStopTexture() {
  const s = 256;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  // red octagon
  ctx.fillStyle = '#cc1f1f';
  ctx.beginPath();
  const r = s * 0.48, cx = s / 2, cy = s / 2;
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * Math.PI / 4;
    const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = s * 0.05; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${s * 0.26}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('STOP', cx, cy);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
