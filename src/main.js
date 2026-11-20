// The only file that talks to Obsidian. It finds ```stepper blocks and puts a diagram in their place,
// and adds the settings tab, the full-screen view and two commands.
import { Plugin, MarkdownRenderChild, MarkdownRenderer, Modal, PluginSettingTab, Setting, Component, parseYaml } from 'obsidian';
import { readLesson } from './lesson.js';
import { View } from './view.js';
import { blockAtCursor } from './editor.js';

const DEFAULT_SETTINGS = { speed: 1, motion: 'system', grid: true };

const EXAMPLE_BLOCK = `\`\`\`stepper
title: Will one server do?
metrics:
  users: { label: Daily users, icon: users }
legend: [req, fail]
steps:
  - title: Is one server enough?
    short: The question
    kind: problem
    text: 10 million users a day. One server, or a hundred?
    metrics: { users: 10M }
    scene:
      people: { type: crowd, at: [-2, -8], label: 10M users }
      s0:     { type: block, at: [0, 6], label: [One, "server?"] }
    links: { u: { from: people, to: s0 } }
    flows: [ { route: [u], rate: 2 } ]
  - title: The busiest hour
    short: Peak
    kind: insight
    text: Evenings run about **3×** the average.
    scene: { s0: { heat: 1, cpu: 1 } }
    flows: [ { route: [u], rate: 6, fail: 0.3 } ]
\`\`\`
`;

export default class StepperPlugin extends Plugin {
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    // Obsidian redraws a block every time you edit the note. Remembering the step per block
    // ("note path:line") keeps you where you were instead of jumping back to step 1.
    this.lastStep = new Map();

    this.registerMarkdownCodeBlockProcessor('stepper', (source, el, ctx) => {
      const key = `${ctx.sourcePath}:${ctx.getSectionInfo(el)?.lineStart ?? 0}`;
      ctx.addChild(new StepperBlock(el, source, this, ctx.sourcePath, key));
    });

    this.addSettingTab(new StepperSettingTab(this));

    this.addCommand({
      id: 'insert-example',
      name: 'Insert an example block',
      editorCallback: editor => editor.replaceSelection(EXAMPLE_BLOCK),
    });
    this.addCommand({
      id: 'open-full-screen',
      name: 'Open the block under the cursor in full screen',
      editorCheckCallback: (checking, editor, view) => {
        const source = blockAtCursor(editor);
        if (source === null) return false;
        if (!checking) new FullScreenModal(this, source, view.file?.path ?? '').open();
        return true;
      },
    });
  }

  // The options every View gets: Markdown rendering, motion, speed and grid from the settings.
  viewOptions(component, sourcePath) {
    const { speed, motion, grid } = this.settings;
    const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      // Step text is Markdown, so [[links]], bold and tables work like anywhere else in the vault.
      renderMarkdown: (text, el) => MarkdownRenderer.render(this.app, text, el, sourcePath, component),
      reduceMotion: motion === 'reduce' || (motion === 'system' && systemReduced),
      speed: Number(speed),
      grid,
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// One ```stepper block in a note. Obsidian calls onunload when the block is redrawn or the note closes.
class StepperBlock extends MarkdownRenderChild {
  constructor(el, source, plugin, sourcePath, key) {
    super(el);
    Object.assign(this, { source, plugin, sourcePath, key });
  }

  onload() {
    const root = this.containerEl.createDiv();
    try {
      const lesson = readLesson(parseYaml(this.source));
      this.view = new View(root, lesson, {
        ...this.plugin.viewOptions(this, this.sourcePath),
        startAt: this.plugin.lastStep.get(this.key) ?? 0,
        onStep: index => this.plugin.lastStep.set(this.key, index),
        onFullscreen: () => new FullScreenModal(this.plugin, this.source, this.sourcePath, this.view.index).open(),
      });
    } catch (error) {
      showError(root, error);
    }
  }

  onunload() {
    this.view?.destroy();
  }
}

// The same block, big: in a window over the note, where the side-panel layout fits.
class FullScreenModal extends Modal {
  constructor(plugin, source, sourcePath, startAt = 0) {
    super(plugin.app);
    Object.assign(this, { plugin, source, sourcePath, startAt });
  }

  onOpen() {
    this.modalEl.addClass('stepper-modal');
    this.component = new Component();
    this.component.load();
    const root = this.contentEl.createDiv();
    try {
      this.view = new View(root, readLesson(parseYaml(this.source)), { ...this.plugin.viewOptions(this.component, this.sourcePath), startAt: this.startAt });
      root.focus();
    } catch (error) {
      showError(root, error);
    }
  }

  onClose() {
    this.view?.destroy();
    this.component.unload();
    this.contentEl.empty();
  }
}

class StepperSettingTab extends PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl, plugin } = this;
    containerEl.empty();
    const save = key => async value => { plugin.settings[key] = value; await plugin.saveSettings(); };
    new Setting(containerEl)
      .setName('Animation speed')
      .setDesc('How fast dots move and steps change. Applies to blocks drawn after the change.')
      .addDropdown(d => d.addOptions({ 0.5: 'Slow (0.5×)', 1: 'Normal', 2: 'Fast (2×)' }).setValue(String(plugin.settings.speed)).onChange(save('speed')));
    new Setting(containerEl)
      .setName('Motion')
      .setDesc('"Follow the system" respects your computer\'s reduced-motion setting. "Reduced" shows each step as a still picture.')
      .addDropdown(d => d.addOptions({ system: 'Follow the system', full: 'Always animate', reduce: 'Reduced' }).setValue(plugin.settings.motion).onChange(save('motion')));
    new Setting(containerEl)
      .setName('Show the grid')
      .setDesc('The dotted floor grid behind the diagram.')
      .addToggle(t => t.setValue(plugin.settings.grid).onChange(save('grid')));
  }
}

function showError(root, error) {
  root.empty();
  root.addClass('stepper');
  root.createDiv({ cls: 'stepper-error', text: `Stepper: ${error.message}` });
}
