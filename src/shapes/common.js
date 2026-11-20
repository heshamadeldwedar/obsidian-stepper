// Pieces several shapes share: the stack of pills above a shape, the CPU gauge, a label pill below.
import { tag, text, icon, pill, r2 } from '../svg.js';

// Draw pills upwards from (x, y): the first item sits lowest.
export function tagsAbove(x, y, items) {
  return items.map(([kind, item], i) => {
    const at = y - i * 26;
    return kind === 'cpu' ? cpuGauge(x, at, item) : pill(x, at, item.text ?? item, { icon: item.icon, tone: item.tone ?? 'paper' });
  }).join('');
}

// ⚙ ███── 80%. Green under 60%, amber under 85%, red above.
export function cpuGauge(x, y, cpu) {
  const value = Math.max(0, Math.min(1, cpu));
  const color = value < 0.6 ? 'st-good' : value < 0.85 ? 'st-warn' : 'st-bad';
  const left = x - 43;
  return tag('g', { class: 'st-pill st-tone-paper' },
    tag('rect', { x: left + 1.5, y: y - 8.5, width: 86, height: 21, rx: 10.5, class: 'st-pill-shadow' }) +
    tag('rect', { x: left, y: y - 10.5, width: 86, height: 21, rx: 10.5, class: 'st-pill-bg' }) +
    icon('cpu', left + 13, y, 12, { cls: 'st-pill-icon' }) +
    tag('rect', { x: left + 23, y: y - 3.5, width: 28, height: 7, rx: 3.5, class: 'st-gauge-track' }) +
    tag('rect', { x: left + 23, y: y - 3.5, width: r2(Math.max(3, 28 * value)), height: 7, rx: 3.5, class: `st-gauge ${color}` }) +
    text(left + 78, y + 3.8, `${Math.round(value * 100)}%`, { size: 10.5, weight: 800, anchor: 'end' }));
}

// The name pill under a crowd, database or device.
export function labelBelow(x, y, label, iconName) {
  return label ? pill(x, y, label, { icon: iconName, size: 11 }) : '';
}
