import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, roundedPath, box, depth } from '../src/iso.js';
import { fit, between } from '../src/camera.js';
import { mix, shapeColors } from '../src/colors.js';
import { esc, tag, pill } from '../src/svg.js';
import { SHAPE_DRAWERS } from '../src/shapes/index.js';
import { SHAPES } from '../src/lesson.js';

test('projection: one unit is 14 px across and 7 px down, height goes up', () => {
  assert.deepEqual(project(0, 0, 0), [0, 0]);
  assert.deepEqual(project(1, 0, 0), [14, 7]);
  assert.deepEqual(project(0, 1, 0), [14, -7]);
  assert.deepEqual(project(0, 0, 10), [0, -10]);
});

test('rounded path has one curve per corner and closes', () => {
  const d = roundedPath([[0, 0], [10, 0], [10, 10]], 2);
  assert.equal((d.match(/Q/g) || []).length, 3);
  assert.ok(d.trim().endsWith('Z'));
});

test('a box has a 4-corner top and a 6-corner outline; nearer shapes sort later', () => {
  const g = box(0, 0, 2, 2, 10);
  assert.equal(g.top.length, 4);
  assert.equal(g.outline.length, 6);
  assert.ok(depth({ at: [2, 0] }) > depth({ at: [0, 2] }));
});

test('camera fits every box with room around it, and moves smoothly', () => {
  const view = fit([[0, 0, 400, 200]], 0.1);
  assert.ok(view.x < 0 && view.y < 0);
  assert.ok(view.x + view.w > 400 && view.y + view.h > 200);
  const clear = fit([[0, 0, 400, 200]], 0.1, 360, { top: 0.2, right: 0.3 });
  assert.ok(clear.y < view.y, 'room above for the numbers bar');
  assert.ok(clear.x + clear.w > view.x + view.w * 1.2, 'room on the right for the card');
  assert.deepEqual(between({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 10, w: 20, h: 20 }, 0.5), { x: 5, y: 5, w: 15, h: 15 });
});

test('colors mix, and heat turns a shape red', () => {
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.notEqual(shapeColors({ color: 'blue', heat: 1 }).top, shapeColors({ color: 'blue', heat: 0 }).top);
});

test('text from the YAML is escaped', () => {
  assert.equal(esc('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  assert.equal(tag('rect', { x: 1.234, hidden: false }), '<rect x="1.23"/>');
  assert.ok(pill(0, 0, '<script>').includes('&lt;script&gt;'));
});

test('every shape type draws, has bounds and stays inside its layer', () => {
  for (const [type, drawer] of Object.entries(SHAPE_DRAWERS)) {
    const shape = { id: 'x', type, ...SHAPES[type], at: [1, 2], label: 'Name' };
    assert.ok(drawer.draw(shape).length > 50, `${type} draws`);
    assert.equal(drawer.bounds(shape).length, 4, `${type} bounds`);
    assert.ok(['floor', 'shapes'].includes(drawer.layer), `${type} layer`);
    assert.ok(drawer.reach(shape) > 0, `${type} reach`);
    assert.ok(drawer.outline(shape).length >= 3, `${type} outline`);
    assert.equal(typeof drawer.overlay(shape), 'string');
  }
});
