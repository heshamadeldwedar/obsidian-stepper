# Phase 3: Drawing

**Goal:** draw a step's shapes as little 3D objects on a tilted grid, in the hand-made style of the reference.

## What I did

1. **The 3D trick (`src/iso.js`).** There is no 3D engine. Every point on the floor `(x, y)` at height `z` goes to the screen with one formula:
   `screen = (14 × (x + y), 7 × (x − y) − z)`. One grid unit is 14 px.
   From that, `box()` gives the corners of a box's top, its two visible sides and its outline.
2. **Rounded corners (`roundedPath`).** Every corner becomes a small curve. That, plus a thick dark outline, is most of the "drawn by hand" feel.
3. **One file per shape (`src/shapes/`).** Each file exports the same five things, so they're easy to compare and copy:
   - `layer`: `floor` (drawn under everything) or `shapes`
   - `draw(shape)`: the SVG for the shape
   - `overlay(shape)`: pills that float above it (CPU gauge, tags, name). Drawn last so nothing hides them.
   - `bounds(shape)`: the screen box it covers, for the camera
   - `reach(shape)`: how far from its center an arrow should stop (used in phase 4)
   Shapes so far: `block`, `crowd`, `db`, `zone`. `shapes/index.js` lists them.
4. **Drawing as text (`src/svg.js`).** Shapes return SVG strings. Every value from the YAML goes through `esc()`, so a label can't inject HTML.
5. **The stage (`src/stage.js`).** One `<svg>` with five layers, bottom to top: floor, links, dots, shapes, overlays. It keeps each shape's `<g>` by id and only redraws a shape when its SVG text changed. This matters later for animation.
6. **The camera (`src/camera.js`).** `fit()` finds a view that shows every shape with a little room around it.
7. **Icons (`src/icons.js`).** 67 Lucide icons, copied in by `npm run icons`. No icon library at runtime.
8. **Colors (`src/colors.js`).** Each color has a light top and a darker side. `heat` mixes towards red, `dead` towards gray.
9. **Preview page (`dev/preview.html`).** Shows the diagram in a normal browser, so I could take screenshots and compare with the reference without opening Obsidian.

## Tests

`tests/drawing.test.js`: projection numbers, rounded paths, box corners, depth order, camera fit, color mixing, escaping, and "every shape draws". 14 tests in total now.

## How to check it

A block with shapes now shows the first step's drawing in Obsidian. Or run `npm run preview` and open `dev/preview.html` (add `?step=2` for the second step).
