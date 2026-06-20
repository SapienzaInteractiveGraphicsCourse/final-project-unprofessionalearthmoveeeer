// Procedural top-down texture for the Astana practical-exam autodrome, styled
// after a real driving-school «автодром»: dark asphalt road network, light-grey
// concrete maneuver pads, green grass infields, a central crosswalk
// intersection, serpentines, a hatched parking zone, garage combs and
// «БЕЗОПАСНОСТЬ ДВИЖЕНИЯ» border text.
//
// LAYOUT (cones, parked cars, start) is kept stable so the existing 3D props do
// not move; this file only changes what is painted.

import * as THREE from 'three';

// The map image is 1237×848. The ground plane matches that aspect so image
// pixel coordinates convert exactly to world coordinates (see mapCoords.js).
export const IMG_W = 1237;
export const IMG_H = 848;
export const AUTO_W = 130;                     // metres along X
export const AUTO_H = AUTO_W * IMG_H / IMG_W;  // metres along Z (≈ 89.1, matches image)

// ---- Shared layout (read by the 3D props in examGround.js) ----------------
function row(x0, x1, z, n) { const o = []; for (let i = 0; i < n; i++) o.push({ x: x0 + (x1 - x0) * (i / (n - 1)), z }); return o; }
function bays(x0, cz, n, w, d, dir) { const o = []; for (let i = 0; i < n; i++) o.push({ cx: x0 + i * (w + 0.4), cz, w, d, dir }); return o; }

const slalomCones = row(-44, -16, -19, 6);
const serpentineCones = row(-44, -16, 19, 7);
const parallelBox = { cx: 38, cz: -26, w: 6.6, d: 2.7 };
const parkBays = bays(14, -13, 4, 2.8, 5.0, 'down');
const garageBays = bays(16, 26, 4, 2.8, 5.0, 'up');

export const LAYOUT = {
  slalomCones, serpentineCones, parallelBox, parkBays, garageBays,
  parkedCars: [
    { x: parkBays[1].cx, z: parkBays[1].cz, ry: 0, color: 0x2f6fb0 },
    { x: garageBays[2].cx, z: garageBays[2].cz, ry: Math.PI, color: 0x2c8a4a },
  ],
  // START from image pixel (850, 45), facing −X (west).
  start: { x: (850 / IMG_W - 0.5) * AUTO_W, z: (45 / IMG_H - 0.5) * AUTO_H, heading: Math.PI },
};

// ---- Palette --------------------------------------------------------------
const C = {
  asphalt: '#44474d',
  grass: '#496f3f',
  concrete: '#b9b8b0',
  white: '#eef0f1',
  border: 'rgba(255,255,255,0.55)',
  blue: '#2f7fd0',
};

const CROSS = 4.8; // half-width of the central cross roads

