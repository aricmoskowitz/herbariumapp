#!/usr/bin/env node
// Concatenates the split source (data/taxonomy.json + src/*.js + styles.css
// + index.html shell) into a single distributable herbarium-app.html at the
// repo root. The split files remain the source of truth for development;
// this is purely a packaging step, per the migration brief.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '..', 'herbarium-app.html');

const taxonomy = fs.readFileSync(path.join(ROOT, 'data', 'taxonomy.json'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

const SRC_ORDER = [
  'shared.js',
  'render-field-guide.js',
  'render-diagram.js',
  'render-trainer.js',
  'render-field-log.js',
  'bootstrap.js',
];
const scripts = SRC_ORDER.map((f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Herbarium</title>
<style>
${css}
</style>
</head>
<body>
<nav id="appSwitch" class="tr-masthead app-switch">
  <div class="app-title">Herbarium</div>
  <div class="app-tabs">
    <button type="button" data-tab="guide">Field Guide</button>
    <button type="button" data-tab="diagram">Diagram</button>
    <button type="button" data-tab="trainer">Trainer</button>
    <button type="button" data-tab="log">Field Log</button>
  </div>
</nav>

<main id="panel-field-guide" class="tab-panel"></main>
<main id="panel-diagram" class="tab-panel" hidden></main>
<main id="panel-trainer" class="tab-panel" hidden></main>
<main id="panel-field-log" class="tab-panel" hidden></main>

<script>
window.TAXONOMY_DATA = ${taxonomy};
</script>
<script>
${scripts}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
const bytes = Buffer.byteLength(html, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${bytes} bytes, ${(bytes / 1024).toFixed(1)} KB)`);
