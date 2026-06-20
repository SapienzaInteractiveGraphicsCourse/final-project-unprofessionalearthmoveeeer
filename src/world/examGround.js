// The Astana practical-exam pad: a marked asphalt area plus knock-over cones
// arranged as a slalom ("snake") — the maneuver the driver is scored on.

import * as THREE from 'three';
import { makeExamPadTexture } from './textures.js';

export const PAD_W = 40; // along X
export const PAD_H = 22; // along Z

export function buildExamGround(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // --- Marked pad --------------------------------------------------------
  const padTex = makeExamPadTexture(PAD_W, PAD_H);
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(PAD_W, PAD_H),
    new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.92, metalness: 0.0 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  pad.receiveShadow = true;
  group.add(pad);

  // Low curb border around the pad.
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.8 });
  for (const [w, h, x, z] of [
    [PAD_W + 0.6, 0.4, 0, -PAD_H / 2 - 0.2],
    [PAD_W + 0.6, 0.4, 0, PAD_H / 2 + 0.2],
    [0.4, PAD_H + 0.4, -PAD_W / 2 - 0.2, 0],
    [0.4, PAD_H + 0.4, PAD_W / 2 + 0.2, 0],
  ]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, h), curbMat);
    curb.position.set(x, 0.09, z);
    curb.receiveShadow = true;
    curb.castShadow = true;
    group.add(curb);
  }

  // --- Cones -------------------------------------------------------------
  // Slalom line down the centre + a pair marking the parking-box entrance.
  const cones = [];
  const slalomX = [-12, -8, -4, 0, 4, 8, 12];
  for (const x of slalomX) cones.push(makeCone(group, x, 0));
  cones.push(makeCone(group, 0.75, 5.5));  // parking box opening
  cones.push(makeCone(group, 7.25, 5.5));

  // --- API ---------------------------------------------------------------
  /**
   * Knock over any standing cone whose base is within `radius` of `point`.
   * Returns how many were newly knocked (for penalty scoring).
   */
  function hitTest(point, radius) {
    let newly = 0;
    for (const c of cones) {
      if (c.knocked) continue;
      const dx = c.group.position.x - point.x;
      const dz = c.group.position.z - point.z;
      if (dx * dx + dz * dz < radius * radius) {
        const dir = new THREE.Vector3(-dx, 0, -dz).normalize(); // push away from car
        c.knock(dir);
        newly++;
      }
    }
    return newly;
  }

  function update(dt) {
    for (const c of cones) c.update(dt);
  }

  function reset() {
    for (const c of cones) c.standUp();
  }

  return { group, pad, cones, hitTest, update, reset };
}

// A single traffic cone that can tip over and stand back up — animated by hand.
function makeCone(parent, x, z) {
  const CONE_H = 0.7;
  const group = new THREE.Group();
  group.position.set(x, 0, z); // origin at base so it tips about its foot

  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, CONE_H, 18),
    new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.6 })
  );
  body.geometry.translate(0, CONE_H / 2, 0); // base at y=0
  body.castShadow = true;
  group.add(body);

  // Reflective white band.
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
      // Fall axis = horizontal, perpendicular to the push direction.
      axis.set(-dir.z, 0, dir.x).normalize();
      target = Math.PI / 2 + 0.08;
    },
    standUp() {
      this.knocked = false;
      target = 0;
    },
    update(dt) {
      const k = Math.min(1, dt * (this.knocked ? 9 : 5));
      angle += (target - angle) * k;
      if (angle < 0.0005) { group.quaternion.identity(); return; }
      group.quaternion.setFromAxisAngle(axis, angle);
    },
  };
}
