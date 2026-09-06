// Field Guide tab: reference browser for plant taxonomy. Every order with
// a non-empty families[] is "built" and gets a header + family cards;
// orders without built families simply do not appear here. This keeps the
// Field Guide's membership a pure function of taxonomy.json - no separate
// "which orders are in the guide" list to keep in sync.
(function () {
  const { esc, iconSvg, collectOrders } = window.Herb;

  function speciesRowHtml(sp) {
    return `<li><span class="fg-sp-common">${esc(sp.common)}</span><span class="fg-sp-sci">${sp.sci}</span></li>`;
  }

  function familyCardHtml(family) {
    return `<article class="fg-family" id="fam-${esc(family.id)}">
      <div class="fg-family-head">
        ${iconSvg(family.icon, 'fg-icon')}
        <div>
          <h4>${esc(family.name)}</h4>
          <p class="fg-common">${esc(family.common)}</p>
        </div>
      </div>
      <p class="fg-trait"><b>Trait:</b> ${family.trait}</p>
      <p class="fg-differentia">${family.differentia}</p>
      ${family.species && family.species.length
        ? `<ul class="fg-species">${family.species.map(speciesRowHtml).join('')}</ul>`
        : ''}
    </article>`;
  }

  function orderSectionHtml(order) {
    return `<section class="fg-order" id="order-${esc(order.name.toLowerCase().replace(/\s+/g, '-'))}">
      <header class="fg-order-head tr-masthead">
        ${iconSvg(order.icon, 'fg-order-icon')}
        <div>
          <span class="fg-rank">Order</span>
          <h3>${esc(order.name)}</h3>
        </div>
      </header>
      <p class="fg-desc">${order.desc || ''}</p>
      <div class="fg-family-grid">${(order.families || []).map(familyCardHtml).join('')}</div>
    </section>`;
  }

  function renderFieldGuide(container, tree) {
    const built = collectOrders(tree).filter((o) => o.families && o.families.length);
    if (!built.length) {
      container.innerHTML = '<p class="fg-empty">No orders built out yet.</p>';
      return;
    }
    container.innerHTML = `
      <nav class="fg-jump">${built
        .map((o) => `<a href="#order-${esc(o.name.toLowerCase().replace(/\s+/g, '-'))}">${esc(o.name)}</a>`)
        .join('')}</nav>
      <div class="fg-orders">${built.map(orderSectionHtml).join('')}</div>
    `;
  }

  window.Herb = window.Herb || {};
  window.Herb.renderFieldGuide = renderFieldGuide;
})();
