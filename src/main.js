// The only file that talks to Obsidian. It finds ```stepper blocks and puts a diagram in their place.
import { Plugin, MarkdownRenderChild, MarkdownRenderer, parseYaml } from 'obsidian';
import { readLesson } from './lesson.js';
import { View } from './view.js';

export default class StepperPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor('stepper', (source, el, ctx) => {
      ctx.addChild(new StepperBlock(el, source, this, ctx.sourcePath));
    });
  }
}

// One ```stepper block in a note. Obsidian calls onunload when the block is re-rendered or the note closes.
class StepperBlock extends MarkdownRenderChild {
  constructor(el, source, plugin, sourcePath) {
    super(el);
    this.source = source;
    this.plugin = plugin;
    this.sourcePath = sourcePath;
  }

  onload() {
    const root = this.containerEl.createDiv();
    try {
      const lesson = readLesson(parseYaml(this.source));
      this.view = new View(root, lesson, {
        // Step text is Markdown, so [[links]], bold and tables work like anywhere else in the vault.
        renderMarkdown: (text, el) => MarkdownRenderer.render(this.plugin.app, text, el, this.sourcePath, this),
      });
    } catch (error) {
      root.addClass('stepper');
      root.createDiv({ cls: 'stepper-error', text: `Stepper: ${error.message}` });
    }
  }

  onunload() {
    this.view?.destroy();
  }
}
