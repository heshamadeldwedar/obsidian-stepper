// The whole block on screen: header, numbers bar, diagram, step panel, timeline and goals.
// It knows nothing about Obsidian. main.js passes in `renderMarkdown` so this file also runs in the browser preview.
import { h, iconEl } from './dom.js';
import { Player } from './player.js';
import { DOTS } from './colors.js';

const KIND_LABELS = { problem: 'Problem', setup: 'Setup', technique: 'Technique', solution: 'Solution', insight: 'Insight', tradeoff: 'Trade-off', recap: 'Recap' };
const CALLOUTS = {
  tip: { label: 'Good to know', icon: 'lightbulb' },
  insight: { label: 'Key idea', icon: 'sparkles' },
  warn: { label: 'Watch out', icon: 'triangle-alert' },
  next: { label: 'Up next', icon: 'arrow-right' },
};
const DOT_NAMES = {
  req: 'request', res: 'response', msg: 'message', write: 'write', heavy: 'heavy request',
  slow: 'slow request', ping: 'health check', poison: 'poison message', fail: 'failed request', mine: 'your request',
};

export class View {
  constructor(root, lesson, { renderMarkdown = plainMarkdown, onFullscreen = null, reduceMotion = false, speed = 1, grid = true, startAt = 0, onStep = null } = {}) {
    this.root = root;
    this.lesson = lesson;
    this.renderMarkdown = renderMarkdown;
    this.index = -1;
    this.onStep = onStep;
    root.classList.add('stepper');
    root.classList.toggle('no-grid', !grid);
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', `${lesson.title}: interactive diagram. Use the left and right arrow keys to change step.`);
    root.addEventListener('keydown', event => this.onKey(event));

    root.append(this.header(onFullscreen));
    this.chips = h('div', { cls: 'stepper-chips' });
    this.card = h('div', { cls: 'stepper-card' });
    this.legend = h('div', { cls: 'stepper-legend' });
    this.pauseButton = this.toolButton('pause', 'Pause', () => this.togglePause());
    const tools = h('div', { cls: 'stepper-tools' }, [this.toolButton('rotate-ccw', 'Replay', () => this.replay()), this.pauseButton]);
    const stageBox = h('div', { cls: 'stepper-stage-box' }, [this.chips, tools, this.card, this.legend]);
    this.player = new Player(stageBox, { reduceMotion, speed });
    this.timeline = h('ol', { cls: 'stepper-timeline' });
    this.panel = h('div', { cls: 'stepper-panel' });
    this.goals = h('ul', { cls: 'stepper-goals' });
    root.append(h('div', { cls: 'stepper-body' }, [
      h('div', { cls: 'stepper-main' }, [stageBox, h('div', { cls: 'stepper-timeline-box' }, [h('div', { cls: 'stepper-eyebrow', text: 'In this lesson' }), this.timeline])]),
      h('div', { cls: 'stepper-side' }, [this.panel, lesson.goals.length ? h('div', { cls: 'stepper-goals-box' }, [h('div', { cls: 'stepper-eyebrow', text: "You'll learn" }), this.goals]) : null]),
    ]));

    this.buildChips();
    this.buildTimeline();
    this.buildLegend();
    this.goTo(Math.min(startAt, lesson.steps.length - 1), { animate: false });
  }

  header(onFullscreen) {
    const { title, subtitle, tags, steps } = this.lesson;
    const pills = [];
    if (tags.minutes) pills.push(this.tagPill('clock', `${tags.minutes} min`, 'sand'));
    if (tags.level) pills.push(this.tagPill('gauge', capitalize(tags.level), 'green'));
    pills.push(this.tagPill('list-ordered', `${steps.length} steps`, 'violet'));
    if (onFullscreen) pills.push(this.toolButton('maximize-2', 'Full screen', onFullscreen));
    return h('div', { cls: 'stepper-header' }, [
      h('div', {}, [h('div', { cls: 'stepper-title', text: title }), subtitle ? h('div', { cls: 'stepper-subtitle', text: subtitle }) : null]),
      h('div', { cls: 'stepper-tags' }, pills),
    ]);
  }

