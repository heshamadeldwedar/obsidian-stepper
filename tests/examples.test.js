// Every stepper block we publish (README, format guide, examples, the "insert example" command)
// must be valid YAML and a valid lesson. A broken example in the docs is a bug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';
import { readLesson } from '../src/lesson.js';

const sources = ['README.md', 'docs/format.md', ...fs.readdirSync('examples').map(f => `examples/${f}`)];
const blocks = sources.flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/```stepper\n([\s\S]*?)\n```/g)].map(m => [file, m[1]]));
const main = fs.readFileSync('src/main.js', 'utf8').match(/const EXAMPLE_BLOCK = `\\`\\`\\`stepper\n([\s\S]*?)\\`\\`\\`/);
blocks.push(['src/main.js (insert command)', main[1]]);

test('there are examples to check', () => assert.ok(blocks.length >= 4));

for (const [file, yaml] of blocks) {
  test(`${file}: "${yaml.split('\n')[0]}" is a valid lesson`, () => {
    const lesson = readLesson(parse(yaml));
    assert.ok(lesson.steps.length >= 1);
  });
}
