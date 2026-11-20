// A dashed area on the floor (a tier, a region, a cluster) with its name written on the floor.
import { project, roundedPath } from '../iso.js';
import { tag, esc, r2 } from '../svg.js';
import { boundsOf } from './block.js';

export const layer = 'floor';
export const reach = shape => Math.min(shape.w, shape.d) / 2;

function corners(shape) {
  const [x, y] = shape.at;
  const x0 = x - shape.w / 2, x1 = x + shape.w / 2, y0 = y - shape.d / 2, y1 = y + shape.d / 2;
  return [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
}

export const bounds = shape => boundsOf(corners(shape));

export function draw(shape) {
  const [x, y] = shape.at;
  // The name runs along the front-left edge. This matrix lays text flat on the floor along +x.
  const [tx, ty] = project(x - shape.w / 2 + 0.7, y - shape.d / 2 + 0.25);
  return (
    tag('path', { d: roundedPath(corners(shape), 8), class: 'st-zone' }) +
    (shape.label ? `<text class="st-floor-text" transform="matrix(1 0.5 -1 0.5 ${r2(tx)} ${r2(ty)})" font-size="10.5" font-weight="800">${esc(String(shape.label).toUpperCase())}</text>` : '')
  );
}

export const overlay = () => '';
