const state = {
  items: [],
  stores: [],
  reports: [],
  selected: new Map(),
  user: null,
  homeZip: localStorage.getItem('dtpr_zip') || '08096'
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

function setMessage(id, message, isError=false) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.textContent = message;
  el.style.borderColor = isError ? '#f5b5ad' : '';
  el.style.background = isError ? '#fff1ef' : '';
  el.style.color = isError ? '#8a1f16' : '';
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

function reportPayloadFromChoice(choice) {
  const payload = { appStatus: 'unknown', scanResult: 'unknown', foundStatus: 'unknown' };
  if (['in_stock', 'limited_stock', 'out_of_stock', 'product_not_found'].includes(choice)) payload.appStatus = choice;
  if (choice === 'penny') { payload.scanResult = 'penny'; payload.foundStatus = 'found'; }
  if (choice === 'normal') { payload.scanResult = 'normal'; payload.foundStatus = 'found'; }
  if (choice === 'not_found') payload.foundStatus = 'not_found';
  if (choice === 'store_pulled') payload.foundStatus = 'store_pulled';
  return payload;
}

function setTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  $(`${tab}Tab`)?.classList.remove('hidden');
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'run') { loadHunts(); renderSelected(); renderRouteBuilder(); }
  if (tab === 'check') { renderQuickSelectors(); renderCheckHelper(); }
  if (tab === 'community') renderReports();
}

function updateAccountUi() {
  const pill = $('accountPill');
  const adminBtn = $('adminTabButton');
  if (state.user) {
    pill.textContent = `${state.user.name} · ${state.user.role}${state.user.paid ? ' · Paid' : ''}`;
    $('meBox').classList.remove('hidden');
    $('meBox').textContent = `Logged in as ${state.user.name} (${state.user.email}) — ${state.user.role}${state.user.paid ? ', paid' : ''}`;
    adminBtn.classList.toggle('hidden', state.user.role !== 'admin');
  } else {
    pill.textContent = 'Guest Mode';
    $('meBox').classList.add('hidden');
    $('meBox').textContent = '';
    adminBtn.classList.add('hidden');
  }
}

async function loadMe() {
  const data = await api('/api/auth/me');
  state.user = data.user;
  updateAccountUi();
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
  renderDashboard();
}

function renderItems() {
  $('itemCount').textContent = `${state.items.length} items found`;
  $('itemsList').innerHTML = state.items.map(item => {
    const confirmed = item.confidence === 'field-confirmed';
    const inRun = state.selected.has(item.id);
    return `
      <article class="item-card">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(item.description)}</div>
            <div class="sku">SKU: ${escapeHtml(item.sku || 'unknown')} · Event: ${escapeHtml(item.eventNumber || 'n/a')} · Drop: ${escapeHtml(item.dropDate || 'n/a')}</div>
          </div>
          <div class="score">100<span>PennyScore</span></div>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(item.category)}</span>
          <span class="pill ${confirmed ? 'green' : 'gold'}">${confirmed ? 'Field Confirmed' : 'Penny Drop'}</span>
          <span class="pill">Source: ${escapeHtml(item.source || 'n/a')}</span>
        </div>
        <div class="small"><strong>Search in Dollar Tree app/site:</strong> ${escapeHtml(preferredSearchTerm(item))}</div>
        <div class="actions simple-actions">
          <button class="teal" onclick="addToRun('${item.id}')">${inRun ? 'Added to Run' : 'Add to My Run'}</button>
          <button class="secondary" onclick="copyTerm('${item.id}')">Copy Search</button>
          <a class="button-link" href="${dollarTreeSearchUrl(preferredSearchTerm(item))}" target="_blank" rel="noopener">Open Search</a>
          <button onclick="addAndCheck('${item.id}')">Check Item</button>
        </div>
      </article>`;
  }).join('');
}

function addToRun(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  state.selected.set(itemId, item);
  saveSelectedLocal();
  renderItems();
  renderSelected();
  renderQuickSelectors();
  renderDashboard();
}

function addAndCheck(itemId) {
  addToRun(itemId);
  $('quickItem').value = itemId;
  setTab('check');
}

function removeFromRun(itemId) {
  state.selected.delete(itemId);
  saveSelectedLocal();
  renderItems();
  renderSelected();
  renderQuickSelectors();
  renderDashboard();
}

function saveSelectedLocal() {
  localStorage.setItem('dtpr_selected_ids', JSON.stringify([...state.selected.keys()]));
}

function restoreSelectedLocal() {
  const ids = JSON.parse(localStorage.getItem('dtpr_selected_ids') || '[]');
  ids.forEach(id => {
    const item = state.items.find(i => i.id === id);
    if (item) state.selected.set(id, item);
  });
}

