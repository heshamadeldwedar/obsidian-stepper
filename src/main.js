// The only file that talks to Obsidian. It finds ```stepper blocks and puts a diagram in their place.
import { Plugin, MarkdownRenderChild, parseYaml } from 'obsidian';

export default class StepperPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor('stepper', (source, el, ctx) => {
      ctx.addChild(new StepperBlock(el, source));
    });
  }
}

// One ```stepper block in a note. Obsidian calls onunload when the block leaves the screen or the note closes.
class StepperBlock extends MarkdownRenderChild {
  constructor(el, source) {
    super(el);
    this.source = source;
  }

  onload() {
    const root = this.containerEl.createDiv({ cls: 'stepper' });
    try {
      const data = parseYaml(this.source) || {};
      root.createDiv({ cls: 'stepper-title', text: data.title || 'Untitled' });
    } catch (error) {
      showError(root, error);
    }
  }
}

function showError(root, error) {
  root.empty();
  root.createDiv({ cls: 'stepper-error', text: `Stepper: ${error.message}` });
}
