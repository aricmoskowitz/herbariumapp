// Discover tab: a vertical snap-scroll feed of one-fact-per-card plant
// trivia, flattening every funFacts[] entry found anywhere in the tree
// (order/informal-group/clade, family, species) into a flat card pool, plus
// one species-detail-illustration card per illustrated species, plus one
// multiple-choice quiz card per eligible target across all six of the
// former Trainer tab's quiz relationships (species->family, species->group,
// family->group, spot-the-difference, icon->group, illustration->species -
// see buildQuizCards). Unseen cards are shuffled ahead of seen ones; only
// the seen-set itself persists (in localStorage), never a fixed queue
// order.
//
// Built once per page load, not once per tab visit - bootstrap.js caches
// this tab's render exactly like Field Guide/Diagram/Field Log now, so
// switching away and back doesn't repeat the work below. The feed can run
// to several thousand cards once quiz cards are included, so the DOM is
// virtualized (see "windowing" below): every card gets a same-sized
// placeholder div up front (scroll-snap needs a real, correctly-sized
// element per snap point), but only a small window of cards around the
// current scroll position ever has its actual content (icons,
// illustrations, quiz answer buttons) materialized. Click handling for
// view-links and quiz answers is delegated to one listener on the feed
// container rather than one per button, since the fixed-pool/button count
// would otherwise scale with the whole feed instead of the visible window.
(function () {
  const {
    esc, iconSvg, walk,
  } = window.Herb;

  const SEEN_KEY = 'df-seen';

  const TYPE_LABELS = {
    height: 'Height', region_found: 'Region found', region_origin: 'Region origin',
    pollination: 'Pollination', interspecies: 'Interspecies', culinary: 'Culinary',
    cultural: 'Cultural', medicinal: 'Medicinal', discovery: 'Discovery', cultivation: 'Cultivation',
    chemical: 'Chemical', other: 'Fact',
  };
  const TYPE_COLORS = {
    height: '#5f7a8a', region_found: '#6f7d5c', region_origin: '#a8763a',
    pollination: '#c79a2b', interspecies: '#8b3a2f', culinary: '#e0b74a',
    cultural: '#8a9678', medicinal: '#4c7a4c', discovery: '#a4453a', cultivation: '#5c7a3f',
    chemical: '#6b5b95', other: '#8a9678',
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
    cultivation: '<path d="M3 18h18"/><path d="M12 18v-7"/><path d="M12 11c-3.2 0-5.5-2.3-5.5-5.5 3.2 0 5.5 2.3 5.5 5.5zM12 11c3.2 0 5.5-2.3 5.5-5.5-3.2 0-5.5 2.3-5.5 5.5z"/>',
    chemical: '<path d="M9 3h6M10 3v6.5l-5.2 8.7A1.8 1.8 0 006.4 21h11.2a1.8 1.8 0 001.6-2.8L14 9.5V3"/><path d="M8.2 15h7.6"/>',
    other: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/>',
  };

  function badgeGlyphSvg(type) {
    return `<svg class="df-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${TYPE_GLYPHS[type] || TYPE_GLYPHS.other}</svg>`;
  }

  // Species-detail illustrations: a second, additive visual tier on top of
  // the funFacts badge system above. An `organ` label reuses the .df-badge
  // pill styling (a distinct color) with one shared "illustration" glyph
  // (analogous to chemical's beaker) followed by the organ name - not a
  // fact-type badge, since an illustration isn't a funFacts entry. See the
  // Species Detail Illustrations brief, "Discover card rendering".
  const ORGAN_LABELS = {
    flower: 'Flower', leaf: 'Leaf', fruit: 'Fruit', root: 'Root', stem: 'Stem', shoot: 'Shoot', seed: 'Seed',
  };
  const ORGAN_BADGE_COLOR = '#c79a6b';
  const ILLUSTRATION_GLYPH = '<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 17l5-5 4 4 3-3 4 4"/>';
  function illustrationGlyphSvg() {
    return `<svg class="df-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ILLUSTRATION_GLYPH}</svg>`;
  }

  // Quiz cards: a third, additive card type folded into the same feed and
  // seen-tracking system as fact cards and illustration cards. One card per
  // eligible target per mode (not an infinite random generator - a fixed
  // pool like everything else in Discover), covering all six of the former
  // Trainer tab's quiz relationships. Study/Browse had no quiz content of
  // its own (it just paged through Field Guide-equivalent info) and is not
  // represented here at all.
  const QUIZ_BADGE_COLOR = '#4a7a9a';
  const QUIZ_GLYPH = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2 1.8-2 3.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>';
  function quizGlyphSvg() {
    return `<svg class="df-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${QUIZ_GLYPH}</svg>`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Picks n random items from arr, excluding `exclude` - used to build
  // multiple-choice distractors for quiz cards (see buildQuizCards below).
  function pick(arr, n, exclude) {
    return shuffle(arr.filter((x) => x !== exclude)).slice(0, n);
  }

  // One walk over the tree builds both the fact/illustration card pool and
  // the denormalized order/family/species pools buildQuizCards needs -
  // these used to be two separate tree walks (buildCardPool, plus
  // buildQuizCards calling collectGroups twice on its own) every single
  // render.
  //
  // Every fact/illustration card carries a `breadcrumb`: the chain of
  // ancestor clade names, then (for family/species cards) the owning
  // order/informal-group name, then (for species cards) the family name -
  // so a card always shows where it sits in the tree, not just its own
  // name. `walk`'s third callback argument is the node's ancestor chain
  // (root-first, node itself excluded), which is exactly this breadcrumb's
  // clade portion once filtered to rank === 'clade'.
  //
  // A handful of species are placeholder namesake stand-ins for otherwise
  // empty families (e.g. "Grasses" / sci "Poaceae", for the Poaceae family
  // itself) - fine as fact-card content, but a species->family quiz
  // question built from one is tautological (the prompt's own subtitle
  // already says the answer), so these are excluded from the quiz pools
  // (not from the fact-card pool) by checking sci against the family name.
  function collectFeedData(tree) {
    const cards = [];
    const orders = [];
    const families = [];
    const species = [];
    const iconOrders = [];
    const illustratedSpecies = [];

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
      const isGroup = node.rank === 'order' || node.rank === 'informal group';
      const groupBreadcrumb = isGroup ? [...ancestryClades, node.name] : ancestryClades;
      const groupDiagramTarget = isGroup ? node.id : null;

      if (isGroup && node.quizClue && node.icon) iconOrders.push(node);
      if (isGroup && node.families && node.families.length) orders.push(node);

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

        if (fam.species && fam.species.length) {
          families.push({ ...fam, orderName: node.name, orderRank: node.rank });
        }

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
          // Species-detail illustration (optional, additive) - never on
          // family/order/informal-group/clade entries, per the brief's
          // scope rule. A separate card from any funFacts this species
          // also has, not a replacement or merge.
          if (sp.illustration) {
            cards.push({
              cardId: `species:${sp.id}:illustration`,
              level: 'species', rankLabel: 'Species',
              name: sp.common, common: sp.common, sci: sp.sci,
              isIllustration: true,
              organ: sp.illustration.organ,
              illustrationSvg: sp.illustration.svg,
              caption: sp.illustration.caption,
              breadcrumb: [...groupBreadcrumb, fam.name],
              navTarget: sp.id,
              diagramTarget: groupDiagramTarget,
            });
          }

          if (sp.sci !== fam.name) {
            const spWithParents = {
              ...sp, familyName: fam.name, orderName: node.name, orderRank: node.rank,
            };
            species.push(spWithParents);
            if (sp.illustration) illustratedSpecies.push(spWithParents);
          }
        }
      }
    });

    return {
      cards, orders, families, species, iconOrders, illustratedSpecies,
    };
  }

  function buildQuizCards({
    orders, families, species, iconOrders, illustratedSpecies,
  }) {
    const cards = [];
    const familyNames = families.map((f) => f.name);
    const orderNames = orders.map((o) => o.name);
    const iconOrderNames = iconOrders.map((o) => o.name);
    const illustratedNames = illustratedSpecies.map((s) => s.common);

    if (families.length >= 4) {
      for (const sp of species) {
        const options = shuffle([sp.familyName, ...pick(familyNames, 3, sp.familyName)]);
        cards.push({
          cardId: `quiz:speciesFamily:${sp.id}`,
          isQuiz: true,
          modeLabel: 'Species → Family',
          promptName: sp.common,
          promptSub: sp.sci,
          promptSubStyle: 'sci',
          questionHtml: 'Which family does this belong to?',
          options,
          answer: sp.familyName,
          whyHtml: `${esc(sp.common)} sits in ${esc(sp.familyName)}, ${esc(sp.orderRank)} ${esc(sp.orderName)}.`,
        });
      }
    }

    if (families.length >= 4 && orders.length >= 4) {
      for (const sp of species) {
        const options = shuffle([sp.orderName, ...pick(orderNames, 3, sp.orderName)]);
        cards.push({
          cardId: `quiz:speciesGroup:${sp.id}`,
          isQuiz: true,
          modeLabel: 'Species → Group',
          promptName: sp.common,
          promptSub: sp.sci,
          promptSubStyle: 'sci',
          questionHtml: `Which ${esc(sp.orderRank)} does this belong to?`,
          options,
          answer: sp.orderName,
          whyHtml: `${esc(sp.common)} sits in ${esc(sp.familyName)}, ${esc(sp.orderRank)} ${esc(sp.orderName)}.`,
        });
      }

      for (const fam of families) {
        const options = shuffle([fam.orderName, ...pick(orderNames, 3, fam.orderName)]);
        cards.push({
          cardId: `quiz:familyGroup:${fam.id}`,
          isQuiz: true,
          modeLabel: 'Family → Group',
          promptName: fam.name,
          promptSub: fam.common,
          promptSubStyle: 'common',
          questionHtml: `${fam.trait} Which group is this?`,
          options,
          answer: fam.orderName,
          whyHtml: fam.differentia,
        });
      }
    }

    if (families.length >= 4) {
      for (const fam of families) {
        const siblings = families.filter((f) => f.orderName === fam.orderName && f.name !== fam.name);
        const distractorPool = siblings.length >= 3 ? siblings.map((f) => f.name) : familyNames;
        const options = shuffle([fam.name, ...pick(distractorPool, 3, fam.name)]);
        cards.push({
          cardId: `quiz:differentia:${fam.id}`,
          isQuiz: true,
          modeLabel: 'Spot the Difference',
          promptName: 'Which family is this?',
          promptSub: null,
          questionHtml: fam.differentia,
          options,
          answer: fam.name,
          whyHtml: `${esc(fam.name)} (${esc(fam.common)}) — ${fam.trait}`,
        });
      }
    }

    if (iconOrders.length >= 4) {
      for (const grp of iconOrders) {
        const options = shuffle([grp.name, ...pick(iconOrderNames, 3, grp.name)]);
        cards.push({
          cardId: `quiz:iconGroup:${grp.id}`,
          isQuiz: true,
          modeLabel: 'Icon → Group',
          promptIcon: grp.icon,
          questionHtml: `${grp.quizClue} Which group is this?`,
          options,
          answer: grp.name,
          whyHtml: grp.quizWhy,
        });
      }
    }

    if (illustratedSpecies.length >= 4) {
      for (const sp of illustratedSpecies) {
        const options = shuffle([sp.common, ...pick(illustratedNames, 3, sp.common)]);
        cards.push({
          cardId: `quiz:illustrationSpecies:${sp.id}`,
          isQuiz: true,
          modeLabel: 'Illustration → Species',
          promptIllustrationSvg: sp.illustration.svg,
          questionHtml: 'Which species does this illustration show?',
          options,
          answer: sp.common,
          whyHtml: `${esc(sp.common)} (${esc(sp.sci)}) — ${sp.illustration.caption}`,
        });
      }
    }

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

  // Interleaves several arrays into one, in proportion to their relative
  // sizes, so no single array ever runs unbroken for long: at each step it
  // takes the next item from whichever array is furthest behind its fair
  // share so far. Used below to keep quiz cards and fact/illustration
  // cards mixed throughout the feed regardless of how many of each exist.
  function interleaveByShare(groups) {
    const result = [];
    const cursors = groups.map(() => 0);
    const total = groups.reduce((n, g) => n + g.length, 0);
    for (let n = 0; n < total; n++) {
      let pick = -1;
      let bestRatio = Infinity;
      for (let g = 0; g < groups.length; g++) {
        if (cursors[g] >= groups[g].length) continue;
        const ratio = cursors[g] / groups[g].length;
        if (ratio < bestRatio) { bestRatio = ratio; pick = g; }
      }
      result.push(groups[pick][cursors[pick]]);
      cursors[pick] += 1;
    }
    return result;
  }

  // Within each card type (quiz vs. fact/illustration), unseen cards come
  // first (shuffled), then seen cards (shuffled) - then the two type
  // sequences are interleaved proportionally so quiz and fact cards stay
  // mixed throughout the scroll, rather than segregating into one giant
  // block per type. That segregation is exactly what happened the first
  // time quiz cards shipped: ~1,000 of them were unseen for everyone at
  // once, while most fact cards were already marked seen from ordinary
  // use, so "unseen before seen" alone put nearly a thousand quiz cards in
  // a row at the front of the feed before a single fact card appeared.
  // Computed once per page load (see the top-of-file note on caching);
  // only the seen-set itself is durable.
  function buildFeedOrder(allCards, seenSet) {
    const orderWithinType = (arr) => {
      const unseen = shuffle(arr.filter((c) => !seenSet.has(c.cardId)));
      const seen = shuffle(arr.filter((c) => seenSet.has(c.cardId)));
      return [...unseen, ...seen];
    };
    const quiz = orderWithinType(allCards.filter((c) => c.isQuiz));
    const other = orderWithinType(allCards.filter((c) => !c.isQuiz));
    return interleaveByShare([other, quiz]);
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
  // order/informal group; see collectFeedData).
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

  function quizPromptHtml(card) {
    let html = '';
    if (card.promptIcon) html += iconSvg(card.promptIcon, 'df-icon');
    if (card.promptIllustrationSvg) html += `<div class="df-illustration">${card.promptIllustrationSvg}</div>`;
    if (card.promptName) {
      html += `<h2 class="df-name">${esc(card.promptName)}</h2>`;
      if (card.promptSub) {
        html += card.promptSubStyle === 'common'
          ? `<div class="df-common">${esc(card.promptSub)}</div>`
          : `<div class="df-sci">${esc(card.promptSub)}</div>`;
      }
    }
    return html;
  }

  function quizCardInnerHtml(card) {
    return `<div class="df-rank">Quiz &middot; ${esc(card.modeLabel)}</div>
      ${quizPromptHtml(card)}
      <span class="df-badge" style="--badge-color:${QUIZ_BADGE_COLOR}">${quizGlyphSvg()}Quiz</span>
      <p class="df-fact">${card.questionHtml}</p>
      <div class="answers">${card.options.map((opt) => `<button type="button" class="answer-btn" data-opt="${esc(opt)}"><span class="a-name">${esc(opt)}</span></button>`).join('')}</div>
      <div class="feedback hidden"></div>
      <button type="button" class="next-btn hidden">Continue scrolling &darr;</button>`;
  }

  // Inner content only - the outer <div class="df-card" data-card-id="...">
  // is created once up front as a placeholder (see renderDiscover) so
  // scroll-snap always has a correctly-sized element per card; this is
  // what gets swapped in and out of that placeholder as the feed scrolls.
  function cardInnerHtml(card) {
    if (card.isQuiz) return quizCardInnerHtml(card);

    const guideAnchor = fieldGuideAnchorId(card);
    const diagramAnchor = diagramAnchorId(card);
    const viewLinksHtml = `<div class="df-viewlinks">
        ${guideAnchor ? `<button type="button" class="df-viewlink" data-tab="guide" data-anchor="${esc(guideAnchor)}">View in Field Guide &rarr;</button>` : ''}
        ${diagramAnchor ? `<button type="button" class="df-viewlink" data-tab="diagram" data-anchor="${esc(diagramAnchor)}">View in Diagram &rarr;</button>` : ''}
      </div>`;

    if (card.isIllustration) {
      // card.illustrationSvg is trusted, author-supplied markup (same trust
      // level as taxonomy.json's icon paths elsewhere), inserted verbatim.
      return `<div class="df-illustration">${card.illustrationSvg}</div>
      <div class="df-rank">${esc(card.rankLabel)}</div>
      ${nameHtml(card)}
      ${breadcrumbHtml(card)}
      <span class="df-badge" style="--badge-color:${ORGAN_BADGE_COLOR}">${illustrationGlyphSvg()}${esc(ORGAN_LABELS[card.organ] || card.organ)}</span>
      <p class="df-fact">${esc(card.caption)}</p>
      ${viewLinksHtml}`;
    }

    return `${iconSvg(card.icon, 'df-icon')}
      <div class="df-rank">${esc(card.rankLabel)}</div>
      ${nameHtml(card)}
      ${breadcrumbHtml(card)}
      <span class="df-badge" style="--badge-color:${esc(TYPE_COLORS[card.factType] || TYPE_COLORS.other)}">${badgeGlyphSvg(card.factType)}${esc(TYPE_LABELS[card.factType] || TYPE_LABELS.other)}</span>
      <p class="df-fact">${esc(card.factText)}</p>
      ${viewLinksHtml}`;
  }

  // Module-scoped so a second call (there shouldn't normally be one now
  // that bootstrap.js caches this render, but nothing stops a future
  // caller) disconnects the previous observer instead of leaking it.
  let activeObserver = null;

  function renderDiscover(container, tree) {
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }

    const data = collectFeedData(tree);
    const pool = [...data.cards, ...buildQuizCards(data)];

    if (!pool.length) {
      container.innerHTML = '<p class="df-empty">No facts yet &mdash; check back once the Discover feed has content.</p>';
      return;
    }

    const seenSet = loadSeen();
    const order = buildFeedOrder(pool, seenSet);
    const cardById = new Map(order.map((c) => [c.cardId, c]));

    // Every card gets an empty, correctly-sized placeholder up front -
    // scroll-snap computes its snap points from real in-flow children, so
    // every card needs to exist and be full height even before its content
    // is materialized. Only a small window around the current scroll
    // position ever gets populated (see updateWindow), which is what keeps
    // live DOM/SVG/button counts flat regardless of how long the feed gets.
    container.innerHTML = `<div class="df-feed" id="dfFeed">${order.map((c) => `<div class="df-card" data-card-id="${esc(c.cardId)}"></div>`).join('')}</div>`;

    const feedEl = container.querySelector('#dfFeed');
    const cardEls = [...feedEl.children];

    const populated = new Set();
    function populate(i) {
      if (populated.has(i) || i < 0 || i >= order.length) return;
      const card = order[i];
      const el = cardEls[i];
      el.innerHTML = cardInnerHtml(card);
      el.classList.toggle('df-quiz-card', !!card.isQuiz);
      populated.add(i);
    }
    function depopulate(i) {
      if (!populated.has(i)) return;
      const el = cardEls[i];
      el.innerHTML = '';
      el.classList.remove('df-quiz-card');
      delete el.dataset.answered;
      populated.delete(i);
    }

    const BUFFER = 4;
    let windowCenter = -1;
    function updateWindow(centerIndex) {
      const lo = Math.max(0, centerIndex - BUFFER);
      const hi = Math.min(order.length - 1, centerIndex + BUFFER);
      for (const i of [...populated]) {
        if (i < lo || i > hi) depopulate(i);
      }
      for (let i = lo; i <= hi; i++) populate(i);
      windowCenter = centerIndex;
    }

    let cardHeight = feedEl.clientHeight || 1;
    function currentIndex() {
      return Math.round(feedEl.scrollTop / cardHeight);
    }
    updateWindow(currentIndex());

    let scrollTicking = false;
    feedEl.addEventListener('scroll', () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        cardHeight = feedEl.clientHeight || cardHeight;
        const idx = currentIndex();
        if (idx !== windowCenter) updateWindow(idx);
      });
    }, { passive: true });
    window.addEventListener('resize', () => {
      cardHeight = feedEl.clientHeight || cardHeight;
      updateWindow(currentIndex());
    });

    // One delegated listener for the whole feed instead of one per button -
    // view-link navigation, quiz answers, and the quiz "continue" button all
    // route through here. This is what keeps the live listener count flat
    // regardless of feed length, on top of the windowing above.
    feedEl.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.df-viewlink');
      if (viewBtn) {
        const anchorId = viewBtn.dataset.anchor;
        const tabBtn = document.querySelector(`#appSwitch button[data-tab="${viewBtn.dataset.tab}"]`);
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
        return;
      }

      const nextBtn = e.target.closest('.next-btn');
      if (nextBtn) {
        const cardEl = nextBtn.closest('.df-card');
        const next = cardEl && cardEl.nextElementSibling;
        if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // Quiz cards: tap an option to answer in place (one try per card,
      // like the old Trainer tab) - there is no regenerate-in-place here,
      // since a quiz card is a fixed, pre-built member of the pool like any
      // other Discover card.
      const answerBtn = e.target.closest('.answer-btn');
      if (answerBtn) {
        const cardEl = answerBtn.closest('.df-card');
        if (!cardEl || cardEl.dataset.answered) return;
        const card = cardById.get(cardEl.dataset.cardId);
        if (!card) return;
        cardEl.dataset.answered = '1';
        const choice = answerBtn.dataset.opt;
        const correct = choice === card.answer;
        cardEl.querySelectorAll('.answer-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.opt === card.answer) b.classList.add('correct');
          else if (b.dataset.opt === choice) b.classList.add('wrong');
        });
        const feedback = cardEl.querySelector('.feedback');
        feedback.classList.remove('hidden');
        feedback.innerHTML = `${correct ? '<b>Correct.</b>' : `<b>Answer: ${esc(card.answer)}.</b>`} ${card.whyHtml}`;
        cardEl.querySelector('.next-btn').classList.remove('hidden');
      }
    });

    // Seen-tracking: a card counts as seen once it scrolls off the top of
    // the viewport (exits with its top edge above 0), not merely once it
    // has been visible. Writes are debounced rather than flushed every
    // tick. Placeholder cards are correctly sized/positioned by CSS alone,
    // so this observes every card regardless of whether its content is
    // currently populated.
    let pendingWrite = null;
    const newlySeen = new Set(seenSet);
    function scheduleSave() {
      if (pendingWrite) clearTimeout(pendingWrite);
      pendingWrite = setTimeout(() => saveSeen(newlySeen), 400);
    }
    activeObserver = new IntersectionObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          const id = entry.target.dataset.cardId;
          if (!newlySeen.has(id)) { newlySeen.add(id); changed = true; }
        }
      }
      if (changed) scheduleSave();
    }, { root: feedEl, threshold: 0 });
    cardEls.forEach((el) => activeObserver.observe(el));
  }

  window.Herb = window.Herb || {};
  window.Herb.renderDiscover = renderDiscover;
})();
