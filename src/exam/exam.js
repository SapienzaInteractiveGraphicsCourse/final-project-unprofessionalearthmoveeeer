// Image-aligned exam logic. Rules are defined against pixel positions on the map
// PNG (converted to world via mapCoords). Grows as more exercises are placed.
//
// Defined so far:
//   • Start line — white line at image x=820. Crossing it (heading west) without
//     the LEFT turn signal on → 5-point penalty.
//   • Hill start (estakada) — overpass at image x 550→210: rolling back > 30 cm
//     → 25; stopping > 0.5 m before / past the STOP line, or not stopping → 25.

import * as THREE from 'three';
import { Scoring } from './scoring.js';
import { pxX } from '../world/mapCoords.js';
import { OVERPASS } from '../world/overpass.js';

export class Exam {
  constructor(vehicle, car) {
    this.vehicle = vehicle;
    this.car = car;
    this.scoring = new Scoring();
    this._front = new THREE.Vector3();
    this.startLineX = pxX(820); // white start line
    this.reset();
  }

  reset() {
    this.scoring.reset();
    this.crossedStartLine = false;
    this.prevFx = null;
    this.hillStopJudged = false;
    this.hillRollbackPenalized = false;
    this.hillMinFx = Infinity;
    this.hillStopTimer = 0;
  }

  update(dt) {
    if (this.scoring.isOver) return;
    const sc = this.scoring, v = this.vehicle;

    // Front-axle world position (car drives along −X from START).
    this._front.set(1.45, 0, 0);
    this.car.group.localToWorld(this._front);
    const fx = this._front.x, fz = this._front.z;

    // --- Start line: crossing it westbound requires the LEFT signal ------
    if (!this.crossedStartLine && this.prevFx != null &&
        this.prevFx > this.startLineX && fx <= this.startLineX) {
      this.crossedStartLine = true;
      if (this.car.indicator !== 'left') {
        sc.penalize('Start', 'No left turn signal at the start line', 5);
      }
    }

    // --- Hill start (overpass) ------------------------------------------
    const O = OVERPASS;
    const onRamp = fx <= O.xA && fx >= O.xD && fz >= O.z0 && fz <= O.z1;
    if (onRamp) {
      this.hillMinFx = Math.min(this.hillMinFx, fx);
      // Rolling back (east) more than 30 cm from the furthest-forward point.
      if (!this.hillRollbackPenalized && fx - this.hillMinFx > 0.30) {
        sc.penalize('Hill start', 'Rolled back > 30 cm', 25);
        this.hillRollbackPenalized = true;
      }
      // A sustained stop on the ramp: judge its position vs the STOP line.
      if (!this.hillStopJudged) {
        if (Math.abs(v.speed) < 0.25) {
          this.hillStopTimer += dt;
          if (this.hillStopTimer > 0.4) {
            this.hillStopJudged = true;
            const d = fx - O.stopX; // >0 short of line, <0 past line
            if (d > 0.5) sc.penalize('Hill start', 'Stopped > 0.5 m before the STOP line', 25);
            else if (d < -0.5) sc.penalize('Hill start', 'Stopped past the STOP line', 25);
          }
        } else {
          this.hillStopTimer = 0;
        }
      }
    }
    // Crossed the STOP line while still moving (never stopped for it).
    if (!this.hillStopJudged && Math.abs(v.speed) > 0.4 && this.prevFx != null &&
        this.prevFx > O.stopX && fx <= O.stopX && fz >= O.z0 && fz <= O.z1) {
      this.hillStopJudged = true;
      sc.penalize('Hill start', 'Did not stop at the STOP line', 25);
    }

    this.prevFx = fx;
  }
}
