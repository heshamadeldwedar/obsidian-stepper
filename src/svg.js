// Small helpers for writing SVG as text. Drawing code returns strings; the stage puts them on the page.
import { ICONS } from './icons.js';

// Text from the YAML goes into SVG, so it must be escaped.
export function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Round to 2 decimals, which keeps the SVG text short.
export const r2 = n => Math.round(n * 100) / 100;

// tag('rect', { x: 1, fill: 'red' }) → '<rect x="1" fill="red"/>'. Skips empty values.
export function tag(name, attrs = {}, inner = '') {
  const list = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== '')
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? r2(v) : esc(v)}"`)
    .join('');
  return inner === '' ? `<${name}${list}/>` : `<${name}${list}>${inner}</${name}>`;
}

// Monospace text: every character is about 0.6 of the font size wide.
export const textWidth = (text, size) => String(text).length * size * 0.6;

export function text(x, y, value, { size = 12, weight = 700, cls = 'st-ink', anchor = 'middle' } = {}) {
  return tag('text', { x, y, class: cls, 'font-size': size, 'font-weight': weight, 'text-anchor': anchor }, esc(value));
}

// A Lucide icon centered on (x, y), `size` px wide. Unknown names draw nothing.
export function icon(name, x, y, size = 16, { cls = 'st-icon', stroke = 2 } = {}) {
  const body = ICONS[name];
  if (!body) return '';
  const scale = size / 24;
  return tag('g', { class: cls, transform: `translate(${r2(x - size / 2)} ${r2(y - size / 2)}) scale(${r2(scale)})`, 'stroke-width': r2(stroke / scale) }, body);
}

// A pill: rounded box with text and an optional icon, centered on (x, y). Used for labels and tags.
export function pill(x, y, value, { icon: iconName = '', tone = 'paper', size = 11 } = {}) {
  const w = textWidth(value, size) + 20 + (iconName ? size + 4 : 0);
  const h = size + 10;
  const left = x - w / 2;
  return tag('g', { class: `st-pill st-tone-${tone}` },
    tag('rect', { x: left + 1.5, y: y - h / 2 + 2, width: w, height: h, rx: h / 2, class: 'st-pill-shadow' }) +
    tag('rect', { x: left, y: y - h / 2, width: w, height: h, rx: h / 2, class: 'st-pill-bg' }) +
    (iconName ? icon(iconName, left + 10 + size / 2, y, size + 1, { cls: 'st-pill-icon' }) : '') +
    text(left + w / 2 + (iconName ? (size + 4) / 2 : 0), y + size * 0.36, value, { size, cls: 'st-pill-text' }));
}
