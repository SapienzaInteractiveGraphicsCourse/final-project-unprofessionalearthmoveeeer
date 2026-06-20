// Procedural top-down texture for the Astana practical-exam autodrome.
// One big canvas paints grass, the asphalt road network, the central
// intersection (crosswalks + turn arrows), the parking zones and lane markings.
// LAYOUT is shared so the 3D props (cones, parked cars) in examGround.js align
// to exactly what is painted here.

import * as THREE from 'three';

export const AUTO_W = 130; // metres along X
export const AUTO_H = 90;  // metres along Z

// Road geometry (metres, origin at centre).
const RING = { x0: -58, x1: 58, z0: -38, z1: 38, w: 9, r: 14 }; // loop ring road
const CROSS_HW = 4.6; // half-width of the central cross roads

// Maneuver zones (asphalt patches in the four infield quadrants).
const ZONE = {
  slalom:     { x0: -50, x1: -10, z0: -28, z1: -10 }, // top-left
  parking:    { x0: 10,  x1: 52,  z0: -30, z1: -9 },  // top-right
  serpentine: { x0: -50, x1: -10, z0: 10,  z1: 28 },  // bottom-left
  garage:     { x0: 10,  x1: 52,  z0: 9,   z1: 30 },  // bottom-right
};

// Cone lines (straight rows the driver weaves through).
const slalomCones = row(-44, -16, -19, 6);
const serpentineCones = row(-44, -16, 19, 7);

// Parallel-parking box (top-right) and perpendicular bays.
const parallelBox = { cx: 38, cz: -26, w: 6.6, d: 2.7 };
const parkBays = bays(14, -13, 4, 2.8, 5.0, 'down');   // top-right perpendicular
const garageBays = bays(16, 26, 4, 2.8, 5.0, 'up');    // bottom-right perpendicular

export const LAYOUT = {
  slalomCones, serpentineCones,
  parallelBox, parkBays, garageBays,
  // Static parked cars sit in two of the bays.
  parkedCars: [
    { x: parkBays[1].cx, z: parkBays[1].cz, ry: 0, color: 0x2f6fb0 },
    { x: garageBays[2].cx, z: garageBays[2].cz, ry: Math.PI, color: 0x2c8a4a },
  ],
  start: { x: -44, z: 0, heading: 0 },
};

