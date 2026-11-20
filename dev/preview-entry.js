// Browser preview: shows a lesson without Obsidian. Build with `npm run preview`, open dev/preview.html.
// ?step=3 opens on step 3, ?width=500 shows a narrow block, ?dark=1 uses the dark theme, ?gallery=1 shows every shape.
import { readLesson } from '../src/lesson.js';
import { View } from '../src/view.js';
import { EXAMPLE } from './example-lesson.js';
import { GALLERY } from './gallery-lesson.js';

const params = new URLSearchParams(location.search);
const root = document.getElementById('root');
if (params.get('dark')) { document.body.classList.add('theme-dark'); document.body.style.background = '#1b1916'; }
if (params.get('width')) root.style.maxWidth = `${params.get('width')}px`;
const view = new View(root, readLesson(params.get('gallery') ? GALLERY : EXAMPLE));
view.goTo(Number(params.get('step') ?? 1) - 1, { animate: false });
window.view = view;
