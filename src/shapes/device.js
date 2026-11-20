// A user's device on a rounded platform: a laptop or a phone.
// Laptop, back to front (x grows towards the viewer's lower right):
//   a thin dark screen standing at the back, then a thin keyboard lying in front of it
//   (4 rows of keys and a touchpad), all on a square platform. Proportions follow the reference.
import { box, project, roundedPath } from '../iso.js';
import { COLORS } from '../colors.js';
import { tag, r2 } from '../svg.js';
import { boundsOf } from './block.js';
import { labelBelow, tagsAbove } from './common.js';

export const layer = 'shapes';

const SLAB = 6;      // platform size in grid units (square)
const SLAB_H = 16;   // platform thickness, px
const SCREEN = { gap: 0.7, thick: 0.35, inset: 0.9, z0: 19, z1: 66 }; // screen slab, measured from the platform's back edge
const KEYBOARD = { depth: 2.7, z0: 16, z1: 19 };                      // lies in front of the screen
const PHONE = { thick: 0.45, width: 2.4, z0: 17, z1: 80 };

export const reach = () => SLAB * 0.55;

const platform = shape => box(shape.at[0], shape.at[1], SLAB, SLAB, SLAB_H);
export const outline = shape => platform(shape).outline;

export function bounds(shape) {
  const g = platform(shape);
  return boundsOf([...g.outline, project(shape.at[0], shape.at[1], (shape.kind === 'phone' ? PHONE.z1 : SCREEN.z1) + 30), [g.outline[3][0], g.outline[3][1] + 34]]);
}

export function draw(shape) {
  const g = platform(shape);
  const slab =
    tag('path', { d: roundedPath(g.outline, 12), class: 'st-shadow', transform: 'translate(0 8)' }) +
    tag('path', { d: roundedPath(g.outline, 12), fill: COLORS.slab.side }) +
    tag('path', { d: roundedPath(g.top, 12), fill: COLORS.slab.top }) +
    tag('path', { d: roundedPath(g.outline, 12), class: 'st-edge' });
  return slab + (shape.kind === 'phone' ? phone(shape) : laptop(shape));
}