// --- texture --------------------------------------------------------------
export function makeAutodromeTexture() {
  const S = 28; // pixels per metre
  const px = Math.round(AUTO_W * S);
  const py = Math.round(AUTO_H * S);
  const c = document.createElement('canvas');
  c.width = px; c.height = py;
  const ctx = c.getContext('2d');

  const X = (x) => (x + AUTO_W / 2) * S;
  const Z = (z) => (z + AUTO_H / 2) * S;
  const M = (m) => m * S;

  // 1) Grass base.
  ctx.fillStyle = '#3f6b3c';
  ctx.fillRect(0, 0, px, py);
  speckle(ctx, px, py, 9000, ['#356135', '#477a40', '#2f5630'], 2);

  // 2) Asphalt road network.
  const asphalt = '#3b3e43';
  // Loop ring: outer rounded rect minus inner rounded rect.
  ctx.fillStyle = asphalt;
  roundRect(ctx, X(RING.x0), Z(RING.z0), M(RING.x1 - RING.x0), M(RING.z1 - RING.z0), M(RING.r));
  ctx.fill();
  // carve the infield back to grass
  ctx.fillStyle = '#3f6b3c';
  roundRect(ctx, X(RING.x0 + RING.w), Z(RING.z0 + RING.w),
    M(RING.x1 - RING.x0 - 2 * RING.w), M(RING.z1 - RING.z0 - 2 * RING.w), M(RING.r - RING.w * 0.5));
  ctx.fill();
  speckle(ctx, px, py, 4000, ['#356135', '#477a40'], 2, X(RING.x0 + RING.w), Z(RING.z0 + RING.w),
    M(RING.x1 - RING.x0 - 2 * RING.w), M(RING.z1 - RING.z0 - 2 * RING.w));

  // Cross roads through the centre.
  ctx.fillStyle = asphalt;
  rect(ctx, X(-50), Z(-CROSS_HW), M(100), M(2 * CROSS_HW));      // horizontal
  rect(ctx, X(-CROSS_HW), Z(-30), M(2 * CROSS_HW), M(60));        // vertical

  // Maneuver-zone asphalt patches + short connectors to the cross/ring.
  for (const z of Object.values(ZONE)) {
    rect(ctx, X(z.x0), Z(z.z0), M(z.x1 - z.x0), M(z.z1 - z.z0));
  }
  // connectors (zone centre to the nearest cross road)
  connector(ctx, X, Z, M, ZONE.slalom, 'h');
  connector(ctx, X, Z, M, ZONE.parking, 'h');
  connector(ctx, X, Z, M, ZONE.serpentine, 'h');
  connector(ctx, X, Z, M, ZONE.garage, 'h');

  // light asphalt grain over everything
  speckle(ctx, px, py, 6000, ['#33363b', '#42454a'], 1.6);

  // 3) Markings.
  ctx.lineCap = 'butt';

  // Loop centre dashes.
  drawRingDashes(ctx, X, Z, M);

  // Intersection: stop lines, crosswalks, turn arrows.
  drawIntersection(ctx, X, Z, M);

  // Parking markings.
  ctx.strokeStyle = '#eef0f2';
  ctx.lineWidth = M(0.14);
  strokeRect(ctx, X, Z, M, parallelBox.cx, parallelBox.cz, parallelBox.w, parallelBox.d);
  label(ctx, X(parallelBox.cx), Z(parallelBox.cz), M(1.6), 'P');
  for (const b of parkBays) bay(ctx, X, Z, M, b);
  for (const b of garageBays) bay(ctx, X, Z, M, b);

  // Direction arrows around the loop (clockwise).
  ctx.fillStyle = '#e7eaed';
  arrowsAlong(ctx, X, Z, M, 'h', RING.z0 + RING.w / 2, [-30, 0, 30], 0);             // top → +x
  arrowsAlong(ctx, X, Z, M, 'h', RING.z1 - RING.w / 2, [30, 0, -30], Math.PI);        // bottom → -x
  arrowsAlong(ctx, X, Z, M, 'v', RING.x1 - RING.w / 2, [-24, 0, 24], Math.PI / 2);     // right → +z
  arrowsAlong(ctx, X, Z, M, 'v', RING.x0 + RING.w / 2, [24, 0, -24], -Math.PI / 2);    // left → -z

  // 4) Numbered exam markers (blue dots) at zone entries.
  const markers = [
    [-30, -10], [30, -9], [-30, 10], [30, 9], [0, -10], [0, 10], [-10, 0], [10, 0],
  ];
  markers.forEach(([x, z], i) => marker(ctx, X(x), Z(z), M(0.9), i + 1));

  // 5) Title + perimeter line.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  label(ctx, X(0), Z(-42), M(2.6), 'ASTANA — PRACTICAL EXAM AUTODROME (CATEGORY B)');
  ctx.strokeStyle = '#cfd2d6';
  ctx.lineWidth = M(0.4);
  ctx.strokeRect(M(0.6), M(0.6), px - M(1.2), py - M(1.2));

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

// --- layout helpers -------------------------------------------------------
function row(x0, x1, z, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + (x1 - x0) * (i / (n - 1)), z });
  return out;
}
function bays(x0, cz, n, w, d, dir) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ cx: x0 + i * (w + 0.4), cz, w, d, dir });
  return out;
}

