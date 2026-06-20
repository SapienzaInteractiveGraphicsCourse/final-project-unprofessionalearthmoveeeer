// Camera manager: cycles between several viewpoints that follow the car.
//   chase   - third-person, behind and above (default)
//   cockpit - driver's seat, looking forward through the windshield
//   top     - top-down map view, good for parking maneuvers
//   orbit   - free OrbitControls camera (drag/zoom) centred on the car
//
// Car-local forward is +X (see car.js). Offsets below are in car-local space
// and converted to world space each frame via localToWorld.

import * as THREE from 'three';

const MODES = ['fixed', 'cockpit', 'top', 'orbit'];

// Local-space rig points per mode: where the camera sits and what it looks at.
// `fixed` is rigidly bolted to the car (lerp 1 = no smoothing): it translates and
// rotates exactly with the car rather than chasing it.
const RIG = {
  fixed:   { pos: new THREE.Vector3(-7.5, 3.6, 0), look: new THREE.Vector3(5, 1.2, 0), lerp: 1.0 },
  cockpit: { pos: new THREE.Vector3(0.2, 1.62, 0.38), look: new THREE.Vector3(8, 1.4, 0.38), lerp: 1.0 },
  top:     { pos: new THREE.Vector3(0, 22, 0.001), look: new THREE.Vector3(0, 0, 0), lerp: 0.1 },
};

export class CameraManager {
  constructor(camera, controls, car) {
    this.camera = camera;
    this.controls = controls; // OrbitControls
    this.car = car;           // THREE.Object3D (root)
    this.mode = 'fixed';

    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._target = new THREE.Vector3();

    this._applyMode();
  }

  next() {
    const i = MODES.indexOf(this.mode);
    this.mode = MODES[(i + 1) % MODES.length];
    this._applyMode();
    return this.mode;
  }

  _applyMode() {
    // OrbitControls only active in 'orbit' mode.
    this.controls.enabled = this.mode === 'orbit';
  }

  update() {
    this.car.updateMatrixWorld(); // use the car's current pose this frame

    if (this.mode === 'orbit') {
      // Keep the orbit pivot on the car so it stays framed while it drives.
      this.car.getWorldPosition(this._target);
      this._target.y += 1;
      this.controls.target.lerp(this._target, 0.1);
      this.controls.update();
      return;
    }

    const rig = RIG[this.mode];

    // Desired camera position & look-at in world space.
    this._pos.copy(rig.pos);
    this.car.localToWorld(this._pos);
    this._look.copy(rig.look);
    this.car.localToWorld(this._look);

    // Smooth follow (snappier in cockpit so it feels locked to the car).
    this.camera.position.lerp(this._pos, rig.lerp);
    this._target.lerp(this._look, rig.lerp);
    this.camera.lookAt(this._target);
  }
}
