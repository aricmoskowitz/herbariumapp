// Shared helpers used by all four tab renderers. Single place for icon
// wrapping, escaping, and tree traversal so nothing is hand-duplicated
// per tab. There is no guide-status concept in this app - every order
// and informal group is equally "in the guide" - so this file carries
// no status vocabulary of any kind.
window.Herb = (function () {
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // path markup is trusted inline SVG authored in data/taxonomy.json, not
  // user input, so it is inserted verbatim (never escaped).
  function iconSvg(pathMarkup, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${pathMarkup || ''}</svg>`;
  }

  // Depth-first walk over the taxonomy tree. visit(node, depth, parents)
  // may return false to skip descending into node.children.
  function walk(nodes, visit, depth = 0, parents = []) {
    for (const node of nodes) {
      const cont = visit(node, depth, parents);
      if (cont !== false && node.children) {
        walk(node.children, visit, depth + 1, [...parents, node]);
      }
    }
  }

  // Collect every order and informal-group node, in document order. These
  // are the two ranks that can carry families[] - rank is a taxonomic
  // label only, so this checks rank membership, never field presence vs.
  // rank as a gate for what a renderer is allowed to show.
  function collectGroups(tree) {
    const groups = [];
    walk(tree, (node) => {
      if (node.rank === 'order' || node.rank === 'informal group') groups.push(node);
    });
    return groups;
  }

  function eventsRowHtml(events) {
    if (!events || !events.length) return '';
    return `<div class="ph-event-row">${events
      .map((e) => `<span class="ph-event-chip"><span class="ph-event-chip-date">${esc(e.date)}</span><span class="ph-event-chip-name">${esc(e.label)}</span></span>`)
      .join('')}</div>`;
  }

  return {
    esc, iconSvg, walk, collectGroups, eventsRowHtml,
  };
})();
