// Browser preview: shows a lesson without Obsidian. Build with `npm run preview`, open dev/preview.html.
// ?step=3 opens on step 3, ?width=500 shows a narrow block, ?dark=1 uses the dark theme, ?gallery=1 shows every shape, ?napkin=1 shows examples/napkin-math.md (run `node dev/napkin-json.js` first).
import { readLesson } from '../src/lesson.js';
import { View } from '../src/view.js';
import { EXAMPLE } from './example-lesson.js';
import { GALLERY } from './gallery-lesson.js';
import NAPKIN from './napkin.json';
import CHECK1 from './check1.json';
import CHECK2 from './check2.json';

const params = new URLSearchParams(location.search);
const root = document.getElementById('root');
if (params.get('dark')) { document.body.classList.add('theme-dark'); document.body.style.background = '#1b1916'; }
if (params.get('width')) root.style.maxWidth = `${params.get('width')}px`;
if (root.parentElement.id !== 'block' && !params.get('width')) root.style.maxWidth = '1100px';
const lessons = { gallery: GALLERY, napkin: NAPKIN, check1: CHECK1, check2: CHECK2 };
const pick = Object.keys(lessons).find(name => params.get(name));
const view = new View(root, readLesson(pick ? lessons[pick] : EXAMPLE));
view.goTo(Number(params.get('step') ?? 1) - 1, { animate: false });
window.view = view;
window.stepper = { View, readLesson, lessons: { ...lessons, example: EXAMPLE } }; // for browser checks
