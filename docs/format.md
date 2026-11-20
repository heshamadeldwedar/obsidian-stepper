# Writing a stepper block

A stepper block is YAML inside a code block called `stepper`. Here's the whole idea in one example:

````markdown
```stepper
title: Will one server do?
subtitle: Turn users into servers with napkin math
tags: { minutes: 5, level: beginner }
metrics:
  dau:  { label: Daily users, icon: users }
  peak: { label: Peak req/s,  icon: trending-up }
legend: [req, fail]
goals:
  - { text: Size for the peak, step: 2 }
steps:
  - title: Will one server do?
    short: The question
    kind: problem
    text: 10M users, 20 requests a day each. One server, or a hundred?
    metrics: { dau: 10M, peak: "?" }
    scene:
      users: { type: crowd, at: [-6, 4], label: 10M daily users }
      s0:    { type: block, at: [4, -4], label: [One, "server?"] }
    links:
      u: { from: users, to: s0 }
    flows:
      - { route: [u], rate: 2 }

  - title: Plan for the peak
    short: Peak
    kind: insight
    text: Evenings run about **3×** the average.
    callout: { kind: warn, text: Sized for the average means down at the peak. }
    changes: ["+ Peak ≈ 7,000 req/s", "~ One server: overloaded"]
    metrics: { peak: 7000 }
    card: { title: Peak traffic, icon: trending-up, lines: ["2,300 × 3", "≈ 7,000 req/s"] }
    scene:
      s0: { heat: 1, cpu: 1 }
    flows:
      - { route: [u], rate: 6, fail: 0.35 }
```
````

## The rule that makes it short

**Each step starts from the step before it.** Write only what changes:

- `s0: { heat: 1 }` keeps everything about `s0` and only turns it red.
- `s0: null` removes `s0`, and any link touching it.
- `scene!:` (with `!`) throws the old scene away and starts fresh.
- `metrics` carry over too. Numbers get commas (`7000` → `7,000`).
- `flows` do **not** carry over. Each step lists what's moving right now.

## Lesson fields

| Field | What it is |
|---|---|
| `title` | Big title at the top |
| `subtitle` | One line under the title |
| `tags` | `{ minutes: 10, level: beginner }`, shown as small pills |
| `metrics` | The numbers bar. `key: { label, icon }` or just `key: Label` |
| `legend` | Dot kinds to explain under the diagram: `[req, fail]`. Give one its own name with `[slow, cache miss]` |
| `goals` | "You'll learn" list. Each goal gets ticked at its `step` (counting from 1) |
| `steps` | The list of steps |

## Step fields

| Field | What it is |
|---|---|
| `title` | The step's heading |
| `short` | Short name for the timeline and the "Next: …" button (default: the title) |
| `kind` | Badge: `problem`, `setup`, `technique`, `solution`, `insight`, `tradeoff`, `recap` |
| `text` | Markdown. Links, **bold** and tables work |
| `callout` | `{ kind: tip \| insight \| warn \| next, text }`, or just a string (a tip) |
| `changes` | List of lines. Start with `+` (added) or `~` (changed) |
| `metrics` | New values for the numbers bar |
| `card` | The napkin card on the diagram: `{ title, icon, lines }`. The last line is the result |
| `scene` | Shapes, by id |
| `links` | Arrows, by id |
| `flows` | Moving dots |

## Shapes

Every shape has `type` and `at: [x, y]` (grid units on the floor: +x goes down-right, +y goes up-right).

| type | What | Extra fields (defaults) |
|---|---|---|
| `block` | A 3D box: a server, cache, service | `s` size (4), `h` height px (46), `color` (blue), `glyph` icon (server), `label` (1–2 lines), `sub`, `cpu` 0–1 (−1 hides the gauge), `heat` 0–1 (blue → red), `dead` 0–1, `dim` 0–1, `lift` px, `tags` |
| `crowd` | Users standing on a platform | `w` (8), `d` (6), `count` (15), `label`, `tags` |
| `db` | A cylinder: database, disk | `r` (1.45), `h` (30), `color` (purple), `glyph` (database), `label`, `heat`, `dead`, `dim`, `lift`, `tags` |
| `zone` | A dashed area on the floor with its name on the floor | `w` (10), `d` (6), `label` |
| `queue` | A row of waiting items | `n` (6), `dir` [1, 0], `label`, `color` (yellow) |
| `device` | A laptop or phone | `kind` laptop \| phone, `label`, `tags` |
| `ghost` | A see-through outline: planned or removed | `s`, `h`, `label` |
| `ring` | Nodes on a circle (consistent hashing) | `r` (5), `n` (6), `label`, `color` |

> **YAML tip:** inside `[ ]` or `{ }`, quote text with `?`, `:` or `#` in it: `label: [One, "server?"]`.

**Colors:** `blue`, `green`, `orange`, `yellow`, `purple`, `red`, `gray`, `slab`.
**Icons** (`glyph`, `icon`): [Lucide](https://lucide.dev/icons) names, like `server`, `database`, `zap`, `globe`, `users`. The list that's bundled is in `src/icons.js`.
**Tags:** `tags: [{ text: DOWN, tone: red, icon: alert-triangle }]`. Tones: `green`, `red`, `amber`, `violet`, `gray`.

## Links

Links lie on the floor grid. If the two shapes are on one grid line (same `x` or same `y`), the link is straight. Otherwise it turns one rounded 90° corner.

```yaml
links:
  u: { from: users, to: web, style: dashed, heads: both, label: HTTPS }
  v: { from: web, to: db, bend: y }              # go along y first, then x
  w: { from: a, to: b, via: [[0, 2], [4, 2]] }   # your own corners
```

| Field | Default | What |
|---|---|---|
| `from`, `to` | (required) | Shape ids |
| `bend` | `x` | Which way the corner goes: `x` (along x first), `y` (along y first), `none` (straight across, ignoring the grid) |
| `via` | `[]` | Your own corner points `[x, y]` (overrides `bend`) |
| `style` | `solid` | `solid`, `dashed`, `dotted`, `off` (hidden, but dots still use it), `beat` (pulses), `cut` (broken) |
| `heads` | `end` | `end`, `both`, `none` (small filled arrowheads) |
| `label` | | A pill beside the link. It finds its own space: near the corner of a bent link (or 65% along a straight one), on whichever side overlaps shapes, other labels and lines the least |
| `labelAt` | | Where along the link the label should try first (0 = start, 1 = end) |

## Flows (moving dots)

```yaml
flows:
  - { route: [u, w], rate: 3, kind: req, fail: 0.2, bounce: true }
```

| Field | Default | What |
|---|---|---|
| `route` | (required) | Link ids, joined end to end |
| `rate` | 2 | Dots per second |
| `kind` | `req` | `req` orange, `res` green, `msg` yellow square, `write` violet, `heavy` big square, `slow` amber, `ping` hollow ring, `poison` red square, `fail` red ✕, `mine` blue |
| `fail` | 0 | Share of dots that fail on the way (0.35 = 35%) |
| `bounce` | false | Go there and come back (request and response) |
| `reverse` | false | Run the route backwards |
