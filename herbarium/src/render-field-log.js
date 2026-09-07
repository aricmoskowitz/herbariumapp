// Field Log tab: private log of user-found plants. Reads the taxonomy tree
// only to build the species picker (so a logged sighting can reference a
// real species/family/order) - the log entries themselves live only in
// window.storage (localStorage-backed) and are never written back into
// taxonomy.json. This is personal data, not a shared fact.
(function () {
  const { esc, collectGroups } = window.Herb;
  const STORAGE_KEY = 'herbarium.fieldLog.v1';

  window.storage = window.storage || {
    get() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    },
    set(entries) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (e) { /* storage unavailable (private browsing, quota) */ }
    },
  };

  function speciesOptionsHtml(tree) {
    let html = '<option value="custom">Other / not in guide&hellip;</option>';
    for (const order of collectGroups(tree)) {
      for (const fam of order.families || []) {
        if (!fam.species || !fam.species.length) continue;
        html += `<optgroup label="${esc(order.name)} — ${esc(fam.name)}">`;
        for (const sp of fam.species) {
          const value = esc(JSON.stringify({ common: sp.common, sci: sp.sci, family: fam.name, order: order.name }));
          html += `<option value="${value}">${esc(sp.common)}</option>`;
        }
        html += '</optgroup>';
      }
    }
    return html;
  }

  function entryCardHtml(entry, idx) {
    const tags = [entry.family, entry.order].filter(Boolean);
    return `<div class="fl-card" data-idx="${idx}">
      <div class="fl-card-top">
        <div>
          <span class="fl-name">${esc(entry.common)}</span>
          ${entry.sci ? `<span class="fl-sci"> &mdash; ${entry.sci}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="fl-date">${esc(entry.date || '')}</span>
          <button type="button" class="fl-delete" data-idx="${idx}" aria-label="Delete entry">&times;</button>
        </div>
      </div>
      ${tags.length ? `<div class="fl-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${entry.location ? `<div class="fl-location">${esc(entry.location)}</div>` : ''}
      ${entry.notes ? `<p class="fl-notes">${esc(entry.notes)}</p>` : ''}
    </div>`;
  }

  function renderFieldLog(container, tree) {
    function stats(entries) {
      const species = new Set(entries.map((e) => e.common).filter(Boolean));
      const families = new Set(entries.map((e) => e.family).filter(Boolean));
      const orders = new Set(entries.map((e) => e.order).filter(Boolean));
      return { total: entries.length, species: species.size, families: families.size, orders: orders.size };
    }

    function draw() {
      const entries = window.storage.get();
      const s = stats(entries);
      container.innerHTML = `
        <header class="tr-masthead">
          <div class="eyebrow">Your Private Log</div>
          <h1 class="tr-title">The <em>Field</em> Log</h1>
          <p class="tip">Every sighting you add here is saved privately to this app &mdash; nothing is shared or uploaded anywhere else.</p>
        </header>
        <div class="stats-bar">
          <div class="stat"><span class="stat-num">${s.total}</span><span class="stat-label">Sightings</span></div>
          <div class="stat"><span class="stat-num">${s.species}</span><span class="stat-label">Species</span></div>
          <div class="stat"><span class="stat-num">${s.families}</span><span class="stat-label">Families</span></div>
          <div class="stat"><span class="stat-num">${s.orders}</span><span class="stat-label">Groups</span></div>
        </div>
        <div class="tr-main">
          <form id="flForm" class="fl-form">
            <div class="fl-field">
              <label for="flSpeciesSelect">Species</label>
              <select id="flSpeciesSelect">${speciesOptionsHtml(tree)}</select>
            </div>
            <div class="fl-field hidden" id="flCustomWrap">
              <label for="flCustomName">Species name</label>
              <input type="text" id="flCustomName" placeholder="e.g. Trillium grandiflorum" />
            </div>
            <div class="fl-row">
              <div class="fl-field">
                <label for="flDate">Date found</label>
                <input type="date" id="flDate" />
              </div>
              <div class="fl-field">
                <label for="flLocation">Location</label>
                <input type="text" id="flLocation" placeholder="e.g. Riverside trail, north bank" />
              </div>
            </div>
            <div class="fl-field">
              <label for="flNotes">Notes</label>
              <textarea id="flNotes" rows="2" placeholder="Anything worth remembering &mdash; condition, habitat, identifying features"></textarea>
            </div>
            <button type="submit" class="fl-submit">Add Sighting</button>
          </form>
          <div class="fl-list">${entries.slice().reverse().map((e, i) => entryCardHtml(e, entries.length - 1 - i)).join('') || ''}</div>
          ${!entries.length ? '<p class="fl-empty">No sightings logged yet &mdash; add the first one above.</p>' : ''}
        </div>
      `;

      const select = container.querySelector('#flSpeciesSelect');
      const customWrap = container.querySelector('#flCustomWrap');
      select.addEventListener('change', () => {
        customWrap.classList.toggle('hidden', select.value !== 'custom');
      });

      container.querySelector('#flForm').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const customName = container.querySelector('#flCustomName');
        let entry;
        if (select.value === 'custom') {
          if (!customName.value.trim()) return;
          entry = { common: customName.value.trim(), sci: '', family: '', order: '' };
        } else {
          entry = JSON.parse(select.value);
        }
        entry.date = container.querySelector('#flDate').value || '';
        entry.location = container.querySelector('#flLocation').value.trim();
        entry.notes = container.querySelector('#flNotes').value.trim();

        const current = window.storage.get();
        current.push(entry);
        window.storage.set(current);
        draw();
      });

      container.querySelectorAll('.fl-delete').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.idx);
          const current = window.storage.get();
          current.splice(idx, 1);
          window.storage.set(current);
          draw();
        });
      });
    }
    draw();
  }

  window.Herb = window.Herb || {};
  window.Herb.renderFieldLog = renderFieldLog;
})();
