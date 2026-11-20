// Nodes on a circle, for consistent hashing: a dashed ring on the floor with small servers on it.
import { box, flatCircle, project, roundedPath } from '../iso.js';
import { shapeColors } from '../colors.js';
import { tag } from '../svg.js';
import { labelBelow } from './common.js';

export const layer = 'shapes';
export const reach = shape => shape.r;
export function outline(shape) {
  const [x0, y0, x1, y1] = bounds(shape);
  return [[x0, y0 + 20], [x1, y0 + 20], [x1, y1 - 30], [x0, y1 - 30]];
}

export function bounds(shape) {
  const c = flatCircle(shape.at[0], shape.at[1], shape.r + 1);
  return [c.cx - c.rx, c.cy - c.ry - 30, c.cx + c.rx, c.cy + c.ry + 34];
}

export function draw(shape) {
  const [x, y] = shape.at;
  const circle = flatCircle(x, y, shape.r);
  const colors = shapeColors(shape);
  const nodes = Array.from({ length: shape.n }, (_, i) => {
    const angle = (i / shape.n) * Math.PI * 2;
    return [x + Math.cos(angle) * shape.r, y + Math.sin(angle) * shape.r];
  }).sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
  return tag('ellipse', { cx: circle.cx, cy: circle.cy, rx: circle.rx, ry: circle.ry, class: 'st-zone' }) +
    nodes.map(([nx, ny]) => {
      const g = box(nx, ny, 1.5, 1.5, 16);
      return tag('path', { d: roundedPath(g.outline, 5), fill: colors.side }) + tag('path', { d: roundedPath(g.top, 5), fill: colors.top }) + tag('path', { d: roundedPath(g.outline, 5), class: 'st-edge' });
    }).join('');
}

export function overlay(shape) {
  const c = flatCircle(shape.at[0], shape.at[1], shape.r);
  return labelBelow(c.cx, c.cy + c.ry + 22, shape.label, 'refresh-cw');
}
