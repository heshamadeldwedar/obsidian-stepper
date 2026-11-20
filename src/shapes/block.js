// A rounded 3D box: a server, cache, load balancer, any service.
import { box, project, roundedPath } from '../iso.js';
import { shapeColors } from '../colors.js';
import { tag, text, icon } from '../svg.js';
import { tagsAbove } from './common.js';

export const layer = 'shapes';

// How far a link stops from the center (floor units), so arrows end at the box's edge.
export const reach = shape => shape.s * 0.62;

export function bounds(shape) {
  const g = box(shape.at[0], shape.at[1], shape.s, shape.s, shape.h, shape.lift);
  return boundsOf([...g.outline, project(shape.at[0], shape.at[1], shape.h + shape.lift + 40)]);
}

export function draw(shape) {
  const [x, y] = shape.at;
  const g = box(x, y, shape.s, shape.s, shape.h, shape.lift);
  const floor = box(x, y, shape.s, shape.s, shape.h, 0);
  const colors = shapeColors(shape);
  const corner = Math.min(9, shape.h / 3);
  const label = [].concat(shape.label ?? []).filter(Boolean);
  const [cx, cy] = g.center;
  const size = shape.s >= 6 ? 1.15 : shape.s < 3.5 ? 0.8 : 1;

  return (
    tag('path', { d: roundedPath(floor.outline, corner), class: 'st-shadow', transform: 'translate(0 7)' }) +
    tag('path', { d: roundedPath(g.outline, corner), fill: colors.side }) +
    tag('path', { d: roundedPath(g.right, corner), class: 'st-shade' }) +
    tag('path', { d: roundedPath(g.top, corner), fill: colors.top }) +
    tag('path', { d: roundedPath(g.outline, corner), class: 'st-edge' }) +
    icon(shape.glyph, cx, cy + (label.length ? -6 : 2) * size, 22 * size) +
    label.map((line, i) => text(cx, cy + (12 + i * 14 - (label.length - 1) * 4) * size + shape.h * 0.25, line, { size: 12.5 * size, weight: 800 })).join('') +
    (shape.sub ? text(cx, cy + 22 * size + shape.h * 0.25 + label.length * 6, shape.sub, { size: 10, weight: 600, cls: 'st-muted' }) : '') +
    (shape.dead > 0.01 ? deadMark(cx, cy, shape.dead) : '')
  );
}

// Things that float above the box and must never be hidden by other shapes: the CPU gauge and tags.
export function overlay(shape) {
  const [x, y] = shape.at;
  // Pills stack above the top corner of the box.
  const [, topY] = project(x - shape.s / 2, y + shape.s / 2, shape.h + shape.lift);
  const items = [];
  if (shape.cpu >= 0) items.push(['cpu', shape.cpu]);
  for (const t of shape.tags ?? []) items.push(['tag', t]);
  if (shape.dead > 0.5) items.push(['tag', { text: 'DOWN', tone: 'red', icon: 'triangle-alert' }]);
  return tagsAbove(project(x, y, 0)[0], topY - 16, items);
}

function deadMark(cx, cy, amount) {
  return tag('g', { class: 'st-dead', opacity: amount },
    tag('path', { d: `M${cx - 12},${cy - 12} L${cx + 12},${cy + 12} M${cx + 12},${cy - 12} L${cx - 12},${cy + 12}` }));
}

export function boundsOf(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
