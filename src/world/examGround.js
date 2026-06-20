// The Astana practical-exam autodrome: the painted top-down map (autodromeMap.js)
// plus the 3D props placed on it — slalom/serpentine cones the driver weaves
// through, a perimeter curb, and a couple of static parked cars for context.

import * as THREE from 'three';
import { AUTO_W, AUTO_H, LAYOUT } from './autodromeMap.js';

export { AUTO_W, AUTO_H } from './autodromeMap.js';

// Drop your autodrome image here (PNG or JPG). It is laid flat on the ground.
const MAP_IMAGE = 'assets/textures/autodrome.png';

export function buildExamGround(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // --- Ground map: the autodrome image laid flat -------------------------
  // Starts as neutral grey, then swaps in the PNG once it loads. Image is
  // oriented so its top = north (−Z) and right = east (+X) — i.e. START at the
  // top, parking on the right, matching the reference photo.
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

  // --- Perimeter curb ----------------------------------------------------
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e8, roughness: 0.8 });
  const hw = AUTO_W / 2, hh = AUTO_H / 2;
  for (const [w, h, x, z] of [
    [AUTO_W + 1.2, 0.5, 0, -hh - 0.5],
    [AUTO_W + 1.2, 0.5, 0, hh + 0.5],
    [0.5, AUTO_H + 1.2, -hw - 0.5, 0],
    [0.5, AUTO_H + 1.2, hw + 0.5, 0],
  ]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, h), curbMat);
    curb.position.set(x, 0.15, z);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  }

  // --- Cones (slalom + serpentine) ---------------------------------------
  const cones = [];
  for (const p of LAYOUT.slalomCones) cones.push(makeCone(group, p.x, p.z));
  for (const p of LAYOUT.serpentineCones) cones.push(makeCone(group, p.x, p.z));
  // A few cones framing the parallel-parking box.
  const pb = LAYOUT.parallelBox;
  cones.push(makeCone(group, pb.cx - pb.w / 2 - 0.4, pb.cz));
  cones.push(makeCone(group, pb.cx + pb.w / 2 + 0.4, pb.cz));

  // --- Static parked cars (scenery) --------------------------------------
  for (const pc of LAYOUT.parkedCars) addParkedCar(group, pc);

  // --- API ---------------------------------------------------------------
  function hitTest(point, radius) {
    let newly = 0;
    for (const c of cones) {
      if (c.knocked) continue;
      const dx = c.group.position.x - point.x;
      const dz = c.group.position.z - point.z;
      if (dx * dx + dz * dz < radius * radius) {
        c.knock(new THREE.Vector3(-dx, 0, -dz).normalize());
        newly++;
      }
    }
    return newly;
  }
  function update(dt) { for (const c of cones) c.update(dt); }
  function reset() { for (const c of cones) c.standUp(); }

  return { group, map, cones, hitTest, update, reset, start: LAYOUT.start };
}

// --- a knock-over traffic cone -------------------------------------------
function makeCone(parent, x, z) {
  const CONE_H = 0.7;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, CONE_H, 18),
    new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.6 })
  );
  body.geometry.translate(0, CONE_H / 2, 0);
  body.castShadow = true;
  group.add(body);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.19, 0.12, 18),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.5 })
  );
  band.position.y = CONE_H * 0.45;
  group.add(band);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.05, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xcf5a10, roughness: 0.7 })
  );
  base.position.y = 0.025;
  base.castShadow = true;
  group.add(base);

  parent.add(group);

  const axis = new THREE.Vector3(1, 0, 0);
  let angle = 0;
  let target = 0;

  return {
    group,
    knocked: false,
    knock(dir) {
      if (this.knocked) return;
      this.knocked = true;
      axis.set(-dir.z, 0, dir.x).normalize();
      target = Math.PI / 2 + 0.08;
    },
    standUp() { this.knocked = false; target = 0; },
    update(dt) {
      const k = Math.min(1, dt * (this.knocked ? 9 : 5));
      angle += (target - angle) * k;
      if (angle < 0.0005) { group.quaternion.identity(); return; }
      group.quaternion.setFromAxisAngle(axis, angle);
    },
  };
}

// --- simple static car (scenery only) ------------------------------------
function addParkedCar(parent, { x, z, ry = 0, color = 0x3366aa }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;

  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.7, 1.7), paint);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.3 }));
  cabin.position.set(-0.2, 1.3, 0); cabin.castShadow = true; g.add(cabin);

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.9 });
  for (const [wx, wz] of [[1.3, 0.8], [1.3, -0.8], [-1.3, 0.8], [-1.3, -0.8]]) {
    const wgeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
    wgeo.rotateX(Math.PI / 2);
    const w = new THREE.Mesh(wgeo, tireMat);
    w.position.set(wx, 0.38, wz); g.add(w);
  }
  parent.add(g);
  return g;
}