// ===========================================================================
export function makeAutodromeTexture() {
  const S = 30;
  const px = Math.round(AUTO_W * S), py = Math.round(AUTO_H * S);
  const c = document.createElement('canvas'); c.width = px; c.height = py;
  const ctx = c.getContext('2d');
  const X = (x) => (x + AUTO_W / 2) * S;
  const Z = (z) => (z + AUTO_H / 2) * S;
  const M = (m) => m * S;
  const H = { ctx, X, Z, M };

  // 1) Asphalt base + grain.
  ctx.fillStyle = C.asphalt; ctx.fillRect(0, 0, px, py);
  speckle(ctx, 16000, ['#3c3f45', '#4b4e55'], 2, 0, 0, px, py);

  // 2) Grass quadrant infields (gaps between them stay asphalt = the roads).
  for (const [x0, z0, x1, z1] of [
    [-50, -32, -9, -9], [9, -32, 50, -9], [-50, 9, -9, 32], [9, 9, 50, 32],
  ]) grass(H, x0, z0, x1, z1);

  // 3) Concrete maneuver pads.
  concTrack(H, snake(-46, -12, -19, 4.5, 3), 9.0);   // TL змейка (slalom)
  concTrack(H, snake(-46, -12, 19, 5.5, 4), 9.0);    // BL serpentine
  concRect(H, 18, -13, 34, 9.0);                     // TR perpendicular parking pad
  garageComb(H, 24, 25, 26, 13);                     // BR garage combs

  // 4) Road markings + central intersection.
  roadMarkings(H);
  intersection(H);

  // 5) Top-right hatched parking zone + parallel-parking box.
  hatchZone(H, 9, -33, 49, -23);
  boxOutline(H, parallelBox.cx, parallelBox.cz, parallelBox.w, parallelBox.d, 'P');

  // 6) Parking-bay outlines.
  for (const b of parkBays) boxOutline(H, b.cx, b.cz, b.w, b.d);
  for (const b of garageBays) boxOutline(H, b.cx, b.cz, b.w, b.d);

  // 7) START line + label + top-road arrows.
  startMarks(H);

  // 8) Numbered exam markers + labels.
  [[-30, -9], [30, -9], [-30, 9], [30, 9], [0, -10], [0, 10], [-10, 0], [10, 0]]
    .forEach(([x, z], i) => marker(H, x, z, 0.95, i + 1));
  vlabel(H, 3, 24, 2.6, 'АВТОШКОЛА');

  // 9) Border safety text.
  borderText(H, px, py);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

// ---- surfaces -------------------------------------------------------------
function grass({ ctx, X, Z, M }, x0, z0, x1, z1) {
  ctx.fillStyle = C.grass;
  roundRectPath(ctx, X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0), M(2.5));
  ctx.fill();
  speckle(ctx, 2600, ['#406036', '#52814a'], 2, X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
}

function concRect({ ctx, X, Z, M }, cx, cz, w, h) {
  ctx.fillStyle = C.white;
  ctx.fillRect(X(cx - w / 2) - M(0.22), Z(cz - h / 2) - M(0.22), M(w + 0.44), M(h + 0.44));
  ctx.fillStyle = C.concrete;
  ctx.fillRect(X(cx - w / 2), Z(cz - h / 2), M(w), M(h));
}

// Smooth concrete track: white border stroke + concrete core stroke.
function concTrack({ ctx, X, Z, M }, pts, widthM) {
  for (const [w, col] of [[M(widthM + 0.5), C.white], [M(widthM), C.concrete]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(X(pts[0][0]), Z(pts[0][1]));
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(X(pts[i][0]), Z(pts[i][1]), X(mx), Z(mz));
    }
    ctx.lineTo(X(pts[pts.length - 1][0]), Z(pts[pts.length - 1][1]));
    ctx.stroke();
  }
}

function garageComb(H, cx, cz, w, h) {
  concRect(H, cx, cz + h / 2 - 1.1, w, 2.4);          // spine
  const n = 4, tw = 2.8, gap = (w - n * tw) / (n + 1);
  for (let i = 0; i < n; i++) {
    const tx = cx - w / 2 + gap + tw / 2 + i * (tw + gap);
    concRect(H, tx, cz - 1.2, tw, h - 3.4);            // teeth (bays)
  }
}

function hatchZone({ ctx, X, Z, M }, x0, z0, x1, z1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
  ctx.strokeStyle = C.white; ctx.lineWidth = M(0.22); ctx.stroke();
  ctx.clip();
  ctx.lineWidth = M(0.18); ctx.strokeStyle = C.white;
  const h = Z(z1) - Z(z0), step = M(2.4);
  for (let p = X(x0) - h; p < X(x1); p += step) {
    ctx.beginPath(); ctx.moveTo(p, Z(z0)); ctx.lineTo(p + h, Z(z1)); ctx.stroke();
  }
  ctx.restore();
}

// ---- markings -------------------------------------------------------------
function roadMarkings({ ctx, X, Z, M }) {
  ctx.strokeStyle = C.white;
  // Central cross-road centre lines (dashed).
  ctx.save();
  ctx.setLineDash([M(2), M(1.8)]); ctx.lineWidth = M(0.16);
  line(ctx, X(0), Z(-38), X(0), Z(38));
  line(ctx, X(-58), Z(0), X(58), Z(0));
  ctx.restore();

  // Perimeter loop centre dashes.
  ctx.save();
  ctx.setLineDash([M(2.4), M(2)]); ctx.lineWidth = M(0.16);
  rectPath(ctx, X(-54), Z(-35), X(54) - X(-54), Z(35) - Z(-35));
  ctx.stroke();
  ctx.restore();

  // A few directional arrows around the loop (clockwise).
  ctx.fillStyle = C.white;
  for (const [x, z, a] of [
    [-30, -35, 0], [30, -35, 0], [54, -10, Math.PI / 2], [54, 14, Math.PI / 2],
    [30, 35, Math.PI], [-30, 35, Math.PI], [-54, 14, -Math.PI / 2], [-54, -10, -Math.PI / 2],
  ]) arrow(ctx, X(x), Z(z), M(2.6), a);
}

function intersection({ ctx, X, Z, M }) {
  // Four zebra crosswalks on the approaches.
  crosswalk({ ctx, X, Z, M }, 0, -CROSS - 3, 'h');
  crosswalk({ ctx, X, Z, M }, 0, CROSS + 3, 'h');
  crosswalk({ ctx, X, Z, M }, -CROSS - 3, 0, 'v');
  crosswalk({ ctx, X, Z, M }, CROSS + 3, 0, 'v');
  // Turn arrows into the box.
  ctx.fillStyle = C.white;
  arrow(ctx, X(-CROSS - 7), Z(-2), M(2.4), 0);
  arrow(ctx, X(CROSS + 7), Z(2), M(2.4), Math.PI);
  arrow(ctx, X(-2), Z(-CROSS - 7), M(2.4), Math.PI / 2);
  arrow(ctx, X(2), Z(CROSS + 7), M(2.4), -Math.PI / 2);
}

function startMarks({ ctx, X, Z, M }) {
  // Start/finish line across the top road.
  ctx.fillStyle = C.white;
  ctx.fillRect(X(2) - M(0.3), Z(-38), M(0.6), M(8));
  // Left-pointing arrows along the top road (traffic goes left from START).
  for (const x of [-6, -16, -26]) arrow(ctx, X(x), Z(-33.5), M(2.6), Math.PI);
  // СТАРТ label.
  ctx.fillStyle = C.white;
  ctx.font = `bold ${M(2.2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('СТАРТ', X(14), Z(-36));
}

// ---- primitives -----------------------------------------------------------
function crosswalk({ ctx, X, Z, M }, cx, cz, orient) {
  ctx.fillStyle = C.white;
  const bars = 6, len = 5.6, span = 5.6;
  for (let i = 0; i < bars; i++) {
    const t = -span / 2 + (span / bars) * (i + 0.5);
    if (orient === 'h') ctx.fillRect(X(cx + t) - M(0.22), Z(cz - len / 2), M(0.44), M(len));
    else ctx.fillRect(X(cx - len / 2), Z(cz + t) - M(0.22), M(len), M(0.44));
  }
}

function boxOutline({ ctx, X, Z, M }, cx, cz, w, d, label) {
  ctx.strokeStyle = C.white; ctx.lineWidth = M(0.14);
  ctx.strokeRect(X(cx - w / 2), Z(cz - d / 2), M(w), M(d));
  if (label) {
    ctx.fillStyle = C.white; ctx.font = `bold ${M(1.6)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, X(cx), Z(cz));
  }
}

