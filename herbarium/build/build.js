#!/usr/bin/env node
// Concatenates the split source (data/taxonomy.json + src/*.js + styles.css
// + index.html shell) into a single distributable herbarium-app.html at the
// repo root. The split files remain the source of truth for development;
// this is purely a packaging step, per the migration brief.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '..', 'herbarium-app.html');
// Also published to docs/index.html so GitHub Pages (source: main /docs) can
// serve the exact same self-contained build as a real https:// site -- the
// single-file download and the live site are never allowed to drift apart.
const PAGES_OUT = path.join(ROOT, '..', 'docs', 'index.html');

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
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#1b2a20" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Herbarium" />
<title>Herbarium</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
<style>
${css}
</style>
</head>
<body>
<div id="appSwitch">
  <button type="button" data-tab="guide" class="active">Field Guide</button>
  <button type="button" data-tab="diagram">Diagram</button>
  <button type="button" data-tab="trainer">Trainer</button>
  <button type="button" data-tab="log">Field Log</button>
</div>

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
fs.mkdirSync(path.dirname(PAGES_OUT), { recursive: true });
fs.writeFileSync(PAGES_OUT, html);
const bytes = Buffer.byteLength(html, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${bytes} bytes, ${(bytes / 1024).toFixed(1)} KB)`);
console.log(`Wrote ${path.relative(process.cwd(), PAGES_OUT)}`);
