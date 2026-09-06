// Field Guide tab: reference browser for plant taxonomy. Every order with
// a non-empty families[] is "built" and gets a header + family cards;
// orders without built families simply do not appear here. This keeps the
// Field Guide's membership a pure function of taxonomy.json - no separate
// "which orders are in the guide" list to keep in sync.
(function () {
  const { esc, iconSvg, collectOrders } = window.Herb;

  function slug(name) { return name.toLowerCase().replace(/\s+/g, '-'); }

  function speciesRowHtml(sp) {
    return `<li><span class="common">${esc(sp.common)}</span><span class="sci">${sp.sci}</span></li>`;
  }

  function familyCardHtml(family) {
    return `<article class="family-card" id="fam-${esc(family.id)}" data-family="${esc(family.name)}">
      <div class="card-top">
        <div class="fam-titles">
          <h3 class="fam-name">${esc(family.name)}</h3>
          <div class="fam-common">${esc(family.common)}</div>
        </div>
        ${iconSvg(family.icon, 'leaf-icon')}
      </div>
      <p class="trait">${family.trait}</p>
      <p class="differentia"><b>Sets it apart:</b> ${family.differentia}</p>
      ${family.species && family.species.length
        ? `<ul class="species-list">${family.species.map(speciesRowHtml).join('')}</ul>`
        : ''}
    </article>`;
  }

  function orderSectionHtml(order, index) {
    const plate = String(index + 1).padStart(2, '0');
    return `<section class="order" id="order-${slug(order.name)}" data-order="${esc(order.name)}">
      <div class="order-head">
        <div class="order-title-group">
          ${iconSvg(order.icon, 'order-icon')}
          <h2 class="order-name">${esc(order.name)}</h2>
        </div>
        <span class="plate">Plate No. ${plate}</span>
      </div>
      <p class="order-traits">${order.desc || ''}</p>
      <div class="family-grid">${(order.families || []).map(familyCardHtml).join('')}</div>
    </section>`;
  }

  function renderFieldGuide(container, tree) {
    const built = collectOrders(tree).filter((o) => o.families && o.families.length);
    const header = `<header class="masthead">
      <div class="eyebrow">Herbarium Edition &middot; Volume I</div>
      <h1 class="title">A Field Guide to the <em>Plant Kingdom</em></h1>
      <div class="subtitle">${built.length} ORDERS <span class="dot">&middot;</span> ${built.reduce((n, o) => n + o.families.length, 0)} FAMILIES <span class="dot">&middot;</span> ${built.reduce((n, o) => n + o.families.reduce((m, f) => m + (f.species ? f.species.length : 0), 0), 0)} SPECIES</div>
    </header>`;

    if (!built.length) {
      container.innerHTML = `${header}<p style="text-align:center;color:var(--sage);padding:60px 24px;">No orders built out yet.</p>`;
      return;
    }

    container.innerHTML = `
      ${header}
      <nav class="fg-jump">${built.map((o) => `<a href="#order-${slug(o.name)}">${esc(o.name)}</a>`).join('')}</nav>
      <main>${built.map((o, i) => orderSectionHtml(o, i)).join('')}</main>
    `;
  }

  window.Herb = window.Herb || {};
  window.Herb.renderFieldGuide = renderFieldGuide;
})();
