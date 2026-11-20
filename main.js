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

// src/lesson.js
var SHAPES = {
  block: { s: 4, h: 46, color: "blue", glyph: "server", label: [], sub: "", cpu: -1, heat: 0, dead: 0, dim: 0, lift: 0, tags: [] },
  crowd: { w: 8, d: 6, count: 15, label: "", tags: [] },
  db: { r: 1.45, h: 30, color: "purple", glyph: "database", label: "", heat: 0, dead: 0, dim: 0, lift: 0, tags: [] },
  zone: { w: 10, d: 6, label: "", color: "ink" },
  queue: { n: 6, dir: [1, 0], label: "", color: "yellow" },
  device: { kind: "laptop", label: "", tags: [] },
  ghost: { s: 4, h: 46, label: [] },
  ring: { r: 5, n: 6, label: "", color: "blue" }
};
var DOT_KINDS = ["req", "res", "msg", "write", "heavy", "slow", "ping", "poison", "fail", "mine"];
var STEP_KINDS = ["problem", "setup", "technique", "solution", "insight", "tradeoff", "recap"];
var CALLOUT_KINDS = ["tip", "insight", "warn", "next"];
var LINK_DEFAULTS = { via: [], style: "solid", heads: "end", label: "", labelAt: 0.5 };
var LINK_STYLES = ["solid", "dashed", "off", "beat", "cut"];
var LessonError = class extends Error {
  constructor(path, message) {
    super(path ? `${path}: ${message}` : message);
    this.path = path;
  }
};
function readLesson(data) {
  if (!data || typeof data !== "object") throw new LessonError("", "the block is empty. Add a title and steps.");
  if (!Array.isArray(data.steps) || data.steps.length === 0) throw new LessonError("steps", "add at least one step");
  let scene = {};
  let links = {};
  let values = {};
  const steps = data.steps.map((raw, index) => {
    const path = `steps[${index}]`;
    if (!raw || typeof raw !== "object") throw new LessonError(path, "a step must be a map with a title");
    scene = nextScene(scene, raw, path);
    links = nextLinks(links, raw.links, scene, path);
    values = { ...values, ...readValues(raw.metrics) };
    const title = String(raw.title ?? `Step ${index + 1}`);
    return {
      index,
      title,
      short: String(raw.short ?? title),
      kind: oneOf(raw.kind ?? "", ["", ...STEP_KINDS], `${path}.kind`),
      text: String(raw.text ?? ""),
      callout: readCallout(raw.callout, `${path}.callout`),
      changes: (raw.changes ?? []).map(String),
      card: readCard(raw.card, `${path}.card`),
      metrics: values,
      scene,
      links,
      flows: readFlows(raw.flows, links, `${path}.flows`)
    };
  });
  return {
    title: String(data.title ?? "Untitled"),
    subtitle: String(data.subtitle ?? ""),
    tags: data.tags ?? {},
    metrics: readMetricList(data.metrics),
    legend: (data.legend ?? []).map((kind) => oneOf(kind, DOT_KINDS, "legend")),
    goals: (data.goals ?? []).map((goal, i) => ({ text: String(goal.text ?? goal), step: Number(goal.step ?? 1) - 1 })),
    steps
  };
}
function nextScene(previous, raw, path) {
  const replace = raw["scene!"] !== void 0;
  const changes = (replace ? raw["scene!"] : raw.scene) ?? {};
  const scene = replace ? {} : { ...previous };
  for (const [id, change] of Object.entries(changes)) {
    const where = `${path}.scene.${id}`;
    if (change === null) {
      delete scene[id];
      continue;
    }
    if (typeof change !== "object") throw new LessonError(where, "a shape must be a map, like { type: block, at: [0, 0] }");
    scene[id] = readShape(id, scene[id], change, where);
  }
  return scene;
}
function readShape(id, old, change, where) {
  const type = change.type ?? old?.type;
  if (!type) throw new LessonError(where, "add a type: " + Object.keys(SHAPES).join(", "));
  if (!SHAPES[type]) throw new LessonError(where, `unknown type "${type}" (${Object.keys(SHAPES).join(", ")})`);
  const base = old && old.type === type ? old : { id, type, ...SHAPES[type] };
  const shape = { ...base, ...change };
  if (!Array.isArray(shape.at) || shape.at.length !== 2 || !shape.at.every(Number.isFinite)) {
    throw new LessonError(where, "add a position: at: [x, y]");
  }
  shape.label = shape.label ?? "";
  return shape;
}
function nextLinks(previous, changes = {}, scene, path) {
  const links = {};
  for (const [id, link] of Object.entries(previous)) if (scene[link.from] && scene[link.to]) links[id] = link;
  for (const [id, change] of Object.entries(changes ?? {})) {
    const where = `${path}.links.${id}`;
    if (change === null) {
      delete links[id];
      continue;
    }
    const link = { ...LINK_DEFAULTS, ...links[id], ...change, id };
    for (const end of ["from", "to"]) {
      if (!scene[link[end]]) throw new LessonError(`${where}.${end}`, `no shape called "${link[end]}" in this step`);
    }
    oneOf(link.style, LINK_STYLES, `${where}.style`);
    oneOf(link.heads, ["end", "both", "none"], `${where}.heads`);
    links[id] = link;
  }
  return links;
}
function readFlows(flows = [], links, path) {
  return (flows ?? []).map((flow, i) => {
    const where = `${path}[${i}]`;
    const route = Array.isArray(flow.route) ? flow.route : [flow.route];
    for (const id of route) if (!links[id]) throw new LessonError(`${where}.route`, `no link called "${id}"`);
    return {
      route,
      rate: Number(flow.rate ?? 2),
      kind: oneOf(flow.kind ?? "req", DOT_KINDS, `${where}.kind`),
      fail: Number(flow.fail ?? 0),
      bounce: Boolean(flow.bounce),
      reverse: Boolean(flow.reverse)
    };
  });
}
function readMetricList(metrics = {}) {
  return Object.entries(metrics ?? {}).map(([key, m]) => ({ key, label: String(m?.label ?? m ?? key), icon: m?.icon ?? "" }));
}
function readValues(values = {}) {
  const out = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    out[key] = typeof value === "number" ? value.toLocaleString("en-US") : String(value);
  }
  return out;
}
function readCallout(callout, where) {
  if (!callout) return null;
  if (typeof callout === "string") return { kind: "tip", text: callout };
  return { kind: oneOf(callout.kind ?? "tip", CALLOUT_KINDS, `${where}.kind`), text: String(callout.text ?? "") };
}
function readCard(card, where) {
  if (!card) return null;
  if (!Array.isArray(card.lines)) throw new LessonError(`${where}.lines`, "a card needs lines: [ \u2026 ]");
  return { title: String(card.title ?? ""), icon: card.icon ?? "", lines: card.lines.map(String) };
}
function oneOf(value, allowed, where) {
  if (!allowed.includes(value)) throw new LessonError(where, `"${value}" is not one of: ${allowed.filter(Boolean).join(", ")}`);
  return value;
}

