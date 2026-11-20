# Phase 1: Skeleton

**Goal:** an empty plugin that Obsidian loads, that finds ` ```stepper ` blocks, and that shows something in their place.

## What I did

1. **Made the project.** `package.json`, `manifest.json` (Obsidian reads this to know the plugin's name and id: `stepper`), `LICENSE` (MIT) and `.gitignore`.
2. **Picked the tools.**
   - The code is **plain JavaScript** (ES modules), no TypeScript.
   - **esbuild** joins all the files in `src/` into one `main.js`, because Obsidian can only load a single file. That's the whole build: `esbuild.config.js`, about 20 lines.
   - **Tests use Node's built-in test runner** (`node --test`), so there's no test library to learn.
3. **Wrote `src/main.js`.** It tells Obsidian: "when you see a code block called `stepper`, give it to me". For now it reads the YAML and shows the title.
4. **Errors don't crash anything.** If the YAML is broken, the block shows a red message with the reason.
5. **Install by git.** The built `main.js` is committed, so a vault can `git clone` the repo into `.obsidian/plugins/stepper` and `git pull` to update.

## Files

| File | What it is |
|---|---|
| `src/main.js` | The plugin. The only file that imports `obsidian`. |
| `styles.css` | All styles. Every rule starts with `.stepper`. |
| `manifest.json` | Name, id, version for Obsidian. |
| `esbuild.config.js` | Builds `src/` into `main.js`. |

## How to check it

Put this in a note and switch to reading view. You should see a box with "Hello".

````markdown
```stepper
title: Hello
```
````
