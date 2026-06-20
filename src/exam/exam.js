// Generic, data-driven exam engine. Reads the course definition (course.js),
// converts pixel segments to world segments, and each frame applies:
//   • signal lines  — crossing requires the right indicator (else −5)
//   • light lines   — crossing on red/yellow → FAIL
//   • stop lines    — must full-stop ≥1 s before crossing (else −25)
//   • penalty lines — any wheel on the line → +20 (cooldown)
//   • parkings      — timed; required wheels stationary in the target → done, else FAIL
//   • finish line   — crossing ends the exam
// Plus the hill/estakada scoring (rollback / stop-at-line), tied to OVERPASS.

import * as THREE from 'three';
import { Scoring } from './scoring.js';
import { px2world } from '../world/mapCoords.js';
import { COURSE, POINTS } from './course.js';
import { OVERPASS } from '../world/overpass.js';

const HALF_WB = 1.45, HALF_TR = 0.82; // car wheel offsets (match car.js)
const WHEELS = {
  fl: [HALF_WB, 0, -HALF_TR], fr: [HALF_WB, 0, HALF_TR],
  rl: [-HALF_WB, 0, -HALF_TR], rr: [-HALF_WB, 0, HALF_TR],
};

// Pixel segment → world segment {ax,az,bx,bz}.
function seg(s) {
  const A = px2world(s.a[0], s.a[1]), B = px2world(s.b[0], s.b[1]);
  return { ax: A.x, az: A.z, bx: B.x, bz: B.z };
}
function sideOf(px, pz, L) { return Math.sign((L.bx - L.ax) * (pz - L.az) - (L.bz - L.az) * (px - L.ax)); }
function projT(px, pz, L) {
  const dx = L.bx - L.ax, dz = L.bz - L.az, len2 = dx * dx + dz * dz || 1e-6;
  return ((px - L.ax) * dx + (pz - L.az) * dz) / len2;
}
function distToSeg(px, pz, L) {
  const t = Math.max(0, Math.min(1, projT(px, pz, L)));
  const cx = L.ax + t * (L.bx - L.ax), cz = L.az + t * (L.bz - L.az);
  return Math.hypot(px - cx, pz - cz);
}

export class Exam {
  constructor(vehicle, car, signals = {}) {
    this.vehicle = vehicle;
    this.car = car;
    this.signals = signals;          // id -> { signal } traffic-light controller
    this.scoring = new Scoring();
    this._p = new THREE.Vector3();
    this._w = new THREE.Vector3();

    this.signalLines = COURSE.signalLines.map((e) => ({ ...e, L: seg(e) }));
    this.lightLines = COURSE.lightLines.map((e) => ({ ...e, L: seg(e) }));
    this.stopLines = COURSE.stopLines.map((e) => ({ ...e, L: seg(e) }));
    this.penaltyLines = COURSE.penaltyLines.map((e) => seg(e));
    this.parkings = COURSE.parkings.map((p) => ({ ...p, trig: seg(p.trigger), targ: seg(p.target) }));
    this.finish = seg(COURSE.finishLine);

    this.reset();
  }

  reset() {
    this.scoring.reset();
    this._side = new Map();
    this._fired = new Set();
    this._buttonCd = 0;
    this._stop = new Map(this.stopLines.map((s) => [s.id, { timer: 0, ok: false }]));
    this._park = new Map(this.parkings.map((p) => [p.id, { active: false, done: false, t: 0, hold: 0 }]));
    this.activeExercise = null;
    this._hillMinFx = Infinity; this._hillJudged = false; this._hillRolled = false;
    this._hillStopT = 0; this._prevHill = null;
  }

  // Crossing of segment L by the tracked point; one event per side flip.
  _cross(key, px, pz, L) {
    const s = sideOf(px, pz, L);
    const prev = this._side.get(key);
    this._side.set(key, s);
    if (prev === undefined || prev === 0 || s === 0 || prev === s) return false;
    const t = projT(px, pz, L);
    return t >= -0.15 && t <= 1.15;
  }

