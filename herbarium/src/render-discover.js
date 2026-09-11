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
  function buildCardPool(tree) {
    const cards = [];

    function pushNodeCard(level, rankLabel, node) {
      if (!node.icon) return; // §4: iconless node with facts - skip rather than assume
      (node.funFacts || []).forEach((fact, i) => {
        cards.push({
          cardId: `${level}:${node.id}:${i}`,
          level, rankLabel,
          name: node.name, common: null, sci: null,
          icon: node.icon,
          factType: fact.type, factText: fact.text,
          navTarget: node.id,
        });
      });
    }

    walk(tree, (node) => {
      if (node.rank === 'order') pushNodeCard('order', 'Order', node);
      else if (node.rank === 'informal group') pushNodeCard('informalGroup', 'Informal group', node);
      else if (node.rank === 'clade') pushNodeCard('clade', 'Clade', node);

      for (const fam of (node.families || [])) {
        (fam.funFacts || []).forEach((fact, i) => {
          cards.push({
            cardId: `family:${fam.id}:${i}`,
            level: 'family', rankLabel: 'Family',
            name: fam.name, common: fam.common, sci: null,
            icon: fam.icon,
            factType: fact.type, factText: fact.text,
            navTarget: fam.id,
          });
        });
        for (const sp of (fam.species || [])) {
          (sp.funFacts || []).forEach((fact, i) => {
            cards.push({
              cardId: `species:${sp.id}:${i}`,
              level: 'species', rankLabel: 'Species',
              name: sp.common, common: sp.common, sci: sp.sci,
              icon: fam.icon, // species carry no icon of their own - use the parent family's
              factType: fact.type, factText: fact.text,
              navTarget: sp.id,
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

  function nameHtml(card) {
    if (card.level === 'species') {
      return `<h2 class="df-name">${esc(card.common)}</h2><div class="df-sci">${esc(card.sci)}</div>`;
    }
    if (card.level === 'family') {
      return `<h2 class="df-name">${esc(card.name)}</h2><div class="df-common">${esc(card.common)}</div>`;
    }
    return `<h2 class="df-name">${esc(card.name)}</h2>`;
  }

  function cardHtml(card) {
    const anchorId = fieldGuideAnchorId(card);
    return `<div class="df-card" data-card-id="${esc(card.cardId)}">
      ${iconSvg(card.icon, 'df-icon')}
      <div class="df-rank">${esc(card.rankLabel)}</div>
      ${nameHtml(card)}
      <span class="df-badge" style="--badge-color:${esc(TYPE_COLORS[card.factType] || TYPE_COLORS.other)}">${esc(TYPE_LABELS[card.factType] || TYPE_LABELS.other)}</span>
      <p class="df-fact">${esc(card.factText)}</p>
      ${anchorId ? `<button type="button" class="df-viewlink" data-anchor="${esc(anchorId)}">View in Field Guide &rarr;</button>` : ''}
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
        const guideBtn = document.querySelector('#appSwitch button[data-tab="guide"]');
        if (guideBtn) guideBtn.click();
        requestAnimationFrame(() => {
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
