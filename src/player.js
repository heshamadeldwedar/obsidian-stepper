// Plays the diagram: shows a step on the stage. Phases 6 and 7 add moving dots and the step-change animation here.
import { Stage } from './stage.js';

export class Player {
  constructor(parent) {
    this.stage = new Stage(parent);
    this.step = null;
  }

  show(step) {
    const shapes = Object.values(step.scene);
    this.stage.drawShapes(shapes);
    this.stage.drawLinks(Object.values(step.links), step.scene);
    this.stage.setView(this.stage.fitView(shapes));
    this.step = step;
  }

  replay() { if (this.step) this.show(this.step); }
  setPaused() {}
  destroy() {}
}
