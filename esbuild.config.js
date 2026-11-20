// Bundles src/ into the single main.js Obsidian loads.
// `--watch` rebuilds on save. `--preview` also builds dev/preview.js for the browser preview page.
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const builds = [{
  entryPoints: ['src/main.js'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['obsidian', 'electron'],
  logLevel: 'info',
}];
if (process.argv.includes('--preview')) {
  builds.push({ entryPoints: ['dev/preview-entry.js'], outfile: 'dev/preview.js', bundle: true, format: 'iife', target: 'es2020', logLevel: 'info' });
}

for (const options of builds) {
  if (watch) await (await esbuild.context(options)).watch();
  else await esbuild.build(options);
}
