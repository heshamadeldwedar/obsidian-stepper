// Counting a number up (or down) when the numbers bar changes: "80 ms" → "120 ms" shows 80, 94, 119, 120.
// Works when both texts are a number with the same words around it ("2,300 req/s", "70%", "1.5 s").

const PATTERN = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

// The text part way (t from 0 to 1) from `from` to `to`, or null if they can't be counted between.
export function countBetween(from, to, t) {
  const a = PATTERN.exec(from);
  const b = PATTERN.exec(to);
  if (!a || !b || a[1] !== b[1] || a[3] !== b[3]) return null;
  const start = Number(a[2].replace(/,/g, ''));
  const end = Number(b[2].replace(/,/g, ''));
  const decimals = (b[2].split('.')[1] ?? '').length;
  const value = start + (end - start) * t;
  const shown = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${b[1]}${shown}${b[3]}`;
}