// --- drawing helpers ------------------------------------------------------
function rect(ctx, x, y, w, h) { ctx.fillRect(x, y, w, h); }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function speckle(ctx, px, py, n, colors, size, ox = 0, oy = 0, ow = px, oh = py) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.fillRect(ox + Math.random() * ow, oy + Math.random() * oh, size, size);
  }
}
function connector(ctx, X, Z, M, z, kind) {
  const cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
  ctx.fillStyle = '#3b3e43';
  if (cz < 0) ctx.fillRect(X(cx - 3), Z(z.z1), M(6), Z(-CROSS_HW) - Z(z.z1));
  else ctx.fillRect(X(cx - 3), Z(CROSS_HW), M(6), Z(z.z0) - Z(CROSS_HW));
}
function drawRingDashes(ctx, X, Z, M) {
  ctx.save();
  ctx.strokeStyle = '#e7eaed';
  ctx.lineWidth = M(0.16);
  ctx.setLineDash([M(2), M(1.8)]);
  const mid = (RING.x0 + RING.w / 2 + RING.x1 - RING.w / 2) / 2;
  roundRect(ctx,
    X(RING.x0 + RING.w / 2), Z(RING.z0 + RING.w / 2),
    M(RING.x1 - RING.x0 - RING.w), M(RING.z1 - RING.z0 - RING.w), M(RING.r - RING.w / 2));
  ctx.stroke();
  ctx.restore();
}
function drawIntersection(ctx, X, Z, M) {
  const arm = CROSS_HW;
  // Crosswalks on the four approaches.
  crosswalk(ctx, X, Z, M, 0, -arm - 3.2, 'h'); // north
  crosswalk(ctx, X, Z, M, 0, arm + 3.2, 'h');  // south
  crosswalk(ctx, X, Z, M, -arm - 3.2, 0, 'v'); // west
  crosswalk(ctx, X, Z, M, arm + 3.2, 0, 'v');  // east
  // Turn arrows leading into the box.
  ctx.fillStyle = '#e7eaed';
  arrow(ctx, X(-arm - 7), Z(-2), M(2.4), 0);            // from west → east
  arrow(ctx, X(arm + 7), Z(2), M(2.4), Math.PI);        // from east → west
  arrow(ctx, X(-2), Z(-arm - 7), M(2.4), Math.PI / 2);  // from north → south
  arrow(ctx, X(2), Z(arm + 7), M(2.4), -Math.PI / 2);   // from south → north
}
function crosswalk(ctx, X, Z, M, cx, cz, orient) {
  ctx.fillStyle = '#eef0f2';
  const bars = 6, len = 5.4, span = 5.4;
  for (let i = 0; i < bars; i++) {
    const t = -span / 2 + (span / bars) * (i + 0.5);
    if (orient === 'h') ctx.fillRect(X(cx + t) - M(0.22), Z(cz - len / 2), M(0.44), M(len));
    else ctx.fillRect(X(cx - len / 2), Z(cz + t) - M(0.22), M(len), M(0.44));
  }
}
function arrow(ctx, sx, sy, size, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  const w = size * 0.34;
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, -w * 0.45);
  ctx.lineTo(size * 0.05, -w * 0.45);
  ctx.lineTo(size * 0.05, -w);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(size * 0.05, w);
  ctx.lineTo(size * 0.05, w * 0.45);
  ctx.lineTo(-size * 0.6, w * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function arrowsAlong(ctx, X, Z, M, kind, fixed, positions, angle) {
  for (const p of positions) {
    if (kind === 'h') arrow(ctx, X(p), Z(fixed), M(2.6), angle);
    else arrow(ctx, X(fixed), Z(p), M(2.6), angle);
  }
}
function strokeRect(ctx, X, Z, M, cx, cz, w, d) {
  ctx.strokeRect(X(cx - w / 2), Z(cz - d / 2), M(w), M(d));
}
function bay(ctx, X, Z, M, b) {
  ctx.strokeStyle = '#eef0f2';
  ctx.lineWidth = M(0.14);
  ctx.strokeRect(X(b.cx - b.w / 2), Z(b.cz - b.d / 2), M(b.w), M(b.d));
}
function label(ctx, sx, sy, sizePx, text) {
  ctx.save();
  ctx.font = `bold ${sizePx}px sans-serif`;
  ctx.fillStyle = ctx.fillStyle;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, sy);
  ctx.restore();
}
function marker(ctx, sx, sy, r, n) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2f7fd0';
  ctx.fill();
  ctx.lineWidth = r * 0.25;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${r * 1.3}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), sx, sy);
  ctx.restore();
}
