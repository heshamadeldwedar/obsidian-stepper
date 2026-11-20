// Plays the diagram: shows a step, animates the change to the next one, and runs the moving dots.
// The loop only runs while the block is on screen, not paused, and something is moving, so it costs nothing otherwise.
import { Stage } from './stage.js';
import { startFlow, tick, routePoints, where } from './dots.js';
import { planChange, stateAt, TIMING } from './transition.js';

const EFFECT_SECONDS = { arrive: 0.45, fail: 0.6 };
const SPOT_SECONDS = 1.5;

// Which shapes get a floor glow, and when: shapes that changed glow as they change,
// new shapes glow as they land.
export function spotsFor(plan) {
  const spots = [];
  for (const { from, to } of plan.stays) {
    if (JSON.stringify(from) !== JSON.stringify(to)) spots.push({ id: to.id, wait: TIMING.morph[0] / 1000, age: 0 });
  }
  plan.drops.forEach((shape, i) => spots.push({ id: shape.id, wait: (TIMING.dropStart + i * TIMING.dropGap + TIMING.dropLength * 0.6) / 1000, age: 0 }));
  return spots;
}

export class Player {
  constructor(parent, { reduceMotion = false, speed = 1 } = {}) {
    this.stage = new Stage(parent);
    this.reduceMotion = reduceMotion;
    this.speed = speed;
    this.paused = false;
    this.visible = true;
    this.flows = [];
    this.oldFlows = []; // the previous step's dots, finishing their trip during a step change
    this.effects = [];
    this.spots = []; // floor glows under shapes that changed or landed: { id, wait, age }
    this.change = null; // { plan, ms } while a step change is playing
    this.frame = this.frame.bind(this);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.wake(); });
    this.observer.observe(this.stage.el);
  }

  // Show a step. With `animate`, play the change from the step shown now.
  show(step, { animate = true } = {}) {
    const from = this.step;
    this.step = step;
    this.stage.resetZoom();
    const toView = this.viewFor(step);
    if (!from || !animate || this.reduceMotion) {
      this.change = null;
      this.oldFlows = [];
      this.drawStill(step, toView);
      this.startFlows(step, { warm: true });
    } else {
      // Old dots keep going (without new ones) until they arrive; new dots wait for the change to finish.
      this.oldFlows = this.flows;
      this.flows = [];
      this.change = { plan: planChange(from, step, this.stage.view, toView), ms: 0 };
      this.spots = spotsFor(this.change.plan);
    }
    this.wake();
  }

  // One camera for the whole lesson: it fits every shape of every step, so stepping through never
  // moves or zooms the picture, and every step has the same margins. Call once with all steps.
  prepare(steps) {
    const shapes = steps.flatMap(step => Object.values(step.scene));
    // Room at the top for the numbers bar. The napkin card needs no room: it docks in the emptiest corner.
    this.lessonView = this.stage.fitView(shapes, { top: 0.16 });
  }

  // The shapes' boxes on screen, in px from the diagram's top-left corner. Used to dock the card.
  shapeRects(step) {
    const box = this.stage.svg.getBoundingClientRect();
    const view = this.lessonView ?? this.stage.view;
    // The SVG keeps its aspect ratio (centered), so one scale fits both axes.
    const scale = Math.min(box.width / view.w, box.height / view.h);
    const offsetX = (box.width - view.w * scale) / 2;
    const offsetY = (box.height - view.h * scale) / 2;
    return Object.values(step.scene).map(shape => {
      const [x0, y0, x1, y1] = this.stage.boundsOf(shape);
      return [offsetX + (x0 - view.x) * scale, offsetY + (y0 - view.y) * scale, offsetX + (x1 - view.x) * scale, offsetY + (y1 - view.y) * scale];
    });
  }

  viewFor(step) {
    return this.lessonView ?? this.stage.fitView(Object.values(step.scene), { top: 0.16 });
  }

  // Play the change into the current step again, from `previous` (or just restart the dots on the first step).
  replay(previous) {
    const step = this.step;
    if (!step) return;
    if (previous) { this.show(previous, { animate: false }); this.show(step); }
    else this.show(step, { animate: false });
  }

  setPaused(paused) { this.paused = paused; this.wake(); }

  drawStill(step, view) {
    this.stage.drawShapes(Object.values(step.scene));
    this.stage.drawLinks(Object.values(step.links), step.scene);
    this.stage.setView(view);
  }

  startFlows(step, { warm }) {
    this.flows = step.flows.map(flow => startFlow(flow, routePoints(flow, step)));
    // On first show, run the dots for 3 seconds at once so the arrows are already busy.
    if (warm && !this.reduceMotion) for (let i = 0; i < 60; i++) for (const state of this.flows) tick(state, 0.05);
    this.stage.drawDots(this.dots(), this.effects);
  }

  get moving() {
    return Boolean(this.change || this.flows.length || this.oldFlows.length || this.effects.length || this.spots.length);
  }

  get running() { return !this.paused && this.visible && !this.reduceMotion && this.moving; }

  wake() {
    if (this.running && !this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  frame(now) {
    this.raf = null;
    // Cap the step so coming back to a background tab doesn't make everything jump.
    const seconds = Math.min(0.05, (now - this.last) / 1000) * this.speed;
    this.last = now;

    if (this.change) this.playChange(seconds);
    for (const state of this.flows) this.collect(tick(state, seconds));
    for (const state of this.oldFlows) this.collect(tick(state, seconds, { spawning: false }));
    this.oldFlows = this.oldFlows.filter(state => state.dots.length);
    for (const spot of this.spots) { spot.wait -= seconds; if (spot.wait <= 0) spot.age += seconds / SPOT_SECONDS; }
    this.spots = this.spots.filter(spot => spot.age < 1);
    this.stage.drawSpots(this.spots.filter(spot => spot.wait <= 0 && this.step.scene[spot.id]).map(spot => ({ shape: this.step.scene[spot.id], age: spot.age })));
    for (const effect of this.effects) effect.age += seconds / EFFECT_SECONDS[effect.type];
    this.effects = this.effects.filter(effect => effect.age < 1);
    this.stage.drawDots(this.dots(), this.effects);

    if (this.running) this.raf = requestAnimationFrame(this.frame);
  }

  playChange(seconds) {
    const { plan } = this.change;
    this.change.ms += seconds * 1000;
    const state = stateAt(plan, this.change.ms);
    this.stage.drawShapes(state.shapes);
    this.stage.drawLinks(state.links, state.scene, state.linkOpacity);
    this.stage.setView(state.view);
    if (state.done) {
      this.change = null;
      this.drawStill(this.step, plan.toView);
      this.startFlows(this.step, { warm: false });
    }
  }

  collect(events) {
    for (const event of events) this.effects.push({ ...event, age: 0 });
  }

  dots() {
    return [...this.oldFlows, ...this.flows].flatMap(state => state.dots.map(dot => where(state, dot))).filter(dot => !dot.hidden);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.observer.disconnect();
  }
}
