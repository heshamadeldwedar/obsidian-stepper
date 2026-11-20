// The diagram area: one <svg> with layers (floor, links, dots, shapes, overlays), drawn from a scene.
// Shapes are kept by id, so a shape that changes is redrawn in place, and one that stays the same is left alone.
import { SHAPE_DRAWERS } from './shapes/index.js';
import { depth } from './iso.js';
import { fit, viewBox } from './camera.js';
import { drawLink, drawLinkLabel } from './links.js';
import { DOTS } from './colors.js';
import { r2 } from './svg.js';

let counter = 0;

export class Stage {
  constructor(parent) {
    // Ids must be unique on the page: a note can hold several stepper blocks.
    const id = `stepper-${++counter}`;
    this.el = parent.appendChild(Object.assign(document.createElement('div'), { className: 'stepper-stage' }));
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
    this.zoom = { scale: 1, dx: 0, dy: 0 };
    this.listenForZoom();
    // Link labels go on top of everything, after the shape overlays.
    this.labelLayer = svgEl('g');
    this.svg.appendChild(this.labelLayer);
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

  // Draw the arrows. `opacity` (optional) maps a link id to how visible it is, for fading in and out.
  drawLinks(links, scene, opacity = {}) {
    let lines = '';
    let labels = '';
    for (const link of links) {
      const fade = opacity[link.id] ?? 1;
      if (fade <= 0.01) continue;
      lines += `<g opacity="${fade}">${drawLink(link, scene, this.arrowId)}</g>`;
      labels += `<g opacity="${fade}">${drawLinkLabel(link, scene)}</g>`;
    }
    if (lines !== this.linesHtml) { this.layers.links.innerHTML = lines; this.linesHtml = lines; }
    if (labels !== this.labelsHtml) { this.labelLayer.innerHTML = labels; this.labelsHtml = labels; }
  }

  // Draw the moving dots and the short effects (arrival rings, fail bursts). Called every frame.
  drawDots(dots, effects) {
    this.layers.dots.innerHTML = dots.map(drawDot).join('') + effects.map(drawEffect).join('');
  }

  // The view that shows all these shapes.
  fitView(shapes) {
    return fit(shapes.map(shape => SHAPE_DRAWERS[shape.type].bounds(shape)));
  }

  // The camera's view (from fitView or an animation), before the reader's own zoom and pan.
  setView(view) {
    this.view = view;
    const { scale, dx, dy } = this.zoom;
    const w = view.w / scale;
    const h = view.h / scale;
    this.svg.setAttribute('viewBox', viewBox({ x: view.x + (view.w - w) / 2 + dx, y: view.y + (view.h - h) / 2 + dy, w, h }));
  }

  resetZoom() {
    this.zoom = { scale: 1, dx: 0, dy: 0 };
    if (this.view) this.setView(this.view);
  }

  // Ctrl/⌘ + wheel zooms (plain scrolling still scrolls the note). Drag pans. Double-click resets.
  listenForZoom() {
    this.svg.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      this.zoom.scale = Math.min(4, Math.max(0.5, this.zoom.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
      this.setView(this.view);
    }, { passive: false });
    this.svg.addEventListener('pointerdown', start => {
      if (start.button !== 0) return;
      const box = this.svg.getBoundingClientRect();
      const origin = { ...this.zoom };
      const unitsPerPixel = (this.view.w / this.zoom.scale) / box.width;
      const move = event => {
        this.zoom.dx = origin.dx - (event.clientX - start.clientX) * unitsPerPixel;
        this.zoom.dy = origin.dy - (event.clientY - start.clientY) * unitsPerPixel;
        this.setView(this.view);
      };
      const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
    });
    this.svg.addEventListener('dblclick', () => this.resetZoom());
  }
}

const svgEl = name => document.createElementNS('http://www.w3.org/2000/svg', name);

function drawDot({ x, y, kind }) {
  const color = DOTS[kind] ?? DOTS.req;
  x = r2(x); y = r2(y);
  if (kind === 'msg' || kind === 'poison') return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.5" fill="${color}" class="st-dot"/>`;
  if (kind === 'heavy') return `<rect x="${x - 5.5}" y="${y - 5.5}" width="11" height="11" rx="2" fill="${color}" class="st-dot"/>`;
  if (kind === 'ping') return `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${color}" stroke-width="2"/>`;
  if (kind === 'fail') return failMark(x, y, 1);
  return `<circle cx="${x}" cy="${y}" r="4.5" fill="${color}" class="st-dot"/>`;
}

// age goes from 0 to 1 over the effect's life.
function drawEffect({ type, x, y, age }) {
  x = r2(x); y = r2(y);
  if (type === 'fail') return failMark(x, y, 1 - age);
  return `<circle cx="${x}" cy="${y}" r="${r2(4 + age * 10)}" class="st-ring" opacity="${r2(1 - age)}"/>`;
}

function failMark(x, y, opacity) {
  return `<g opacity="${r2(opacity)}"><circle cx="${x}" cy="${y}" r="6.5" class="st-fail"/>` +
    `<path d="M${x - 2.6},${y - 2.6} L${x + 2.6},${y + 2.6} M${x + 2.6},${y - 2.6} L${x - 2.6},${y + 2.6}" class="st-fail-x"/></g>`;
}
