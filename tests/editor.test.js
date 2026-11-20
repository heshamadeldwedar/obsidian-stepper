import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockAtCursor } from '../src/editor.js';

const note = ['# Note', '```stepper', 'title: A', 'steps: []', '```', 'after', '```js', 'code', '```'];
const editorAt = line => ({ getCursor: () => ({ line }), getLine: i => note[i], lineCount: () => note.length });

test('finds the stepper block around the cursor', () => {
  assert.equal(blockAtCursor(editorAt(2)), 'title: A\nsteps: []');
  assert.equal(blockAtCursor(editorAt(1)), 'title: A\nsteps: []', 'on the opening fence');
});

test('returns null outside a stepper block', () => {
  assert.equal(blockAtCursor(editorAt(0)), null);
  assert.equal(blockAtCursor(editorAt(5)), null);
  assert.equal(blockAtCursor(editorAt(7)), null, 'inside another code block');
});