  // ——— Building the parts that stay the same for every step ———

  buildChips() {
    this.chipValues = {};
    for (const metric of this.lesson.metrics) {
      const value = h('div', { cls: 'stepper-chip-value', text: '?' });
      this.chipValues[metric.key] = value;
      this.chips.append(h('div', { cls: 'stepper-chip' }, [
        h('div', { cls: 'stepper-chip-label' }, [metric.icon ? iconEl(metric.icon, 11) : null, metric.label]),
        value,
      ]));
    }
  }

  buildTimeline() {
    this.dots = this.lesson.steps.map((step, i) => {
      const item = h('li', { cls: 'stepper-timeline-step' }, [
        h('button', { cls: 'stepper-timeline-dot', text: String(i + 1), attrs: { 'aria-label': `Step ${i + 1}: ${step.short}` }, on: { click: () => this.goTo(i) } }),
        h('span', { cls: 'stepper-timeline-name', text: step.short }),
      ]);
      this.timeline.append(item);
      return item;
    });
  }

  buildLegend() {
    for (const kind of this.lesson.legend) {
      const mark = h('span', { cls: `stepper-legend-mark stepper-dot-${kind}` });
      mark.style.background = DOTS[kind];
      this.legend.append(h('span', { cls: 'stepper-legend-item' }, [mark, DOT_NAMES[kind]]));
    }
  }

  // ——— Changing step ———

  // Show a step. `animate: false` jumps straight there (used for the first step and the preview).
  goTo(index, { animate = true } = {}) {
    const steps = this.lesson.steps;
    if (index < 0 || index >= steps.length || index === this.index) return;
    const step = steps[index];
    this.index = index;
    this.updateChips(step);
    this.updatePanel(step);
    this.updateCard(step);
    this.dots.forEach((dot, i) => dot.className = `stepper-timeline-step${i < index ? ' is-done' : ''}${i === index ? ' is-current' : ''}`);
    this.updateGoals();
    this.player.show(step, { animate });
    this.shownOnce = true;
    this.onStep?.(index);
  }

  updateChips(step) {
    for (const [key, el] of Object.entries(this.chipValues)) {
      const value = step.metrics[key] ?? '?';
      if (el.textContent === value) continue;
      el.textContent = value;
      if (!this.shownOnce) continue; // no flash on first load
      // Restart the flash animation on the chip whose value changed.
      const chip = el.parentElement;
      chip.classList.remove('is-changed');
      void chip.offsetWidth;
      chip.classList.add('is-changed');
    }
  }

  updatePanel(step) {
    const total = this.lesson.steps.length;
    const next = this.lesson.steps[step.index + 1];
    const body = h('div', { cls: 'stepper-text' });
    this.renderMarkdown(step.text, body);
    const changes = step.changes.length
      ? h('div', { cls: 'stepper-changes' }, [h('div', { cls: 'stepper-eyebrow', text: 'What changed' }), ...step.changes.map(changeLine)])
      : null;
    this.panel.replaceChildren(
      h('div', { cls: 'stepper-panel-meta' }, [
        h('span', { cls: 'stepper-eyebrow', text: `Step ${step.index + 1} / ${total}` }),
        step.kind ? h('span', { cls: `stepper-kind stepper-kind-${step.kind}`, text: KIND_LABELS[step.kind] }) : null,
      ]),
      h('div', { cls: 'stepper-panel-content' }, [
        h('div', { cls: 'stepper-step-title', text: step.title }),
        body,
        step.callout ? this.callout(step.callout) : null,
        changes,
      ]),
      h('div', { cls: 'stepper-nav' }, [
        h('button', { cls: 'stepper-back', attrs: { 'aria-label': 'Back' }, on: { click: () => this.goTo(step.index - 1) } }, [iconEl('arrow-left'), 'Back']),
        h('button', { cls: 'stepper-next', attrs: { 'aria-label': next ? `Next: ${next.short}` : 'Finished' }, on: { click: () => this.goTo(step.index + 1) } },
          [next ? `Next: ${next.short}` : 'Done ✓', next ? iconEl('arrow-right') : null]),
      ]),
      h('div', { cls: 'stepper-hint', text: '← → step · R replay · Space pause · Ctrl+wheel zoom · 0 reset' }),
    );
    this.panel.querySelector('.stepper-back').disabled = step.index === 0;
    this.panel.querySelector('.stepper-next').disabled = !next;
  }

