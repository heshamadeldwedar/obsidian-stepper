// Arrows between shapes. A link is a path on the floor from one shape, through optional corners (`via`), to another.
// The same path is what the moving dots follow (phase 6).
import { project } from './iso.js';
import { SHAPE_DRAWERS } from './shapes/index.js';
import { tag, pill, r2 } from './svg.js';

const HEIGHT = 4; // px above the floor, so arrows sit just over the grid

// The link's screen points. The ends stop at each shape's edge, not its center.
export function linkPoints(link, scene) {
  const from = scene[link.from];
  const to = scene[link.to];
  const floor = [from.at, ...(link.via ?? []), to.at];
  floor[0] = moveTowards(floor[0], floor[1], SHAPE_DRAWERS[from.type].reach(from));
  floor[floor.length - 1] = moveTowards(floor[floor.length - 1], floor[floor.length - 2], SHAPE_DRAWERS[to.type].reach(to));
  return floor.map(([x, y]) => project(x, y, HEIGHT));
}

function moveTowards([x, y], [tx, ty], distance) {
  const length = Math.hypot(tx - x, ty - y) || 1;
  const step = Math.min(distance, length * 0.45) / length;
  return [x + (tx - x) * step, y + (ty - y) * step];
}

// Total length of a line through `points`.
export function lengthOf(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

// The point `distance` px along the line. Past the end gives the last point.
export function pointAt(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const piece = Math.hypot(bx - ax, by - ay);
    if (distance <= piece) {
      const t = piece ? distance / piece : 0;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    distance -= piece;
  }
  return points[points.length - 1];
}

// An open line through the points, with soft corners at each `via` point.
export function linePath(points, radius = 10) {
  let d = `M${r2(points[0][0])},${r2(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const a = pointAt([points[i], points[i - 1]], radius);
    const b = pointAt([points[i], points[i + 1]], radius);
    d += ` L${r2(a[0])},${r2(a[1])} Q${r2(x)},${r2(y)} ${r2(b[0])},${r2(b[1])}`;
  }
  const last = points[points.length - 1];
  return `${d} L${r2(last[0])},${r2(last[1])}`;
}

export function drawLink(link, scene, arrowId) {
  const points = linkPoints(link, scene);
  const arrow = `url(#${arrowId})`;
  const path = tag('path', {
    d: linePath(points),
    class: `st-link st-link-${link.style}`,
    'marker-end': link.heads !== 'none' ? arrow : '',
    'marker-start': link.heads === 'both' ? arrow : '',
  });
  const [mx, my] = pointAt(points, lengthOf(points) / 2);
  const cut = link.style === 'cut'
    ? tag('path', { d: `M${r2(mx - 6)},${r2(my - 6)} L${r2(mx + 6)},${r2(my + 6)} M${r2(mx + 6)},${r2(my - 6)} L${r2(mx - 6)},${r2(my + 6)}`, class: 'st-link-cut-mark' })
    : '';
  return path + cut;
}

// The label pill sits in the overlay layer, so shapes never cover it.
export function drawLinkLabel(link, scene) {
  if (!link.label) return '';
  const points = linkPoints(link, scene);
  const [x, y] = pointAt(points, lengthOf(points) * link.labelAt);
  return pill(x, y, link.label, { size: 10.5 });
}
