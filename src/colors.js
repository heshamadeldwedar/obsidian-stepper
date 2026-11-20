// Shape colors. Each has a light top, a darker side, and the line color for its icon.
export const COLORS = {
  blue:   { top: '#d9e7f8', side: '#b9d1ef', ink: '#1d1b18' },
  green:  { top: '#dcefcf', side: '#bcdca6', ink: '#1d1b18' },
  orange: { top: '#fde0c2', side: '#f6c08f', ink: '#1d1b18' },
  yellow: { top: '#fbeab0', side: '#f1d27a', ink: '#1d1b18' },
  purple: { top: '#e6ddf5', side: '#cdbde9', ink: '#1d1b18' },
  red:    { top: '#f4cfd0', side: '#e3a6a9', ink: '#1d1b18' },
  gray:   { top: '#e6e1da', side: '#cbc3b8', ink: '#1d1b18' },
  slab:   { top: '#f8f3ec', side: '#e2d8cb', ink: '#1d1b18' },
  ink:    { top: '#fffaf2', side: '#e2d8cb', ink: '#1d1b18' },
};

// Dot colors, by flow kind.
export const DOTS = {
  req: '#ef9a4a', res: '#7fc278', msg: '#f2c94c', write: '#9b7fd6', heavy: '#e8834d',
  slow: '#e3ae3c', ping: '#7fc278', poison: '#d9534f', fail: '#e5534b', mine: '#5b8fd6',
};

// Mix two hex colors: t = 0 gives a, t = 1 gives b. Used to turn a server red as it heats up.
export function mix(a, b, t) {
  const from = parseInt(a.slice(1), 16);
  const to = parseInt(b.slice(1), 16);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return '#' + ((1 << 24) | (channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).slice(1);
}

// The colors of a shape after heat (0–1 → red) and dead (0–1 → gray).
export function shapeColors(shape) {
  const base = COLORS[shape.color] ?? COLORS.blue;
  const heat = Math.max(0, Math.min(1, shape.heat ?? 0));
  const dead = Math.max(0, Math.min(1, shape.dead ?? 0));
  const top = mix(mix(base.top, COLORS.red.top, heat), COLORS.gray.top, dead);
  const side = mix(mix(base.side, COLORS.red.side, heat), COLORS.gray.side, dead);
  return { top, side, ink: base.ink };
}
