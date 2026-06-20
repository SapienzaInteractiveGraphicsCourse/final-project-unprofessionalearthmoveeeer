// The automated examiner. Each frame it inspects the car/vehicle/world state and
// issues penalties through the Scoring engine, following the exam specification
// (docs/exam-specification.md). This is the "core subset": Phase-1 start
// sequence, slalom cone scoring, the controlled-intersection traffic light, and
// the Phase-3 global rules (time limit, off-circuit, emergency stop, abrupt
// braking). Heavier geometry exercises (ramp, railway, 90° corridor, yard) are
// specified but out of this subset.

import * as THREE from 'three';

// Geometry constants — must match the autodrome layout (autodromeMap.js).
const TOP_Z = -33.5;        // top-road centre line (the START straight)
const START_LINE_X = 2;     // painted start/finish line
const CROSS_HW = 4.6;       // half-width of the central cross roads
const STOPLINE_Z = -CROSS_HW - 2.5; // traffic-light stop line on the north approach

const COMMAND_DELAY = 1.5;  // seconds before "Start driving" is issued
const TIME_LIMIT = 240;     // total exam time (s)
const ABRUPT_ACCEL = -16;   // m/s² considered an abrupt stop

export class Examiner {
  constructor(scoring, { vehicle, car, examGround, trafficLight }) {
    this.scoring = scoring;
    this.vehicle = vehicle;
    this.car = car;
    this.examGround = examGround;
    this.trafficLight = trafficLight;
    this._front = new THREE.Vector3();
    this.reset();
  }

  reset() {
    this.clock = 0;
    this.commandIssued = false;
    this.commandTime = 0;
    this.crossedStart = false;
    this.seatbelt = false;
    this._beltChecked = false;
    this.prompt = 'Fasten seatbelt (B), then await the command…';
    this.prevFront = null;
    this.prevFrontZ = null;
    this.trafficDone = false;
    this.slalomCleared = false;

    // emergency stop
    this.esScheduled = COMMAND_DELAY + 12 + Math.random() * 10;
    this.esActive = false;
    this.esStart = 0;
    this.esSpeed0 = 0;
    this.esBraked = false;
    this.esHazard = false;
    this.esDone = false;

    // abrupt braking
    this._wasFast = -10;
    this.lastAbrupt = -10;
  }

  toggleSeatbelt() { this.seatbelt = !this.seatbelt; }

  get timeLeft() {
    if (!this.commandIssued) return TIME_LIMIT;
    return Math.max(0, TIME_LIMIT - (this.clock - this.commandTime));
  }

  finish() {
    if (this.scoring.status === 'running') this.scoring.finish();
    this.prompt = '';
  }

