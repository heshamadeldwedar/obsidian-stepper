// Turns the YAML of a ```stepper block into a list of complete steps.
// Each step starts from the one before it, so authors only write what changes.
// Nothing here touches the screen, so it is easy to test (tests/lesson.test.js).

// Every shape type and its default fields. A shape in the YAML only needs `type` and `at`.
export const SHAPES = {
  block:  { s: 4, h: 46, color: 'blue', glyph: 'server', label: [], sub: '', cpu: -1, heat: 0, dead: 0, dim: 0, lift: 0, tags: [] },
  crowd:  { w: 8, d: 6, count: 15, label: '', tags: [] },
  db:     { r: 1.45, h: 30, color: 'purple', glyph: 'database', label: '', heat: 0, dead: 0, dim: 0, lift: 0, tags: [] },
  zone:   { w: 10, d: 6, label: '', color: 'ink' },
  queue:  { n: 6, dir: [1, 0], label: '', color: 'yellow' },
  device: { kind: 'laptop', label: '', tags: [] },
  ghost:  { s: 4, h: 46, label: [] },
  ring:   { r: 5, n: 6, label: '', color: 'blue' },
};
export const DOT_KINDS = ['req', 'res', 'msg', 'write', 'heavy', 'slow', 'ping', 'poison', 'fail', 'mine'];
export const STEP_KINDS = ['problem', 'setup', 'technique', 'solution', 'insight', 'tradeoff', 'recap'];
export const CALLOUT_KINDS = ['tip', 'insight', 'warn', 'next'];
const LINK_DEFAULTS = { via: [], bend: 'x', style: 'solid', heads: 'end', label: '', labelAt: null };
const LINK_STYLES = ['solid', 'dashed', 'dotted', 'off', 'beat', 'cut'];

// A mistake in the YAML. `path` says where, like "steps[2].scene.s0".
export class LessonError extends Error {
  constructor(path, message) {
    super(path ? `${path}: ${message}` : message);
    this.path = path;
  }
}

export function readLesson(data) {
  if (!data || typeof data !== 'object') throw new LessonError('', 'the block is empty. Add a title and steps.');
  if (!Array.isArray(data.steps) || data.steps.length === 0) throw new LessonError('steps', 'add at least one step');

  let scene = {};
  let links = {};
  let values = {};
  const steps = data.steps.map((raw, index) => {
    const path = `steps[${index}]`;
    if (!raw || typeof raw !== 'object') throw new LessonError(path, 'a step must be a map with a title');
    scene = nextScene(scene, raw, path);
    links = nextLinks(links, raw.links, scene, path);
    values = { ...values, ...readValues(raw.metrics) };
    const title = String(raw.title ?? `Step ${index + 1}`);
    return {
      index,
      title,
      short: String(raw.short ?? title),
      kind: oneOf(raw.kind ?? '', ['', ...STEP_KINDS], `${path}.kind`),
      text: String(raw.text ?? ''),
      callout: readCallout(raw.callout, `${path}.callout`),
      changes: (raw.changes ?? []).map(String),
      card: readCard(raw.card, `${path}.card`),
      metrics: values,
      scene,
      links,
      flows: readFlows(raw.flows, links, `${path}.flows`),
    };
  });

  return {
    title: String(data.title ?? 'Untitled'),
    subtitle: String(data.subtitle ?? ''),
    tags: data.tags ?? {},
    metrics: readMetricList(data.metrics),
    // A legend entry is a dot kind, or [kind, name] to give it a name of its own.
    legend: (data.legend ?? []).map(entry => {
      const [kind, name] = Array.isArray(entry) ? entry : [entry, null];
      return { kind: oneOf(kind, DOT_KINDS, 'legend'), name };
    }),
    goals: (data.goals ?? []).map((goal, i) => ({ text: String(goal.text ?? goal), step: Number(goal.step ?? 1) - 1 })),
    steps,
  };
}

