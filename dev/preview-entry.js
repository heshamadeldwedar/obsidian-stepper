// Browser preview: shows a lesson without Obsidian. Build with `npm run preview`, open dev/preview.html.
// ?step=3 opens on step 3, ?width=500 shows a narrow block.
import { readLesson } from '../src/lesson.js';
import { View } from '../src/view.js';
import { EXAMPLE } from './example-lesson.js';

const params = new URLSearchParams(location.search);
const root = document.getElementById('root');
if (params.get('width')) root.style.maxWidth = `${params.get('width')}px`;
const view = new View(root, readLesson(EXAMPLE));
view.goTo(Number(params.get('step') ?? 1) - 1);
window.view = view;
