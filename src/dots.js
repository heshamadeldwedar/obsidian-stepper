// Moving dots. A flow is a stream of dots along a route (one or more links joined end to end).
// tick() moves time forward: dots travel, new dots start at the flow's rate, failing dots burst on the way.
// Pure logic, no drawing, so it's tested in tests/dots.test.js.
import { lengthOf, pointAt, linkPoints } from './links.js';

export const SPEED = 120; // px per second

// The screen points of a whole route, plus the gaps: where one link ends at a shape and the next one
// starts on the shape's other side, the dot is passing *through* the shape, so it isn't drawn there.
export function routePoints(flow, step) {
  const points = [];
  const gaps = [];
  let walked = 0;
  flow.route.forEach((id, i) => {
    const line = linkPoints(step.links[id], step.scene);
    if (i > 0) {
      const jump = Math.hypot(line[0][0] - points.at(-1)[0], line[0][1] - points.at(-1)[1]);
      gaps.push([walked, walked + jump]);
      walked += jump;
    }
    points.push(...line);
    walked += lengthOf(line);
  });
  if (flow.reverse) return { points: points.reverse(), gaps: gaps.map(([a, b]) => [walked - b, walked - a]) };
  return { points, gaps };
}

export function startFlow(flow, { points, gaps = [] }, random = Math.random) {
  return { flow, points, gaps, length: lengthOf(points), dots: [], due: random(), random };
}

// Move the flow `seconds` forward. Returns what happened, for the arrival rings and fail bursts:
// [{ type: 'arrive' | 'fail', x, y }]
export function tick(state, seconds, { spawning = true } = {}) {
  const events = [];
  const { flow, length } = state;
  if (spawning) {
    state.due += seconds * flow.rate;
    while (state.due >= 1) {
      state.due -= 1;
      const fails = state.random() < flow.fail;
      state.dots.push({ distance: 0, back: false, fails, failAt: length * (0.55 + state.random() * 0.3) });
    }
  }
  for (const dot of state.dots) {
    dot.distance += SPEED * seconds;
    if (dot.fails && !dot.back && dot.distance >= dot.failAt) {
      dot.gone = true;
      events.push({ type: 'fail', ...where(state, { ...dot, distance: dot.failAt }) });
    } else if (dot.distance >= length) {
      if (flow.bounce && !dot.back) { dot.back = true; dot.distance = 0; continue; }
      dot.gone = true;
      events.push({ type: 'arrive', ...where(state, { ...dot, distance: length }) });
    }
  }
  state.dots = state.dots.filter(dot => !dot.gone);
  return events;
}

// Where a dot is on screen, and what it looks like. A bounced dot is a response on its way back.
export function where(state, dot) {
  const along = Math.min(dot.back ? state.length - dot.distance : dot.distance, state.length);
  const [x, y] = pointAt(state.points, along);
  const hidden = state.gaps.some(([a, b]) => along > a && along < b);
  return { x, y, kind: dot.back ? 'res' : state.flow.kind, hidden };
}
