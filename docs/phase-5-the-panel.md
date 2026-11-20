# Phase 5: The panel

**Goal:** everything around the diagram, so a block works like a lesson: numbers, step text, buttons, timeline.

## What I did

1. **`src/view.js`, the whole block.** It builds the layout once and then `goTo(index)` changes only what a step changes:
   - **Numbers bar** (top-left of the diagram). Values start as `?`. A value that changes flashes green for a second, so your eye goes there.
   - **Step panel**: "Step 2 / 3", a colored badge for the step's kind (Problem, Insight, Solution…), the title, the text, one callout, and "What changed" (`+` added, `~` changed).
   - **Back** and **Next: Servers**. The Next button names the next step, so you know where you're going.
   - **Timeline** under the diagram: numbered dots. Done steps are tinted, the current one is green. Click a dot to jump.
   - **You'll learn**: goals that tick when you reach their step.
   - **Napkin card** in the diagram's corner: a small calculation, with the last line (the result) highlighted.
   - **Legend** of the dot kinds used in this lesson.
2. **No Obsidian inside the view.** `main.js` passes a `renderMarkdown` function in. In Obsidian that's Obsidian's own renderer, so `[[links]]` in step text work. In the browser preview it's a tiny bold-and-paragraphs version. That's why the same view runs in both.
3. **`src/dom.js`.** One helper, `h(tag, props, children)`, so the view code reads like the page it builds.
4. **`src/player.js`.** Owns what the diagram shows. For now it just draws a step. Phases 6 and 7 add the motion here, without touching the view.
5. **Layout follows the block's own width, not the window's** (CSS container queries). A block in a narrow note column gets one column and icon-only buttons. A wide block (full screen, or a wide note) gets the diagram with a side panel.
6. **Keyboard:** ← → change step, Space pauses, R replays. Only while the block has focus (click it first), so it never steals keys from the editor.
7. **Every control has a name** (visible text or `aria-label`), so screen readers, and agents like Jev, can find them.

## How to check it

`npm run preview`, open `dev/preview.html`. Try `?step=2`, and `?width=500` for the narrow layout.
