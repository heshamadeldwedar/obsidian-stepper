// A tiny helper to build HTML elements, so the view code reads like the page it makes.
// h('div', { cls: 'row', text: 'Hi', on: { click } }, [children])
import { ICONS } from './icons.js';

export function h(name, props = {}, children = []) {
  const el = document.createElement(name);
  if (props.cls) el.className = props.cls;
  if (props.text !== undefined) el.textContent = props.text;
  for (const [key, value] of Object.entries(props.attrs ?? {})) el.setAttribute(key, value);
  for (const [event, handler] of Object.entries(props.on ?? {})) el.addEventListener(event, handler);
  for (const child of [].concat(children)) if (child) el.append(child);
  return el;
}

// A Lucide icon as an inline <svg> element (our own bundled icons, not user input).
export function iconEl(name, size = 14) {
  const span = h('span', { cls: 'stepper-icon' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
  return span;
}
