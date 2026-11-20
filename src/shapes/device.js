// A user's device standing on a rounded platform: a laptop (keyboard base + raised screen) or a phone.
// The screen stands along the base's back-left edge and faces the viewer, like the reference.
import { box, project, roundedPath } from '../iso.js';
import { COLORS } from '../colors.js';
import { tag, r2 } from '../svg.js';
import { boundsOf } from './block.js';
import { labelBelow, tagsAbove } from './common.js';

export const layer = 'shapes';

// Sizes in grid units (w, d) and px (heights).
const SIZES = {
  laptop: { slab: [6.4, 5.6], base: [4.4, 3.6], baseH: 4, screenW: 3.4, screenH: 42 },
  phone: { slab: [4.4, 4.4], base: [1.9, 1.1], baseH: 3, screenW: 1.7, screenH: 46 },
};
const SLAB_H = 14;

const sizeOf = shape => SIZES[shape.kind] ?? SIZES.laptop;
export const reach = shape => Math.min(...sizeOf(shape).slab) * 0.55;

export function bounds(shape) {
  const size = sizeOf(shape);
  const g = box(shape.at[0], shape.at[1], size.slab[0], size.slab[1], SLAB_H);
  return boundsOf([...g.outline, project(shape.at[0], shape.at[1], SLAB_H + size.screenH + 40), [g.outline[3][0], g.outline[3][1] + 34]]);
}

export function draw(shape) {
  const [x, y] = shape.at;
  const size = sizeOf(shape);
  const slab = box(x, y, size.slab[0], size.slab[1], SLAB_H);
  const [bw, bd] = size.base;
  const base = box(x + 0.3, y, bw, bd, size.baseH, SLAB_H);
  return (
    tag('path', { d: roundedPath(slab.outline, 14), class: 'st-shadow', transform: 'translate(0 8)' }) +
    tag('path', { d: roundedPath(slab.outline, 14), fill: COLORS.slab.side }) +
    tag('path', { d: roundedPath(slab.top, 14), fill: COLORS.slab.top }) +
    tag('path', { d: roundedPath(slab.outline, 14), class: 'st-edge' }) +
    tag('path', { d: roundedPath(base.outline, 4), fill: '#e9e3da' }) +
    tag('path', { d: roundedPath(base.top, 4), fill: '#f6f2ec' }) +
    keys(x + 0.3, y, bw, bd, SLAB_H + size.baseH, shape.kind) +
    tag('path', { d: roundedPath(base.outline, 4), class: 'st-edge' }) +
    screen(x + 0.3 - bw / 2 + 0.15, y, size, SLAB_H + size.baseH)
  );
}

// Rows of small keys, drawn flat on the keyboard's top face (a laptop only).
// The matrix lays local (u, v) flat on the floor: u along +y (screen 14, −7), v along +x (screen 14, 7).
function keys(cx, cy, w, d, z, kind) {
  if (kind === 'phone') return '';
  const [ox, oy] = project(cx - w / 2 + 0.95, cy - d / 2 + 0.35, z);
  let rects = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 11; col++) rects += `<rect x="${r2(col * 0.21 * 14)}" y="${r2(row * 0.26 * 14)}" width="2.2" height="2.6" rx="0.5"/>`;
  }
  return `<g class="st-keys" transform="matrix(1 -0.5 1 0.5 ${r2(ox)} ${r2(oy)})">${rects}</g>`;
}

// The screen: a dark frame standing up along the +y direction, with a browser bar and a page inside.
// Local coordinates: u goes along the edge (px), v goes down from the top (px).
function screen(x, y, size, z) {
  const width = size.screenW * 14;
  const height = size.screenH;
  const [ox, oy] = project(x, y - size.screenW / 2, z + height);
  const inner = width - 7;
  const hero = Math.min(10, height * 0.3);
  return `<g transform="matrix(1 -0.5 0 1 ${r2(ox)} ${r2(oy)})">` +
    `<rect x="0" y="0" width="${r2(width)}" height="${height}" rx="3.5" class="st-device-frame"/>` +
    `<rect x="3.5" y="3.5" width="${r2(inner)}" height="${height - 7}" rx="1.5" class="st-device-glass"/>` +
    `<rect x="3.5" y="3.5" width="${r2(inner)}" height="5.5" rx="1.5" class="st-device-bar"/>` +
    `<circle cx="6.5" cy="6.2" r="0.9" fill="#E5534B"/><circle cx="9" cy="6.2" r="0.9" fill="#EFB041"/><circle cx="11.5" cy="6.2" r="0.9" fill="#7FC278"/>` +
    `<rect x="7" y="12" width="${r2(inner - 7)}" height="${r2(hero)}" rx="1.2" class="st-device-page"/>` +
    `<rect x="7" y="${r2(14 + hero)}" width="${r2((inner - 7) * 0.7)}" height="2.2" rx="1" class="st-device-line"/>` +
    `<rect x="7" y="${r2(18 + hero)}" width="${r2((inner - 7) * 0.5)}" height="2.2" rx="1" class="st-device-line"/>` +
    `</g>`;
}

export function overlay(shape) {
  const [x, y] = shape.at;
  const size = sizeOf(shape);
  const front = project(x + size.slab[0] / 2, y - size.slab[1] / 2, 0);
  const top = project(x - size.slab[0] / 2, y + size.slab[1] / 2, SLAB_H + size.screenH + 18);
  return labelBelow(project(x, y)[0], front[1] + 26, shape.label, 'user') +
    tagsAbove(project(x, y)[0], top[1], (shape.tags ?? []).map(t => ['tag', t]));
}
