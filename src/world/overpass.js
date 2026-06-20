// A small overpass / flyover (the "estakada" hill-start element), placed on the
// top road just after the START line. The car rides up a ramp, over a flat
// crest (with a painted STOP line and a STOP sign), and down the far side.
//
// The car drives west (−X) from START. Geometry (world X, metres):
//   up ramp  : x −1 → −4   (ground → crest height H)
//   crest    : x −4 → −7   (flat, height H)
//   down ramp: x −7 → −10  (crest → ground)
// It spans the road width in Z. heightAt()/the slope let the vehicle ride it.

import * as THREE from 'three';

export const OVERPASS = {
  xA: -1, xB: -4, xC: -7, xD: -10, // ramp break points (east→west)
  H: 1.25,                          // crest height
  z0: -38.5, z1: -28.5,             // Z span (covers the top road)
  stopX: -4,                        // STOP line at the crest entry
};

export function buildOverpass(scene) {
  const { xA, xB, xC, xD, H, z0, z1, stopX } = OVERPASS;
  const group = new THREE.Group();
  scene.add(group);

  // --- Bridge body: extrude the side profile across the road width ---------
  const shape = new THREE.Shape();
  shape.moveTo(xA, 0);
  shape.lineTo(xB, H);
  shape.lineTo(xC, H);
  shape.lineTo(xD, 0);
  shape.lineTo(xA, 0);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
  geo.translate(0, 0, z0); // extrude runs +Z from z0
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, roughness: 0.85, metalness: 0.0 });
  const bridge = new THREE.Mesh(geo, concrete);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  group.add(bridge);

  // Side parapets (low walls) along both edges of the deck.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d9dc, roughness: 0.8 });
  for (const z of [z0 + 0.15, z1 - 0.15]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(xA - xD, 0.35, 0.2), wallMat);
    w.position.set((xA + xD) / 2, H + 0.18, z);
    w.castShadow = true;
    group.add(w);
  }

  // --- STOP line painted across the crest ---------------------------------
  const stop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, z1 - z0 - 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f2, roughness: 0.9 })
  );
  stop.position.set(stopX, H + 0.03, (z0 + z1) / 2);
  group.add(stop);

  // --- STOP sign beside the crest (right of a west-bound driver = +Z) ------
  group.add(makeStopSign(stopX + 0.2, z1 + 0.4, H));

  // Height of the deck surface at (x, z); 0 elsewhere.
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

  // Octagonal red sign facing the oncoming (west-bound) driver: normal along +X.
  const signGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8);
  signGeo.rotateZ(Math.PI / 2);  // axis along X → faces ±X
  signGeo.rotateX(Math.PI / 8);  // align a flat edge to the top
  const sign = new THREE.Mesh(
    signGeo,
    new THREE.MeshStandardMaterial({ color: 0xcc1f1f, emissive: 0x3a0000, roughness: 0.5 })
  );
  sign.position.set(0, baseY + 2.0, 0);
  sign.castShadow = true;
  g.add(sign);

  // White "STOP" bar.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.6 })
  );
  bar.position.set(0.32, baseY + 2.0, 0);
  g.add(bar);

  return g;
}
