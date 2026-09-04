// Trainer tab: quiz/study game built from the same taxonomy tree.
// 4 modes, all reading taxonomy.json directly (no separate quiz data file):
//   1. Species -> Family   2. Family -> Order   3. Species -> Order
//   4. Icon -> Order (uses order.quizClue / order.quizWhy)
(function () {
  const { esc, iconSvg, collectOrders } = window.Herb;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr, n, exclude) {
    const pool = arr.filter((x) => x !== exclude);
    return shuffle(pool).slice(0, n);
  }

  function buildPools(tree) {
    const orders = collectOrders(tree).filter((o) => o.families && o.families.length);
    const families = [];
    const species = [];
    for (const order of orders) {
      for (const fam of order.families) {
        families.push({ ...fam, orderName: order.name });
        for (const sp of fam.species || []) {
          species.push({ ...sp, familyName: fam.common || fam.name, orderName: order.name });
        }
      }
    }
    const iconOrders = collectOrders(tree).filter((o) => o.quizClue && o.icon);
    return { orders, families, species, iconOrders };
  }

  function questionSpeciesToFamily(pools) {
    const target = pools.species[Math.floor(Math.random() * pools.species.length)];
    const distractors = pick(pools.families.map((f) => f.common || f.name), 3, target.familyName);
    const options = shuffle([target.familyName, ...distractors]);
    return {
      prompt: `Which family does <b>${esc(target.common)}</b> (<i>${target.sci}</i>) belong to?`,
      options, answer: target.familyName,
      why: `${esc(target.common)} is placed in ${esc(target.familyName)}, order ${esc(target.orderName)}.`,
    };
  }

  function questionFamilyToOrder(pools) {
    const target = pools.families[Math.floor(Math.random() * pools.families.length)];
    const distractors = pick(pools.orders.map((o) => o.name), 3, target.orderName);
    const options = shuffle([target.orderName, ...distractors]);
    return {
      prompt: `${target.trait}<br><br>Which order does the <b>${esc(target.common || target.name)}</b> family (${esc(target.name)}) belong to?`,
      options, answer: target.orderName,
      why: target.differentia,
    };
  }

  function questionSpeciesToOrder(pools) {
    const target = pools.species[Math.floor(Math.random() * pools.species.length)];
    const distractors = pick(pools.orders.map((o) => o.name), 3, target.orderName);
    const options = shuffle([target.orderName, ...distractors]);
    return {
      prompt: `Which order does <b>${esc(target.common)}</b> (<i>${target.sci}</i>) belong to?`,
      options, answer: target.orderName,
      why: `${esc(target.common)} sits in the ${esc(target.familyName)} family, order ${esc(target.orderName)}.`,
    };
  }

  function questionIconToOrder(pools) {
    const target = pools.iconOrders[Math.floor(Math.random() * pools.iconOrders.length)];
    const distractors = pick(pools.iconOrders.map((o) => o.name), 3, target.name);
    const options = shuffle([target.name, ...distractors]);
    return {
      prompt: `${iconSvg(target.icon, 'tr-icon-prompt')}<div class="tr-clue">${target.quizClue}</div>`,
      options, answer: target.name, why: target.quizWhy,
    };
  }

  const MODES = {
    species_family: { label: 'Species → Family', build: questionSpeciesToFamily, needs: (p) => p.species.length >= 4 },
    family_order: { label: 'Family → Order', build: questionFamilyToOrder, needs: (p) => p.families.length >= 4 && p.orders.length >= 4 },
    species_order: { label: 'Species → Order', build: questionSpeciesToOrder, needs: (p) => p.species.length >= 1 && p.orders.length >= 4 },
    icon_order: { label: 'Icon → Order', build: questionIconToOrder, needs: (p) => p.iconOrders.length >= 4 },
  };

  function renderTrainer(container, tree) {
    const pools = buildPools(tree);
    const state = { mode: 'icon_order', score: 0, asked: 0, current: null };

    container.innerHTML = `
      <div class="tr-mode-row">${Object.entries(MODES)
        .map(([key, m]) => `<button type="button" class="tr-mode-btn" data-mode="${key}">${m.label}</button>`)
        .join('')}</div>
      <div class="tr-score">Score: <span class="tr-score-val">0</span> / <span class="tr-asked-val">0</span></div>
      <div class="tr-quiz"></div>
    `;

    const quizEl = container.querySelector('.tr-quiz');
    const scoreEl = container.querySelector('.tr-score-val');
    const askedEl = container.querySelector('.tr-asked-val');

    function setMode(key) {
      state.mode = key;
      container.querySelectorAll('.tr-mode-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === key);
      });
      nextQuestion();
    }

    function nextQuestion() {
      const mode = MODES[state.mode];
      if (!mode.needs(pools)) {
        quizEl.innerHTML = '<p class="tr-empty">Not enough built data for this mode yet.</p>';
        return;
      }
      const q = mode.build(pools);
      state.current = q;
      quizEl.innerHTML = `
        <div class="tr-prompt">${q.prompt}</div>
        <div class="tr-options">${q.options
          .map((opt) => `<button type="button" class="tr-option" data-opt="${esc(opt)}">${esc(opt)}</button>`)
          .join('')}</div>
        <div class="tr-reveal" hidden></div>
      `;
      quizEl.querySelectorAll('.tr-option').forEach((btn) => {
        btn.addEventListener('click', () => answer(btn.dataset.opt));
      });
    }

    function answer(choice) {
      const q = state.current;
      const correct = choice === q.answer;
      state.asked += 1;
      if (correct) state.score += 1;
      scoreEl.textContent = state.score;
      askedEl.textContent = state.asked;

      quizEl.querySelectorAll('.tr-option').forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.opt === q.answer) btn.classList.add('correct');
        else if (btn.dataset.opt === choice) btn.classList.add('wrong');
      });
      const reveal = quizEl.querySelector('.tr-reveal');
      reveal.hidden = false;
      reveal.innerHTML = `<p class="tr-why">${correct ? 'Correct. ' : `Answer: ${esc(q.answer)}. `}${q.why}</p>
        <button type="button" class="tr-next">Next question</button>`;
      reveal.querySelector('.tr-next').addEventListener('click', nextQuestion);
    }

    container.querySelectorAll('.tr-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    setMode(state.mode);
  }

  window.Herb = window.Herb || {};
  window.Herb.renderTrainer = renderTrainer;
})();
