// Isometric math: how a point on the floor (x, y) at height z lands on the screen.
// One grid unit is 14 px. +x goes down-right, +y goes up-right, z goes straight up (in px).
import { r2 } from './svg.js';

export const UNIT = 14;

export function project(x, y, z = 0) {
  return [UNIT * (x + y), (UNIT / 2) * (x - y) - z];
}

// A closed path through `points` with every corner rounded by `radius` px.
// This is most of the hand-drawn feel: no sharp corners anywhere.
export function roundedPath(points, radius = 6) {
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const here = points[i];
    const next = points[(i + 1) % n];
    const a = towards(here, prev, radius);
    const b = towards(here, next, radius);
    d += `${i === 0 ? 'M' : 'L'}${r2(a[0])},${r2(a[1])} Q${r2(here[0])},${r2(here[1])} ${r2(b[0])},${r2(b[1])} `;
  }
  return d + 'Z';
}

// The point `distance` px from `from` towards `to`, never past the middle (so two corners never overlap).
function towards(from, to, distance) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const step = Math.min(distance, length / 2) / length;
  return [from[0] + dx * step, from[1] + dy * step];
}

// The screen points of a box standing on the floor: centered on (x, y), `w` by `d` units, `h` px tall.
// Named by floor corner: a = back-left, b = front, c = right, dTop = the back corner of the top.
export function box(x, y, w, d, h, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2;
  const at = (px, py, pz) => project(px, py, pz);
  const top = { a: at(x0, y0, z + h), b: at(x1, y0, z + h), c: at(x1, y1, z + h), d: at(x0, y1, z + h) };
  const bottom = { a: at(x0, y0, z), b: at(x1, y0, z), c: at(x1, y1, z) };
  return {
    top: [top.a, top.b, top.c, top.d],
    left: [top.a, top.b, bottom.b, bottom.a],
    right: [top.b, top.c, bottom.c, bottom.b],
    outline: [top.d, top.c, bottom.c, bottom.b, bottom.a, top.a],
    center: at(x, y, z + h),
  };
}

// The screen ellipse of a circle of radius r (units) lying flat at height z.
export function flatCircle(x, y, r, z = 0) {
  const [cx, cy] = project(x, y, z);
  return { cx, cy, rx: r * UNIT * Math.SQRT2, ry: r * (UNIT / 2) * Math.SQRT2 };
}

// Shapes are drawn back to front. A bigger x − y is nearer to the viewer.
export const depth = shape => shape.at[0] - shape.at[1];
