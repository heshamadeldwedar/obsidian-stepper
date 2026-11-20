// A see-through dashed box: something planned, or something that was removed.
import { box, roundedPath } from '../iso.js';
import { tag, text } from '../svg.js';
import { bounds as blockBounds } from './block.js';

export const layer = 'shapes';
export const reach = shape => shape.s * 0.62;
export const bounds = shape => blockBounds({ ...shape, lift: 0 });

export function draw(shape) {
  const g = box(shape.at[0], shape.at[1], shape.s, shape.s, shape.h);
  const label = [].concat(shape.label ?? []).filter(Boolean);
  const [cx, cy] = g.center;
  return (
    tag('path', { d: roundedPath(g.outline, 9), class: 'st-ghost' }) +
    tag('path', { d: roundedPath(g.top, 9), class: 'st-ghost' }) +
    label.map((line, i) => text(cx, cy + 16 + i * 14 + shape.h * 0.2, line, { size: 12, weight: 800, cls: 'st-muted' })).join('')
  );
}

export const overlay = () => '';
