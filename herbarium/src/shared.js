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
    return `<svg class="${cls || 'ic'}" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${pathMarkup || ''}</svg>`;
  }

  const STATUS_LABEL = {
    inguide: '✓ in guide',
    extension: 'extension pt.',
    context: 'not in guide',
  };

  function statusTag(status) {
    const key = STATUS_LABEL[status] ? status : 'context';
    return `<span class="status-tag status-${key}">${STATUS_LABEL[key]}</span>`;
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
    return `<div class="ph-events">${events
      .map((e) => `<span class="ph-event"><b>${esc(e.date)}</b> ${esc(e.label)}</span>`)
      .join('')}</div>`;
  }

  function headerEventHtml(headerEvent) {
    if (!headerEvent) return '';
    return `<span class="ph-header-event">${esc(headerEvent.date)} · ${esc(headerEvent.label)}</span>`;
  }

  return { esc, iconSvg, statusTag, STATUS_LABEL, walk, collectOrders, eventsRowHtml, headerEventHtml };
})();
