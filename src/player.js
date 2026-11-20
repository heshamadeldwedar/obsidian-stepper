// Plays the diagram: shows a step and runs the animation loop (moving dots now, step changes in phase 7).
// The loop only runs while the block is on screen, not paused, and motion is allowed, so it costs nothing otherwise.
import { Stage } from './stage.js';
import { startFlow, tick, routePoints, where } from './dots.js';

const EFFECT_SECONDS = { arrive: 0.45, fail: 0.6 };

export class Player {
  constructor(parent, { reduceMotion = false } = {}) {
    this.stage = new Stage(parent);
    this.reduceMotion = reduceMotion;
    this.paused = false;
    this.visible = true;
    this.flows = [];
    this.effects = [];
    this.frame = this.frame.bind(this);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.wake(); });
    this.observer.observe(this.stage.el);
  }

  show(step) {
    const shapes = Object.values(step.scene);
    this.stage.drawShapes(shapes);
    this.stage.drawLinks(Object.values(step.links), step.scene);
    this.stage.setView(this.stage.fitView(shapes));
    this.startFlows(step);
    this.step = step;
    this.wake();
  }

  startFlows(step) {
    this.flows = step.flows.map(flow => startFlow(flow, routePoints(flow, step)));
    this.effects = [];
    // Run the flows for a few seconds right away, so the arrows are already busy when the step appears.
    if (!this.reduceMotion) for (let i = 0; i < 60; i++) for (const state of this.flows) tick(state, 0.05);
    this.stage.drawDots(this.dots(), []);
  }

  replay() { if (this.step) this.show(this.step); }

  setPaused(paused) { this.paused = paused; this.wake(); }

  get running() { return !this.paused && this.visible && !this.reduceMotion && this.flows.length > 0; }

  // Start the loop if it should run and isn't running yet.
  wake() {
    if (this.running && !this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  frame(now) {
    this.raf = null;
    // Cap the step so a tab that was in the background doesn't make everything jump.
    const seconds = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    for (const state of this.flows) {
      for (const event of tick(state, seconds)) this.effects.push({ ...event, age: 0 });
    }
    for (const effect of this.effects) effect.age += seconds / EFFECT_SECONDS[effect.type];
    this.effects = this.effects.filter(effect => effect.age < 1);
    this.stage.drawDots(this.dots(), this.effects);
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  }

  dots() {
    return this.flows.flatMap(state => state.dots.map(dot => where(state, dot)));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.observer.disconnect();
  }
}
