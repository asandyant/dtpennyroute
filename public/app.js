const state = {
  items: [],
  stores: [],
  reports: [],
  selected: new Map(),
  reportItemId: null,
  user: null
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function statusLabel(value) {
  return String(value || 'unknown').replaceAll('_',' ');
}

function findItem(itemId) {
  return state.items.find(i => i.id === itemId) || [...state.selected.values()].find(i => i.id === itemId);
}

function findStore(storeId) {
  return state.stores.find(s => s.id === storeId);
}

function preferredSearchTerm(item) {
  return (item?.searchTerms || [])[0] || item?.description || '';
}

function dollarTreeSearchUrl(term) {
  return `https://www.dollartree.com/searchresults?Ntt=${encodeURIComponent(term)}`;
}

function latestReportFor(itemId, storeId) {
  return state.reports
    .filter(r => r.itemId === itemId && r.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function setTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  $(`${tab}Tab`).classList.remove('hidden');
  if (tab === 'reports') loadReports();
  if (tab === 'stores') loadStores();
  if (tab === 'run') loadHunts().then(renderRouteBuilder);
  if (tab === 'stock') renderStockHelper();
}

async function loadMe() {
  const data = await api('/api/auth/me');
  state.user = data.user;
  const box = $('meBox');
  if (state.user) {
    box.classList.remove('hidden');
    box.textContent = `Logged in as ${state.user.name} (${state.user.role}${state.user.paid ? ', paid' : ''})`;
  } else {
    box.classList.add('hidden');
    box.textContent = '';
  }
}

async function loadCategories() {
  const data = await api('/api/categories');
  $('categoryFilter').innerHTML = '<option value="">All Categories</option>' + data.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

async function loadItems() {
  const params = new URLSearchParams();
  if ($('itemSearch').value.trim()) params.set('q', $('itemSearch').value.trim());
  if ($('categoryFilter').value) params.set('category', $('categoryFilter').value);
  const data = await api(`/api/items?${params}`);
  state.items = data.items;
  renderItems();
}

function renderItems() {
  $('itemCount').textContent = `${state.items.length} items found`;
  $('itemsList').innerHTML = state.items.map(item => {
    const confirmed = item.confidence === 'field-confirmed';
    return `
      <article class="item-card">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(item.description)}</div>
            <div class="sku">SKU: ${escapeHtml(item.sku || 'unknown')} · Event: ${escapeHtml(item.eventNumber || 'n/a')} · Drop: ${escapeHtml(item.dropDate || 'n/a')}</div>
          </div>
          <div class="score">${item.pennyScore}<span>PennyScore</span></div>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(item.category)}</span>
          <span class="pill ${confirmed ? 'green' : 'gray'}">${escapeHtml(item.confidence)}</span>
          <span class="pill amber">${escapeHtml(item.source)}</span>
        </div>
        <div class="small">Search terms: ${(item.searchTerms || []).map(escapeHtml).join(', ') || 'none yet'}</div>
        <div class="actions">
          <button class="teal" onclick="addToRun('${item.id}')">Add to Penny Run</button>
          <button class="secondary" onclick="copyTerm('${item.id}')">Copy Search Term</button>
          <button onclick="openReport('${item.id}')">Report Find</button>
        </div>
      </article>`;
  }).join('');
}

function addToRun(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  state.selected.set(itemId, item);
  renderSelected();
  renderStockHelper();
  renderRouteBuilder();
  setTab('run');
}

function removeFromRun(itemId) {
  state.selected.delete(itemId);
  renderSelected();
  renderStockHelper();
  renderRouteBuilder();
}

function renderSelected() {
  const items = [...state.selected.values()];
  $('selectedItems').innerHTML = items.length ? items.map(item => `
    <div class="selected-chip">
      <div><strong>${escapeHtml(item.description)}</strong><div class="small">Best app search: ${escapeHtml(preferredSearchTerm(item))}</div></div>
      <div class="chip-actions">
        <button class="secondary" onclick="copyTerm('${item.id}')">Copy</button>
        <button class="secondary" onclick="removeFromRun('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('') : '<p class="muted">No items selected yet. Go to Penny List and tap Add to Penny Run.</p>';
}

async function loadStores() {
  const data = await api('/api/stores');
  state.stores = data.stores;
  renderStores();
  populateReportStores();
}

function renderStores() {
  $('storesList').innerHTML = state.stores.map(store => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(store.name)}</div>
          <div class="sku">${escapeHtml(store.address)}, ${escapeHtml(store.city)}, ${escapeHtml(store.state)} ${escapeHtml(store.zip)} ${store.storeNumber ? '· Store #' + escapeHtml(store.storeNumber) : ''}</div>
        </div>
        <div class="score">${store.worthTheDriveScore}<span>Worth Drive</span></div>
      </div>
    </article>
  `).join('');
}

function populateReportStores() {
  const options = ['<option value="">Unknown / not listed</option>'].concat(state.stores.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`));
  $('reportStore').innerHTML = options.join('');
}

function openReport(itemId) {
  state.reportItemId = itemId;
  const item = findItem(itemId);
  $('reportItemName').textContent = item ? item.description : '';
  $('reportDialog').showModal();
}

async function submitReport(event) {
  event.preventDefault();
  if (!state.reportItemId) return;
  await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      itemId: state.reportItemId,
      storeId: $('reportStore').value,
      zip: $('huntZip').value || '08096',
      appStatus: $('reportAppStatus').value,
      scanResult: $('reportScanResult').value,
      foundStatus: $('reportFoundStatus').value,
      priceSeen: $('reportPrice').value,
      notes: $('reportNotes').value
    })
  });
  $('reportDialog').close();
  $('reportPrice').value = '';
  $('reportNotes').value = '';
  await refreshAfterReport();
}

async function saveStockStatus(itemId, storeId, appStatus) {
  const item = findItem(itemId);
  const store = findStore(storeId);
  await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      itemId,
      storeId,
      zip: $('huntZip').value || '08096',
      appStatus,
      scanResult: 'unknown',
      foundStatus: 'unknown',
      priceSeen: '',
      notes: `Stock Helper: ${statusLabel(appStatus)} for ${item?.description || itemId} at ${store?.name || storeId}`
    })
  });
  await refreshAfterReport();
}

async function refreshAfterReport() {
  await loadItems();
  await loadReports();
  await loadStores();
  renderStockHelper();
  renderRouteBuilder();
}

async function loadReports() {
  const data = await api('/api/reports');
  state.reports = data.reports;
  $('reportsList').innerHTML = state.reports.length ? state.reports.map(r => {
    const item = findItem(r.itemId);
    const store = findStore(r.storeId);
    return `
      <article class="item-card">
        <div class="item-title">${escapeHtml(item?.description || r.itemId)}</div>
        <div class="sku">${escapeHtml(store?.name || 'Unknown store')} · ${new Date(r.createdAt).toLocaleString()}</div>
        <div class="pill-row">
          <span class="pill">App: ${escapeHtml(statusLabel(r.appStatus))}</span>
          <span class="pill ${r.scanResult === 'penny' ? 'green' : r.scanResult === 'normal' ? 'amber' : 'gray'}">Scan: ${escapeHtml(statusLabel(r.scanResult))}</span>
          <span class="pill">Found: ${escapeHtml(statusLabel(r.foundStatus))}</span>
        </div>
        ${r.priceSeen ? `<div class="small">Price seen: ${escapeHtml(r.priceSeen)}</div>` : ''}
        ${r.notes ? `<p class="muted">${escapeHtml(r.notes)}</p>` : ''}
      </article>`;
  }).join('') : '<div class="card"><p class="muted">No reports yet. Report your first penny find.</p></div>';
}

function renderStockHelper() {
  const box = $('stockHelperList');
  if (!box) return;
  const selectedItems = [...state.selected.values()];
  const items = selectedItems.length ? selectedItems : state.items.slice(0, 8);
  if (!items.length) {
    box.innerHTML = '<div class="card"><p class="muted">Load the penny list first, then add items to your Penny Run.</p></div>';
    return;
  }
  box.innerHTML = items.map(item => {
    const term = preferredSearchTerm(item);
    return `
      <article class="item-card stock-card">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(item.description)}</div>
            <div class="sku">App search term: <strong>${escapeHtml(term)}</strong></div>
          </div>
          <div class="score">${item.pennyScore}<span>PennyScore</span></div>
        </div>
        <div class="actions">
          <button class="teal" onclick="copyTerm('${item.id}')">Copy Search Term</button>
          <a class="button-link" href="${dollarTreeSearchUrl(term)}" target="_blank" rel="noopener">Open Dollar Tree Search</a>
          <button class="secondary" onclick="openReport('${item.id}')">Report Scan</button>
        </div>
        <div class="store-stock-grid">
          ${state.stores.map(store => {
            const latest = latestReportFor(item.id, store.id);
            const status = latest?.appStatus && latest.appStatus !== 'unknown' ? statusLabel(latest.appStatus) : 'not checked';
            return `
              <div class="store-stock-row">
                <div>
                  <strong>${escapeHtml(store.name)}</strong>
                  <div class="small">${store.storeNumber ? 'Store #' + escapeHtml(store.storeNumber) + ' · ' : ''}${escapeHtml(status)}</div>
                </div>
                <div class="mini-actions">
                  <button onclick="saveStockStatus('${item.id}','${store.id}','in_stock')">In</button>
                  <button onclick="saveStockStatus('${item.id}','${store.id}','limited_stock')">Limited</button>
                  <button class="secondary" onclick="saveStockStatus('${item.id}','${store.id}','out_of_stock')">Out</button>
                  <button class="secondary" onclick="saveStockStatus('${item.id}','${store.id}','product_not_found')">Not Found</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </article>`;
  }).join('');
}

function stockValue(status) {
  if (status === 'in_stock') return 12;
  if (status === 'limited_stock') return 7;
  if (status === 'out_of_stock') return -6;
  if (status === 'product_not_found') return -2;
  return 0;
}

function renderRouteBuilder() {
  const box = $('routeBuilder');
  if (!box) return;
  const items = [...state.selected.values()];
  if (!items.length) {
    box.innerHTML = '<p class="muted">Add items to your Penny Run first. Then use Stock Helper to mark what the Dollar Tree app shows for each store.</p>';
    return;
  }
  const rows = state.stores.map(store => {
    const itemRows = items.map(item => {
      const latest = latestReportFor(item.id, store.id);
      const appStatus = latest?.appStatus || 'unknown';
      const scan = latest?.scanResult || 'unknown';
      const found = latest?.foundStatus || 'unknown';
      const points = stockValue(appStatus) + (scan === 'penny' ? 10 : scan === 'normal' ? -8 : 0) + (found === 'not_found' ? -5 : found === 'store_pulled' ? -9 : 0);
      return { item, latest, appStatus, points };
    });
    const possible = itemRows.filter(r => ['in_stock','limited_stock'].includes(r.appStatus)).length;
    const checked = itemRows.filter(r => r.latest).length;
    const score = Math.max(0, Math.min(100, 35 + itemRows.reduce((sum, r) => sum + r.points, 0) + Math.round((store.worthTheDriveScore || 40) / 5)));
    return { store, itemRows, possible, checked, score };
  }).sort((a, b) => b.score - a.score);

  box.innerHTML = rows.map((row, idx) => `
    <article class="route-card">
      <div class="item-head">
        <div>
          <div class="item-title">${idx === 0 ? 'Start Here: ' : ''}${escapeHtml(row.store.name)}</div>
          <div class="sku">${row.possible} possible finds · ${row.checked}/${items.length} items checked · ${escapeHtml(row.store.address)}</div>
        </div>
        <div class="score">${row.score}<span>Worth Drive</span></div>
      </div>
      <div class="route-items">
        ${row.itemRows.map(r => `<div class="route-line"><span>${escapeHtml(r.item.description)}</span><strong>${escapeHtml(statusLabel(r.appStatus))}</strong></div>`).join('')}
      </div>
    </article>
  `).join('');
}

async function saveHunt() {
  const itemIds = [...state.selected.keys()];
  if (!itemIds.length) return alert('Add items to your Penny Run first.');
  const data = await api('/api/hunts', {
    method: 'POST',
    body: JSON.stringify({ name: $('huntName').value, zip: $('huntZip').value, itemIds })
  });
  alert(`Saved: ${data.hunt.name}`);
  loadHunts();
}

async function loadHunts() {
  const data = await api('/api/hunts');
  $('savedHunts').innerHTML = data.hunts.length ? data.hunts.map(h => `
    <div class="selected-chip">
      <div><strong>${escapeHtml(h.name)}</strong><div class="small">ZIP ${escapeHtml(h.zip)} · ${h.itemIds.length} items · ${new Date(h.createdAt).toLocaleString()}</div></div>
    </div>
  `).join('') : '<p class="muted">No saved hunts yet.</p>';
}

async function signup() {
  try {
    await api('/api/auth/signup', { method:'POST', body: JSON.stringify({ name:$('signupName').value, email:$('signupEmail').value, password:$('signupPassword').value }) });
    await loadMe();
  } catch (e) { alert(e.message); }
}

async function login() {
  try {
    await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email:$('loginEmail').value, password:$('loginPassword').value }) });
    await loadMe();
  } catch (e) { alert(e.message); }
}

async function logout() {
  await api('/api/auth/logout', { method:'POST' });
  await loadMe();
}

async function copyTerm(itemId) {
  const item = findItem(itemId);
  const term = preferredSearchTerm(item);
  if (!term) return;
  try {
    await navigator.clipboard.writeText(term);
    alert(`Copied: ${term}`);
  } catch {
    window.prompt('Copy this search term:', term);
  }
}

async function init() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  $('loginToggle').addEventListener('click', () => $('authPanel').classList.toggle('hidden'));
  $('itemSearch').addEventListener('input', () => loadItems());
  $('categoryFilter').addEventListener('change', () => loadItems());
  $('submitReportBtn').addEventListener('click', submitReport);
  $('saveHuntBtn').addEventListener('click', saveHunt);
  $('signupBtn').addEventListener('click', signup);
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  await loadMe();
  await loadCategories();
  await loadStores();
  await loadItems();
  await loadReports();
  renderSelected();
  renderStockHelper();
  renderRouteBuilder();
}

window.addToRun = addToRun;
window.removeFromRun = removeFromRun;
window.openReport = openReport;
window.copyTerm = copyTerm;
window.saveStockStatus = saveStockStatus;
init().catch(err => alert(err.message));