// A box between floor corners [x0, x1] × [y0, y1], from height z0 to z1, with its own face colors.
function slabBox([x0, x1], [y0, y1], z0, z1, colors, corner) {
  const g = box((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, z1 - z0, z0);
  return tag('path', { d: roundedPath(g.outline, corner), fill: colors.left }) +
    tag('path', { d: roundedPath(g.right, corner), fill: colors.front }) +
    tag('path', { d: roundedPath(g.top, corner), fill: colors.top }) +
    tag('path', { d: roundedPath(g.outline, corner), class: 'st-edge-device' });
}

function laptop(shape) {
  const [x, y] = shape.at;
  const back = x - SLAB / 2;
  const ys = [y - SLAB / 2 + SCREEN.inset, y + SLAB / 2 - SCREEN.inset];
  const screenX = [back + SCREEN.gap, back + SCREEN.gap + SCREEN.thick];
  const keyboardX = [screenX[1], screenX[1] + KEYBOARD.depth];
  const width = (ys[1] - ys[0]) * 14; // px along the edge

  // Keys and touchpad lie flat on the keyboard: local u runs along +y, local v runs along +x (14 px per unit).
  const [kx, ky] = project(keyboardX[0] + 0.15, ys[0], KEYBOARD.z1);
  const columns = Math.floor((width - 6) / 4.7);
  let keys = '';
  for (let row = 0; row < 4; row++) for (let col = 0; col < columns; col++) keys += `<rect x="${r2(3 + col * 4.7)}" y="${r2(2.5 + row * 4.3)}" width="3.8" height="3.3" rx="0.7"/>`;
  const touchpad = `<rect x="${r2(width / 2 - 10)}" y="21.5" width="20" height="9" rx="1.6"/>`;

  // The screen's picture lies on its front face: local u along +y, local v straight down.
  const [sx, sy] = project(screenX[1], ys[0], SCREEN.z1);
  const height = SCREEN.z1 - SCREEN.z0;
  const glassW = width - 6.8;
  const picture =
    `<rect x="3.4" y="3.4" width="${r2(glassW)}" height="${height - 8}" rx="1.5" class="st-device-glass"/>` +
    `<rect x="3.4" y="3.4" width="${r2(glassW)}" height="7" rx="1.5" class="st-device-bar"/>` +
    `<circle cx="6.6" cy="6.9" r="1" fill="#E5534B"/><circle cx="9.6" cy="6.9" r="1" fill="#EFB041"/><circle cx="12.6" cy="6.9" r="1" fill="#7FC278"/>` +
    `<rect x="16" y="5" width="${r2(glassW - 16)}" height="3.8" rx="1.9" class="st-device-glass"/>` +
    `<rect x="7" y="14.5" width="${r2(glassW - 7.2)}" height="12" rx="1.5" class="st-device-page"/>` +
    `<rect x="7" y="29.5" width="${r2((glassW - 7.2) * 0.62)}" height="2.6" rx="1.3" class="st-device-line"/>` +
    `<rect x="7" y="34" width="${r2((glassW - 7.2) * 0.8)}" height="2.6" rx="1.3" class="st-device-line"/>`;

  return (
    slabBox(keyboardX, ys, KEYBOARD.z0, KEYBOARD.z1, { top: '#efeae4', front: '#cfc8c0', left: '#ddd6ce' }, 2.5) +
    `<g class="st-keys" transform="matrix(1 -0.5 1 0.5 ${r2(kx)} ${r2(ky)})">${keys}${touchpad}</g>` +
    slabBox(screenX, ys, SCREEN.z0, SCREEN.z1, { top: '#8b8580', front: '#3d3935', left: '#6e6862' }, 3) +
    `<g transform="matrix(1 -0.5 0 1 ${r2(sx)} ${r2(sy)})">${picture}</g>`
  );
}

// A phone standing upright on the platform, its screen facing the viewer.
function phone(shape) {
  const [x, y] = shape.at;
  const xs = [x - 0.2, x - 0.2 + PHONE.thick];
  const ys = [y - PHONE.width / 2, y + PHONE.width / 2];
  const [sx, sy] = project(xs[1], ys[0], PHONE.z1);
  const width = PHONE.width * 14;
  const height = PHONE.z1 - PHONE.z0;
  const inner = width - 5;
  const picture =
    `<rect x="2.5" y="2.5" width="${r2(inner)}" height="${height - 5}" rx="3.5" class="st-device-glass"/>` +
    `<rect x="${r2(width / 2 - 4)}" y="3.6" width="8" height="2.2" rx="1.1" fill="#3d3935"/>` +
    `<rect x="2.5" y="8" width="${r2(inner)}" height="7" class="st-device-bar"/>` +
    `<rect x="5" y="19" width="${r2(inner * 0.62)}" height="7" rx="3" class="st-device-line"/>` +
    `<rect x="${r2(2.5 + inner * 0.32)}" y="29" width="${r2(inner * 0.6)}" height="7" rx="3" class="st-device-page"/>` +
    `<rect x="5" y="39" width="${r2(inner * 0.5)}" height="7" rx="3" class="st-device-line"/>`;
  return slabBox(xs, ys, PHONE.z0, PHONE.z1, { top: '#8b8580', front: '#3d3935', left: '#6e6862' }, 3) +
    `<g transform="matrix(1 -0.5 0 1 ${r2(sx)} ${r2(sy)})">${picture}</g>`;
}

export function overlay(shape) {
  const [x, y] = shape.at;
  const front = project(x + SLAB / 2, y - SLAB / 2, 0);
  const top = project(x - SLAB / 2, y, (shape.kind === 'phone' ? PHONE.z1 : SCREEN.z1) + 16);
  return labelBelow(project(x, y)[0], front[1] + 24, shape.label, 'user') +
    tagsAbove(top[0], top[1], (shape.tags ?? []).map(t => ['tag', t]));
}
