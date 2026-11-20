# Stepper for Obsidian

Write a small YAML block in a note. Stepper turns it into an **animated, step-by-step isometric diagram** you click through: servers, users and databases as little 3D blocks, dots flowing along arrows, and one idea per step.

````markdown
```stepper
title: Will one server do?
steps:
  - title: The question
    text: 10 million users, 20 requests a day each.
    scene:
      users: { type: crowd, at: [-6, 4], label: 10M users }
      s0:    { type: block, at: [4, -4], label: [One, server?] }
    links: { u: { from: users, to: s0 } }
    flows: [ { route: [u], rate: 2 } ]
```
````

- **How to write a block:** [docs/format.md](docs/format.md)
- **How it was built, phase by phase:** [docs/](docs/)

## Install

Stepper is not in the community store. Clone it into your vault's plugin folder, then turn it on in **Settings → Community plugins**:

```bash
cd <your vault>/.obsidian/plugins
git clone https://github.com/heshamadeldwedar/obsidian-stepper stepper
```

To update later: `cd stepper && git pull`, then reload Obsidian. The built `main.js` is committed on purpose, so you don't need Node to install it.

## Develop

```bash
npm install
npm test          # unit tests (Node's built-in test runner)
npm run build     # src/ → main.js
npm run dev       # rebuild on every save
npm run preview   # build dev/preview.html, a browser page that shows the diagram without Obsidian
```

The code is plain JavaScript. Start reading at `src/main.js`. Each file begins with a comment that says what it does.

## Features

<!-- Updated at the end of every phase. -->
### Phase 1: Skeleton
- [x] Plugin loads in Obsidian and finds ` ```stepper ` blocks
- [x] Shows the block's title
- [x] A broken block shows a readable error instead of crashing
- [x] Build (`npm run build`) and install by `git clone` / `git pull`

### Phase 2: Lesson format
- [x] Read title, metrics, legend, goals, steps
- [x] Each step starts from the previous one (scene, links, metrics)
- [x] `id: null` removes a shape, `scene!` replaces the whole scene
- [x] Flows are per step (not inherited)
- [x] Errors say where: `steps[2].scene.s0: unknown type "srvr"`
- [x] Unit tests (7)

### Phase 3: Drawing
- [x] Isometric math: floor (x, y) and height z → screen
- [x] Rounded corners everywhere (the hand-drawn look)
- [x] Shapes: `block` (3D box with icon and label), `crowd` (people on a platform), `db` (cylinder), `zone` (dashed area, name on the floor)
- [x] Colors, and `heat` turning a shape red
- [x] CPU gauge pill above a block
- [x] Dotted isometric grid that fades at the edges
- [x] Camera fits everything in view
- [x] 67 Lucide icons bundled (no runtime library)
- [x] Browser preview page (`npm run preview`)
- [x] Unit tests (7 more, 14 total)

## Credits

Icons from [Lucide](https://lucide.dev) (ISC license). The look was inspired by the *Designed to Scale* course by Dilum Sanjaya. No code or artwork was copied from it.
