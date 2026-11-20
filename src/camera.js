// The camera decides which part of the drawing is visible: the SVG viewBox.

// A view that fits every box [minX, minY, maxX, maxY] with some room around it.
export function fit(boxes, padding = 0.1, minWidth = 360) {
  if (boxes.length === 0) return { x: -200, y: -150, w: 400, h: 300 };
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [a, b, c, d] of boxes) {
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  const w = Math.max(minWidth, x1 - x0);
  const h = y1 - y0;
  const pad = Math.max(w, h) * padding;
  const cx = (x0 + x1) / 2;
  return { x: cx - w / 2 - pad, y: y0 - pad, w: w + pad * 2, h: h + pad * 2 };
}

// The view part way (t from 0 to 1) between two views.
export function between(a, b, t) {
  const at = key => a[key] + (b[key] - a[key]) * t;
  return { x: at('x'), y: at('y'), w: at('w'), h: at('h') };
}

export const viewBox = v => [v.x, v.y, v.w, v.h].map(n => Math.round(n * 10) / 10).join(' ');
