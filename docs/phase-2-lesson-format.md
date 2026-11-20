# Phase 2: The lesson format

**Goal:** read the YAML in a block and turn it into a clean list of steps the drawing code can use, with clear error messages when something is wrong.

## What I did

1. **Wrote `src/lesson.js`**, one function: `readLesson(data)`. It takes the parsed YAML and returns `{ title, metrics, goals, steps, … }`.
2. **Every shape type and its default values sit in one table** (`SHAPES`, at the top of the file). Want a new field or a new default? Change that table.
3. **Steps build on each other.** Step 2 starts as a copy of step 1's scene, links and metrics, then applies its own changes. That keeps blocks short: `s0: { heat: 1 }` is enough to turn one server red.
   - `null` removes a shape (and any link touching it).
   - `scene!` starts a fresh scene.
   - Flows are the exception: each step lists its own.
4. **Clear errors.** A mistake says exactly where it is, like `steps[2].scene.s0: unknown type "srvr" (block, crowd, db, …)`. The plugin shows that in a red box.
5. **Each step gets its own copy**, so changing step 3 can never change step 2 by accident.
6. **Wrote the format guide** for authors: [format.md](format.md).

## Tests

`tests/lesson.test.js`, 7 tests: defaults, steps building on each other, flows per step, removing with `null`, `scene!`, error messages, callouts/cards/goals. Run with `npm test`.

## How to check it

In Obsidian, a valid block now shows its title and "N steps". Break it (for example `type: srvr`) and the red box tells you where.
