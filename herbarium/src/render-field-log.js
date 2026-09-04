// Field Log tab: private log of user-found plants. Unlike the other three
// tabs this reads/writes only window.storage (localStorage-backed) and
// never touches taxonomy.json - it is personal data, not shared facts.
(function () {
  const { esc } = window.Herb;
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

  function entryHtml(entry, idx) {
    return `<li class="fl-entry" data-idx="${idx}">
      <div class="fl-entry-head">
        <b>${esc(entry.name)}</b>
        <span class="fl-date">${esc(entry.date || '')}</span>
        <button type="button" class="fl-delete" data-idx="${idx}" aria-label="Delete entry">&times;</button>
      </div>
      ${entry.location ? `<div class="fl-loc">${esc(entry.location)}</div>` : ''}
      ${entry.notes ? `<p class="fl-notes">${esc(entry.notes)}</p>` : ''}
    </li>`;
  }

  function renderFieldLog(container) {
    function draw() {
      const entries = window.storage.get();
      container.innerHTML = `
        <form class="fl-form">
          <input type="text" name="name" placeholder="Plant name" required />
          <input type="date" name="date" />
          <input type="text" name="location" placeholder="Location (optional)" />
          <textarea name="notes" placeholder="Notes (optional)"></textarea>
          <button type="submit">Add entry</button>
        </form>
        <ul class="fl-list">${entries
          .slice()
          .reverse()
          .map((e, i) => entryHtml(e, entries.length - 1 - i))
          .join('') || '<li class="fl-empty">No plants logged yet.</li>'}</ul>
      `;

      container.querySelector('.fl-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const name = fd.get('name').trim();
        if (!name) return;
        const current = window.storage.get();
        current.push({
          name,
          date: fd.get('date') || '',
          location: fd.get('location').trim(),
          notes: fd.get('notes').trim(),
        });
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
