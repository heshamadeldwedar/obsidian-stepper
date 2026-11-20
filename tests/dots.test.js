import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFlow, tick, where, SPEED } from '../src/dots.js';

const line = { points: [[0, 0], [SPEED * 2, 0]] }; // two seconds long
const flow = (extra = {}) => ({ route: ['l'], rate: 2, kind: 'req', fail: 0, bounce: false, reverse: false, ...extra });
const steady = () => 0.5; // a fixed "random" so tests repeat

test('dots start at the flow rate', () => {
  const state = startFlow(flow({ rate: 4 }), line, steady);
  tick(state, 1);
  assert.equal(state.dots.length, 4);
});

test('no new dots while spawning is off (the drain before a step change)', () => {
  const state = startFlow(flow(), line, steady);
  tick(state, 0.5);
  const before = state.dots.length;
  tick(state, 0.5, { spawning: false });
  assert.equal(state.dots.length, before);
});

test('a dot travels and arrives at the end', () => {
  const state = startFlow(flow({ rate: 1 }), line, () => 0.99);
  tick(state, 0.02);
  assert.equal(state.dots.length, 1);
  const events = tick(state, 2.1, { spawning: false });
  assert.equal(state.dots.length, 0);
  assert.equal(events[0].type, 'arrive');
  assert.equal(Math.round(events[0].x), SPEED * 2);
});

test('failing dots burst before they arrive', () => {
  const state = startFlow(flow({ rate: 1, fail: 1 }), line, () => 0.99);
  tick(state, 0.02);
  const events = tick(state, 2.1, { spawning: false });
  assert.equal(events[0].type, 'fail');
  assert.ok(events[0].x < SPEED * 2);
});

test('bounce comes back as a response', () => {
  const state = startFlow(flow({ rate: 1, bounce: true }), line, () => 0.99);
  tick(state, 0.02);
  tick(state, 2.0, { spawning: false });
  assert.equal(state.dots.length, 1, 'still travelling, on the way back');
  assert.equal(where(state, state.dots[0]).kind, 'res');
  tick(state, 2.1, { spawning: false });
  assert.equal(state.dots.length, 0);
});

test('dots passing through a shape between two links are hidden', () => {
  const route = { points: [[0, 0], [SPEED, 0], [SPEED * 2, 0], [SPEED * 3, 0]], gaps: [[SPEED, SPEED * 2]] };
  const state = startFlow(flow({ rate: 1 }), route, () => 0.99);
  tick(state, 0.02);
  tick(state, 1.4, { spawning: false });
  assert.equal(where(state, state.dots[0]).hidden, true, 'inside the gap');
  tick(state, 1.0, { spawning: false });
  assert.equal(where(state, state.dots[0]).hidden, false, 'out the other side');
});
