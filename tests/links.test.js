import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthOf, pointAt, linkPoints, linePath, drawLink, drawLinkLabel } from '../src/links.js';
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

test('a link stops at the edge of each shape, not its center', () => {
  const points = linkPoints(step.links.l, step.scene);
  const full = lengthOf([[0, -4], [140, 66]]);
  assert.ok(lengthOf(points) < full * 0.8);
});

test('corners through via points are rounded', () => {
  assert.match(linePath([[0, 0], [20, 0], [20, 20]]), /Q20,0/);
});

test('arrowheads, cut marks and labels', () => {
  const both = drawLink(step.links.l, step.scene, 'arr');
  assert.match(both, /marker-end="url\(#arr\)"/);
  assert.match(both, /marker-start="url\(#arr\)"/);
  assert.match(drawLink(step.links.v, step.scene, 'arr'), /st-link-cut-mark/);
  assert.match(drawLinkLabel(step.links.l, step.scene), /HTTPS/);
  assert.equal(drawLinkLabel(step.links.v, step.scene), '');
});