// src/shapes/block.js
var block_exports = {};
__export(block_exports, {
  bounds: () => bounds,
  boundsOf: () => boundsOf,
  draw: () => draw,
  layer: () => layer,
  overlay: () => overlay,
  reach: () => reach
});

// src/icons.js
var ICONS = {
  "server": '<rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" />',
  "database": '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />',
  "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />',
  "globe": '<circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />',
  "zap": '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />',
  "activity": '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />',
  "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />',
  "cpu": '<rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />',
  "triangle-alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />',
  "check": '<path d="M20 6 9 17l-5-5" />',
  "x": '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  "clock": '<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />',
  "info": '<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />',
  "lightbulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />',
  "sparkles": '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />',
  "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />',
  "play": '<polygon points="6 3 20 12 6 21 6 3" />',
  "pause": '<rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" />',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />',
  "arrow-left": '<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
  "arrow-right": '<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />',
  "maximize-2": '<polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" />',
  "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />',
  "key": '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" />',
  "mail": '<rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />',
  "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
  "box": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />',
  "package": '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" /><path d="m7.5 4.27 9 5.15" />',
  "layers": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />',
  "network": '<rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" />',
  "gauge": '<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />',
  "hard-drive": '<line x1="22" x2="2" y1="12" y2="12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" x2="6.01" y1="16" y2="16" /><line x1="10" x2="10.01" y1="16" y2="16" />',
  "smartphone": '<rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />',
  "laptop": '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />',
  "cloud": '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />',
  "list-ordered": '<path d="M10 12h11" /><path d="M10 18h11" /><path d="M10 6h11" /><path d="M4 10h2" /><path d="M4 6h1v4" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />',
  "git-branch": '<line x1="6" x2="6" y1="3" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />',
  "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />',
  "search": '<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />',
  "file": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />',
  "credit-card": '<rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />',
  "shopping-cart": '<circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />',
  "hourglass": '<path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />',
  "timer": '<line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" />',
  "split": '<path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />',
  "filter": '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />',
  "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />',
  "bug": '<path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />',
  "heart-pulse": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />',
  "workflow": '<rect width="8" height="8" x="3" y="3" rx="2" /><path d="M7 11v4a2 2 0 0 0 2 2h4" /><rect width="8" height="8" x="13" y="13" rx="2" />',
  "inbox": '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />',
  "hash": '<line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />',
  "scale": '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />',
  "route": '<circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" />',
  "signpost": '<path d="M12 13v8" /><path d="M12 3v3" /><path d="M18 6a2 2 0 0 1 1.387.56l2.307 2.22a1 1 0 0 1 0 1.44l-2.307 2.22A2 2 0 0 1 18 13H6a2 2 0 0 1-1.387-.56l-2.306-2.22a1 1 0 0 1 0-1.44l2.306-2.22A2 2 0 0 1 6 6z" />',
  "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />',
  "settings": '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />',
  "chart-column": '<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />',
  "gift": '<rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />',
  "car": '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" />',
  "image": '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />',
  "video": '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" />',
  "radio": '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />',
  "boxes": '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" /><path d="m7 16.5-4.74-2.85" /><path d="m7 16.5 5-3" /><path d="M7 16.5v5.17" /><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" /><path d="m17 16.5-5-3" /><path d="m17 16.5 4.74-2.85" /><path d="M17 16.5v5.17" /><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" /><path d="M12 8 7.26 5.15" /><path d="m12 8 4.74-2.85" /><path d="M12 13.5V8" />',
  "braces": '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />'
};

