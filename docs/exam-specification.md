# Project Specification — Kazakhstan Practical Driving Exam Simulator
### Category B · Astana autodrome

This document specifies the rules, scoring and pass/fail logic the simulator
reproduces, and maps each rule to the systems that must be implemented. It is
the functional specification that drives the gameplay layer on top of the
already-built 3D scene (car, autodrome, lights, textures, animations).

---

## 1. Goal and success criterion

The candidate drives the category-B car through a fixed sequence of exercises on
the Astana autodrome. The automated examiner accumulates **penalty points** for
mistakes.

**The exam is passed if, and only if:**

1. **All exam tasks (Phases 1–2) are completed**, in order, and
2. the **cumulative penalty total stays below 100 points**, and
3. **no single "critical" (100-point) error** is triggered.

Reaching **100 penalty points** at any moment — whether from one critical error
or from accumulated smaller ones — ends the exam **immediately as a FAIL**.

---

## 2. Scoring model

Penalties are cumulative and classified into three severity tiers:

| Points | Severity | Meaning | Examples |
| ---: | --- | --- | --- |
| **100** | Critical (Immediate Fail) | Ends the exam at once | Running a red/yellow light, skipping the railway STOP, running out of time, leaving the circuit / oncoming lane |
| **25** | Major violation | Heavy deduction | Crossing a solid line/curb, >30 cm hill rollback, wrong final parking position |
| **5** | Minor mistake | Light deduction | Forgetting a turn signal, stalling the engine, touching a cone |

**Examiner system requirements**

- Maintain a running `totalPenalty` and an ordered **event log** (timestamp,
  exercise, rule, points).
- Fail instantly when `totalPenalty >= 100` or any 100-point rule fires.
- Track per-exercise state (entered / completed) and a global **exam timer**.
- Surface all of the above on the HUD (current total, last violation, timer,
  current exercise, pass/fail banner at the end).

---

## 3. Exam flow

```
Phase 1  Preparation & Start  ──►  Phase 2  Circuit Exercises (1→8)  ──►  Result
                                   (Phase 3 global rules apply throughout)
```

Phase 3 penalties can be issued by the system **at any location** on the track.

---

## 4. Phase 1 — Preparation and Start (the "START" zone)

The candidate is seated; they adjust seat and mirrors. The **timer starts** on
the audio command **"Start driving" (Начните движение)**.

| Rule | Points | Detection in sim |
| --- | ---: | --- |
| No movement within **30 s** of the command | **100** | 30 s timer from command; vehicle speed still ≈ 0 → fail |
| No movement within **20 s** of the command | 25 | 20 s timer; one-shot if not yet moved |
| Seatbelt not fastened | 5 | Seatbelt toggle must be ON before moving |
| Left indicator not on **before crossing the start line** | 5 | Left turn signal must be active when the front axle crosses the START line |
| Stalling the engine at the start | 5 | Engine stall model (see §8) on a botched launch |

---

## 5. Phase 2 — Circuit exercises

Every exercise has strict boundaries. **Crossing a solid line / curb** is a
major (25) penalty; **touching a plastic cone** is a minor (5) penalty.

### 5.1 Hill Start — the Ramp (Estakada)
Drive up a steep ramp, stop smoothly at the **STOP** line, then pull away
without rolling back.

| Rule | Points |
| --- | ---: |
| Rolling backward **> 30 cm** | 25 |
| Stopping **> 0.5 m** before, or **past**, the STOP line | 25 |
| Stalling the engine on the ramp | 5 |

*Sim needs:* inclined ramp geometry; longitudinal model with gravity on slopes
and a rollback measurement; STOP-line tolerance band (±0.5 m).

### 5.2 Controlled Intersection (traffic lights)
A simulated city crossroad with working traffic lights.

| Rule | Points |
| --- | ---: |
| Running a **red or yellow** light | **100** |
| Crossing the stop line during a restrictive signal | 25 |
| No turn indicator when turning at the intersection | 5 |

*Sim needs:* traffic-light state machine (green/yellow/red cycle); stop-line
trigger; signal-vs-position check; turn-intent detection from indicator + path.

### 5.3 90-Degree Turns
A narrow winding corridor with sharp right angles.

| Rule | Points |
| --- | ---: |
| Crossing the solid boundary line / hitting the curb | 25 **per occurrence** |
| Touching an outer boundary cone / pole | 5 |
| Using reverse gear to correct the path | 5 |

*Sim needs:* corridor boundary polylines with crossing detection; boundary
cones; reverse-usage flag inside the exercise.

### 5.4 Turnaround in a Limited Space ("the Yard")
Turn the car 180° inside a small marked square using reverse gear **exactly
once**.

| Rule | Points |
| --- | ---: |
| Crossing the solid boundary line | 25 |
| Engaging reverse gear **more than once** | 5 |

*Sim needs:* square boundary; reverse-engagement counter; heading-change check
(≈180°) to mark completion.

### 5.5 Slalom ("Zmeika")
Drive a smooth S-trajectory between a line of cones.

| Rule | Points |
| --- | ---: |
| Crossing the exercise boundary line | 25 |
| Knocking down or touching a cone | 5 |

