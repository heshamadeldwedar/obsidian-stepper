import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLesson } from '../src/lesson.js';
import { planChange, stateAt, morph, easeOutBack, TIMING } from '../src/transition.js';

const [one, two] = readLesson({
  steps: [
    {
      scene: { users: { type: 'crowd', at: [0, -6] }, s0: { type: 'block', at: [0, 4] }, old: { type: 'db', at: [8, 0] } },
      links: { u: { from: 'users', to: 's0' }, x: { from: 's0', to: 'old' } },
    },
    {
      scene: {
        old: null,
        s0: { at: [2, 4], s: 2.8, heat: 1, label: 'Server A' },
        zone: { type: 'zone', at: [3, 5], w: 8, d: 6 },
        b: { type: 'block', at: [4, 2] },
        c: { type: 'block', at: [4, 8] },
      },
      links: { v: { from: 'users', to: 'b' } },
    },
  ],
}).steps;
const view = { x: 0, y: 0, w: 100, h: 100 };
const plan = planChange(one, two, view, { x: 50, y: 50, w: 200, h: 200 });
const at = (ms, id) => stateAt(plan, ms).shapes.find(s => s.id === id);

test('the plan sorts shapes into stays, leaves, zones and drops', () => {
  assert.deepEqual(plan.stays.map(p => p.to.id).sort(), ['s0', 'users']);
  assert.deepEqual(plan.leaves.map(s => s.id), ['old']);
  assert.deepEqual(plan.zones.map(s => s.id), ['zone']);
  assert.deepEqual(plan.drops.map(s => s.id), ['c', 'b'], 'back to front: c (x − y = −4) before b (x − y = 2)');
  assert.equal(plan.duration, TIMING.dropStart + TIMING.dropGap + TIMING.dropLength);
});

test('at the click, everything is where it was', () => {
  assert.deepEqual(at(0, 's0').at, [0, 4]);
  assert.equal(at(0, 's0').heat, 0);
  assert.equal(at(0, 'old').opacity, 1);
  assert.equal(at(0, 'b'), undefined, 'new shapes are not there yet');
  assert.deepEqual(stateAt(plan, 0).view, view);
});

test('shapes that stay slide and recolor; leaving shapes fade out', () => {
  const mid = at(550, 's0');
  assert.ok(mid.at[0] > 0 && mid.at[0] < 2);
  assert.ok(mid.heat > 0 && mid.heat < 1);
  assert.equal(at(400, 'old'), undefined, 'gone after 300 ms');
});

test('new shapes drop from above with a small bounce, one after another', () => {
  const first = plan.drops[0].id;
  const second = plan.drops[1].id;
  assert.equal(at(TIMING.dropStart + 1, first).lift > 100, true, 'starts high');
  assert.equal(at(TIMING.dropStart + 1, second), undefined, 'the second waits its turn');
  const lifts = [];
  for (let ms = TIMING.dropStart + 20; ms <= TIMING.dropStart + TIMING.dropLength; ms += 20) lifts.push(at(ms, first).lift);
  assert.ok(Math.min(...lifts) < -5 && Math.min(...lifts) > -12, 'dips about 8 px below the floor');
  assert.equal(Math.round(lifts.at(-1)), 0, 'and settles on it');
});

test('new links fade in, removed links fade out, the camera glides', () => {
  assert.equal(stateAt(plan, 0).linkOpacity.v, 0);
  assert.equal(stateAt(plan, 1400).linkOpacity.v, 1);
  assert.equal(stateAt(plan, 100).linkOpacity.x < 1, true);
  const mid = stateAt(plan, 550).view;
  assert.ok(mid.x > 0 && mid.x < 50);
});

test('new dots start only when the animation is over', () => {
  assert.equal(stateAt(plan, 1000).startNewFlows, false);
  assert.equal(stateAt(plan, plan.duration).startNewFlows, true);
  assert.equal(stateAt(plan, plan.duration).done, true);
});

test('morph: words switch half way; the CPU gauge only slides between two shown values', () => {
  const a = { at: [0, 0], s: 2, label: 'A', cpu: -1 };
  const b = { at: [2, 2], s: 4, label: 'B', cpu: 0.8 };
  assert.equal(morph(a, b, 0.4).label, 'A');
  assert.equal(morph(a, b, 0.6).label, 'B');
  assert.equal(morph(a, b, 0.4).cpu, -1);
  assert.equal(morph({ ...a, cpu: 0.2 }, b, 0.5).cpu, 0.5);
  assert.ok(easeOutBack(0.75) > 1, 'overshoots');
});
