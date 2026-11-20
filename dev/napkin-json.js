// Turns the stepper block in examples/napkin-math.md into dev/napkin.json, for the preview page.
import fs from 'node:fs';
import { parse } from 'yaml';
const md = fs.readFileSync('examples/napkin-math.md', 'utf8');
fs.writeFileSync('dev/napkin.json', JSON.stringify(parse(md.match(/```stepper\n([\s\S]*?)\n```/)[1])));