// src/svg.js
function esc(text2) {
  return String(text2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var r2 = (n) => Math.round(n * 100) / 100;
function tag(name, attrs = {}, inner = "") {
  const list = Object.entries(attrs).filter(([, v]) => v !== void 0 && v !== null && v !== false && v !== "").map(([k, v]) => ` ${k}="${typeof v === "number" ? r2(v) : esc(v)}"`).join("");
  return inner === "" ? `<${name}${list}/>` : `<${name}${list}>${inner}</${name}>`;
}
var textWidth = (text2, size) => String(text2).length * size * 0.6;
function text(x, y, value, { size = 12, weight = 700, cls = "st-ink", anchor = "middle" } = {}) {
  return tag("text", { x, y, class: cls, "font-size": size, "font-weight": weight, "text-anchor": anchor }, esc(value));
}
function icon(name, x, y, size = 16, { cls = "st-icon", stroke = 2 } = {}) {
  const body = ICONS[name];
  if (!body) return "";
  const scale = size / 24;
  return tag("g", { class: cls, transform: `translate(${r2(x - size / 2)} ${r2(y - size / 2)}) scale(${r2(scale)})`, "stroke-width": r2(stroke / scale) }, body);
}
function pill(x, y, value, { icon: iconName = "", tone = "paper", size = 11 } = {}) {
  const w = textWidth(value, size) + 20 + (iconName ? size + 4 : 0);
  const h = size + 10;
  const left = x - w / 2;
  return tag(
    "g",
    { class: `st-pill st-tone-${tone}` },
    tag("rect", { x: left + 1.5, y: y - h / 2 + 2, width: w, height: h, rx: h / 2, class: "st-pill-shadow" }) + tag("rect", { x: left, y: y - h / 2, width: w, height: h, rx: h / 2, class: "st-pill-bg" }) + (iconName ? icon(iconName, left + 10 + size / 2, y, size + 1, { cls: "st-pill-icon" }) : "") + text(left + w / 2 + (iconName ? (size + 4) / 2 : 0), y + size * 0.36, value, { size, cls: "st-pill-text" })
  );
}

// src/iso.js
var UNIT = 14;
function project(x, y, z = 0) {
  return [UNIT * (x + y), UNIT / 2 * (x - y) - z];
}
function roundedPath(points, radius = 6) {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const here = points[i];
    const next = points[(i + 1) % n];
    const a = towards(here, prev, radius);
    const b = towards(here, next, radius);
    d += `${i === 0 ? "M" : "L"}${r2(a[0])},${r2(a[1])} Q${r2(here[0])},${r2(here[1])} ${r2(b[0])},${r2(b[1])} `;
  }
  return d + "Z";
}
function towards(from, to, distance) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const step = Math.min(distance, length / 2) / length;
  return [from[0] + dx * step, from[1] + dy * step];
}
function box(x, y, w, d, h, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2;
  const at = (px, py, pz) => project(px, py, pz);
  const top = { a: at(x0, y0, z + h), b: at(x1, y0, z + h), c: at(x1, y1, z + h), d: at(x0, y1, z + h) };
  const bottom = { a: at(x0, y0, z), b: at(x1, y0, z), c: at(x1, y1, z) };
  return {
    top: [top.a, top.b, top.c, top.d],
    left: [top.a, top.b, bottom.b, bottom.a],
    right: [top.b, top.c, bottom.c, bottom.b],
    outline: [top.d, top.c, bottom.c, bottom.b, bottom.a, top.a],
    center: at(x, y, z + h)
  };
}
function flatCircle(x, y, r, z = 0) {
  const [cx, cy] = project(x, y, z);
  return { cx, cy, rx: r * UNIT * Math.SQRT2, ry: r * (UNIT / 2) * Math.SQRT2 };
}
var depth = (shape) => shape.at[0] - shape.at[1];

