// Kinematic driving model (a "bicycle model") that turns keyboard input into
// car motion. No physics engine — speed, heading and position are integrated
// by hand, then pushed to the car's scene-graph node and wheels.

import * as THREE from 'three';
import { MAX_STEER } from './world/car.js';

const WHEELBASE = 2.9;       // distance between axles (m)
const MAX_FWD = 15;          // m/s  (~54 km/h)
const MAX_REV = -5;          // m/s
const ENGINE_ACCEL = 9;      // m/s²
const BRAKE_DECEL = 20;      // m/s²
const ROLL_FRICTION = 3.2;   // m/s² coasting deceleration
const STEER_SPEED = 3.0;     // how fast the steering angle eases to target
const SLOPE_G = 10;          // along-slope gravity on ramps (hill-start feel)

export class Vehicle {
  constructor(car, start = { x: 0, z: 0, heading: 0 }, terrain = null) {
    this.car = car;
    this.start = start;
    this.terrain = terrain;   // optional { heightAt(x,z) } for the overpass
    this.x = start.x;
    this.z = start.z;
    this.heading = start.heading; // yaw, radians
    this.speed = 0;               // signed m/s
    this.steer = 0;               // current steering angle (radians)
    this.braking = false;
    this.accel = 0;               // signed m/s² this frame (for abrupt-braking rule)
    this.justStalled = false;     // true for the single frame the engine stalls
    this.hasMoved = false;        // ever exceeded the move threshold
    this.handbrake = false;       // full-stop hold (toggled with Space)
    this._stallLatch = false;
    this._dir = new THREE.Vector3();
  }

  reset() {
    this.x = this.start.x; this.z = this.start.z; this.heading = this.start.heading;
    this.speed = 0; this.steer = 0; this.accel = 0;
    this.justStalled = false; this.hasMoved = false; this._stallLatch = false;
    this.handbrake = false;
    this.car.reset();
  }

  get speedKmh() { return Math.abs(this.speed) * 3.6; }
  get gear() { return this.speed < -0.2 ? 'R' : 'D'; }

  /**
   * @param dt          seconds
   * @param throttle    +1 forward, -1 brake/reverse, 0 coast
   * @param steerIn     -1..+1 (left/right)
   * @param bothPedals  throttle and brake pressed together (causes a stall)
   */
  update(dt, throttle, steerIn, bothPedals = false) {
    const prevSpeed = this.speed;
    this.justStalled = false;

    // --- Handbrake: full stop, held until released ------------------------
    if (this.handbrake) {
      this.speed = 0;
      throttle = 0;
      bothPedals = false;
    }

    // --- Engine stall: throttle + brake together near standstill ----------
    if (bothPedals && Math.abs(this.speed) < 1.5) {
      if (!this._stallLatch) { this.justStalled = true; this._stallLatch = true; }
      this.speed = 0;
      throttle = 0;
    } else if (!bothPedals) {
      this._stallLatch = false;
    }

    // --- Longitudinal ----------------------------------------------------
    this.braking = false;
    if (throttle > 0) {
      this.speed += ENGINE_ACCEL * dt;
    } else if (throttle < 0) {
      if (this.speed > 0.1) {
        this.speed -= BRAKE_DECEL * dt; // braking
        this.braking = true;
      } else {
        this.speed -= ENGINE_ACCEL * 0.6 * dt; // reverse
      }
    } else {
      // Coast: friction pulls speed toward zero.
      const f = ROLL_FRICTION * dt;
      this.speed += this.speed > 0 ? -Math.min(f, this.speed) : Math.min(f, -this.speed);
    }
    this.speed = THREE.MathUtils.clamp(this.speed, MAX_REV, MAX_FWD);
    this.accel = (this.speed - prevSpeed) / Math.max(dt, 1e-3);
    if (Math.abs(this.speed) > 0.4) this.hasMoved = true;

    // --- Steering (eased; tighter lock at low speed) ---------------------
    const speedFactor = 1 - 0.45 * Math.min(1, Math.abs(this.speed) / MAX_FWD);
    const targetSteer = steerIn * MAX_STEER * speedFactor;
    this.steer += (targetSteer - this.steer) * Math.min(1, STEER_SPEED * dt);

    // --- Integrate pose (bicycle model) ----------------------------------
    if (Math.abs(this.speed) > 1e-3) {
      this.heading += (this.speed / WHEELBASE) * Math.tan(this.steer) * dt;
    }
    // Car-local forward +X under yaw → world (cos h, 0, -sin h).
    this._dir.set(Math.cos(this.heading), 0, -Math.sin(this.heading));
    const dist = this.speed * dt;
    this.x += this._dir.x * dist;
    this.z += this._dir.z * dist;

    // --- Terrain (overpass): elevation, pitch and along-slope gravity ----
    let y = 0, pitch = 0;
    if (this.terrain) {
      y = this.terrain.heightAt(this.x, this.z);
      const e = 0.7;
      const hf = this.terrain.heightAt(this.x + this._dir.x * e, this.z + this._dir.z * e);
      const hb = this.terrain.heightAt(this.x - this._dir.x * e, this.z - this._dir.z * e);
      pitch = Math.atan2(hf - hb, 2 * e);          // nose up on an uphill
      this.speed += -SLOPE_G * Math.sin(pitch) * dt; // gravity pulls downhill
      this.speed = THREE.MathUtils.clamp(this.speed, MAX_REV, MAX_FWD);
    }

    // --- Push to the car node + animated parts ---------------------------
    this.car.group.position.set(this.x, y, this.z);
    this.car.setPose(this.heading, pitch);
    this.car.setSteering(this.steer);
    this.car.addRoll(dist);
    this.car.setBrake(this.braking || this.handbrake || this.speed < -0.15);
  }
}
