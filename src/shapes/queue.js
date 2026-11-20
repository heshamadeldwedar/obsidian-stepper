// A queue: a row of waiting items, with its name written on the floor beside it.
import { box, project, roundedPath } from '../iso.js';
import { shapeColors } from '../colors.js';
import { tag, esc, r2 } from '../svg.js';
import { boundsOf } from './block.js';

export const layer = 'shapes';
const GAP = 1.25; // units between items

export const reach = () => 1;
export function outline(shape) {
  const [x0, y0, x1, y1] = bounds(shape);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

function items(shape) {
  const [dx, dy] = shape.dir;
  const length = Math.hypot(dx, dy) || 1;
  return Array.from({ length: shape.n }, (_, i) => [shape.at[0] + (dx / length) * GAP * i, shape.at[1] + (dy / length) * GAP * i]);
}

export function bounds(shape) {
  return boundsOf(items(shape).flatMap(([x, y]) => [project(x - 1, y - 1, 0), project(x + 1, y + 1, 30)]));
}

export function draw(shape) {
  const colors = shapeColors(shape);
  const list = items(shape).sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
  const boxes = list.map(([x, y]) => {
    const g = box(x, y, 0.85, 0.85, 9);
    return tag('path', { d: roundedPath(g.outline, 3), fill: colors.side }) + tag('path', { d: roundedPath(g.top, 3), fill: colors.top }) + tag('path', { d: roundedPath(g.outline, 3), class: 'st-edge-thin', fill: 'none' });
  }).join('');
  if (!shape.label) return boxes;
  // The name runs along the row, on the floor, just in front of it.
  const alongX = Math.abs(shape.dir[0]) >= Math.abs(shape.dir[1]);
  const [tx, ty] = project(shape.at[0] + (alongX ? 0 : 1.1), shape.at[1] - (alongX ? 1.1 : 0));
  const matrix = alongX ? `matrix(1 0.5 -1 0.5 ${r2(tx)} ${r2(ty)})` : `matrix(1 -0.5 1 0.5 ${r2(tx)} ${r2(ty)})`;
  return boxes + `<text class="st-floor-text" transform="${matrix}" font-size="10" font-weight="800">${esc(String(shape.label).toUpperCase())}</text>`;
}

export const overlay = () => '';
