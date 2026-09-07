// Trainer tab: quiz/study game built from the same taxonomy tree, no
// separate quiz-data file. Five modes: Species -> Family, Family -> Order,
// Spot the Difference (differentia -> family), Icon -> Order, and a
// non-quiz Study/Browse mode for flipping through a chosen order's families.
(function () {
  const { esc, iconSvg, collectGroups } = window.Herb;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick(arr, n, exclude) {
    return shuffle(arr.filter((x) => x !== exclude)).slice(0, n);
  }

  // "orders" here also includes the 5 informal groups (Brown Algae etc.) -
  // they carry families[]/quizClue/icon exactly like an order does, and
  // are quizzed/browsed identically. Rank is a taxonomic label shown in
  // the UI, not a gate on what content or quiz modes a node takes part in.
  function buildPools(tree) {
    const orders = collectGroups(tree).filter((o) => o.families && o.families.length);
    const families = [];
    const species = [];
    for (const order of orders) {
      for (const fam of order.families) {
        if (!fam.species || !fam.species.length) continue;
        families.push({ ...fam, orderName: order.name, orderRank: order.rank });
        for (const sp of fam.species) {
          species.push({
            ...sp, familyName: fam.name, orderName: order.name, orderRank: order.rank,
          });
        }
      }
    }
    const iconOrders = collectGroups(tree).filter((o) => o.quizClue && o.icon);
    return { orders, families, species, iconOrders };
  }

  function questionSpeciesToFamily(pools) {
    const target = pools.species[Math.floor(Math.random() * pools.species.length)];
    const options = shuffle([target.familyName, ...pick(pools.families.map((f) => f.name), 3, target.familyName)]);
    return {
      label: 'Species &rarr; Family', icon: null,
      main: esc(target.common), sub: target.sci,
      text: `Which family does this belong to?`,
      options, answer: target.familyName,
      why: `${esc(target.common)} sits in ${esc(target.familyName)}, ${esc(target.orderRank)} ${esc(target.orderName)}.`,
    };
  }

  function questionFamilyToOrder(pools) {
    const target = pools.families[Math.floor(Math.random() * pools.families.length)];
    const options = shuffle([target.orderName, ...pick(pools.orders.map((o) => o.name), 3, target.orderName)]);
    return {
      label: 'Family &rarr; Group', icon: null,
      main: esc(target.name), sub: target.common,
      text: target.trait,
      options, answer: target.orderName,
      why: target.differentia,
    };
  }

  function questionDifferentia(pools) {
    const target = pools.families[Math.floor(Math.random() * pools.families.length)];
    const siblings = pools.families.filter((f) => f.orderName === target.orderName && f.name !== target.name);
    const distractorPool = siblings.length >= 3 ? siblings : pools.families;
    const options = shuffle([target.name, ...pick(distractorPool.map((f) => f.name), 3, target.name)]);
    return {
      label: 'Spot the Difference', icon: null,
      main: 'Which family is this?', sub: '',
      text: target.differentia,
      options, answer: target.name,
      why: `${esc(target.name)} (${esc(target.common)}) &mdash; ${target.trait}`,
    };
  }

  function questionIconToGroup(pools) {
    const target = pools.iconOrders[Math.floor(Math.random() * pools.iconOrders.length)];
    const options = shuffle([target.name, ...pick(pools.iconOrders.map((o) => o.name), 3, target.name)]);
    return {
      label: 'Icon &rarr; Group', icon: target.icon,
      main: '', sub: '',
      text: target.quizClue,
      options, answer: target.name,
      why: target.quizWhy,
    };
  }

  const MODES = {
    species: { label: 'Species &rarr; Family', build: questionSpeciesToFamily, needs: (p) => p.species.length >= 4 },
    family: { label: 'Family &rarr; Group', build: questionFamilyToOrder, needs: (p) => p.families.length >= 4 && p.orders.length >= 4 },
    differentia: { label: 'Spot the Difference', build: questionDifferentia, needs: (p) => p.families.length >= 4 },
    icon: { label: 'Icon &rarr; Group', build: questionIconToGroup, needs: (p) => p.iconOrders.length >= 4 },
  };

  function studyCardHtml(family) {
    return `<div class="study-card">
      <div class="study-card-top">${iconSvg(family.icon)}<div>
        <div class="study-fam-name">${esc(family.name)}</div>
        <div class="study-fam-common">${esc(family.common)}</div>
      </div></div>
      <p class="study-trait">${family.trait}</p>
      <p class="study-differentia">${family.differentia}</p>
      <div class="study-species">${(family.species || []).map((sp) => `<span>${esc(sp.common)}</span>`).join('')}</div>
    </div>`;
  }

  function renderTrainer(container, tree) {
    const pools = buildPools(tree);
    const state = { mode: 'icon', correct: 0, answered: 0, streak: 0, best: 0, current: null, studyOrder: null };

    container.innerHTML = `
      <header class="tr-masthead">
        <div class="eyebrow">Companion to the Field Guide</div>
        <h1 class="tr-title">The <em>Herbarium</em> Trainer</h1>
        <p class="tip">Cycle through all four quiz modes each session instead of mastering one at a time &mdash; interleaving species, families, and groups builds stronger recall than drilling one relationship on its own.</p>
      </header>
      <div class="stats-bar">
        <div class="stat"><span class="stat-num" id="statCorrect">0</span><span class="stat-label">Correct</span></div>
        <div class="stat"><span class="stat-num" id="statTotal">0</span><span class="stat-label">Answered</span></div>
        <div class="stat"><span class="stat-num" id="statStreak">0</span><span class="stat-label">Streak</span></div>
        <div class="stat"><span class="stat-num" id="statBest">0</span><span class="stat-label">Best Streak</span></div>
      </div>
      <nav class="modes">${Object.entries(MODES).map(([key, m]) => `<button type="button" data-mode="${key}">${m.label}</button>`).join('')}<button type="button" data-mode="study">Study / Browse</button></nav>
      <div class="tr-main">
        <div id="quizArea" class="quiz-wrap"></div>
        <div id="studyArea" class="hidden">
          <div class="order-chips" id="orderChips"></div>
          <p class="study-order-desc" id="studyOrderDesc"></p>
          <div class="study-grid" id="studyGrid"></div>
        </div>
      </div>
    `;

    const quizArea = container.querySelector('#quizArea');
    const studyArea = container.querySelector('#studyArea');
    const statCorrect = container.querySelector('#statCorrect');
    const statTotal = container.querySelector('#statTotal');
    const statStreak = container.querySelector('#statStreak');
    const statBest = container.querySelector('#statBest');

    function setMode(key) {
      state.mode = key;
      container.querySelectorAll('nav.modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === key));
      if (key === 'study') {
        quizArea.classList.add('hidden');
        studyArea.classList.remove('hidden');
        renderStudy();
      } else {
        studyArea.classList.add('hidden');
        quizArea.classList.remove('hidden');
        nextQuestion();
      }
    }

    function nextQuestion() {
      const mode = MODES[state.mode];
      if (!mode.needs(pools)) {
        quizArea.innerHTML = '<p class="tr-empty">Not enough built data for this mode yet.</p>';
        return;
      }
      const q = mode.build(pools);
      state.current = q;
      quizArea.innerHTML = `
        <div class="prompt-card">
          <div class="prompt-label">${q.label}</div>
          ${q.icon ? iconSvg(q.icon, 'prompt-icon') : ''}
          ${q.main ? `<div class="prompt-main">${q.main}</div>` : ''}
          ${q.sub ? `<div class="prompt-sub">${q.sub}</div>` : ''}
          <p class="prompt-text">${q.text}</p>
        </div>
        <div class="answers">${q.options.map((opt) => `<button type="button" class="answer-btn" data-opt="${esc(opt)}"><span class="a-name">${esc(opt)}</span></button>`).join('')}</div>
        <div class="feedback hidden" id="feedback"></div>
        <button type="button" class="next-btn hidden" id="nextBtn">Next</button>
      `;
      quizArea.querySelectorAll('.answer-btn').forEach((btn) => btn.addEventListener('click', () => answer(btn.dataset.opt)));
      quizArea.querySelector('#nextBtn').addEventListener('click', nextQuestion);
    }

    function answer(choice) {
      const q = state.current;
      const correct = choice === q.answer;
      state.answered += 1;
      if (correct) { state.correct += 1; state.streak += 1; state.best = Math.max(state.best, state.streak); }
      else { state.streak = 0; }
      statCorrect.textContent = state.correct;
      statTotal.textContent = state.answered;
      statStreak.textContent = state.streak;
      statBest.textContent = state.best;

      quizArea.querySelectorAll('.answer-btn').forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.opt === q.answer) btn.classList.add('correct');
        else if (btn.dataset.opt === choice) btn.classList.add('wrong');
      });
      const feedback = quizArea.querySelector('#feedback');
      feedback.classList.remove('hidden');
      feedback.innerHTML = `${correct ? '<b>Correct.</b>' : `<b>Answer: ${esc(q.answer)}.</b>`} ${q.why}`;
      quizArea.querySelector('#nextBtn').classList.remove('hidden');
    }

    function renderStudy() {
      const chipsEl = container.querySelector('#orderChips');
      if (!chipsEl.dataset.built) {
        chipsEl.dataset.built = '1';
        chipsEl.innerHTML = pools.orders.map((o) => `<button type="button" class="order-chip" style="--chip-color:${esc(o.accent || '#c79a2b')}" data-order="${esc(o.name)}">${esc(o.name)}</button>`).join('');
        chipsEl.querySelectorAll('.order-chip').forEach((btn) => btn.addEventListener('click', () => showStudyOrder(btn.dataset.order)));
      }
      if (!state.studyOrder) showStudyOrder(pools.orders[0].name);
    }

    function showStudyOrder(name) {
      state.studyOrder = name;
      const order = pools.orders.find((o) => o.name === name);
      container.querySelectorAll('.order-chip').forEach((b) => b.classList.toggle('active', b.dataset.order === name));
      container.querySelector('#studyOrderDesc').innerHTML = order.desc || '';
      container.querySelector('#studyGrid').innerHTML = (order.families || []).map(studyCardHtml).join('');
    }

    container.querySelectorAll('nav.modes button').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    setMode(state.mode);
  }

  window.Herb = window.Herb || {};
  window.Herb.renderTrainer = renderTrainer;
})();
