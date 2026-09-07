// Field Guide tab: reference browser for plant taxonomy. Every order or
// informal group with a non-empty families[] is "built" and gets a header
// + family cards; nodes without built families simply do not appear here.
// This keeps the Field Guide's membership a pure function of
// taxonomy.json - no separate "what's in the guide" list to keep in sync,
// and no guide-status tag of any kind (there is no longer a distinction
// between what's "in" the guide and what isn't - everything built is in).
(function () {
  const { esc, iconSvg, collectGroups } = window.Herb;

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

  function groupSectionHtml(group, index) {
    const plate = String(index + 1).padStart(2, '0');
    return `<section class="order" id="order-${slug(group.name)}" data-group="${esc(group.name)}">
      <div class="order-head">
        <div class="order-title-group">
          ${iconSvg(group.icon, 'order-icon')}
          <div>
            <span class="fg-rank">${esc(group.rank)}</span>
            <h2 class="order-name">${esc(group.name)}</h2>
          </div>
        </div>
        <span class="plate">Plate No. ${plate}</span>
      </div>
      <p class="order-traits">${group.desc || ''}</p>
      <div class="family-grid">${(group.families || []).map(familyCardHtml).join('')}</div>
    </section>`;
  }

  function renderFieldGuide(container, tree) {
    const built = collectGroups(tree).filter((g) => g.families && g.families.length);
    const orderCount = built.filter((g) => g.rank === 'order').length;
    const groupCount = built.filter((g) => g.rank === 'informal group').length;
    const header = `<header class="masthead">
      <div class="eyebrow">Herbarium Edition &middot; Volume I</div>
      <h1 class="title">A Field Guide to the <em>Plant Kingdom</em></h1>
      <div class="subtitle">${orderCount} ORDERS <span class="dot">&middot;</span> ${groupCount} INFORMAL GROUPS <span class="dot">&middot;</span> ${built.reduce((n, g) => n + g.families.length, 0)} FAMILIES <span class="dot">&middot;</span> ${built.reduce((n, g) => n + g.families.reduce((m, f) => m + (f.species ? f.species.length : 0), 0), 0)} SPECIES</div>
    </header>`;

    if (!built.length) {
      container.innerHTML = `${header}<p style="text-align:center;color:var(--sage);padding:60px 24px;">Nothing built out yet.</p>`;
      return;
    }

    container.innerHTML = `
      ${header}
      <nav class="fg-jump">${built.map((g) => `<a href="#order-${slug(g.name)}">${esc(g.name)}</a>`).join('')}</nav>
      <main>${built.map((g, i) => groupSectionHtml(g, i)).join('')}</main>
    `;
  }

  window.Herb = window.Herb || {};
  window.Herb.renderFieldGuide = renderFieldGuide;
})();
