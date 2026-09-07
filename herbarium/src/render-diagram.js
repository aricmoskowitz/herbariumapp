// Diagram tab: recursive nested-box map of the plant kingdom. One function,
// renderNode(node, depth, inheritedAccent) - a node with `children` becomes
// a bordered container (.ph-group), a node without becomes a specimen card
// (.ph-card). Depth-based sizing is driven entirely by the CSS custom
// property --depth (see styles.css); this function never special-cases
// rendering by rank or by hand-picked pixel values, so adding a family
// under an order, or a species under a family, needs zero changes here.
(function () {
  const { esc, iconSvg, eventsRowHtml } = window.Herb;

  function chipsToggleHtml(labels, summaryText) {
    if (!labels || !labels.length) return '';
    return `<details class="ph-species-toggle">
      <summary><span class="ph-species-chevron">&#9662;</span>${summaryText}</summary>
      <div class="ph-species-list">${labels.map((l) => `<span class="ph-species-chip">${esc(l)}</span>`).join('')}</div>
    </details>`;
  }

  // Checked by field presence, not rank - any leaf node (order or
  // informal group) can carry families[], and any not-yet-built node can
  // carry a plain plants[] list instead.
  function leafExtrasHtml(node) {
    if (node.families && node.families.length) {
      const labels = node.families.map((f) => f.common || f.name);
      return chipsToggleHtml(labels, `${labels.length} famil${labels.length === 1 ? 'y' : 'ies'}`);
    }
    if (node.plants && node.plants.length) {
      return chipsToggleHtml(node.plants, `${node.plants.length} tagged plant${node.plants.length === 1 ? '' : 's'}`);
    }
    return '';
  }

  function renderNode(node, depth, inheritedAccent) {
    const accent = node.accent || inheritedAccent;
    const eventsHtml = eventsRowHtml(node.events);
    const dateTag = node.headerEvent ? `<span class="ph-group-date">${esc(node.headerEvent.date)} &middot; ${esc(node.headerEvent.label)}</span>` : '';

    if (node.children && node.children.length) {
      const inner = node.children.map((child) => renderNode(child, depth + 1, accent)).join('');
      return `${eventsHtml}<div class="ph-group" style="--depth:${depth};${accent ? `--accent:${esc(accent)}` : ''}">
        <div class="ph-group-head">
          <span class="ph-group-rank">${esc(node.rank)}</span>
          <h3 class="ph-group-title">${esc(node.name)}</h3>
          ${dateTag}
        </div>
        <div class="ph-group-body">${inner}</div>
      </div>`;
    }

    const icon = node.icon ? iconSvg(node.icon, 'ph-card-icon') : '';
    const extras = leafExtrasHtml(node);

    return `${eventsHtml}<div class="ph-card" style="--depth:${depth};${accent ? `--accent:${esc(accent)}` : ''}">
      ${icon}
      <span class="ph-card-rank">${esc(node.rank)}</span>
      <span class="ph-card-name">${esc(node.name)}</span>
      ${extras}
    </div>`;
  }

  function renderDiagram(container, tree) {
    container.innerHTML = `
      <header class="tr-masthead">
        <div class="eyebrow">Herbarium Edition &middot; Diagram</div>
        <h1 class="tr-title">Where the Orders <em>Fit</em></h1>
        <div class="tip">A nested map of the plant kingdom, from the origin of life to every order in this field guide.</div>
      </header>
      <div class="tr-main ph-main">
        <div class="ph-caveat">
          <b>A caveat on the first few boxes.</b> Brown Algae, Red Algae, Green Algae, Bryophytes, and Ferns
          are <b>not taxonomic orders</b> like the rest of this guide &mdash; each is tagged &ldquo;informal
          group&rdquo; rather than &ldquo;order&rdquo; below, since they sit at a much higher, less precise rank.
          Brown Algae in particular sits on an entirely different branch of the tree of life than green plants do;
          they're placed near each other here only to sketch when photosynthetic life diversified before true land
          plants existed.
          <br><br>
          <b>A caveat on the dates.</b> Boxes run oldest to youngest, top to bottom and outer to inner. Divergence
          dates for ancient splits come from molecular-clock and fossil studies that often disagree by tens of
          millions of years &mdash; treat the dates on the rust-colored tags as commonly-cited estimates, not precise
          figures.
        </div>
        <div class="ph-species-controls">
          <button type="button" id="phExpandAll" class="ph-species-btn">Expand all</button>
          <button type="button" id="phCollapseAll" class="ph-species-btn">Collapse all</button>
        </div>
        <div id="phyloTree" class="ph-tree">${tree.map((n) => renderNode(n, 0, n.accent)).join('')}</div>
      </div>
    `;

    const root = container.querySelector('#phyloTree');
    container.querySelector('#phExpandAll').addEventListener('click', () => {
      root.querySelectorAll('details.ph-species-toggle').forEach((d) => { d.open = true; });
    });
    container.querySelector('#phCollapseAll').addEventListener('click', () => {
      root.querySelectorAll('details.ph-species-toggle').forEach((d) => { d.open = false; });
    });
  }

  window.Herb = window.Herb || {};
  window.Herb.renderDiagram = renderDiagram;
})();