// src/colors.js
var COLORS = {
  blue: { top: "#d9e7f8", side: "#b9d1ef", ink: "#1d1b18" },
  green: { top: "#dcefcf", side: "#bcdca6", ink: "#1d1b18" },
  orange: { top: "#fde0c2", side: "#f6c08f", ink: "#1d1b18" },
  yellow: { top: "#fbeab0", side: "#f1d27a", ink: "#1d1b18" },
  purple: { top: "#e6ddf5", side: "#cdbde9", ink: "#1d1b18" },
  red: { top: "#f4cfd0", side: "#e3a6a9", ink: "#1d1b18" },
  gray: { top: "#e6e1da", side: "#cbc3b8", ink: "#1d1b18" },
  slab: { top: "#f8f3ec", side: "#e2d8cb", ink: "#1d1b18" },
  ink: { top: "#fffaf2", side: "#e2d8cb", ink: "#1d1b18" }
};
function mix(a, b, t) {
  const from = parseInt(a.slice(1), 16);
  const to = parseInt(b.slice(1), 16);
  const channel = (shift) => Math.round((from >> shift & 255) * (1 - t) + (to >> shift & 255) * t);
  return "#" + (1 << 24 | channel(16) << 16 | channel(8) << 8 | channel(0)).toString(16).slice(1);
}
function shapeColors(shape) {
  const base = COLORS[shape.color] ?? COLORS.blue;
  const heat = Math.max(0, Math.min(1, shape.heat ?? 0));
  const dead = Math.max(0, Math.min(1, shape.dead ?? 0));
  const top = mix(mix(base.top, COLORS.red.top, heat), COLORS.gray.top, dead);
  const side = mix(mix(base.side, COLORS.red.side, heat), COLORS.gray.side, dead);
  return { top, side, ink: base.ink };
}

// src/shapes/common.js
function tagsAbove(x, y, items) {
  return items.map(([kind, item], i) => {
    const at = y - i * 26;
    return kind === "cpu" ? cpuGauge(x, at, item) : pill(x, at, item.text ?? item, { icon: item.icon, tone: item.tone ?? "paper" });
  }).join("");
}
function cpuGauge(x, y, cpu) {
  const value = Math.max(0, Math.min(1, cpu));
  const color = value < 0.6 ? "st-good" : value < 0.85 ? "st-warn" : "st-bad";
  const left = x - 43;
  return tag(
    "g",
    { class: "st-pill st-tone-paper" },
    tag("rect", { x: left + 1.5, y: y - 8.5, width: 86, height: 21, rx: 10.5, class: "st-pill-shadow" }) + tag("rect", { x: left, y: y - 10.5, width: 86, height: 21, rx: 10.5, class: "st-pill-bg" }) + icon("cpu", left + 13, y, 12, { cls: "st-pill-icon" }) + tag("rect", { x: left + 23, y: y - 3.5, width: 28, height: 7, rx: 3.5, class: "st-gauge-track" }) + tag("rect", { x: left + 23, y: y - 3.5, width: r2(Math.max(3, 28 * value)), height: 7, rx: 3.5, class: `st-gauge ${color}` }) + text(left + 78, y + 3.8, `${Math.round(value * 100)}%`, { size: 10.5, weight: 800, anchor: "end" })
  );
}
function labelBelow(x, y, label, iconName) {
  return label ? pill(x, y, label, { icon: iconName, size: 11 }) : "";
}

