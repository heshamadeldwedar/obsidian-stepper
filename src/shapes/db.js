// A cylinder: a database, a disk, a shard.
import { flatCircle, project } from '../iso.js';
import { shapeColors } from '../colors.js';
import { tag, icon } from '../svg.js';
import { labelBelow, tagsAbove } from './common.js';

export const layer = 'shapes';
export const reach = shape => shape.r * 1.25;

export function bounds(shape) {
  const top = flatCircle(shape.at[0], shape.at[1], shape.r, shape.h + shape.lift);
  const bottom = flatCircle(shape.at[0], shape.at[1], shape.r, 0);
  return [top.cx - top.rx, top.cy - top.ry - 30, top.cx + top.rx, bottom.cy + bottom.ry + 34];
}

export function draw(shape) {
  const [x, y] = shape.at;
  const top = flatCircle(x, y, shape.r, shape.h + shape.lift);
  const bottom = flatCircle(x, y, shape.r, shape.lift);
  const shadow = flatCircle(x, y, shape.r, 0);
  const colors = shapeColors(shape);
  const { rx, ry } = top;
  // The side: down the left, round the bottom, up the right. The fill closes it; the outline stays open,
  // so no straight line is drawn across the top (the top ellipse already draws that edge).
  const side = `M${top.cx - rx},${top.cy} L${bottom.cx - rx},${bottom.cy} A${rx},${ry} 0 0 0 ${bottom.cx + rx},${bottom.cy} L${top.cx + rx},${top.cy}`;
  return (
    tag('ellipse', { cx: shadow.cx, cy: shadow.cy + 5, rx, ry, class: 'st-shadow' }) +
    tag('path', { d: side + ' Z', fill: colors.side }) +
    tag('ellipse', { cx: top.cx, cy: top.cy, rx, ry, fill: colors.top }) +
    tag('path', { d: side, class: 'st-edge' }) +
    tag('ellipse', { cx: top.cx, cy: top.cy, rx, ry, class: 'st-edge' }) +
    icon(shape.glyph, top.cx, top.cy + shape.h / 2 + ry * 0.5, 16)
  );
}

export function overlay(shape) {
  const [x, y] = shape.at;
  const bottom = flatCircle(x, y, shape.r, 0);
  const [, topY] = project(x, y, shape.h + shape.lift);
  const tags = (shape.tags ?? []).map(t => ['tag', t]);
  if (shape.dead > 0.5) tags.push(['tag', { text: 'DOWN', tone: 'red', icon: 'triangle-alert' }]);
  return labelBelow(bottom.cx, bottom.cy + bottom.ry + 18, shape.label, 'database') + tagsAbove(bottom.cx, topY - bottom.ry - 18, tags);
}