  update(dt) {
    if (this.scoring.isOver) return;
    const sc = this.scoring, v = this.vehicle;

    // Front-axle reference point + the four wheels in world space.
    this._p.set(HALF_WB, 0, 0); this.car.group.localToWorld(this._p);
    const px = this._p.x, pz = this._p.z;
    const W = {};
    for (const k in WHEELS) { this._w.set(...WHEELS[k]); this.car.group.localToWorld(this._w); W[k] = { x: this._w.x, z: this._w.z }; }

    // --- Signal lines ---------------------------------------------------
    for (const e of this.signalLines) {
      const key = 'sig:' + e.id;
      if (this._cross(key, px, pz, e.L) && !this._fired.has(key)) {
        this._fired.add(key);
        if (this.car.indicator !== e.dir) sc.penalize('Signal', `No ${e.dir} signal (${e.id})`, POINTS.signal);
      }
    }

    // --- Traffic-light lines -------------------------------------------
    for (const e of this.lightLines) {
      const key = 'light:' + e.id;
      if (this._cross(key, px, pz, e.L) && !this._fired.has(key)) {
        this._fired.add(key);
        const sig = this.signals[e.id] ? this.signals[e.id].signal : 'green';
        if (sig === 'red' || sig === 'yellow') sc.penalize('Light', `Crossed on ${sig} (${e.id})`, POINTS.light);
      }
    }

    // --- Stop lines -----------------------------------------------------
    for (const e of this.stopLines) {
      const st = this._stop.get(e.id);
      if (!st.ok) {
        if (distToSeg(px, pz, e.L) < 3.5 && Math.abs(v.speed) < 0.25) { st.timer += dt; if (st.timer >= 1) st.ok = true; }
        else if (Math.abs(v.speed) >= 0.25) st.timer = 0;
      }
      const key = 'stop:' + e.id;
      if (this._cross(key, px, pz, e.L) && !this._fired.has(key)) {
        this._fired.add(key);
        if (!st.ok) sc.penalize('Stop', `No full stop (${e.id})`, POINTS.stop);
      }
    }

    // --- Penalty buttons (wheel on a black line) ------------------------
    this._buttonCd -= dt;
    if (this._buttonCd <= 0) {
      let hit = false;
      for (const L of this.penaltyLines) { for (const k in W) { if (distToSeg(W[k].x, W[k].z, L) < 0.3) { hit = true; break; } } if (hit) break; }
      if (hit) { sc.penalize('Boundary', 'Wheel on the line', POINTS.button); this._buttonCd = 2.0; }
    }

    // --- Parking exercises ---------------------------------------------
    for (const p of this.parkings) {
      const ps = this._park.get(p.id);
      if (!ps.active && !ps.done) {
        if (this._cross('park:' + p.id, px, pz, p.trig)) { ps.active = true; ps.t = 0; ps.hold = 0; this.activeExercise = p.name; }
      } else if (ps.active) {
        ps.t += dt;
        const need = p.wheels === 'rear' ? ['rl', 'rr'] : ['fr', 'rr'];
        const inTarget = need.every((k) => distToSeg(W[k].x, W[k].z, p.targ) < 1.4);
        if (inTarget && Math.abs(v.speed) < 0.2) { ps.hold += dt; if (ps.hold >= 1) { ps.done = true; ps.active = false; this.activeExercise = null; } }
        else ps.hold = 0;
        if (ps.active && ps.t > p.limit) { ps.active = false; this.activeExercise = null; sc.penalize('Parking', `${p.name} not completed in ${p.limit}s`, POINTS.parking); }
      }
    }

    // --- Hill / estakada (rollback + stop-at-line) ----------------------
    this._hill(dt, px, pz, v, sc);

    // --- Finish ---------------------------------------------------------
    if (this._cross('finish', px, pz, this.finish) && !this._fired.has('finish')) {
      this._fired.add('finish');
      this.scoring.finish();
    }

    this._prevHill = px; // (kept for hill stop-line crossing)
  }

  _hill(dt, px, pz, v, sc) {
    const O = OVERPASS;
    const onRamp = px <= O.xA && px >= O.xD && pz >= O.z0 && pz <= O.z1;
    if (onRamp) {
      this._hillMinFx = Math.min(this._hillMinFx, px);
      if (!this._hillRolled && px - this._hillMinFx > 0.30) { sc.penalize('Hill start', 'Rolled back > 30 cm', 25); this._hillRolled = true; }
      if (!this._hillJudged) {
        if (Math.abs(v.speed) < 0.25) {
          this._hillStopT += dt;
          if (this._hillStopT > 0.4) {
            this._hillJudged = true;
            const d = px - O.stopX;
            if (d > 0.5) sc.penalize('Hill start', 'Stopped > 0.5 m before the STOP line', 25);
            else if (d < -0.5) sc.penalize('Hill start', 'Stopped past the STOP line', 25);
          }
        } else this._hillStopT = 0;
      }
    }
    if (!this._hillJudged && Math.abs(v.speed) > 0.4 && this._prevHill != null &&
        this._prevHill > O.stopX && px <= O.stopX && pz >= O.z0 && pz <= O.z1) {
      this._hillJudged = true;
      sc.penalize('Hill start', 'Did not stop at the STOP line', 25);
    }
  }
}