function arrow(ctx, sx, sy, size, angle) {
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle);
  const w = size * 0.34;
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, -w * 0.45); ctx.lineTo(size * 0.05, -w * 0.45);
  ctx.lineTo(size * 0.05, -w); ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(size * 0.05, w); ctx.lineTo(size * 0.05, w * 0.45);
  ctx.lineTo(-size * 0.6, w * 0.45); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function marker({ ctx, X, Z, M }, x, z, r, n) {
  const sx = X(x), sy = Z(z), rr = M(r);
  ctx.beginPath(); ctx.arc(sx, sy, rr, 0, Math.PI * 2);
  ctx.fillStyle = C.blue; ctx.fill();
  ctx.lineWidth = rr * 0.22; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${rr * 1.3}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), sx, sy);
}

function vlabel({ ctx, X, Z, M }, x, z, sizeM, text) {
  ctx.save(); ctx.translate(X(x), Z(z)); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `bold ${M(sizeM)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0);
  ctx.restore();
}

function borderText({ ctx, X, Z, M }, px, py) {
  ctx.fillStyle = C.border; ctx.font = `bold ${M(1.8)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const T = 'БЕЗОПАСНОСТЬ ДВИЖЕНИЯ';
  ctx.fillText(T, px / 2, M(1.6));                         // top
  ctx.save(); ctx.translate(M(1.6), py / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(T, 0, 0); ctx.restore(); // left
  ctx.save(); ctx.translate(px - M(1.6), py / 2); ctx.rotate(Math.PI / 2); ctx.fillText(T, 0, 0); ctx.restore(); // right
}

// ---- helpers --------------------------------------------------------------
function snake(x0, x1, zc, amp, nWaves) {
  const pts = [], N = nWaves * 8;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push([x0 + (x1 - x0) * t, zc + amp * Math.sin(t * Math.PI * 2 * nWaves)]);
  }
  return pts;
}
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function rectPath(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); }
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function speckle(ctx, n, colors, size, ox, oy, ow, oh) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.fillRect(ox + Math.random() * ow, oy + Math.random() * oh, size, size);
  }
}