// The scene after this step: the previous scene, plus or minus what the step changes.
// `scene!` throws the old scene away. A shape set to null is removed.
function nextScene(previous, raw, path) {
  const replace = raw['scene!'] !== undefined;
  const changes = (replace ? raw['scene!'] : raw.scene) ?? {};
  const scene = replace ? {} : { ...previous };
  for (const [id, change] of Object.entries(changes)) {
    const where = `${path}.scene.${id}`;
    if (change === null) { delete scene[id]; continue; }
    if (typeof change !== 'object') throw new LessonError(where, 'a shape must be a map, like { type: block, at: [0, 0] }');
    scene[id] = readShape(id, scene[id], change, where);
  }
  return scene;
}

function readShape(id, old, change, where) {
  const type = change.type ?? old?.type;
  if (!type) throw new LessonError(where, 'add a type: ' + Object.keys(SHAPES).join(', '));
  if (!SHAPES[type]) throw new LessonError(where, `unknown type "${type}" (${Object.keys(SHAPES).join(', ')})`);
  const base = old && old.type === type ? old : { id, type, ...SHAPES[type] };
  const shape = { ...base, ...change };
  if (!Array.isArray(shape.at) || shape.at.length !== 2 || !shape.at.every(Number.isFinite)) {
    throw new LessonError(where, 'add a position: at: [x, y]');
  }
  shape.label = shape.label ?? '';
  return shape;
}

// Links are inherited like shapes. A link whose shape was removed disappears with it.
function nextLinks(previous, changes = {}, scene, path) {
  const links = {};
  for (const [id, link] of Object.entries(previous)) if (scene[link.from] && scene[link.to]) links[id] = link;
  for (const [id, change] of Object.entries(changes ?? {})) {
    const where = `${path}.links.${id}`;
    if (change === null) { delete links[id]; continue; }
    const link = { ...LINK_DEFAULTS, ...links[id], ...change, id };
    for (const end of ['from', 'to']) {
      if (!scene[link[end]]) throw new LessonError(`${where}.${end}`, `no shape called "${link[end]}" in this step`);
    }
    oneOf(link.style, LINK_STYLES, `${where}.style`);
    oneOf(link.heads, ['end', 'both', 'none'], `${where}.heads`);
    oneOf(link.bend, ['x', 'y', 'none'], `${where}.bend`);
    links[id] = link;
  }
  return links;
}

// Flows are not inherited: each step lists what is moving right now.
function readFlows(flows = [], links, path) {
  return (flows ?? []).map((flow, i) => {
    const where = `${path}[${i}]`;
    const route = Array.isArray(flow.route) ? flow.route : [flow.route];
    for (const id of route) if (!links[id]) throw new LessonError(`${where}.route`, `no link called "${id}"`);
    return {
      route,
      rate: Number(flow.rate ?? 2),
      kind: oneOf(flow.kind ?? 'req', DOT_KINDS, `${where}.kind`),
      fail: Number(flow.fail ?? 0),
      bounce: Boolean(flow.bounce),
      reverse: Boolean(flow.reverse),
    };
  });
}

function readMetricList(metrics = {}) {
  return Object.entries(metrics ?? {}).map(([key, m]) => ({ key, label: String(m?.label ?? m ?? key), icon: m?.icon ?? '' }));
}

// Numbers are shown with thousands separators: 7000 → "7,000".
function readValues(values = {}) {
  const out = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    out[key] = typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
  }
  return out;
}

function readCallout(callout, where) {
  if (!callout) return null;
  if (typeof callout === 'string') return { kind: 'tip', text: callout };
  return { kind: oneOf(callout.kind ?? 'tip', CALLOUT_KINDS, `${where}.kind`), text: String(callout.text ?? '') };
}

function readCard(card, where) {
  if (!card) return null;
  if (!Array.isArray(card.lines)) throw new LessonError(`${where}.lines`, 'a card needs lines: [ … ]');
  return { title: String(card.title ?? ''), icon: card.icon ?? '', lines: card.lines.map(String) };
}

function oneOf(value, allowed, where) {
  if (!allowed.includes(value)) throw new LessonError(where, `"${value}" is not one of: ${allowed.filter(Boolean).join(', ')}`);
  return value;
}