function renderSelected() {
  const items = [...state.selected.values()];
  $('selectedItems').innerHTML = items.length ? items.map(item => `
    <div class="selected-chip">
      <div><strong>${escapeHtml(item.description)}</strong><div class="small">Search: ${escapeHtml(preferredSearchTerm(item))}</div></div>
      <div class="chip-actions">
        <button class="secondary" onclick="copyTerm('${item.id}')">Copy</button>
        <a class="mini-link" href="${dollarTreeSearchUrl(preferredSearchTerm(item))}" target="_blank" rel="noopener">Open</a>
        <button onclick="addAndCheck('${item.id}')">Check Item</button>
        <button class="secondary" onclick="removeFromRun('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('') : '<p class="muted">No items selected yet. Go to Penny List and tap Add to My Run.</p>';
}

async function loadStores() {
  const data = await api(`/api/stores/lookup?zip=${encodeURIComponent(state.homeZip)}`);
  state.stores = data.stores;
  state.storeSource = data.source;
  state.storeMessage = data.message || '';
  state.storeLiveConnected = !!data.liveConnected;
  renderQuickSelectors();
  renderRouteBuilder();
  renderDashboard();
}

function renderQuickSelectors() {
  const quickItem = $('quickItem');
  const quickStore = $('quickStore');
  if (!quickItem || !quickStore) return;
  const items = [...state.selected.values()];
  quickItem.innerHTML = items.length
    ? items.map(i => `<option value="${i.id}">${escapeHtml(i.description)}</option>`).join('')
    : '<option value="">Add items to My Run first</option>';
  quickStore.innerHTML = state.stores.map(s => `<option value="${s.id}">${escapeHtml(s.name)} ${s.storeNumber ? '#' + escapeHtml(s.storeNumber) : ''}${Number.isFinite(s.distanceMiles) ? ' · ' + s.distanceMiles + ' mi' : ''}</option>`).join('');
  renderCheckHelper();
}

function renderCheckHelper() {
  const item = findItem($('quickItem')?.value);
  const store = findStore($('quickStore')?.value);
  const el = $('checkHelper');
  if (!el) return;
  if (!item) {
    el.innerHTML = '<p class="muted">Add items to My Run first, then come back here.</p>';
    return;
  }
  el.innerHTML = `
    <strong>${escapeHtml(item.description)}</strong>
    <p class="small">Search term: <strong>${escapeHtml(preferredSearchTerm(item))}</strong></p>
    <p class="small">ZIP: <strong>${escapeHtml(state.homeZip)}</strong>${store ? ` · Store: <strong>${escapeHtml(store.name)}</strong>` : ''}</p>
    <div class="actions">
      <button class="secondary" onclick="copyTerm('${item.id}')">Copy Search Term</button>
      <a class="button-link" href="${dollarTreeSearchUrl(preferredSearchTerm(item))}" target="_blank" rel="noopener">Open Dollar Tree Search</a>
    </div>`;
}

async function loadReports() {
  const data = await api('/api/reports');
  state.reports = data.reports;
  renderReports();
  renderRouteBuilder();
  renderDashboard();
}

async function quickReport(choice) {
  const itemId = $('quickItem').value;
  const storeId = $('quickStore').value;
  if (!itemId || !storeId) return setMessage('quickStatus', 'Choose an item and store first.', true);
  const payload = reportPayloadFromChoice(choice);
  payload.itemId = itemId;
  payload.storeId = storeId;
  payload.zip = state.homeZip;
  payload.notes = `Quick check from ZIP ${state.homeZip}`;
  if (choice === 'penny') payload.priceSeen = '0.01';
  await api('/api/reports', { method:'POST', body: JSON.stringify(payload) });
  setMessage('quickStatus', `Saved: ${statusLabel(choice)} for ${findItem(itemId)?.description || 'item'}`);
  await loadReports();
}

function renderReports() {
  const box = $('reportsList');
  if (!box) return;
  if (!state.reports.length) {
    box.innerHTML = '<p class="muted">No reports yet. Store checks and penny scans will show here.</p>';
    return;
  }
  box.innerHTML = state.reports.slice(0, 75).map(r => {
    const item = findItem(r.itemId) || state.items.find(i => i.id === r.itemId);
    const store = findStore(r.storeId);
    const main = r.scanResult !== 'unknown' ? r.scanResult : (r.appStatus !== 'unknown' ? r.appStatus : r.foundStatus);
    return `<div class="report-row">
      <div>
        <strong>${escapeHtml(item?.description || 'Unknown item')}</strong>
        <small>${escapeHtml(store?.name || 'Unknown store')} · ZIP ${escapeHtml(r.zip || 'n/a')} · ${new Date(r.createdAt).toLocaleString()}</small>
      </div>
      <span class="pill ${main === 'penny' ? 'green' : main === 'normal' ? 'gold' : ''}">${escapeHtml(statusLabel(main))}</span>
    </div>`;
  }).join('');
}

function scoreStoreLocal(store) {
  const selectedIds = new Set([...state.selected.keys()]);
  const storeReports = state.reports.filter(r => r.storeId === store.id && selectedIds.has(r.itemId));

  if (!selectedIds.size) {
    return { hasData: false, score: null, reason: 'Add items to My Run first so the app can score this store.' };
  }

  if (!storeReports.length) {
    return { hasData: false, score: null, reason: 'Not enough data yet. Add an app stock result or penny scan for this store.' };
  }

  let score = 45;
  const uniquePositiveItems = new Set();
  const uniqueNegativeItems = new Set();

  for (const r of storeReports) {
    const ageHours = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
    const freshness = ageHours < 24 ? 1 : ageHours < 72 ? .7 : .35;
    if (r.scanResult === 'penny') { score += 22 * freshness; uniquePositiveItems.add(r.itemId); }
    if (r.appStatus === 'in_stock') { score += 10 * freshness; uniquePositiveItems.add(r.itemId); }
    if (r.appStatus === 'limited_stock') { score += 6 * freshness; uniquePositiveItems.add(r.itemId); }
    if (r.scanResult === 'normal') { score -= 14 * freshness; uniqueNegativeItems.add(r.itemId); }
    if (r.appStatus === 'out_of_stock') { score -= 10 * freshness; uniqueNegativeItems.add(r.itemId); }
    if (r.foundStatus === 'not_found') { score -= 10 * freshness; uniqueNegativeItems.add(r.itemId); }
    if (r.foundStatus === 'store_pulled') { score -= 18 * freshness; uniqueNegativeItems.add(r.itemId); }
  }

  score += Math.min(25, uniquePositiveItems.size * 7);
  score -= Math.min(20, uniqueNegativeItems.size * 5);

  let reason = 'Score based on your saved app checks and scan reports.';
  if (uniquePositiveItems.size && !uniqueNegativeItems.size) reason = `${uniquePositiveItems.size} selected item(s) have positive reports here.`;
  if (uniqueNegativeItems.size && !uniquePositiveItems.size) reason = `${uniqueNegativeItems.size} selected item(s) have bad/empty-shelf reports here.`;
  if (uniquePositiveItems.size && uniqueNegativeItems.size) reason = `${uniquePositiveItems.size} positive and ${uniqueNegativeItems.size} bad reports for selected items here.`;

  return { hasData: true, score: Math.max(0, Math.min(100, Math.round(score))), reason };
}

function renderRouteBuilder() {
  const selected = [...state.selected.values()];
  const rows = state.stores.map(store => {
    const scoreInfo = scoreStoreLocal(store);
    const matches = selected.map(item => {
      const report = latestReportFor(item.id, store.id);
      if (!report) return null;
      const label = report.scanResult !== 'unknown' ? report.scanResult : (report.appStatus !== 'unknown' ? report.appStatus : report.foundStatus);
      return `${item.description}: ${statusLabel(label)}`;
    }).filter(Boolean);
    return { store, scoreInfo, matches };
  }).sort((a,b) => {
    if (a.scoreInfo.hasData && !b.scoreInfo.hasData) return -1;
    if (!a.scoreInfo.hasData && b.scoreInfo.hasData) return 1;
    if (a.scoreInfo.hasData && b.scoreInfo.hasData) return b.scoreInfo.score - a.scoreInfo.score;
    return (a.store.distanceMiles ?? 9999) - (b.store.distanceMiles ?? 9999);
  });

  const html = rows.map((row, idx) => {
    const showBest = idx === 0 && row.scoreInfo.hasData;
    const scoreHtml = row.scoreInfo.hasData
      ? `<div class="route-score">${row.scoreInfo.score}<div class="small">Worth the Drive</div></div>`
      : `<div class="route-score no-score">No Score<div class="small">Needs Data</div></div>`;
    return `
    <div class="route-row ${showBest?'best':''}">
      <div>
        <strong>${showBest?'Start here: ':''}${escapeHtml(row.store.name)} ${row.store.storeNumber ? '#' + escapeHtml(row.store.storeNumber) : ''}</strong>
        <div class="small">${escapeHtml(row.store.address)}, ${escapeHtml(row.store.city)}, ${escapeHtml(row.store.state)} ${escapeHtml(row.store.zip)}${Number.isFinite(row.store.distanceMiles) ? ' · ' + row.store.distanceMiles + ' mi from ' + escapeHtml(state.homeZip) : ''}</div><div class="source-note">Store source: ${state.storeLiveConnected ? 'Live Dollar Tree lookup' : 'starter/cached directory'}</div>
        <div class="small">${row.matches.length ? escapeHtml(row.matches.join(' · ')) : escapeHtml(row.scoreInfo.reason)}</div>
      </div>
      ${scoreHtml}
    </div>`;
  }).join('');
  $('routeBuilder') && ($('routeBuilder').innerHTML = html || '<p class="muted">No stores loaded yet.</p>');
  $('dashboardRoute') && ($('dashboardRoute').innerHTML = html || '<p class="muted">No stores loaded yet.</p>');
}

function renderDashboard() {
  $('metricItems') && ($('metricItems').textContent = state.items.length);
  $('metricRun') && ($('metricRun').textContent = state.selected.size);
  $('metricReports') && ($('metricReports').textContent = state.reports.length);
  renderRouteBuilder();
}

async function copyTerm(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  await navigator.clipboard.writeText(preferredSearchTerm(item));
  alert(`Copied: ${preferredSearchTerm(item)}`);
}

async function loadHunts() {
  const data = await api('/api/hunts');
  $('savedHunts').innerHTML = data.hunts.length ? data.hunts.slice().reverse().map(h => `
    <div class="hunt-row">
      <div><strong>${escapeHtml(h.name)}</strong><div class="small">ZIP ${escapeHtml(h.zip || 'n/a')} · ${h.itemIds.length} items · ${new Date(h.createdAt).toLocaleString()}</div></div>
    </div>
  `).join('') : '<p class="muted">No saved runs yet.</p>';
}

async function saveHunt() {
  const itemIds = [...state.selected.keys()];
  if (!itemIds.length) return alert('Add items to My Run first.');
  await api('/api/hunts', { method:'POST', body: JSON.stringify({ name: $('huntName').value || 'My Penny Run', zip: state.homeZip, itemIds }) });
  await loadHunts();
  alert('Run saved.');
}

async function signup() {
  try {
    const data = await api('/api/auth/signup', { method:'POST', body: JSON.stringify({ name:$('signupName').value, email:$('signupEmail').value, password:$('signupPassword').value }) });
    state.user = data.user; updateAccountUi(); alert('Account created.');
  } catch(e) { alert(e.message); }
}
async function login() {
  try {
    const data = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email:$('loginEmail').value, password:$('loginPassword').value }) });
    state.user = data.user; updateAccountUi(); alert('Logged in.');
  } catch(e) { alert(e.message); }
}
async function logout() {
  await api('/api/auth/logout', { method:'POST', body:'{}' });
  state.user = null; updateAccountUi(); alert('Logged out.');
}

async function adminAddItem() {
  try {
    const payload = {
      sku:$('adminSku').value,
      description:$('adminDescription').value,
      category:$('adminCategory').value,
      eventNumber:$('adminEvent').value,
      dropDate:$('adminDrop').value,
      source:$('adminSource').value,
      confidence:$('adminConfidence').value,
      searchTerms:$('adminSearchTerms').value
    };
    await api('/api/admin/items', { method:'POST', body: JSON.stringify(payload) });
    $('adminStatus').textContent = 'Item added.';
    ['adminSku','adminDescription','adminCategory','adminSearchTerms','adminEvent','adminDrop','adminSource'].forEach(id => $(id).value='');
    await loadCategories();
    await loadItems();
  } catch(e) { $('adminStatus').textContent = e.message; }
}

async function saveZip() {
  const zip = $('homeZip').value.trim();
  if (!/^\d{5}$/.test(zip)) { $('zipStatus').textContent = 'Enter a 5 digit ZIP.'; return; }
  state.homeZip = zip;
  localStorage.setItem('dtpr_zip', zip);
  $('zipStatus').textContent = `Loading stores near ${zip}...`;
  await loadStores();
  const sourceNote = state.storeMessage ? ` ${state.storeMessage}` : '';
  $('zipStatus').textContent = `Saved ${zip}. Stores updated.${sourceNote}`;
  renderCheckHelper();
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  $('saveZipBtn').addEventListener('click', saveZip);
  $('itemSearch').addEventListener('input', () => loadItems());
  $('categoryFilter').addEventListener('change', () => loadItems());
  $('saveHuntBtn').addEventListener('click', saveHunt);
  $('quickItem').addEventListener('change', renderCheckHelper);
  $('quickStore').addEventListener('change', renderCheckHelper);
  $('signupBtn').addEventListener('click', signup);
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  $('adminAddItemBtn').addEventListener('click', adminAddItem);
}

async function init() {
  $('homeZip').value = state.homeZip;
  bindEvents();
  await loadMe();
  await loadCategories();
  await loadItems();
  restoreSelectedLocal();
  await loadStores();
  await loadReports();
  renderSelected();
  renderQuickSelectors();
  renderDashboard();
}

init().catch(err => {
  console.error(err);
  alert('App failed to load: ' + err.message);
});
