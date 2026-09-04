// Wires up tab switching (#appSwitch) and lazily calls each tab's renderer
// the first time it's shown. Works both in dev (fetches data/taxonomy.json)
// and in the concatenated build (reads the inlined window.TAXONOMY_DATA).
(function () {
  function boot(data) {
    const tree = data.tree;
    const rendered = { guide: false, diagram: false, trainer: false, log: false };
    const panels = {
      guide: document.getElementById('panel-field-guide'),
      diagram: document.getElementById('panel-diagram'),
      trainer: document.getElementById('panel-trainer'),
      log: document.getElementById('panel-field-log'),
    };

    function show(tab) {
      Object.entries(panels).forEach(([key, el]) => {
        el.hidden = key !== tab;
      });
      document.querySelectorAll('#appSwitch [data-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      if (!rendered[tab]) {
        rendered[tab] = true;
        if (tab === 'guide') window.Herb.renderFieldGuide(panels.guide, tree);
        if (tab === 'diagram') window.Herb.renderDiagram(panels.diagram, tree);
        if (tab === 'trainer') window.Herb.renderTrainer(panels.trainer, tree);
        if (tab === 'log') window.Herb.renderFieldLog(panels.log);
      }
    }

    document.querySelectorAll('#appSwitch [data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => show(btn.dataset.tab));
    });

    show('guide');
  }

  if (window.TAXONOMY_DATA) {
    boot(window.TAXONOMY_DATA);
  } else {
    fetch('data/taxonomy.json')
      .then((r) => r.json())
      .then(boot)
      .catch((err) => {
        document.body.innerHTML = `<p style="padding:2rem;color:#a33">Failed to load taxonomy.json: ${err.message}</p>`;
      });
  }
})();
