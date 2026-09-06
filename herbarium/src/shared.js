// Shared helpers used by all four tab renderers. Single place for icon
// wrapping, escaping, and the order status-tag vocabulary so nothing is
// hand-duplicated per tab.
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

  // Status -> the modifier class on .ph-group/.ph-card, plus the small
  // label text shown in the tag slot. Absence of both classes (the
  // "context" case) is the default, muted look.
  function statusModifierClass(status) {
    if (status === 'inguide') return 'ph-inguide';
    if (status === 'extension') return 'ph-extension';
    return '';
  }
  function statusTagHtml(status, tagClass) {
    if (status === 'inguide') return `<span class="${tagClass}">&check; in guide</span>`;
    if (status === 'extension') return `<span class="${tagClass}">extension pt.</span>`;
    return `<span class="${tagClass} ${tagClass}-not">not in guide</span>`;
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

  // Collect every rank:"order" node in document order.
  function collectOrders(tree) {
    const orders = [];
    walk(tree, (node) => {
      if (node.rank === 'order') orders.push(node);
    });
    return orders;
  }

  function eventsRowHtml(events) {
    if (!events || !events.length) return '';
    return `<div class="ph-event-row">${events
      .map((e) => `<span class="ph-event-chip"><span class="ph-event-chip-date">${esc(e.date)}</span><span class="ph-event-chip-name">${esc(e.label)}</span></span>`)
      .join('')}</div>`;
  }

  return {
    esc, iconSvg, statusModifierClass, statusTagHtml, walk, collectOrders, eventsRowHtml,
  };
})();