*Sim status:* cone line + knock-over detection already implemented
(`examGround.hitTest`). Add boundary lines + weave-success check.

### 5.6 Backing into a Box (90° reverse garage parking)
Reverse into a simulated garage at a 90° angle.

| Rule | Points |
| --- | ---: |
| Not fully inside (any bumper past the outer line) | 25 |
| Crossing the solid boundary lines (the "walls") | 25 |
| Engaging reverse a **second** time (pulling forward to realign) | 5 |

*Sim needs:* garage box bounds; final-pose containment test (all 4 corners
inside); wall-crossing detection; reverse counter.

### 5.7 Parallel Parking
Reverse into a spot along a simulated curb.

| Rule | Points |
| --- | ---: |
| Failing to cross the broken entry line (not fully in) | 25 |
| Crossing the solid line / hitting the curb | 25 |
| Engaging reverse **more than once** | 5 |

*Sim needs:* parallel bay bounds + broken entry line; curb collision; reverse
counter; final containment test.

### 5.8 Unregulated Railway Crossing

| Rule | Points |
| --- | ---: |
| Failing to stop completely before the STOP sign / line | **100** |
| Stopping **on top of the rails** | **100** |

*Sim needs:* rail geometry + STOP line; full-stop detection (speed ≈ 0) within
the stop zone; on-rails position check.

---

## 6. Phase 3 — General mistakes (whole circuit)

The automated system can issue these **anywhere** on the track:

| Rule | Points | Detection in sim |
| --- | ---: | --- |
| Exceeding the total time limit | **100** | Global exam countdown → fail at 0 |
| Driving into the oncoming lane / leaving the circuit | **100** | Position outside the drivable lane polygon |
| **Emergency Stop** failure | 25 | Random siren; must brake within **2 s** and hazards on within **3 s** |
| Abrupt braking without objective reason | 5 | Deceleration spike above a threshold with no obstacle ahead |

---

## 7. Penalty summary

| Penalty | Class | Representative examples |
| ---: | --- | --- |
| **100** | Critical — Immediate Fail | Red/yellow light, railway STOP skipped, time out, oncoming/off-circuit |
| **25** | Major violation | Solid line/curb crossing, heavy hill rollback, wrong final parking |
| **5** | Minor mistake | Missed turn signal, engine stall, cone touch, single extra reverse |

---

## 8. Implementation mapping (systems to build)

The graded course requirements (hierarchical model, lights, textures,
interaction, animation) are already satisfied by the existing build. The exam
spec adds a **gameplay/examiner layer**. Required new systems:

| System | Purpose | Status |
| --- | --- | --- |
| **Scoring engine** | Cumulative penalties, tiers, fail at ≥100, event log, end banner | **done** (`exam/scoring.js`) |
| **Exam state machine** | Sequence Phases 1→2, per-exercise enter/complete, global timer | partial — start + globals (`exam/examiner.js`); full 8-exercise sequencing pending |
| **Start sequence** | "Start driving" cue, 30 s/20 s timers, seatbelt, left-indicator-before-line | **done** |
| **Turn indicators + hazards** | Blinking signals on the car; required by start/intersection/emergency-stop rules | **done** (`car.js`) |
| **Engine stall model** | Stall on botched launch / ramp | **done** (throttle+brake near standstill) |
| **Traffic light** | Signal cycle + stop-line + restrictive-signal detection | **done** (`trafficLight.js`, north approach) |
| **Hill ramp (estakada)** | Incline geometry + gravity + rollback + STOP tolerance | to build |
| **90° corridor / turnaround yard** | Boundary polylines, crossing + reverse counters | to build |
| **Reverse garage + parallel parking** | Bay bounds, entry line, containment + reverse counters | bays exist visually; logic to build |
| **Railway crossing** | Rails + STOP, full-stop + on-rails checks | to build |
| **Emergency stop event** | Random siren, brake-≤2 s + hazards-≤3 s timing | **done** (visual prompt) |
| **Lane / circuit bounds** | Oncoming-lane & off-circuit detection | **done** off-circuit; oncoming-lane pending |
| **HUD/examiner UI** | Total, last violation, timer, current exercise, result | **done** (examiner panel + prompt + result banner) |

Already in place that the layer builds on: drivable hierarchical car, autodrome
(loop road, intersection visuals, slalom + serpentine cones, parking box +
garage bays, START), cone knock-over detection, camera modes, headlights.

---

## 9. Suggested build order (given the deadline)

A pragmatic order that yields a demonstrable, gradable exam early and adds
fidelity incrementally:

1. **Scoring engine + examiner HUD + event log + pass/fail banner.**
2. **Start sequence** (timer, seatbelt, indicators) — exercises Phase 1 fully.
3. **Slalom scoring** (reuse cone hit-test) + **boundary-crossing** primitive
   (reused by every bounded exercise).
4. **Traffic light** at the existing intersection.
5. **Emergency stop** random event + **abrupt-braking** + **off-circuit** global
   rules (cheap, high-coverage).
6. **Parallel parking** and **reverse garage** containment scoring (bays exist).
7. **Hill ramp**, **railway crossing**, **90° corridor**, **turnaround yard**
   (new geometry — highest effort, add as time allows).

Each step is independently demoable, so the project stays submittable at every
checkpoint.
