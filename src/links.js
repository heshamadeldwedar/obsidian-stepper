// Arrows between shapes. A link is a path lying on the floor grid, from one shape to another.
// Without `via`, it follows the grid: straight if both shapes share a grid line, otherwise one rounded
// 90° corner (`bend: x` goes along x first, `bend: y` along y first, `bend: none` cuts straight across).
// The same path is what the moving dots follow.
import { project } from './iso.js';
import { SHAPE_DRAWERS } from './shapes/index.js';
import { tag, pill, r2 } from './svg.js';

const LABEL_GAP = 20; // px between a line and its label, so the text sits beside the line, not on it

// The link's corners on the floor: start, any corners, end (shape centers, before trimming).
export function floorRoute(link, from, to) {
  if (link.via?.length) return [from.at, ...link.via, to.at];
  const [fx, fy] = from.at;
  const [tx, ty] = to.at;
  const onOneLine = Math.abs(fx - tx) < 0.01 || Math.abs(fy - ty) < 0.01;
  if (onOneLine || link.bend === 'none') return [from.at, to.at];
  return [from.at, link.bend === 'y' ? [fx, ty] : [tx, fy], to.at];
}

// The link's screen points. The ends stop at each shape's edge, not its center.
export function linkPoints(link, scene) {
  const from = scene[link.from];
  const to = scene[link.to];
  const floor = floorRoute(link, from, to);
  floor[0] = moveTowards(floor[0], floor[1], SHAPE_DRAWERS[from.type].reach(from));
  floor[floor.length - 1] = moveTowards(floor[floor.length - 1], floor[floor.length - 2], SHAPE_DRAWERS[to.type].reach(to));
  return floor.map(([x, y]) => project(x, y, 0));
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

// The label pill sits just below the line (in the overlay layer, so shapes never cover it).
// By default it goes at the corner of a bent link, or the middle of a straight one.
export function drawLinkLabel(link, scene) {
  if (!link.label) return '';
  const points = linkPoints(link, scene);
  if (link.labelAt === null && points.length === 3) {
    const [x, y] = points[1];
    return pill(x, y + LABEL_GAP, link.label, { size: 10.5 }); // under the corner
  }
  const length = lengthOf(points);
  const at = length * (link.labelAt ?? 0.65); // nearer the target: the start is usually crowded by its own shape
  const [x, y] = pointAt(points, at);
  // Step sideways off the line, to the side that points down the screen.
  const [ax, ay] = pointAt(points, Math.max(0, at - 1));
  const [bx, by] = pointAt(points, Math.min(length, at + 1));
  let [nx, ny] = [-(by - ay), bx - ax];
  const size = Math.hypot(nx, ny) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const width = link.label.length * 10.5 * 0.6 + 20;
  // Push far enough that the pill (about `width` wide) clears the line, not just its center.
  const push = LABEL_GAP + Math.abs(nx / size) * width * 0.45;
  return pill(x + (nx / size) * push, y + (ny / size) * push, link.label, { size: 10.5 });
}
