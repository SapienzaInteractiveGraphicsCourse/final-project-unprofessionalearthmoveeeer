// Convert image pixel coordinates (top-left origin, as read off the map PNG) to
// world ground coordinates. The plane matches the image aspect, so this is exact.
//   px: 0..IMG_W  (left → right)  →  world X  (−AUTO_W/2 → +AUTO_W/2)
//   py: 0..IMG_H  (top  → bottom) →  world Z  (−AUTO_H/2 → +AUTO_H/2)

import { AUTO_W, AUTO_H, IMG_W, IMG_H } from './autodromeMap.js';

export { IMG_W, IMG_H };

export function px2world(px, py) {
  return {
    x: (px / IMG_W - 0.5) * AUTO_W,
    z: (py / IMG_H - 0.5) * AUTO_H,
  };
}

/** Just the world X for an image pixel column (handy for vertical lines). */
export function pxX(px) { return (px / IMG_W - 0.5) * AUTO_W; }
/** Just the world Z for an image pixel row. */
export function pxZ(py) { return (py / IMG_H - 0.5) * AUTO_H; }
