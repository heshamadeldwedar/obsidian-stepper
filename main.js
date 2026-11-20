var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  default: () => StepperPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var StepperPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("stepper", (source, el, ctx) => {
      ctx.addChild(new StepperBlock(el, source));
    });
  }
};
var StepperBlock = class extends import_obsidian.MarkdownRenderChild {
  constructor(el, source) {
    super(el);
    this.source = source;
  }
  onload() {
    const root = this.containerEl.createDiv({ cls: "stepper" });
    try {
      const data = (0, import_obsidian.parseYaml)(this.source) || {};
      root.createDiv({ cls: "stepper-title", text: data.title || "Untitled" });
    } catch (error) {
      showError(root, error);
    }
  }
};
function showError(root, error) {
  root.empty();
  root.createDiv({ cls: "stepper-error", text: `Stepper: ${error.message}` });
}
