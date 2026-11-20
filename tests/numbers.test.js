import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countBetween } from '../src/numbers.js';

test('counts between two numbers with the same unit', () => {
  assert.equal(countBetween('80 ms', '120 ms', 0), '80 ms');
  assert.equal(countBetween('80 ms', '120 ms', 0.5), '100 ms');
  assert.equal(countBetween('80 ms', '120 ms', 1), '120 ms');
  assert.equal(countBetween('2,300 req/s', '7,000 req/s', 0.5), '4,650 req/s');
  assert.equal(countBetween('1.5 s', '4.2 s', 1), '4.2 s');
  assert.equal(countBetween('10%', '70%', 0.5), '40%');
});

test('gives up when the texts are not the same kind of number', () => {
  assert.equal(countBetween('?', '120 ms', 0.5), null);
  assert.equal(countBetween('600 ms', '4.2 s', 0.5), null);
  assert.equal(countBetween('—', '20 ms', 0.5), null);
});
