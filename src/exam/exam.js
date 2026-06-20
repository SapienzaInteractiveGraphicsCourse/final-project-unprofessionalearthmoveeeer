// Image-aligned exam logic. Rules are defined against pixel positions on the map
// PNG (converted to world via mapCoords). This starts minimal and grows as more
// exercises are placed on the real image.
//
// Defined so far:
//   • Start line — a white line at image x=820. Crossing it (heading west) with
//     no turn signal on → 5-point penalty.

import * as THREE from 'three';
import { Scoring } from './scoring.js';
import { pxX } from '../world/mapCoords.js';

export class Exam {
  constructor(vehicle, car) {
    this.vehicle = vehicle;
    this.car = car;
    this.scoring = new Scoring();
    this._front = new THREE.Vector3();

    // --- element positions (image pixels → world) ---
    this.startLineX = pxX(820);     // white start line
    // The "crossover" zone (image x 550 → 210) is recorded but has no rule yet.
    this.crossoverX1 = pxX(550);
    this.crossoverX0 = pxX(210);

    this.reset();
  }

  reset() {
    this.scoring.reset();
    this.crossedStartLine = false;
    this.prevFx = null;
  }

  /** Front-axle world X (the car drives along −X from START). */
  _frontX() {
    this._front.set(1.45, 0, 0);
    this.car.group.localToWorld(this._front);
    return this._front.x;
  }

  update() {
    if (this.scoring.isOver) return;
    const fx = this._frontX();

    // Start line: crossing it westbound requires a turn signal to be on.
    if (!this.crossedStartLine && this.prevFx != null &&
        this.prevFx > this.startLineX && fx <= this.startLineX) {
      this.crossedStartLine = true;
      if (this.car.indicator === 'off') {
        this.scoring.penalize('Start', 'No turn signal crossing the start line', 5);
      }
    }

    this.prevFx = fx;
  }
}
