// How one step turns into the next. The timing copies what we measured on the reference site
// (docs/phase-7-step-change.md has the table). stateAt(plan, ms) says what everything looks like
// at any moment, so the animation is plain math and easy to test.
import { between } from './camera.js';

// All times in ms after the click.
export const TIMING = {
  drain: 500,           // old dots finish their trip; no new ones start
  camera: [150, 950],   // the view glides to fit the new scene
  morph: [200, 900],    // shapes that stay move, resize and recolor
  remove: [0, 300],     // shapes that leave fade out
  floor: [800, 1300],   // new zones fade in
  linksIn: [800, 1300], // new arrows fade in
  dropStart: 900,       // the first new shape starts dropping in
  dropGap: 120,         // the next one starts this much later (back to front)
  dropLength: 600,
  fadeLength: 500,
  dropHeight: 120,      // px above its place
  minimum: 1100,        // new dots never start earlier than this
};

const NUMBERS = ['s', 'h', 'w', 'd', 'r', 'heat', 'dead', 'dim', 'lift', 'opacity'];

// Work out who stays, who leaves and who arrives, once per step change.
export function planChange(from, to, fromView, toView) {
  const stays = [], leaves = [], arrives = [];
  for (const shape of Object.values(to.scene)) {
    const old = from.scene[shape.id];
    if (old && old.type === shape.type) stays.push({ from: old, to: shape });
    else arrives.push(shape);
  }
  for (const shape of Object.values(from.scene)) {
    const next = to.scene[shape.id];
    if (!next || next.type !== shape.type) leaves.push(shape);
  }
  // New shapes drop in back to front, like bricks being laid. Zones don't drop, they fade in on the floor.
  const drops = arrives.filter(s => s.type !== 'zone').sort((a, b) => (a.at[0] - a.at[1]) - (b.at[0] - b.at[1]));
  const lastDrop = drops.length ? TIMING.dropStart + (drops.length - 1) * TIMING.dropGap + TIMING.dropLength : 0;
  return {
    from, to, fromView, toView, stays, leaves,
    zones: arrives.filter(s => s.type === 'zone'),
    drops,
    duration: Math.max(TIMING.minimum, lastDrop),
  };
}

// Everything at `ms` after the click: the shapes to draw, the links with their opacity, the camera,
// and whether new dots may start yet.
export function stateAt(plan, ms) {
  const shapes = [];
  for (const { from, to } of plan.stays) shapes.push(morph(from, to, easeOut(progress(ms, TIMING.morph))));
  for (const shape of plan.leaves) {
    const fade = 1 - progress(ms, TIMING.remove);
    if (fade > 0) shapes.push({ ...shape, opacity: (shape.opacity ?? 1) * fade });
  }
  for (const zone of plan.zones) shapes.push({ ...zone, opacity: progress(ms, TIMING.floor) });
  plan.drops.forEach((shape, i) => {
    const start = TIMING.dropStart + i * TIMING.dropGap;
    const fall = progress(ms, [start, start + TIMING.dropLength]);
    const fade = progress(ms, [start, start + TIMING.fadeLength]);
    if (fade > 0) shapes.push({ ...shape, opacity: fade, lift: (shape.lift ?? 0) + TIMING.dropHeight * (1 - easeOutBack(fall)) });
  });

  // Links are drawn against the shapes as they are right now, so they follow shapes that move.
  const scene = Object.fromEntries(shapes.map(s => [s.id, s]));
  const linkOpacity = {};
  const links = [];
  for (const link of Object.values(plan.to.links)) {
    links.push(link);
    linkOpacity[link.id] = plan.from.links[link.id] ? 1 : progress(ms, TIMING.linksIn);
  }
  for (const link of Object.values(plan.from.links)) {
    if (plan.to.links[link.id] || !scene[link.from] || !scene[link.to]) continue;
    links.push(link);
    linkOpacity[link.id] = 1 - progress(ms, TIMING.remove);
  }
  const usable = links.filter(link => scene[link.from] && scene[link.to]);

  return {
    shapes,
    scene,
    links: usable,
    linkOpacity,
    view: between(plan.fromView, plan.toView, easeInOut(progress(ms, TIMING.camera))),
    startNewFlows: ms >= plan.duration,
    done: ms >= plan.duration,
  };
}

// A shape part way between two states. Numbers slide; words (label, color, icon) switch half way.
export function morph(from, to, t) {
  const shape = { ...(t < 0.5 ? from : to) };
  for (const key of NUMBERS) {
    if (typeof from[key] === 'number' && typeof to[key] === 'number') shape[key] = from[key] + (to[key] - from[key]) * t;
  }
  shape.at = [from.at[0] + (to.at[0] - from.at[0]) * t, from.at[1] + (to.at[1] - from.at[1]) * t];
  // The CPU gauge slides between two values, but appears or disappears (−1) at the half-way point.
  if (from.cpu >= 0 && to.cpu >= 0) shape.cpu = from.cpu + (to.cpu - from.cpu) * t;
  return shape;
}

// 0 before the window, 1 after it, a straight line in between.
export function progress(ms, [start, end]) {
  return Math.max(0, Math.min(1, (ms - start) / (end - start)));
}

export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Goes a little past 1 before settling: the small bounce when a shape lands (about 8 px on a 120 px drop).
export function easeOutBack(t) {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
