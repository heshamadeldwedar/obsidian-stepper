// Builds dev/smoke.html: the real main.js running against a small fake of Obsidian's API.
// Checks the plugin's whole life (load, draw a block, settings, commands, full screen, unload) in a browser.
// Run: npm run build && node dev/smoke-build.js, then open dev/smoke.html (results are printed on the page).
import fs from 'node:fs';
import { EXAMPLE } from './example-lesson.js';

const fakeObsidian = `
const dom = { createDiv(o = {}) { const d = document.createElement('div'); if (o.cls) d.className = o.cls; if (o.text) d.textContent = o.text; this.append(d); return d; },
  addClass(c) { this.classList.add(c); }, empty() { this.replaceChildren(); } };
Object.assign(HTMLElement.prototype, dom);
class Component { load() { this.onload?.(); } unload() { this.onunload?.(); } }
class MarkdownRenderChild extends Component { constructor(el) { super(); this.containerEl = el; } }
class Plugin extends Component {
  constructor(app) { super(); this.app = app; this.processors = {}; this.commands = []; this.tabs = []; }
  async loadData() { return null; } async saveData(d) { window.saved = d; }
  registerMarkdownCodeBlockProcessor(lang, fn) { this.processors[lang] = fn; }
  addSettingTab(tab) { this.tabs.push(tab); } addCommand(c) { this.commands.push(c); }
}
class Modal { constructor(app) { this.app = app; this.modalEl = document.createElement('div'); this.contentEl = this.modalEl.createDiv(); }
  open() { document.body.append(this.modalEl); this.onOpen(); } close() { this.onClose(); this.modalEl.remove(); } }
class PluginSettingTab { constructor(app, plugin) { this.containerEl = document.createElement('div'); } }
class Setting { constructor(el) { this.el = el.createDiv({ cls: 'setting' }); }
  setName(n) { this.el.createDiv({ text: n }); return this; } setDesc() { return this; }
  addDropdown(f) { const api = { addOptions: () => api, setValue: () => api, onChange: fn => { window.lastChange = fn; return api; } }; f(api); return this; }
  addToggle(f) { const api = { setValue: () => api, onChange: () => api }; f(api); return this; } }
const MarkdownRenderer = { render: async (app, md, el) => { el.textContent = md; } };
window.__obsidian = { Plugin, MarkdownRenderChild, MarkdownRenderer, Modal, PluginSettingTab, Setting, Component, parseYaml: () => window.LESSON };
`;

const run = `
const results = []; const ok = (name, pass) => results.push((pass ? 'PASS ' : 'FAIL ') + name);
const module = { exports: {} };
new Function('module', 'exports', 'require', ${JSON.stringify(fs.readFileSync('main.js', 'utf8'))})(module, module.exports, n => n === 'obsidian' ? window.__obsidian : {});
const StepperPlugin = module.exports.default;
(async () => {
  try {
    const plugin = new StepperPlugin({});
    await plugin.onload();
    ok('registers the stepper block', typeof plugin.processors.stepper === 'function');
    ok('adds two commands and a settings tab', plugin.commands.length === 2 && plugin.tabs.length === 1);
    const el = document.getElementById('note');
    let child;
    plugin.processors.stepper('yaml', el, { sourcePath: 'note.md', getSectionInfo: () => ({ lineStart: 3 }), addChild: c => { child = c; c.load(); } });
    ok('draws the block', !!el.querySelector('.stepper .stepper-svg'));
    ok('draws shapes', el.querySelectorAll('.st-layer-shapes g[data-id]').length >= 2);
    ok('inline block has no Replay/Pause', !el.querySelector('.stepper-tools'));
    el.querySelector('.stepper-next').click();
    ok('Next goes to step 2', el.querySelector('.stepper-panel-meta').textContent.includes('Step 2'));
    ok('remembers the step for redraws', plugin.lastStep.get('note.md:3') === 1);
    child.unload(); el.replaceChildren();
    plugin.processors.stepper('yaml', el, { sourcePath: 'note.md', getSectionInfo: () => ({ lineStart: 3 }), addChild: c => { child = c; c.load(); } });
    ok('a redraw opens on the remembered step', el.querySelector('.stepper-panel-meta').textContent.includes('Step 2'));
    el.querySelector('.stepper-header .stepper-tool').click();
    ok('full screen opens', !!document.querySelector('.stepper-modal .stepper-svg'));
    ok('full screen has Replay and Pause', !!document.querySelector('.stepper-modal .stepper-tools'));
    plugin.tabs[0].display();
    ok('settings tab shows three settings', plugin.tabs[0].containerEl.querySelectorAll('.setting').length === 3);
    const editor = { getCursor: () => ({ line: 1 }), getLine: i => ['\`\`\`stepper', 'title: x', '\`\`\`'][i], lineCount: () => 3, replaceSelection: t => { window.inserted = t; } };
    ok('full-screen command is offered inside a block', plugin.commands[1].editorCheckCallback(true, editor, {}) === true);
    plugin.commands[0].editorCallback(editor);
    ok('insert command writes an example block', window.inserted.startsWith('\`\`\`stepper'));
    window.LESSON = { steps: [{ scene: { a: { type: 'srvr', at: [0, 0] } } }] };
    const bad = document.createElement('div'); document.body.append(bad);
    plugin.processors.stepper('yaml', bad, { sourcePath: 'n.md', getSectionInfo: () => null, addChild: c => c.load() });
    ok('a broken block shows the error', bad.textContent.includes('unknown type "srvr"'));
    child.unload();
    ok('unload stops the animation', child.view.player.raf === null);
  } catch (e) { results.push('FAIL threw: ' + e.stack); }
  document.getElementById('results').textContent = results.join('\\n');
  window.done = true;
})();
`;

fs.writeFileSync('dev/smoke.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../styles.css"></head>
<body><pre id="results">running…</pre><div id="note" style="max-width:1100px"></div>
<script>window.LESSON = ${JSON.stringify(EXAMPLE)};${fakeObsidian}</script><script>${run}</script></body></html>`);
console.log('dev/smoke.html written');