  update(dt) {
    if (this.scoring.isOver) return;
    this.clock += dt;
    const sc = this.scoring;
    const v = this.vehicle;

    // --- Front axle world position (for line crossings) ------------------
    this._front.set(1.45, 0, 0);
    this.car.group.localToWorld(this._front);
    const fx = this._front.x, fz = this._front.z;

    // --- Phase 1: start command + timers ---------------------------------
    if (!this.commandIssued && this.clock >= COMMAND_DELAY) {
      this.commandIssued = true;
      this.commandTime = this.clock;
      this.prompt = '►  "Start driving" (Начните движение)';
    }
    if (this.commandIssued && !v.hasMoved) {
      const since = this.clock - this.commandTime;
      if (since >= 20) sc.penalizeOnce('start20', 'Start', 'No movement within 20 s', 25, this.clock);
      if (since >= 30) sc.penalize('Start', 'No movement within 30 s', 100, this.clock);
    }

    // First movement: clear the start prompt and check the seatbelt once.
    if (v.hasMoved && this.prompt.startsWith('►')) this.prompt = '';
    if (v.hasMoved && !this._beltChecked) {
      this._beltChecked = true;
      if (!this.seatbelt) sc.penalize('Start', 'Seatbelt not fastened', 5, this.clock);
    }

    // Start-line crossing (westbound across x=2 on the top road).
    if (!this.crossedStart && this.prevFront != null &&
        this.prevFront > START_LINE_X && fx <= START_LINE_X && Math.abs(fz - TOP_Z) < 6) {
      this.crossedStart = true;
      const ind = this.car.indicator;
      if (ind !== 'left' && ind !== 'hazard') {
        sc.penalizeOnce('startind', 'Start', 'No left indicator before start line', 5, this.clock);
      }
    }

    // Engine stall (attributed to the current phase).
    if (v.justStalled) {
      sc.penalize(this.crossedStart ? 'Circuit' : 'Start', 'Engine stalled', 5, this.clock);
    }

    // --- Exercise 5: slalom cone touches ---------------------------------
    // Cone collisions are tested in main.js; it reports new hits here.
    // (see reportConeHits)

    // --- Exercise 2: controlled intersection (north approach) ------------
    if (!this.trafficDone && this.prevFrontZ != null &&
        this.prevFrontZ < STOPLINE_Z && fz >= STOPLINE_Z && Math.abs(fx) < CROSS_HW) {
      this.trafficDone = true;
      const sig = this.trafficLight.signal;
      if (sig === 'red' || sig === 'yellow') {
        if (Math.abs(v.speed) > 1.2) sc.penalize('Intersection', `Ran a ${sig} light`, 100, this.clock);
        else sc.penalize('Intersection', 'Crossed stop line on restrictive signal', 25, this.clock);
      }
    }

    // --- Phase 3: global rules -------------------------------------------
    // Time limit.
    if (this.commandIssued && this.timeLeft <= 0) {
      sc.penalize('Global', 'Exceeded the time limit', 100, this.clock);
    }

    // Off-circuit (past the curb perimeter).
    if (Math.abs(v.x) > 64 || Math.abs(v.z) > 44) {
      sc.penalizeOnce('offcircuit', 'Global', 'Left the circuit area', 100, this.clock);
    }

    // Emergency stop.
    this._emergencyStop(dt);

    // Abrupt braking without reason.
    if (Math.abs(v.speed) > 9) this._wasFast = this.clock;
    if (!this.esActive && Math.abs(v.speed) < 1 && this.clock - this._wasFast < 1.0 &&
        this.clock - this.lastAbrupt > 8) {
      this.lastAbrupt = this.clock;
      sc.penalize('Global', 'Abrupt braking without reason', 5, this.clock);
    }

    this.prevFront = fx;
    this.prevFrontZ = fz;
  }

  _emergencyStop(dt) {
    const v = this.vehicle, sc = this.scoring;
    if (!this.esDone && !this.esActive && this.commandIssued && v.hasMoved &&
        this.clock >= this.commandTime + this.esScheduled) {
      this.esActive = true;
      this.esStart = this.clock;
      this.esSpeed0 = Math.abs(v.speed);
      this.esBraked = false;
      this.esHazard = false;
      this.prompt = '⚠  EMERGENCY STOP — brake + hazard lights!';
    }
    if (this.esActive) {
      const since = this.clock - this.esStart;
      if (since <= 2 && Math.abs(v.speed) <= Math.max(0.6, this.esSpeed0 * 0.25)) this.esBraked = true;
      if (since <= 3 && this.car.indicator === 'hazard') this.esHazard = true;
      if (since >= 3) {
        if (!(this.esBraked && this.esHazard)) {
          sc.penalize('Global', 'Failed the emergency-stop test', 25, this.clock);
        }
        this.esActive = false;
        this.esDone = true;
        this.prompt = '';
      }
    }
  }

  /** Called by main.js with the number of cones newly knocked this frame. */
  reportConeHits(n) {
    if (n > 0 && !this.scoring.isOver) {
      for (let i = 0; i < n; i++) {
        this.scoring.penalize('Slalom', 'Touched / knocked a cone', 5, this.clock);
      }
    }
  }
}
