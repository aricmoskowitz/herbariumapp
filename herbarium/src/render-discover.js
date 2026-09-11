// Discover tab: a vertical snap-scroll feed of one-fact-per-card plant
// trivia, built once per load by flattening every funFacts[] entry found
// anywhere in the tree (order/informal-group/clade, family, species) into a
// flat card pool. Unseen cards are shuffled ahead of seen ones on every
// open; only the seen-set itself persists (in localStorage), never a fixed
// queue order.
(function () {
  const { esc, iconSvg, walk } = window.Herb;

  const SEEN_KEY = 'df-seen';

  const TYPE_LABELS = {
    height: 'Height', region_found: 'Region found', region_origin: 'Region origin',
    pollination: 'Pollination', interspecies: 'Interspecies', culinary: 'Culinary',
    cultural: 'Cultural', medicinal: 'Medicinal', discovery: 'Discovery', other: 'Fact',
  };
  const TYPE_COLORS = {
    height: '#5f7a8a', region_found: '#6f7d5c', region_origin: '#a8763a',
    pollination: '#c79a2b', interspecies: '#8b3a2f', culinary: '#e0b74a',
    cultural: '#8a9678', medicinal: '#4c7a4c', discovery: '#a4453a', other: '#8a9678',
  };
  // Small hand-drawn glyphs for the category badge - a distinct, smaller
  // icon set from the per-taxon icons used elsewhere on the card (§4 in the
  // main brief). Rendered on their own 0 0 24 24 viewBox, never conflated
  // with the 0 0 40 40 taxon icon system in iconSvg().
  const TYPE_GLYPHS = {
    height: '<path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3"/>',
    region_found: '<path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    region_origin: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    pollination: '<circle cx="12" cy="12" r="2"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><circle cx="8" cy="16" r="2.5"/><circle cx="16" cy="16" r="2.5"/>',
    interspecies: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    culinary: '<ellipse cx="12" cy="7" rx="4" ry="5"/><path d="M12 12v9"/>',
    cultural: '<path d="M6 3v18M6 4h10l-3 4 3 4H6"/>',
    medicinal: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
    discovery: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
    other: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/>',
  };

  function badgeGlyphSvg(type) {
    return `<svg class="df-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${TYPE_GLYPHS[type] || TYPE_GLYPHS.other}</svg>`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Flatten every funFacts entry in the tree into one card per fact. Built
  // once per load and kept in memory - never rebuilt per scroll.
  //
  // Every card carries a `breadcrumb`: the chain of ancestor clade names,
  // then (for family/species cards) the owning order/informal-group name,
  // then (for species cards) the family name - so a card always shows where
  // it sits in the tree, not just its own name. `walk`'s third callback
  // argument is the node's ancestor chain (root-first, node itself
  // excluded), which is exactly this breadcrumb's clade portion once
  // filtered to rank === 'clade'.
  function buildCardPool(tree) {
    const cards = [];

    function pushNodeCard(level, rankLabel, node, breadcrumb) {
      if (!node.icon) return; // §4: iconless node with facts - skip rather than assume
      (node.funFacts || []).forEach((fact, i) => {
        cards.push({
          cardId: `${level}:${node.id}:${i}`,
          level, rankLabel,
          name: node.name, common: null, sci: null,
          icon: node.icon,
          breadcrumb,
          factType: fact.type, factText: fact.text,
          navTarget: node.id,
          diagramTarget: node.id, // order/informal-group/clade cards link to themselves in the Diagram
        });
      });
    }

    walk(tree, (node, depth, parents) => {
      const ancestryClades = parents.filter((p) => p.rank === 'clade').map((p) => p.name);

      if (node.rank === 'order') pushNodeCard('order', 'Order', node, ancestryClades);
      else if (node.rank === 'informal group') pushNodeCard('informalGroup', 'Informal group', node, ancestryClades);
      else if (node.rank === 'clade') pushNodeCard('clade', 'Clade', node, ancestryClades);

      // families[] only ever lives on order/informal-group nodes
      // (collectGroups' rule elsewhere in the app) - the group breadcrumb
      // below, and the Diagram target every family/species card under this
      // node points at, are only meaningful when node is one of those two
      // ranks.
      const groupBreadcrumb = (node.rank === 'order' || node.rank === 'informal group')
        ? [...ancestryClades, node.name]
        : ancestryClades;
      const groupDiagramTarget = (node.rank === 'order' || node.rank === 'informal group') ? node.id : null;

      for (const fam of (node.families || [])) {
        (fam.funFacts || []).forEach((fact, i) => {
          cards.push({
            cardId: `family:${fam.id}:${i}`,
            level: 'family', rankLabel: 'Family',
            name: fam.name, common: fam.common, sci: null,
            icon: fam.icon,
            breadcrumb: groupBreadcrumb,
            factType: fact.type, factText: fact.text,
            navTarget: fam.id,
            diagramTarget: groupDiagramTarget, // families have no box of their own in the Diagram - link to their order/informal group
          });
        });
        for (const sp of (fam.species || [])) {
          (sp.funFacts || []).forEach((fact, i) => {
            cards.push({
              cardId: `species:${sp.id}:${i}`,
              level: 'species', rankLabel: 'Species',
              name: sp.common, common: sp.common, sci: sp.sci,
              icon: fam.icon, // species carry no icon of their own - use the parent family's
              breadcrumb: [...groupBreadcrumb, fam.name],
              factType: fact.type, factText: fact.text,
              navTarget: sp.id,
              diagramTarget: groupDiagramTarget, // same reasoning as family cards above
            });
          });
        }
      }
    });

    return cards;
  }

  function loadSeen() {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveSeen(seenSet) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seenSet]));
    } catch (e) { /* storage unavailable - seen-tracking degrades gracefully */ }
  }

  // Unseen cards first (shuffled), then seen cards (shuffled) - rebuilt
  // fresh every time the tab opens, per the brief. Only the seen-set itself
  // is durable.
  function buildFeedOrder(allCards, seenSet) {
    const unseen = allCards.filter((c) => !seenSet.has(c.cardId));
    const seen = allCards.filter((c) => seenSet.has(c.cardId));
    return [...shuffle(unseen), ...shuffle(seen)];
  }

  // Field Guide anchor id for a card's navTarget, per the id prefixes that
  // section already uses (order-/fam-/sp-). Clade-level cards have no Field
  // Guide entry at all (Field Guide only renders order/informal-group
  // sections), so there is nothing to link to.
  function fieldGuideAnchorId(card) {
    if (card.level === 'order' || card.level === 'informalGroup') return `order-${card.navTarget}`;
    if (card.level === 'family') return `fam-${card.navTarget}`;
    if (card.level === 'species') return `sp-${card.navTarget}`;
    return null;
  }

  // Diagram anchor id for a card's diagramTarget - the order/informal-group
  // or clade box this card belongs under (families and species have no box
  // of their own in the Diagram, so they resolve to their owning
  // order/informal group; see buildCardPool).
  function diagramAnchorId(card) {
    return card.diagramTarget ? `diag-${card.diagramTarget}` : null;
  }

  function nameHtml(card) {
    if (card.level === 'species') {
      return `<h2 class="df-name">${esc(card.common)}</h2><div class="df-sci">${esc(card.sci)}</div>`;
    }
    if (card.level === 'family') {
      return `<h2 class="df-name">${esc(card.name)}</h2><div class="df-common">${esc(card.common)}</div>`;
    }
    return `<h2 class="df-name">${esc(card.name)}</h2>`;
  }

  // Rendered narrowest-first (species/family end) to broadest-last (clade
  // end) - the reverse of `breadcrumb`'s own root-first order - so it reads
  // as "this, within this, within this" rather than starting from the most
  // abstract ancestor.
  function breadcrumbHtml(card) {
    if (!card.breadcrumb || !card.breadcrumb.length) return '';
    const narrowestFirst = card.breadcrumb.slice().reverse();
    return `<div class="df-breadcrumb">${narrowestFirst.map((n) => `<span>${esc(n)}</span>`).join('<span class="df-breadcrumb-sep">&lsaquo;</span>')}</div>`;
  }

  function cardHtml(card) {
    const guideAnchor = fieldGuideAnchorId(card);
    const diagramAnchor = diagramAnchorId(card);
    return `<div class="df-card" data-card-id="${esc(card.cardId)}">
      ${iconSvg(card.icon, 'df-icon')}
      <div class="df-rank">${esc(card.rankLabel)}</div>
      ${nameHtml(card)}
      ${breadcrumbHtml(card)}
      <span class="df-badge" style="--badge-color:${esc(TYPE_COLORS[card.factType] || TYPE_COLORS.other)}">${badgeGlyphSvg(card.factType)}${esc(TYPE_LABELS[card.factType] || TYPE_LABELS.other)}</span>
      <p class="df-fact">${esc(card.factText)}</p>
      <div class="df-viewlinks">
        ${guideAnchor ? `<button type="button" class="df-viewlink" data-tab="guide" data-anchor="${esc(guideAnchor)}">View in Field Guide &rarr;</button>` : ''}
        ${diagramAnchor ? `<button type="button" class="df-viewlink" data-tab="diagram" data-anchor="${esc(diagramAnchor)}">View in Diagram &rarr;</button>` : ''}
      </div>
    </div>`;
  }

  function renderDiscover(container, tree) {
    const pool = buildCardPool(tree);

    if (!pool.length) {
      container.innerHTML = '<p class="df-empty">No facts yet &mdash; check back once the Discover feed has content.</p>';
      return;
    }

    const seenSet = loadSeen();
    const order = buildFeedOrder(pool, seenSet);

    container.innerHTML = `<div class="df-feed" id="dfFeed">${order.map(cardHtml).join('')}</div>`;

    const feedEl = container.querySelector('#dfFeed');

    feedEl.querySelectorAll('.df-viewlink').forEach((btn) => {
      btn.addEventListener('click', () => {
        const anchorId = btn.dataset.anchor;
        const tabBtn = document.querySelector(`#appSwitch button[data-tab="${btn.dataset.tab}"]`);
        if (tabBtn) tabBtn.click();

        // The target tab's font-display:swap webfonts (Fraunces/Source
        // Serif 4/Space Mono) can still be loading the first time a long
        // tab like Field Guide or Diagram renders, and the resulting
        // reflow after the initial scroll can leave the target hundreds of
        // px off - hence needing a manual scroll to "find" it. Re-run the
        // same scroll once webfonts are actually ready, plus a couple of
        // fixed-delay fallbacks for engines without the Font Loading API
        // or any other late reflow (e.g. iOS Safari's chrome collapsing
        // mid-scroll). A no-op re-scroll (already in place) is harmless.
        const attempt = () => {
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        requestAnimationFrame(() => {
          attempt();
          if (document.fonts && document.fonts.ready) document.fonts.ready.then(attempt);
          setTimeout(attempt, 350);
          setTimeout(attempt, 900);
        });
      });
    });

    // Seen-tracking: a card counts as seen once it scrolls off the top of
    // the viewport (exits with its top edge above 0), not merely once it
    // has been visible. Writes are debounced rather than flushed every tick.
    let pendingWrite = null;
    const newlySeen = new Set(seenSet);
    function scheduleSave() {
      if (pendingWrite) clearTimeout(pendingWrite);
      pendingWrite = setTimeout(() => saveSeen(newlySeen), 400);
    }
    const observer = new IntersectionObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          const id = entry.target.dataset.cardId;
          if (!newlySeen.has(id)) { newlySeen.add(id); changed = true; }
        }
      }
      if (changed) scheduleSave();
    }, { root: feedEl, threshold: 0 });
    feedEl.querySelectorAll('.df-card').forEach((el) => observer.observe(el));
  }

  window.Herb = window.Herb || {};
  window.Herb.renderDiscover = renderDiscover;
})();
