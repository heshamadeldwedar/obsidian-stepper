// The diagram area: one <svg> with layers (floor, links, dots, shapes, overlays), drawn from a scene.
// Shapes are kept by id, so a shape that changes is redrawn in place, and one that stays the same is left alone.
import { SHAPE_DRAWERS } from './shapes/index.js';
import { depth } from './iso.js';
import { fit, viewBox } from './camera.js';

let counter = 0;

export class Stage {
  constructor(parent) {
    // Ids must be unique on the page: a note can hold several stepper blocks.
    const id = `stepper-${++counter}`;
    this.el = parent.createDiv ? parent.createDiv({ cls: 'stepper-stage' }) : parent.appendChild(Object.assign(document.createElement('div'), { className: 'stepper-stage' }));
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('stepper-svg');
    // All drawing is built as text with every YAML value escaped (see svg.js esc), so innerHTML is safe here.
    this.svg.innerHTML = `
      <defs>
        <pattern id="${id}-grid" width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0,7 L14,0 L28,7 L14,14 Z" class="st-grid-line"/>
        </pattern>
        <radialGradient id="${id}-fade"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
        <mask id="${id}-mask"><rect x="-3000" y="-3000" width="6000" height="6000" fill="url(#${id}-fade)"/></mask>
        <marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1,1 L9,5 L1,9" class="st-arrow-head"/>
        </marker>
      </defs>
      <rect class="st-grid" x="-1500" y="-1500" width="3000" height="3000" fill="url(#${id}-grid)" mask="url(#${id}-mask)"/>
      <g class="st-layer-floor"></g><g class="st-layer-links"></g><g class="st-layer-dots"></g><g class="st-layer-shapes"></g><g class="st-layer-over"></g>`;
    this.el.appendChild(this.svg);
    this.arrowId = `${id}-arrow`;
    this.layers = {};
    for (const name of ['floor', 'links', 'dots', 'shapes', 'over']) this.layers[name] = this.svg.querySelector(`.st-layer-${name}`);
    this.drawn = new Map(); // id → { g, overlay, html }
  }

  // Draw every shape in `shapes` (a list of shape states). Removes shapes that are no longer listed.
  drawShapes(shapes) {
    const seen = new Set();
    for (const shape of [...shapes].sort((a, b) => depth(a) - depth(b))) {
      seen.add(shape.id);
      const drawer = SHAPE_DRAWERS[shape.type];
      let entry = this.drawn.get(shape.id);
      if (!entry || entry.type !== shape.type) {
        if (entry) { entry.g.remove(); entry.overlay.remove(); }
        entry = { type: shape.type, g: svgEl('g'), overlay: svgEl('g'), html: '', over: '' };
        entry.g.dataset.id = shape.id;
        this.drawn.set(shape.id, entry);
      }
      const html = drawer.draw(shape);
      const over = drawer.overlay(shape);
      if (html !== entry.html) { entry.g.innerHTML = html; entry.html = html; }
      if (over !== entry.over) { entry.overlay.innerHTML = over; entry.over = over; }
      const opacity = String(Math.round((shape.opacity ?? 1) * (1 - (shape.dim ?? 0) * 0.6) * 100) / 100);
      entry.g.setAttribute('opacity', opacity);
      entry.overlay.setAttribute('opacity', opacity);
      // appendChild moves an existing node, which keeps back-to-front order.
      this.layers[drawer.layer].appendChild(entry.g);
      this.layers.over.appendChild(entry.overlay);
    }
    for (const [id, entry] of this.drawn) {
      if (!seen.has(id)) { entry.g.remove(); entry.overlay.remove(); this.drawn.delete(id); }
    }
  }

  // The view that shows all these shapes.
  fitView(shapes) {
    return fit(shapes.map(shape => SHAPE_DRAWERS[shape.type].bounds(shape)));
  }

  setView(view) {
    this.view = view;
    this.svg.setAttribute('viewBox', viewBox(view));
  }
}

const svgEl = name => document.createElementNS('http://www.w3.org/2000/svg', name);
