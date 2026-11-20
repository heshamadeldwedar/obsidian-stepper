# Phase 4: Arrows and labels

**Goal:** draw the arrows between shapes, and the small pills that name things.

## What I did

1. **`src/links.js`.** A link is a line on the floor: from one shape, through optional corners (`via`), to another.
   - **The ends stop at the shape's edge.** Each shape file has `reach()` (from phase 3), so an arrow into a big box stops further out than an arrow into a small one.
   - **Corners are soft.** `linePath()` puts a small curve at each `via` point.
   - **Arrowheads** are one SVG `<marker>` per diagram. `heads: end | both | none`.
   - **Styles:** `solid`, `dashed`, `off` (invisible but still a path for dots), `beat` (a pulsing dash, for heartbeats and health checks), `cut` (red and dashed with a ✕ in the middle, for a broken connection).
2. **`lengthOf()` and `pointAt()`.** These measure a line and find the point a given distance along it. Labels use them now; the moving dots in phase 6 will use them every frame.
3. **Labels never get hidden.** Link label pills go in a layer above everything else. Shape name pills and tags go in the overlay layer, also above the shapes.
4. **Fading is ready.** `drawLinks()` takes an optional opacity per link, which phase 7 uses to fade links in and out.

## Tests

`tests/links.test.js`: line length, points along a line, links stopping at edges, rounded corners, arrowheads, cut marks, labels. 18 tests in total.

## How to check it

The preview's step 2 shows four kinds of links: plain, both heads, dashed with a label, and a cut link with corners.
