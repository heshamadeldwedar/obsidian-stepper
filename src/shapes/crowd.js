// Users: a low platform with little people standing on it.
import { box, project, roundedPath } from '../iso.js';
import { COLORS } from '../colors.js';
import { tag } from '../svg.js';
import { boundsOf } from './block.js';
import { labelBelow, tagsAbove } from './common.js';

export const layer = 'shapes';
export const reach = shape => Math.min(shape.w, shape.d) * 0.55;
const SLAB = 8;
const PEOPLE_COLORS = ['#b9d1ef', '#f6c08f', '#cdbde9', '#bcdca6', '#f1d27a'];

export function bounds(shape) {
  const g = box(shape.at[0], shape.at[1], shape.w, shape.d, SLAB);
  return boundsOf([...g.outline, ...g.top.map(([x, y]) => [x, y - 40]), [g.outline[3][0], g.outline[3][1] + 34]]);
}

export function draw(shape) {
  const [x, y] = shape.at;
  const g = box(x, y, shape.w, shape.d, SLAB);
  const slab =
    tag('path', { d: roundedPath(g.outline, 10), class: 'st-shadow', transform: 'translate(0 6)' }) +
    tag('path', { d: roundedPath(g.outline, 10), fill: COLORS.slab.side }) +
    tag('path', { d: roundedPath(g.top, 10), fill: COLORS.slab.top }) +
    tag('path', { d: roundedPath(g.outline, 10), class: 'st-edge' });
  return slab + people(shape).map(([px, py, color]) => person(px, py, color)).join('');
}

export function overlay(shape) {
  const [x, y] = shape.at;
  const front = project(x + shape.w / 2, y - shape.d / 2, 0);
  const top = project(x, y, SLAB + 46);
  return labelBelow(project(x, y)[0], front[1] + 24, shape.label, 'users') + tagsAbove(top[0], top[1], (shape.tags ?? []).map(t => ['tag', t]));
}

// People on a grid inside the platform, drawn back to front.
function people(shape) {
  const [x, y] = shape.at;
  const cols = Math.max(1, Math.round(Math.sqrt(shape.count * shape.w / shape.d)));
  const rows = Math.ceil(shape.count / cols);
  const list = [];
  for (let i = 0; i < shape.count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x - shape.w / 2 + (shape.w * (col + 0.5)) / cols;
    const py = y - shape.d / 2 + (shape.d * (row + 0.5)) / rows;
    list.push([px, py, PEOPLE_COLORS[(i * 3 + row) % PEOPLE_COLORS.length]]);
  }
  return list.sort((a, b) => (a[0] - a[1]) - (b[0] - b[1])).map(([px, py, color]) => [...project(px, py, SLAB), color]);
}

function person(sx, sy, color) {
  return tag('g', { class: 'st-person' },
    tag('rect', { x: sx - 5.5, y: sy - 19, width: 11, height: 17, rx: 5, fill: color, class: 'st-edge-thin' }) +
    tag('circle', { cx: sx, cy: sy - 23, r: 4.6, class: 'st-head' }));
}
