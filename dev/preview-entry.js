// Browser preview: shows a lesson without Obsidian. Build with `npm run preview`, open dev/preview.html.
import { readLesson } from '../src/lesson.js';
import { Stage } from '../src/stage.js';
import { EXAMPLE } from './example-lesson.js';

const lesson = readLesson(EXAMPLE);
const step = lesson.steps[Number(new URLSearchParams(location.search).get('step') ?? 1) - 1];
const root = document.getElementById('root');
const stage = new Stage(root);
const shapes = Object.values(step.scene);
stage.drawShapes(shapes);
stage.setView(stage.fitView(shapes));
