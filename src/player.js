// Plays the diagram: shows a step, animates the change to the next one, and runs the moving dots.
// The loop only runs while the block is on screen, not paused, and something is moving, so it costs nothing otherwise.
import { Stage } from './stage.js';
import { startFlow, tick, routePoints, where } from './dots.js';
import { planChange, stateAt } from './transition.js';

const EFFECT_SECONDS = { arrive: 0.45, fail: 0.6 };

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
    this.change = null; // { plan, ms } while a step change is playing
    this.frame = this.frame.bind(this);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.wake(); });
    this.observer.observe(this.stage.el);
  }

  // Show a step. With `animate`, play the change from the step shown now.
  show(step, { animate = true } = {}) {
    const from = this.step;
    this.step = step;
    const toView = this.stage.fitView(Object.values(step.scene));
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
    }
    this.wake();
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
    return Boolean(this.change || this.flows.length || this.oldFlows.length || this.effects.length);
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
    return [...this.oldFlows, ...this.flows].flatMap(state => state.dots.map(dot => where(state, dot)));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.observer.disconnect();
  }
}
