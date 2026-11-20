// Arrows between shapes. A link is a path lying on the floor grid, from one shape to another.
// Without `via`, it follows the grid: straight if both shapes share a grid line, otherwise one rounded
// 90° corner (`bend: x` goes along x first, `bend: y` along y first, `bend: none` cuts straight across).
// The same path is what the moving dots follow.
import { project } from './iso.js';
import { SHAPE_DRAWERS } from './shapes/index.js';
import { tag, pill, r2 } from './svg.js';

// The link's corners on the floor: start, any corners, end (shape centers, before trimming).
export function floorRoute(link, from, to) {
  if (link.via?.length) return [from.at, ...link.via, to.at];
  const [fx, fy] = from.at;
  const [tx, ty] = to.at;
  const onOneLine = Math.abs(fx - tx) < 0.01 || Math.abs(fy - ty) < 0.01;
  if (onOneLine || link.bend === 'none') return [from.at, to.at];
  return [from.at, link.bend === 'y' ? [fx, ty] : [tx, fy], to.at];
}

// The link's screen points, on the floor. Each end stops just outside its shape's outline on screen,
// so an arrowhead is never hidden behind the shape (a raised platform covers the floor behind it).
export function linkPoints(link, scene) {
  const from = scene[link.from];
  const to = scene[link.to];
  const line = floorRoute(link, from, to).map(([x, y]) => project(x, y, 0));
  const start = trimStart(line, SHAPE_DRAWERS[from.type].outline(from));
  return trimStart(start.reverse(), SHAPE_DRAWERS[to.type].outline(to)).reverse();
}

const MARGIN = 3; // px of space between a shape and the end of its arrow

// Drop the part of the line that is inside `polygon`, measured from the line's start.
export function trimStart(points, polygon) {
  const length = lengthOf(points);
  const keep = Math.min(12, length / 2); // always leave a little line, even if shapes overlap
  let inside = 0;
  while (inside < length - keep && isInside(pointAt(points, inside), polygon)) inside += 1;
  return cutFrom(points, Math.min(inside + MARGIN, length - keep));
}

// The line from `distance` px onwards.
function cutFrom(points, distance) {
  const rest = [pointAt(points, distance)];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    walked += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (walked > distance) rest.push(points[i]);
  }
  return rest;
}

// Is the point inside the polygon? (Count how many edges a ray to the right crosses.)
export function isInside([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
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

// ——— Labels ———
// Each label tries spots along its line (near where the author asked) and on both sides of it,
// and takes the spot that overlaps the least: shapes, the other labels, and any line.
// That keeps text off lines and shapes, the way the reference does it.

const LABEL_SIZE = 10.5;
const labelBox = text => ({ w: String(text).length * LABEL_SIZE * 0.6 + 20, h: LABEL_SIZE + 10 });

// Where each link's label goes: { [link id]: [x, y] } (the pill's center).
// `shapeBoxes` are [x0, y0, x1, y1] screen boxes the labels should keep off.
export function placeLabels(links, scene, shapeBoxes) {
  const lines = links.map(link => linkPoints(link, scene));
  const linePoints = lines.flatMap(points => sample(points, 6));
  const placed = [];
  const spots = {};
  links.forEach((link, i) => {
    if (!link.label) return;
    const points = lines[i];
    const length = lengthOf(points);
    // A bent link's label prefers its corner; a straight one prefers 65% of the way (its start is crowded by its own shape).
    const cornerAt = points.length === 3 ? Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) / length : 0.65;
    const wanted = link.labelAt ?? cornerAt;
    const { w, h } = labelBox(link.label);
    let best = null;
    for (const shift of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24, 0.32, -0.32]) {
      const t = Math.min(0.9, Math.max(0.1, wanted + shift));
      const [x, y] = pointAt(points, length * t);
      const [nx, ny] = normalAt(points, length * t);
      for (const side of [1, -1]) {
        for (const gap of [10, 22]) {
          // Far enough along the normal that the whole pill clears the line, plus the gap.
          const push = gap + (Math.abs(nx) * w + Math.abs(ny) * h) / 2;
          const cx = x + nx * side * push;
          const cy = y + ny * side * push;
          const rect = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
          const cost =
            shapeBoxes.reduce((sum, box) => sum + overlap(rect, box), 0) +
            placed.reduce((sum, box) => sum + overlap(rect, box, 4) * 3, 0) +
            linePoints.filter(p => inRect(p, rect, 3)).length * 60 +
            Math.abs(shift) * 400 + (side === 1 ? 0 : 20) + (gap - 10);
          if (!best || cost < best.cost) best = { cost, rect, center: [cx, cy] };
        }
      }
    }
    placed.push(best.rect);
    spots[link.id] = best.center;
  });
  return spots;
}

export function drawLinkLabel(link, center) {
  return link.label && center ? pill(center[0], center[1], link.label, { size: LABEL_SIZE }) : '';
}

// The unit normal of the line at `distance`, pointing down the screen (side 1 = below the line).
function normalAt(points, distance) {
  const length = lengthOf(points);
  const [ax, ay] = pointAt(points, Math.max(0, distance - 1));
  const [bx, by] = pointAt(points, Math.min(length, distance + 1));
  let [nx, ny] = [-(by - ay), bx - ax];
  const size = Math.hypot(nx, ny) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; }
  return [nx / size, ny / size];
}

function sample(points, step) {
  const length = lengthOf(points);
  const out = [];
  for (let d = 0; d <= length; d += step) out.push(pointAt(points, d));
  return out;
}

// Area two boxes share, with an optional margin around the first.
function overlap([a0, b0, a1, b1], [c0, d0, c1, d1], margin = 0) {
  const w = Math.min(a1 + margin, c1) - Math.max(a0 - margin, c0);
  const h = Math.min(b1 + margin, d1) - Math.max(b0 - margin, d0);
  return w > 0 && h > 0 ? w * h : 0;
}

const inRect = ([x, y], [x0, y0, x1, y1], margin) => x > x0 - margin && x < x1 + margin && y > y0 - margin && y < y1 + margin;
