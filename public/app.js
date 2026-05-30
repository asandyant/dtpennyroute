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

function setTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  $(`${tab}Tab`).classList.remove('hidden');
  if (tab === 'reports') loadReports();
  if (tab === 'stores') loadStores();
  if (tab === 'run') loadHunts();
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
          <button onclick="openReport('${item.id}')">Report Find</button>
        </div>
      </article>`;
  }).join('');
}

function addToRun(itemId) {
  const item = state.items.find(i => i.id === itemId) || [...state.selected.values()].find(i => i.id === itemId);
  if (!item) return;
  state.selected.set(itemId, item);
  renderSelected();
  setTab('run');
}

function removeFromRun(itemId) {
  state.selected.delete(itemId);
  renderSelected();
}

function renderSelected() {
  const items = [...state.selected.values()];
  $('selectedItems').innerHTML = items.length ? items.map(item => `
    <div class="selected-chip">
      <div><strong>${escapeHtml(item.description)}</strong><div class="small">${escapeHtml((item.searchTerms || [])[0] || item.description)}</div></div>
      <button class="secondary" onclick="removeFromRun('${item.id}')">Remove</button>
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
  const item = state.items.find(i => i.id === itemId) || [...state.selected.values()].find(i => i.id === itemId);
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
  await loadItems();
  await loadReports();
  await loadStores();
}

async function loadReports() {
  const data = await api('/api/reports');
  state.reports = data.reports;
  $('reportsList').innerHTML = state.reports.length ? state.reports.map(r => {
    const item = [...state.items, ...state.selected.values()].find(i => i.id === r.itemId);
    const store = state.stores.find(s => s.id === r.storeId);
    return `
      <article class="item-card">
        <div class="item-title">${escapeHtml(item?.description || r.itemId)}</div>
        <div class="sku">${escapeHtml(store?.name || 'Unknown store')} · ${new Date(r.createdAt).toLocaleString()}</div>
        <div class="pill-row">
          <span class="pill">App: ${escapeHtml(statusLabel(r.appStatus))}</span>
          <span class="pill ${r.scanResult === 'penny' ? 'green' : r.scanResult === 'normal' ? 'amber' : 'gray'}">Scan: ${escapeHtml(statusLabel(r.scanResult))}</span>
          <span class="pill">Found: ${escapeHtml(statusLabel(r.foundStatus))}</span>
        </div>
        ${r.notes ? `<p class="muted">${escapeHtml(r.notes)}</p>` : ''}
      </article>`;
  }).join('') : '<div class="card"><p class="muted">No reports yet. Report your first penny find.</p></div>';
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
  renderSelected();
}

window.addToRun = addToRun;
window.removeFromRun = removeFromRun;
window.openReport = openReport;
init().catch(err => alert(err.message));
