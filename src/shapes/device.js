// A user's device: a laptop or a phone standing on a small platform.
import { box, project, roundedPath } from '../iso.js';
import { COLORS } from '../colors.js';
import { tag } from '../svg.js';
import { boundsOf } from './block.js';
import { labelBelow, tagsAbove } from './common.js';

export const layer = 'shapes';
const SIZES = { laptop: { w: 3.4, d: 2.6, screen: 2.8, tall: 30 }, phone: { w: 2.6, d: 2.6, screen: 1.3, tall: 38 } };
const BASE = 6;

export const reach = shape => SIZES[shape.kind]?.w * 0.6 ?? 2;

export function bounds(shape) {
  const size = SIZES[shape.kind] ?? SIZES.laptop;
  const g = box(shape.at[0], shape.at[1], size.w, size.d, BASE);
  return boundsOf([...g.outline, project(shape.at[0], shape.at[1], BASE + size.tall + 40), [g.outline[3][0], g.outline[3][1] + 34]]);
}

export function draw(shape) {
  const [x, y] = shape.at;
  const size = SIZES[shape.kind] ?? SIZES.laptop;
  const g = box(x, y, size.w, size.d, BASE);
  // The screen stands up along the back edge of the platform.
  const back = y + size.d / 2 - 0.5;
  const left = x - size.screen / 2;
  const right = x + size.screen / 2;
  const frame = [project(left, back, BASE), project(right, back, BASE), project(right, back, BASE + size.tall), project(left, back, BASE + size.tall)];
  const inset = 3;
  const glass = [project(left + 0.2, back, BASE + inset), project(right - 0.2, back, BASE + inset), project(right - 0.2, back, BASE + size.tall - inset), project(left + 0.2, back, BASE + size.tall - inset)];
  return (
    tag('path', { d: roundedPath(g.outline, 8), class: 'st-shadow', transform: 'translate(0 5)' }) +
    tag('path', { d: roundedPath(g.outline, 8), fill: COLORS.slab.side }) +
    tag('path', { d: roundedPath(g.top, 8), fill: COLORS.slab.top }) +
    tag('path', { d: roundedPath(g.outline, 8), class: 'st-edge' }) +
    tag('path', { d: roundedPath(frame, 4), class: 'st-device-frame' }) +
    tag('path', { d: roundedPath(glass, 2), class: 'st-device-glass' })
  );
}

export function overlay(shape) {
  const [x, y] = shape.at;
  const size = SIZES[shape.kind] ?? SIZES.laptop;
  const front = project(x + size.w / 2, y - size.d / 2, 0);
  const top = project(x, y, BASE + size.tall + 14);
  return labelBelow(project(x, y)[0], front[1] + 22, shape.label, shape.kind === 'phone' ? 'smartphone' : 'laptop') +
    tagsAbove(top[0], top[1], (shape.tags ?? []).map(t => ['tag', t]));
}
