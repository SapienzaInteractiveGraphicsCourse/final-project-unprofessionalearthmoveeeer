// Exam course definition. ALL coordinates are IMAGE PIXELS (1237×848); they are
// converted to world segments at build time (see exam.js / mapCoords.js).
//
// Edit this file to move/add rules. Each line is a segment a→b in pixels.

export const COURSE = {
  // Turn-signal checkpoints — crossing requires the given indicator on (else −5).
  // (#5,7,10,12,13,15,17,19,21, plus the departure line at x=820 from before.)
  signalLines: [
    { id: 'start820', dir: 'left',  a: [820, 30],  b: [820, 62] },   // depart START
    { id: 's5',  dir: 'left',  a: [40, 285],  b: [75, 285] },
    { id: 's7',  dir: 'right', a: [550, 230], b: [550, 265] },
    { id: 's10', dir: 'right', a: [1000, 430], b: [1000, 460] },
    { id: 's12', dir: 'right', a: [1103, 457], b: [1103, 485] },
    { id: 's13', dir: 'right', a: [685, 550], b: [685, 800] },
    { id: 's15', dir: 'right', a: [627, 280], b: [672, 280] },
    { id: 's17', dir: 'right', a: [1081, 243], b: [1081, 264] },
    { id: 's19', dir: 'left',  a: [116, 409], b: [116, 440] },
    { id: 's21', dir: 'left',  a: [43, 773],  b: [72, 773] },
  ],

  // Traffic-light stop lines — crossing on red/yellow → FAIL (100). (#8,9,14)
  lightLines: [
    { id: 'l8',  a: [590, 350], b: [625, 350] },
    { id: 'l9',  a: [543, 433], b: [542, 464] },
    { id: 'l14', a: [623, 516], b: [651, 516] },
  ],

  // Full-stop line — must come to a complete stop ≥1 s before crossing. (#20)
  stopLines: [
    { id: 'st20', a: [42, 663], b: [71, 663] },
  ],

  // Penalty "buttons" — touching with any wheel → +20 (with cooldown). (#6)
  penaltyLines: [
    { a: [290, 345], b: [315, 345] },
    { a: [315, 345], b: [315, 240] },
    { a: [315, 240], b: [380, 240] },
    { a: [290, 380], b: [350, 385] },
    { a: [350, 385], b: [353, 340] },
    { a: [353, 340], b: [380, 270] },
  ],

  // Timed parking exercises. Cross the trigger line → up to `limit` s to get the
  // required wheels stationary (≥1 s) inside the target line, else FAIL. (#11,16)
  parkings: [
    {
      id: 'park90', name: '90° parking', wheels: 'rear', limit: 30,
      trigger: { a: [1030, 530], b: [1066, 530] },
      target:  { a: [1102, 655], b: [1102, 687] },
    },
    {
      id: 'parallel', name: 'parallel parking', wheels: 'right', limit: 30,
      trigger: { a: [627, 280], b: [672, 280] },
      target:  { a: [706, 302], b: [853, 300] },
    },
  ],

  // Finish — crossing this ends the exam. (#18; same line as #17)
  finishLine: { a: [1081, 243], b: [1081, 264] },
};

// Default penalty points per rule type.
export const POINTS = {
  signal: 5,
  stop: 25,
  button: 20,
  light: 100,   // fail
  parking: 100, // fail
};