  callout({ kind, text }) {
    const info = CALLOUTS[kind];
    const body = h('div', { cls: 'stepper-callout-text' });
    this.renderMarkdown(text, body);
    return h('div', { cls: `stepper-callout stepper-callout-${kind}` }, [
      iconEl(info.icon, 16),
      h('div', {}, [h('div', { cls: 'stepper-eyebrow', text: info.label }), body]),
    ]);
  }

  // The napkin card on the diagram. The last line is the result, so it's highlighted.
  updateCard(step) {
    const card = step.card;
    this.card.classList.toggle('is-hidden', !card);
    if (!card) return;
    this.card.replaceChildren(
      h('div', { cls: 'stepper-card-title' }, [card.icon ? iconEl(card.icon, 13) : null, card.title]),
      ...card.lines.map((line, i) => {
        const el = h('div', { cls: `stepper-card-line${i === card.lines.length - 1 ? ' is-result' : ''}` });
        boldText(line, el);
        return el;
      }),
    );
  }

  updateGoals() {
    this.goals.replaceChildren(...this.lesson.goals.map(goal => h('li', { cls: goal.step <= this.index ? 'is-done' : '' }, [
      h('span', { cls: 'stepper-goal-box' }, goal.step <= this.index ? [iconEl('check', 11)] : []),
      goal.text,
    ])));
  }

  // ——— Controls ———

  toolButton(iconName, label, onClick) {
    return h('button', { cls: 'stepper-tool', attrs: { 'aria-label': label, title: label }, on: { click: onClick } }, [iconEl(iconName, 13), h('span', { cls: 'stepper-tool-text', text: label })]);
  }

  tagPill(iconName, text, tone) {
    return h('span', { cls: `stepper-tag stepper-tag-${tone}` }, [iconEl(iconName, 12), text]);
  }

  replay() {
    this.player.replay(this.lesson.steps[this.index - 1]);
  }

  togglePause() {
    this.paused = !this.paused;
    this.player.setPaused(this.paused);
    this.pauseButton.replaceChildren(iconEl(this.paused ? 'play' : 'pause', 13), h('span', { cls: 'stepper-tool-text', text: this.paused ? 'Play' : 'Pause' }));
    this.pauseButton.setAttribute('aria-label', this.paused ? 'Play' : 'Pause');
    this.pauseButton.setAttribute('title', this.paused ? 'Play' : 'Pause');
  }

  onKey(event) {
    if (event.target.closest('input, textarea')) return;
    const actions = {
      ArrowRight: () => this.goTo(this.index + 1),
      ArrowLeft: () => this.goTo(this.index - 1),
      ' ': () => this.togglePause(),
      r: () => this.replay(),
      R: () => this.replay(),
      0: () => this.player.stage.resetZoom(),
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
  }

  destroy() {
    this.player.destroy();
  }
}

function changeLine(line) {
  const mark = line.startsWith('+') ? '+' : line.startsWith('~') ? '~' : '•';
  const text = mark === '•' ? line : line.slice(1).trim();
  return h('div', { cls: `stepper-change stepper-change-${mark === '+' ? 'add' : mark === '~' ? 'edit' : 'note'}` }, [h('span', { cls: 'stepper-change-mark', text: mark }), text]);
}

// **bold** inside a card line. Plain text otherwise (no HTML from the YAML).
function boldText(line, el) {
  line.split(/(\*\*[^*]+\*\*)/).forEach(part => {
    el.append(part.startsWith('**') ? h('b', { text: part.slice(2, -2) }) : part);
  });
}

// Used outside Obsidian (the preview): paragraphs with **bold**.
function plainMarkdown(text, el) {
  for (const para of String(text).split(/\n\s*\n/)) if (para.trim()) { const p = h('p'); boldText(para, p); el.append(p); }
}

const capitalize = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
