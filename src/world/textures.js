// Procedural textures generated on a <canvas> — no external image assets needed.
// Provides the required "different kinds" of textures: a colour map, a normal
// map and a roughness map for the asphalt, plus a painted exam-ground texture.

import * as THREE from 'three';

/** Asphalt: returns { map, normalMap, roughnessMap }, all tiling. */
export function makeAsphaltMaps() {
  const size = 512;

  // Colour map: dark grey with fine noise and a few lighter speckles.
  const color = canvas(size, (ctx) => {
    ctx.fillStyle = '#34373c';
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      if (Math.random() < 0.004) { // speckle
        img.data[i] += 60; img.data[i + 1] += 60; img.data[i + 2] += 60;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  // Normal map: perturb the X/Y channels around flat (128,128,255).
  const normal = canvas(size, (ctx) => {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 128 + (Math.random() - 0.5) * 70;
      img.data[i + 1] = 128 + (Math.random() - 0.5) * 70;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });

  // Roughness map: mostly rough with patchy variation.
  const rough = canvas(size, (ctx) => {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + (Math.random() - 0.5) * 80;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });

  const map = tex(color, THREE.SRGBColorSpace);
  const normalMap = tex(normal);
  const roughnessMap = tex(rough);
  for (const t of [map, normalMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    t.anisotropy = 8;
  }
  return { map, normalMap, roughnessMap };
}

/**
 * Painted exam-ground pad. Draws the asphalt plus white markings: a parallel
 * parking box, a start/finish line, a direction arrow and a label.
 * worldW/worldH are the pad dimensions (metres) so markings keep proportion.
 */
export function makeExamPadTexture(worldW, worldH) {
  const px = 2048;
  const py = Math.round(px * (worldH / worldW));
  const c = document.createElement('canvas');
  c.width = px; c.height = py;
  const ctx = c.getContext('2d');
  const mx = px / worldW; // metres → pixels
  const my = py / worldH;

  // Slightly different asphalt shade so the pad reads as the test area.
  ctx.fillStyle = '#3d4045';
  ctx.fillRect(0, 0, px, py);
  const img = ctx.getImageData(0, 0, px, py);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // Helper: draw in world coords (origin at pad centre, +x right, +z down).
  const X = (x) => (x + worldW / 2) * mx;
  const Z = (z) => (z + worldH / 2) * my;

  ctx.strokeStyle = '#eef0f2';
  ctx.fillStyle = '#eef0f2';
  ctx.lineWidth = 0.12 * mx;

  // Start / finish line (dashed, across the start side).
  dashedLine(ctx, X(-16), Z(-9), X(-16), Z(9), 0.7 * my, 0.5 * my);

  // Centre lane guide (long dashes down the middle).
  ctx.save();
  ctx.setLineDash([1.6 * mx, 1.4 * mx]);
  ctx.beginPath();
  ctx.moveTo(X(-15), Z(0)); ctx.lineTo(X(12), Z(0));
  ctx.stroke();
  ctx.restore();

  // Parallel-parking box (outline) on the lower side.
  strokeRect(ctx, X(4), Z(4.2), 6.5 * mx, 2.6 * my);
  label(ctx, 'P', X(7.25) , Z(5.5), 1.4 * my);

  // Direction arrow near the start.
  arrow(ctx, X(-12.5), Z(0), X(-9.5), Z(0), 0.9 * my);

  // Title.
  label(ctx, 'ASTANA — PRACTICAL EXAM (B)', X(0), Z(-7.6), 1.0 * my);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- canvas helpers -------------------------------------------------------
function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'));
  return c;
}
function tex(canvasEl, colorSpace) {
  const t = new THREE.CanvasTexture(canvasEl);
  if (colorSpace) t.colorSpace = colorSpace;
  return t;
}
function dashedLine(ctx, x1, y1, x2, y2, dash, gap) {
  ctx.save();
  ctx.setLineDash([dash, gap]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
function strokeRect(ctx, cx, cy, w, h) {
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
}
function label(ctx, text, cx, cy, sizePx) {
  ctx.save();
  ctx.font = `bold ${sizePx}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, head) {
  ctx.save();
  ctx.lineWidth = head * 0.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head, y2 - head * 0.7);
  ctx.lineTo(x2 - head, y2 + head * 0.7);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
