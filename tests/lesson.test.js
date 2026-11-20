import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLesson, LessonError } from '../src/lesson.js';

const twoSteps = {
  title: 'Napkin',
  metrics: { dau: { label: 'Daily users', icon: 'users' }, peak: 'Peak req/s' },
  steps: [
    {
      title: 'One server',
      metrics: { dau: '10M', peak: '?' },
      scene: { users: { type: 'crowd', at: [-6, 4] }, s0: { type: 'block', at: [4, -4], label: ['One', 'server?'] } },
      links: { u: { from: 'users', to: 's0' } },
      flows: [{ route: ['u'], rate: 2 }],
    },
    { title: 'Peak', short: 'Peak', metrics: { peak: 7000 }, scene: { s0: { heat: 1 } } },
  ],
};

test('fills in defaults for shapes and links', () => {
  const lesson = readLesson(twoSteps);
  const s0 = lesson.steps[0].scene.s0;
  assert.equal(s0.type, 'block');
  assert.equal(s0.s, 4);
  assert.equal(s0.color, 'blue');
  assert.deepEqual(s0.label, ['One', 'server?']);
  assert.equal(lesson.steps[0].links.u.style, 'solid');
  assert.deepEqual(lesson.metrics.map(m => m.label), ['Daily users', 'Peak req/s']);
});

test('a step starts from the step before it', () => {
  const [first, second] = readLesson(twoSteps).steps;
  assert.equal(second.scene.s0.heat, 1, 'the change applies');
  assert.equal(second.scene.s0.label[0], 'One', 'other fields stay');
  assert.equal(first.scene.s0.heat, 0, 'the earlier step is not changed');
  assert.ok(second.scene.users, 'shapes the step does not mention stay');
  assert.ok(second.links.u, 'links stay');
  assert.deepEqual(second.metrics, { dau: '10M', peak: '7,000' }, 'metrics carry over, numbers get commas');
});

test('flows belong to one step only', () => {
  const [first, second] = readLesson(twoSteps).steps;
  assert.equal(first.flows.length, 1);
  assert.equal(second.flows.length, 0);
});

test('null removes a shape and the links that touch it', () => {
  const lesson = readLesson({ steps: [...twoSteps.steps, { title: 'Gone', scene: { s0: null } }] });
  const last = lesson.steps[2];
  assert.equal(last.scene.s0, undefined);
  assert.equal(last.links.u, undefined);
});

test('scene! replaces the whole scene', () => {
  const lesson = readLesson({ steps: [...twoSteps.steps, { title: 'New', 'scene!': { db: { type: 'db', at: [0, 0] } } }] });
  assert.deepEqual(Object.keys(lesson.steps[2].scene), ['db']);
});

test('errors say where the mistake is', () => {
  const bad = (steps, pattern) => assert.throws(() => readLesson({ steps }), err => err instanceof LessonError && pattern.test(err.message));
  bad([{ scene: { s0: { type: 'srvr', at: [0, 0] } } }], /steps\[0\]\.scene\.s0: unknown type "srvr"/);
  bad([{ scene: { s0: { type: 'block' } } }], /steps\[0\]\.scene\.s0: add a position/);
  bad([{ scene: { a: { type: 'block', at: [0, 0] } }, links: { l: { from: 'a', to: 'b' } } }], /links\.l\.to: no shape called "b"/);
  bad([{ flows: [{ route: ['nope'] }] }], /steps\[0\]\.flows\[0\]\.route: no link called "nope"/);
  bad([{ kind: 'drama' }], /steps\[0\]\.kind: "drama" is not one of/);
  assert.throws(() => readLesson({}), /add at least one step/);
  assert.throws(() => readLesson(null), /empty/);
});

test('callouts, cards and goals', () => {
  const lesson = readLesson({
    goals: [{ text: 'Requests per second', step: 2 }],
    steps: [{ title: 'A', callout: 'Short tip', card: { title: 'Sum', lines: ['1 + 1', '= 2'] } }],
  });
  assert.deepEqual(lesson.steps[0].callout, { kind: 'tip', text: 'Short tip' });
  assert.deepEqual(lesson.steps[0].card.lines, ['1 + 1', '= 2']);
  assert.deepEqual(lesson.goals, [{ text: 'Requests per second', step: 1 }]);
});