// src/shapes/block.js
var layer = "shapes";
var reach = (shape) => shape.s * 0.62;
function bounds(shape) {
  const g = box(shape.at[0], shape.at[1], shape.s, shape.s, shape.h, shape.lift);
  return boundsOf([...g.outline, project(shape.at[0], shape.at[1], shape.h + shape.lift + 40)]);
}
function draw(shape) {
  const [x, y] = shape.at;
  const g = box(x, y, shape.s, shape.s, shape.h, shape.lift);
  const floor = box(x, y, shape.s, shape.s, shape.h, 0);
  const colors = shapeColors(shape);
  const corner = Math.min(9, shape.h / 3);
  const label = [].concat(shape.label ?? []).filter(Boolean);
  const [cx, cy] = g.center;
  const size = shape.s >= 6 ? 1.15 : shape.s < 3.5 ? 0.8 : 1;
  return tag("path", { d: roundedPath(floor.outline, corner), class: "st-shadow", transform: "translate(0 7)" }) + tag("path", { d: roundedPath(g.outline, corner), fill: colors.side }) + tag("path", { d: roundedPath(g.right, corner), class: "st-shade" }) + tag("path", { d: roundedPath(g.top, corner), fill: colors.top }) + tag("path", { d: roundedPath(g.outline, corner), class: "st-edge" }) + icon(shape.glyph, cx, cy + (label.length ? -6 : 2) * size, 22 * size) + label.map((line, i) => text(cx, cy + (12 + i * 14 - (label.length - 1) * 4) * size + shape.h * 0.25, line, { size: 12.5 * size, weight: 800 })).join("") + (shape.sub ? text(cx, cy + 22 * size + shape.h * 0.25 + label.length * 6, shape.sub, { size: 10, weight: 600, cls: "st-muted" }) : "") + (shape.dead > 0.01 ? deadMark(cx, cy, shape.dead) : "");
}
function overlay(shape) {
  const [x, y] = shape.at;
  const [, topY] = project(x - shape.s / 2, y + shape.s / 2, shape.h + shape.lift);
  const items = [];
  if (shape.cpu >= 0) items.push(["cpu", shape.cpu]);
  for (const t of shape.tags ?? []) items.push(["tag", t]);
  if (shape.dead > 0.5) items.push(["tag", { text: "DOWN", tone: "red", icon: "triangle-alert" }]);
  return tagsAbove(project(x, y, 0)[0], topY - 16, items);
}
function deadMark(cx, cy, amount) {
  return tag(
    "g",
    { class: "st-dead", opacity: amount },
    tag("path", { d: `M${cx - 12},${cy - 12} L${cx + 12},${cy + 12} M${cx + 12},${cy - 12} L${cx - 12},${cy + 12}` })
  );
}
function boundsOf(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// src/shapes/crowd.js
var crowd_exports = {};
__export(crowd_exports, {
  bounds: () => bounds2,
  draw: () => draw2,
  layer: () => layer2,
  overlay: () => overlay2,
  reach: () => reach2
});
var layer2 = "shapes";
var reach2 = (shape) => Math.min(shape.w, shape.d) * 0.55;
var SLAB = 8;
var PEOPLE_COLORS = ["#b9d1ef", "#f6c08f", "#cdbde9", "#bcdca6", "#f1d27a"];
function bounds2(shape) {
  const g = box(shape.at[0], shape.at[1], shape.w, shape.d, SLAB);
  return boundsOf([...g.outline, ...g.top.map(([x, y]) => [x, y - 40]), [g.outline[3][0], g.outline[3][1] + 34]]);
}
function draw2(shape) {
  const [x, y] = shape.at;
  const g = box(x, y, shape.w, shape.d, SLAB);
  const slab = tag("path", { d: roundedPath(g.outline, 10), class: "st-shadow", transform: "translate(0 6)" }) + tag("path", { d: roundedPath(g.outline, 10), fill: COLORS.slab.side }) + tag("path", { d: roundedPath(g.top, 10), fill: COLORS.slab.top }) + tag("path", { d: roundedPath(g.outline, 10), class: "st-edge" });
  return slab + people(shape).map(([px, py, color]) => person(px, py, color)).join("");
}
function overlay2(shape) {
  const [x, y] = shape.at;
  const front = project(x + shape.w / 2, y - shape.d / 2, 0);
  const top = project(x, y, SLAB + 46);
  return labelBelow(project(x, y)[0], front[1] + 24, shape.label, "users") + tagsAbove(top[0], top[1], (shape.tags ?? []).map((t) => ["tag", t]));
}
function people(shape) {
  const [x, y] = shape.at;
  const cols = Math.max(1, Math.round(Math.sqrt(shape.count * shape.w / shape.d)));
  const rows = Math.ceil(shape.count / cols);
  const list = [];
  for (let i = 0; i < shape.count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x - shape.w / 2 + shape.w * (col + 0.5) / cols;
    const py = y - shape.d / 2 + shape.d * (row + 0.5) / rows;
    list.push([px, py, PEOPLE_COLORS[(i * 3 + row) % PEOPLE_COLORS.length]]);
  }
  return list.sort((a, b) => a[0] - a[1] - (b[0] - b[1])).map(([px, py, color]) => [...project(px, py, SLAB), color]);
}
function person(sx, sy, color) {
  return tag(
    "g",
    { class: "st-person" },
    tag("rect", { x: sx - 5.5, y: sy - 19, width: 11, height: 17, rx: 5, fill: color, class: "st-edge-thin" }) + tag("circle", { cx: sx, cy: sy - 23, r: 4.6, class: "st-head" })
  );
}

// src/shapes/db.js
var db_exports = {};
__export(db_exports, {
  bounds: () => bounds3,
  draw: () => draw3,
  layer: () => layer3,
  overlay: () => overlay3,
  reach: () => reach3
});
var layer3 = "shapes";
var reach3 = (shape) => shape.r * 1.25;
function bounds3(shape) {
  const top = flatCircle(shape.at[0], shape.at[1], shape.r, shape.h + shape.lift);
  const bottom = flatCircle(shape.at[0], shape.at[1], shape.r, 0);
  return [top.cx - top.rx, top.cy - top.ry - 30, top.cx + top.rx, bottom.cy + bottom.ry + 34];
}
function draw3(shape) {
  const [x, y] = shape.at;
  const top = flatCircle(x, y, shape.r, shape.h + shape.lift);
  const bottom = flatCircle(x, y, shape.r, shape.lift);
  const shadow = flatCircle(x, y, shape.r, 0);
  const colors = shapeColors(shape);
  const { rx, ry } = top;
  const body = `M${top.cx - rx},${top.cy} L${bottom.cx - rx},${bottom.cy} A${rx},${ry} 0 0 0 ${bottom.cx + rx},${bottom.cy} L${top.cx + rx},${top.cy} Z`;
  return tag("ellipse", { cx: shadow.cx, cy: shadow.cy + 5, rx, ry, class: "st-shadow" }) + tag("path", { d: body, fill: colors.side }) + tag("ellipse", { cx: top.cx, cy: top.cy, rx, ry, fill: colors.top }) + tag("path", { d: body, class: "st-edge" }) + tag("ellipse", { cx: top.cx, cy: top.cy, rx, ry, class: "st-edge" }) + icon(shape.glyph, top.cx, top.cy + shape.h / 2 + ry * 0.5, 16);
}
function overlay3(shape) {
  const [x, y] = shape.at;
  const bottom = flatCircle(x, y, shape.r, 0);
  const [, topY] = project(x, y, shape.h + shape.lift);
  const tags = (shape.tags ?? []).map((t) => ["tag", t]);
  if (shape.dead > 0.5) tags.push(["tag", { text: "DOWN", tone: "red", icon: "triangle-alert" }]);
  return labelBelow(bottom.cx, bottom.cy + bottom.ry + 18, shape.label, "database") + tagsAbove(bottom.cx, topY - bottom.ry - 18, tags);
}

// src/shapes/zone.js
var zone_exports = {};
__export(zone_exports, {
  bounds: () => bounds4,
  draw: () => draw4,
  layer: () => layer4,
  overlay: () => overlay4,
  reach: () => reach4
});
var layer4 = "floor";
var reach4 = (shape) => Math.min(shape.w, shape.d) / 2;
function corners(shape) {
  const [x, y] = shape.at;
  const x0 = x - shape.w / 2, x1 = x + shape.w / 2, y0 = y - shape.d / 2, y1 = y + shape.d / 2;
  return [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
}
var bounds4 = (shape) => boundsOf(corners(shape));
function draw4(shape) {
  const [x, y] = shape.at;
  const [tx, ty] = project(x - shape.w / 2 + 0.7, y - shape.d / 2 + 0.25);
  return tag("path", { d: roundedPath(corners(shape), 8), class: "st-zone" }) + (shape.label ? `<text class="st-floor-text" transform="matrix(1 0.5 -1 0.5 ${r2(tx)} ${r2(ty)})" font-size="10.5" font-weight="800">${esc(String(shape.label).toUpperCase())}</text>` : "");
}
var overlay4 = () => "";

// src/shapes/index.js
var SHAPE_DRAWERS = { block: block_exports, crowd: crowd_exports, db: db_exports, zone: zone_exports };

// src/camera.js
function fit(boxes, padding = 0.1, minWidth = 360) {
  if (boxes.length === 0) return { x: -200, y: -150, w: 400, h: 300 };
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [a, b, c, d] of boxes) {
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  }
  const w = Math.max(minWidth, x1 - x0);
  const h = y1 - y0;
  const pad = Math.max(w, h) * padding;
  const cx = (x0 + x1) / 2;
  return { x: cx - w / 2 - pad, y: y0 - pad, w: w + pad * 2, h: h + pad * 2 };
}
var viewBox = (v) => [v.x, v.y, v.w, v.h].map((n) => Math.round(n * 10) / 10).join(" ");

// src/links.js
var HEIGHT = 4;
function linkPoints(link, scene) {
  const from = scene[link.from];
  const to = scene[link.to];
  const floor = [from.at, ...link.via ?? [], to.at];
  floor[0] = moveTowards(floor[0], floor[1], SHAPE_DRAWERS[from.type].reach(from));
  floor[floor.length - 1] = moveTowards(floor[floor.length - 1], floor[floor.length - 2], SHAPE_DRAWERS[to.type].reach(to));
  return floor.map(([x, y]) => project(x, y, HEIGHT));
}
function moveTowards([x, y], [tx, ty], distance) {
  const length = Math.hypot(tx - x, ty - y) || 1;
  const step = Math.min(distance, length * 0.45) / length;
  return [x + (tx - x) * step, y + (ty - y) * step];
}
function lengthOf(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}
function pointAt(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const piece = Math.hypot(bx - ax, by - ay);
    if (distance <= piece) {
      const t = piece ? distance / piece : 0;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    distance -= piece;
  }
  return points[points.length - 1];
}
function linePath(points, radius = 10) {
  let d = `M${r2(points[0][0])},${r2(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const a = pointAt([points[i], points[i - 1]], radius);
    const b = pointAt([points[i], points[i + 1]], radius);
    d += ` L${r2(a[0])},${r2(a[1])} Q${r2(x)},${r2(y)} ${r2(b[0])},${r2(b[1])}`;
  }
  const last = points[points.length - 1];
  return `${d} L${r2(last[0])},${r2(last[1])}`;
}
function drawLink(link, scene, arrowId) {
  const points = linkPoints(link, scene);
  const arrow = `url(#${arrowId})`;
  const path = tag("path", {
    d: linePath(points),
    class: `st-link st-link-${link.style}`,
    "marker-end": link.heads !== "none" ? arrow : "",
    "marker-start": link.heads === "both" ? arrow : ""
  });
  const [mx, my] = pointAt(points, lengthOf(points) / 2);
  const cut = link.style === "cut" ? tag("path", { d: `M${r2(mx - 6)},${r2(my - 6)} L${r2(mx + 6)},${r2(my + 6)} M${r2(mx + 6)},${r2(my - 6)} L${r2(mx - 6)},${r2(my + 6)}`, class: "st-link-cut-mark" }) : "";
  return path + cut;
}
function drawLinkLabel(link, scene) {
  if (!link.label) return "";
  const points = linkPoints(link, scene);
  const [x, y] = pointAt(points, lengthOf(points) * link.labelAt);
  return pill(x, y, link.label, { size: 10.5 });
}

// src/stage.js
var counter = 0;
var Stage = class {
  constructor(parent) {
    const id = `stepper-${++counter}`;
    this.el = parent.createDiv ? parent.createDiv({ cls: "stepper-stage" }) : parent.appendChild(Object.assign(document.createElement("div"), { className: "stepper-stage" }));
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("stepper-svg");
    this.svg.innerHTML = `
      <defs>
        <pattern id="${id}-grid" width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0,7 L14,0 L28,7 L14,14 Z" class="st-grid-line"/>
        </pattern>
        <radialGradient id="${id}-fade"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
        <mask id="${id}-mask"><rect x="-3000" y="-3000" width="6000" height="6000" fill="url(#${id}-fade)"/></mask>
        <marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1,1 L9,5 L1,9" class="st-arrow-head"/>
        </marker>
      </defs>
      <rect class="st-grid" x="-1500" y="-1500" width="3000" height="3000" fill="url(#${id}-grid)" mask="url(#${id}-mask)"/>
      <g class="st-layer-floor"></g><g class="st-layer-links"></g><g class="st-layer-dots"></g><g class="st-layer-shapes"></g><g class="st-layer-over"></g>`;
    this.el.appendChild(this.svg);
    this.arrowId = `${id}-arrow`;
    this.layers = {};
    for (const name of ["floor", "links", "dots", "shapes", "over"]) this.layers[name] = this.svg.querySelector(`.st-layer-${name}`);
    this.drawn = /* @__PURE__ */ new Map();
    this.labelLayer = svgEl("g");
    this.svg.appendChild(this.labelLayer);
  }
  // Draw every shape in `shapes` (a list of shape states). Removes shapes that are no longer listed.
  drawShapes(shapes) {
    const seen = /* @__PURE__ */ new Set();
    for (const shape of [...shapes].sort((a, b) => depth(a) - depth(b))) {
      seen.add(shape.id);
      const drawer = SHAPE_DRAWERS[shape.type];
      let entry = this.drawn.get(shape.id);
      if (!entry || entry.type !== shape.type) {
        if (entry) {
          entry.g.remove();
          entry.overlay.remove();
        }
        entry = { type: shape.type, g: svgEl("g"), overlay: svgEl("g"), html: "", over: "" };
        entry.g.dataset.id = shape.id;
        this.drawn.set(shape.id, entry);
      }
      const html = drawer.draw(shape);
      const over = drawer.overlay(shape);
      if (html !== entry.html) {
        entry.g.innerHTML = html;
        entry.html = html;
      }
      if (over !== entry.over) {
        entry.overlay.innerHTML = over;
        entry.over = over;
      }
      const opacity = String(Math.round((shape.opacity ?? 1) * (1 - (shape.dim ?? 0) * 0.6) * 100) / 100);
      entry.g.setAttribute("opacity", opacity);
      entry.overlay.setAttribute("opacity", opacity);
      this.layers[drawer.layer].appendChild(entry.g);
      this.layers.over.appendChild(entry.overlay);
    }
    for (const [id, entry] of this.drawn) {
      if (!seen.has(id)) {
        entry.g.remove();
        entry.overlay.remove();
        this.drawn.delete(id);
      }
    }
  }
  // Draw the arrows. `opacity` (optional) maps a link id to how visible it is, for fading in and out.
  drawLinks(links, scene, opacity = {}) {
    let lines = "";
    let labels = "";
    for (const link of links) {
      const fade = opacity[link.id] ?? 1;
      if (fade <= 0.01) continue;
      lines += `<g opacity="${fade}">${drawLink(link, scene, this.arrowId)}</g>`;
      labels += `<g opacity="${fade}">${drawLinkLabel(link, scene)}</g>`;
    }
    if (lines !== this.linesHtml) {
      this.layers.links.innerHTML = lines;
      this.linesHtml = lines;
    }
    if (labels !== this.labelsHtml) {
      this.labelLayer.innerHTML = labels;
      this.labelsHtml = labels;
    }
  }
  // The view that shows all these shapes.
  fitView(shapes) {
    return fit(shapes.map((shape) => SHAPE_DRAWERS[shape.type].bounds(shape)));
  }
  setView(view) {
    this.view = view;
    this.svg.setAttribute("viewBox", viewBox(view));
  }
};
var svgEl = (name) => document.createElementNS("http://www.w3.org/2000/svg", name);

// src/main.js
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
      const lesson = readLesson((0, import_obsidian.parseYaml)(this.source));
      root.createDiv({ cls: "stepper-title", text: lesson.title });
      const stage = new Stage(root);
      const shapes = Object.values(lesson.steps[0].scene);
      stage.drawShapes(shapes);
      stage.drawLinks(Object.values(lesson.steps[0].links), lesson.steps[0].scene);
      stage.setView(stage.fitView(shapes));
    } catch (error) {
      showError(root, error);
    }
  }
};
function showError(root, error) {
  root.empty();
  root.createDiv({ cls: "stepper-error", text: `Stepper: ${error.message}` });
}
