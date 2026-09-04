// Diagram tab: recursive nested-box map of the plant kingdom. One function,
// renderNode(node, depth, inheritedAccent) - a node with `children` becomes
// a bordered container (.ph-group), a node without becomes a specimen card
// (.ph-card). Depth-based sizing is driven entirely by the CSS custom
// property --depth (see styles.css); this function never special-cases
// rendering by rank or by hand-picked pixel values, so adding a family
// under an order, or a species under a family, needs zero changes here.
(function () {
  const { esc, iconSvg, statusTag, walk, eventsRowHtml, headerEventHtml } = window.Herb;

  function speciesListHtml(list) {
    if (!list || !list.length) return '';
    return `<details class="ph-species">
      <summary>${list.length} tagged plant${list.length === 1 ? '' : 's'}</summary>
      <ul>${list.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </details>`;
  }

  function familyChipsHtml(families) {
    if (!families || !families.length) return '';
    return `<details class="ph-species">
      <summary>${families.length} famil${families.length === 1 ? 'y' : 'ies'} built</summary>
      <ul>${families.map((f) => `<li>${esc(f.common || f.name)}</li>`).join('')}</ul>
    </details>`;
  }

  function renderNode(node, depth, inheritedAccent) {
    const accent = node.accent || inheritedAccent;
    const style = accent ? ` style="--accent:${esc(accent)}"` : '';
    const isOrder = node.rank === 'order';
    const eventsHtml = eventsRowHtml(node.events);

    if (node.children && node.children.length) {
      const inner = node.children
        .map((child) => renderNode(child, depth + 1, accent))
        .join('');
      return `${eventsHtml}<section class="ph-group" data-rank="${esc(node.rank)}" style="--depth:${depth};${accent ? `--accent:${esc(accent)}` : ''}">
        <header class="ph-group-head">
          <span class="ph-rank">${esc(node.rank)}</span>
          <h3 class="ph-name">${esc(node.name)}</h3>
          ${headerEventHtml(node.headerEvent)}
        </header>
        <div class="ph-group-body">${inner}</div>
      </section>`;
    }

    // Leaf node: order-rank cards get icon + status tag + species/family
    // toggle; non-order leaves (informal groups with no children) get a
    // lighter card.
    const icon = node.icon ? iconSvg(node.icon, 'ph-icon') : '';
    const tag = isOrder ? statusTag(node.status) : '';
    const list = isOrder ? familyChipsHtml(node.families) || speciesListHtml(node.plants) : speciesListHtml(node.plants);

    return `${eventsHtml}<article class="ph-card" data-rank="${esc(node.rank)}" style="--depth:${depth};${accent ? `--accent:${esc(accent)}` : ''}">
      <div class="ph-card-top">
        ${icon}
        <div class="ph-card-text">
          <span class="ph-rank">${esc(node.rank)}</span>
          <h4 class="ph-name">${esc(node.name)}</h4>
        </div>
        ${tag}
      </div>
      ${list}
    </article>`;
  }

  function renderDiagram(container, tree) {
    container.innerHTML = `
      <div class="ph-toolbar">
        <button type="button" class="ph-toggle-all" data-action="expand">Expand all</button>
        <button type="button" class="ph-toggle-all" data-action="collapse">Collapse all</button>
      </div>
      <div class="ph-root">${tree.map((n) => renderNode(n, 0, n.accent)).join('')}</div>
    `;

    const root = container.querySelector('.ph-root');
    container.querySelectorAll('.ph-toggle-all').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.dataset.action === 'expand';
        root.querySelectorAll('details.ph-species').forEach((d) => { d.open = open; });
      });
    });
  }

  window.Herb = window.Herb || {};
  window.Herb.renderDiagram = renderDiagram;
})();
