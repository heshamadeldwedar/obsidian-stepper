import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthOf, pointAt, linkPoints, linePath, drawLink, drawLinkLabel, isInside, floorRoute, placeLabels } from '../src/links.js';
import { SHAPE_DRAWERS } from '../src/shapes/index.js';
import { readLesson } from '../src/lesson.js';

const step = readLesson({
  steps: [{
    scene: { a: { type: 'block', at: [0, 0] }, b: { type: 'block', at: [10, 0] } },
    links: { l: { from: 'a', to: 'b', label: 'HTTPS', heads: 'both' }, v: { from: 'a', to: 'b', via: [[5, 5]], style: 'cut' } },
  }],
}).steps[0];

test('length and points along a line', () => {
  const line = [[0, 0], [10, 0], [10, 10]];
  assert.equal(lengthOf(line), 20);
  assert.deepEqual(pointAt(line, 5), [5, 0]);
  assert.deepEqual(pointAt(line, 15), [10, 5]);
  assert.deepEqual(pointAt(line, 99), [10, 10], 'past the end stays at the end');
});

test('a link stops just outside each shape outline, so both arrowheads show', () => {
  const points = linkPoints(step.links.l, step.scene);
  const a = SHAPE_DRAWERS.block.outline(step.scene.a);
  const b = SHAPE_DRAWERS.block.outline(step.scene.b);
  assert.equal(isInside(points[0], a), false);
  assert.equal(isInside(points.at(-1), b), false);
  assert.ok(lengthOf(points) < 140, 'shorter than center to center');
});

test('links follow the grid: straight on one grid line, else one corner', () => {
  const at = (x, y) => ({ at: [x, y] });
  assert.equal(floorRoute({ bend: 'x' }, at(0, 0), at(5, 0)).length, 2);
  assert.deepEqual(floorRoute({ bend: 'x' }, at(0, 0), at(5, 3)), [[0, 0], [5, 0], [5, 3]]);
  assert.deepEqual(floorRoute({ bend: 'y' }, at(0, 0), at(5, 3)), [[0, 0], [0, 3], [5, 3]]);
  assert.equal(floorRoute({ bend: 'none' }, at(0, 0), at(5, 3)).length, 2);
});

test('corners through via points are rounded', () => {
  assert.match(linePath([[0, 0], [20, 0], [20, 20]]), /Q20,0/);
});

test('arrowheads, cut marks and labels', () => {
  const both = drawLink(step.links.l, step.scene, 'arr');
  assert.match(both, /marker-end="url\(#arr\)"/);
  assert.match(both, /marker-start="url\(#arr\)"/);
  assert.match(drawLink(step.links.v, step.scene, 'arr'), /st-link-cut-mark/);
  const spots = placeLabels(Object.values(step.links), step.scene, []);
  assert.match(drawLinkLabel(step.links.l, spots.l), /HTTPS/);
  assert.equal(drawLinkLabel(step.links.v, spots.v), '');
});

test('labels keep off shapes and off their own line', () => {
  const links = [step.links.l];
  const free = placeLabels(links, step.scene, []).l;
  // Put a "shape" exactly where the label went: it must move somewhere else.
  const blocker = [free[0] - 40, free[1] - 15, free[0] + 40, free[1] + 15];
  const moved = placeLabels(links, step.scene, [blocker]).l;
  assert.notDeepEqual(moved, free);
  const points = linkPoints(step.links.l, step.scene);
  const nearest = Math.min(...Array.from({ length: 50 }, (_, i) => { const [x, y] = pointAt(points, lengthOf(points) * i / 49); return Math.hypot(x - moved[0], y - moved[1]); }));
  assert.ok(nearest > 12, 'the label center is not on the line');
});
