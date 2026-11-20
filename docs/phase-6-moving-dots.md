# Phase 6: Moving dots

**Goal:** make the arrows alive: dots that travel along them, some failing, some coming back.

## What I did

1. **`src/dots.js`: the logic, with no drawing.**
   - `startFlow()` sets up a stream of dots on a route (one or more links joined end to end).
   - `tick(state, seconds)` moves time forward: dots move at 120 px per second, new dots start at the flow's `rate`, and it returns what happened (`arrive` or `fail`, with where).
   - **Failures:** when a dot starts, it decides whether it will fail (`fail: 0.35` means 35% do), and where (55–85% of the way). There it bursts into a red ✕.
   - **Bounce:** at the end, the dot turns around and comes back as a green response.
   - **Spawning can be switched off.** That's for phase 7, where the old dots must finish their trip before the next step starts.
   - Because it's plain logic, the tests can pass a fixed "random" and check exact results.
2. **The player's loop (`src/player.js`).** Every frame it calls `tick()`, collects the arrival rings and fail bursts, and asks the stage to draw them.
   - **It only runs when it has to**: the block is on screen (an `IntersectionObserver` watches it), not paused, and reduced motion is off. Otherwise it costs nothing.
   - **No empty start:** when a step appears, the flows are run for 3 seconds in one go, so the arrows are already busy.
   - **Frame steps are capped** at 50 ms, so coming back to a background tab doesn't make dots jump.
3. **Drawing (`stage.drawDots`).** Circles for most kinds, squares for messages and poison, a hollow ring for health checks, a red ✕ for failures. Arrivals pop a small green ring.

## Tests

`tests/dots.test.js`: rate, no new dots while draining, arriving, failing before the end, bouncing back. A test caught a real bug: a failing dot burst at the end of the line instead of at its failure point.
Browser check (headless Chrome): dots move between two readings, fail bursts appear, the → key changes step, Pause freezes the dots, no console errors.
