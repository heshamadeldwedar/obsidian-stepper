// Turns the stepper block in a note into JSON for the preview page: node dev/note-json.js <note.md> <out.json>
import fs from 'node:fs';
import { parse } from 'yaml';
import { readLesson } from '../src/lesson.js';
const [note, out] = process.argv.slice(2);
const data = parse(fs.readFileSync(note, 'utf8').match(/```stepper\n([\s\S]*?)\n```/)[1]);
readLesson(data); // throws with a clear message if the block is wrong
fs.writeFileSync(out, JSON.stringify(data));
