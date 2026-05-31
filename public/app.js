const PUBLIC_CATEGORIES = ['All','Kitchenware','Party / Gift Bags','Personal Care','Beauty',
  'Candy / Food','Books / Activity','Crafts','Stationery','Home Decor','Household',
  'Electronics','Toys','Apparel','Floral','Seasonal'];

const state = {
  items: [],
  stores: [],
  reports: [],
  stockRun: null,
  selected: new Map(),
  user: null,
  homeZip: localStorage.getItem('dtpr_zip') || '08096',
  activeCategory: localStorage.getItem('dtpr_cat') || 'All'
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
  if (value === 'no_data' || value === 'unknown' || !value) return 'No reports yet';
  return String(value).replaceAll('_', ' ');
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

function setTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  $(`${tab}Tab`)?.classList.remove('hidden');
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'run') { loadHunts(); renderSelected(); renderRouteBuilder(); }
  if (tab === 'check') { renderQuickSelectors(); renderCheckHelper(); buildRouteView(); renderStockRouteResults(); }
  if (tab === 'community') renderReports();
  if (tab === 'admin') initUploadSection();
  if (tab === 'hunt') setTimeout(initHuntMap, 0);
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

function renderCategoryChips() {
  const box = $('categoryChips');
  if (!box) return;
  box.innerHTML = PUBLIC_CATEGORIES.map(cat => `
    <button class="cat-chip ${state.activeCategory === cat ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>
  `).join('');
}

function selectCategory(cat) {
  state.activeCategory = cat;
  localStorage.setItem('dtpr_cat', cat);
  renderCategoryChips();
  loadItems();
}

async function loadItems() {
  const params = new URLSearchParams();
  if ($('itemSearch').value.trim()) params.set('q', $('itemSearch').value.trim());
  if (state.activeCategory && state.activeCategory !== 'All') params.set('category', state.activeCategory);
  const data = await api(`/api/items?${params}`);
  state.items = data.items;
  restoreSelectedLocal();
  renderItems();
  renderDashboard();
  buildRouteView();
  renderStockRouteResults();
}

function itemImageHtml(item) {
  if (item.imageUrl) {
    return `<img class="item-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.description)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
            <div class="item-img-placeholder" style="display:none"><span>Image coming soon</span></div>`;
  }
  return `<div class="item-img-placeholder"><span>Image coming soon</span></div>`;
}

function routeItemImageHtml(item) {
  if (!item) return `<div class="route-img-placeholder"><span>—</span></div>`;
  if (item.imageUrl) {
    return `<img class="route-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.description)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
            <div class="route-img-placeholder" style="display:none"><span>Soon</span></div>`;
  }
  return `<div class="route-img-placeholder"><span>Soon</span></div>`;
}

function renderItems() {
  $('itemCount').textContent = `${state.items.length} item${state.items.length !== 1 ? 's' : ''} found`;
  $('itemsList').innerHTML = state.items.map(item => {
    const inRun = state.selected.has(item.id);
    const terms = (item.searchTerms || []).slice(0, 3);
    return `
      <article class="item-card">
        <div class="item-card-inner">
          <div class="item-img-wrap">${itemImageHtml(item)}</div>
          <div class="item-card-body">
            <div class="item-title">${escapeHtml(item.description)}</div>
            <div class="item-meta">
              <span class="pill">${escapeHtml(item.category)}</span>
              <span class="pill green">Confirmed Penny Item</span>
              ${item.imageSource === 'admin_upload' ? `<span class="pill teal">Verified item photo</span>` : ''}
              ${item.sku ? `<span class="sku-badge">SKU ${escapeHtml(item.sku)}</span>` : ''}
              ${item.dropDate ? `<span class="drop-badge">Drop ${escapeHtml(item.dropDate)}</span>` : ''}
            </div>
            <div class="search-terms-row">${terms.map(t => `<span class="term-chip" onclick="copyTermText('${escapeHtml(t)}')" title="Tap to copy">${escapeHtml(t)}</span>`).join('')}</div>
            <div class="item-actions">
              <button class="${inRun ? 'added-btn' : 'teal'}" onclick="addToRun('${item.id}')">${inRun ? 'Added ✓' : 'Add to My Run'}</button>
              <button class="secondary" onclick="copyTerm('${item.id}')">Copy Search</button>
            </div>
            <div class="item-quick-report hidden" id="qr_${item.id}">
              <span class="small muted">Quick report:</span>
              <div class="qr-buttons">
                <button class="success qr-btn" onclick="quickReportItem('${item.id}','penny')">Found $0.01</button>
                <button class="danger qr-btn" onclick="quickReportItem('${item.id}','normal')">Normal Price</button>
                <button class="secondary qr-btn" onclick="quickReportItem('${item.id}','not_found')">Couldn't Find</button>
              </div>
            </div>
            <button class="link-btn small" onclick="toggleQr('${item.id}')">Report result</button>
          </div>
        </div>
      </article>`;
  }).join('') || '<p class="muted" style="padding:16px">No items found. Try a different search or category.</p>';
}

function toggleQr(itemId) {
  const el = $(`qr_${itemId}`);
  if (el) el.classList.toggle('hidden');
}

async function quickReportItem(itemId, choice) {
  const storeId = state.stores[0]?.id || '';
  const payload = reportPayloadFromChoice(choice);
  payload.itemId = itemId;
  payload.storeId = storeId;
  payload.zip = state.homeZip;
  payload.notes = `Quick report from Penny List`;
  if (choice === 'penny') payload.priceSeen = '0.01';
  await api('/api/reports', { method: 'POST', body: JSON.stringify(payload) });
  await loadReports();
  state.stockRun = null;
  renderStockRouteResults();
  const el = $(`qr_${itemId}`);
  if (el) el.classList.add('hidden');
  alert(`Saved: ${statusLabel(choice)} for ${findItem(itemId)?.description || 'item'}`);
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
  if (!items.length) {
    $('selectedItems').innerHTML = '<p class="muted">No items in My Run yet. Go to Penny List and tap Add to My Run.</p>';
    return;
  }

  // Group by category
  const groups = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  $('selectedItems').innerHTML = Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0])).map(([cat, catItems]) => `
    <div class="run-group">
      <div class="run-group-header">${escapeHtml(cat)}</div>
      ${catItems.map(item => `
        <div class="run-item-card">
          <div class="run-item-img-wrap">${itemImageHtml(item)}</div>
          <div class="run-item-body">
            <div class="run-item-title">${escapeHtml(item.description)}</div>
            <div class="run-item-meta">
              ${item.sku ? `<span class="sku-badge">SKU ${escapeHtml(item.sku)}</span>` : ''}
              ${item.imageSource === 'admin_upload' ? `<span class="pill teal" style="font-size:11px;padding:3px 8px">Verified item photo</span>` : ''}
              <span class="term-chip" onclick="copyTermText('${escapeHtml(preferredSearchTerm(item))}')" title="Tap to copy">${escapeHtml(preferredSearchTerm(item))}</span>
            </div>
            <div class="run-report-buttons">
              <button class="success qr-btn" onclick="quickRunReport('${item.id}','penny')">Found $0.01</button>
              <button class="danger qr-btn" onclick="quickRunReport('${item.id}','normal')">Normal Price</button>
              <button class="secondary qr-btn" onclick="quickRunReport('${item.id}','not_found')">Couldn't Find</button>
              <button class="secondary qr-btn" onclick="quickRunReport('${item.id}','store_pulled')">Store Pulled</button>
              <button class="secondary qr-btn" onclick="quickRunReport('${item.id}','product_not_found')">Not in DT App</button>
              <button class="secondary qr-btn" onclick="copyTerm('${item.id}')">Copy Search</button>
              <button class="secondary qr-btn remove-btn" onclick="removeFromRun('${item.id}')">Remove</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function quickRunReport(itemId, choice) {
  const storeId = state.stores[0]?.id || '';
  const payload = reportPayloadFromChoice(choice);
  payload.itemId = itemId;
  payload.storeId = storeId;
  payload.zip = state.homeZip;
  payload.notes = `Hunt report from My Run`;
  if (choice === 'penny') payload.priceSeen = '0.01';
  await api('/api/reports', { method: 'POST', body: JSON.stringify(payload) });
  await loadReports();
  state.stockRun = null;
  renderStockRouteResults();
  alert(`Saved: ${statusLabel(choice)} for ${findItem(itemId)?.description || 'item'}`);
}

async function loadStores() {
  const data = await api(`/api/stores/lookup?zip=${encodeURIComponent(state.homeZip)}`);
  state.stores = data.stores;
  state.storeSource = data.source;
  state.storeMessage = data.message || '';
  state.storeLiveConnected = data.source === 'yext_live';
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
    <p class="small muted">Search this item in the Dollar Tree app, then log what you see below. Your report improves the Route Confidence score for this store.</p>
    <div class="actions">
      <button class="secondary" onclick="copyTerm('${item.id}')">Copy Search Term</button>
    </div>`;
}

async function loadReports() {
  const data = await api('/api/reports');
  state.reports = data.reports;
  renderReports();
  renderRouteBuilder();
  renderDashboard();
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
  state.stockRun = null;
  buildRouteView();
  renderStockRouteResults();
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

function latestReportFor(itemId, storeId) {
  return state.reports
    .filter(r => r.itemId === itemId && r.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function scoreStoreLocal(store) {
  const selectedIds = new Set([...state.selected.keys()]);
  const storeReports = state.reports.filter(r => r.storeId === store.id && selectedIds.has(r.itemId));
  if (!selectedIds.size) return { hasData: false, score: null, reason: 'Add items to My Run first.' };
  if (!storeReports.length) return { hasData: false, score: null, reason: 'No reports yet for your selected items at this store.' };

  let score = 45;
  const uniquePos = new Set();
  const uniqueNeg = new Set();
  for (const r of storeReports) {
    const ageHours = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
    const freshness = ageHours < 24 ? 1 : ageHours < 72 ? .7 : .35;
    if (r.scanResult === 'penny') { score += 22 * freshness; uniquePos.add(r.itemId); }
    if (r.appStatus === 'in_stock') { score += 10 * freshness; uniquePos.add(r.itemId); }
    if (r.appStatus === 'limited_stock') { score += 6 * freshness; uniquePos.add(r.itemId); }
    if (r.scanResult === 'normal') { score -= 14 * freshness; uniqueNeg.add(r.itemId); }
    if (r.appStatus === 'out_of_stock') { score -= 10 * freshness; uniqueNeg.add(r.itemId); }
    if (r.foundStatus === 'not_found') { score -= 10 * freshness; uniqueNeg.add(r.itemId); }
    if (r.foundStatus === 'store_pulled') { score -= 18 * freshness; uniqueNeg.add(r.itemId); }
  }
  score += Math.min(25, uniquePos.size * 7);
  score -= Math.min(20, uniqueNeg.size * 5);

  let reason = 'Score based on your saved app checks and scan reports.';
  if (uniquePos.size && !uniqueNeg.size) reason = `${uniquePos.size} selected item(s) have positive reports here.`;
  if (uniqueNeg.size && !uniquePos.size) reason = `${uniqueNeg.size} selected item(s) have bad/empty-shelf reports here.`;
  if (uniquePos.size && uniqueNeg.size) reason = `${uniquePos.size} positive and ${uniqueNeg.size} bad reports for selected items here.`;
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
      ? `<div class="route-score">${row.scoreInfo.score}<div class="small">Route Confidence</div></div>`
      : `<div class="route-score no-score">—<div class="small">No reports yet</div></div>`;
    return `
    <div class="route-row ${showBest?'best':''}">
      <div>
        <strong>${showBest?'Start here: ':''}${escapeHtml(row.store.name)} ${row.store.storeNumber ? '#' + escapeHtml(row.store.storeNumber) : ''}</strong>
        <div class="small">${escapeHtml(row.store.address)}, ${escapeHtml(row.store.city)}, ${escapeHtml(row.store.state)} ${escapeHtml(row.store.zip)}${Number.isFinite(row.store.distanceMiles) ? ' · ' + row.store.distanceMiles + ' mi from ' + escapeHtml(state.homeZip) : ''}</div>
        <div class="source-note">Stores: ${state.storeLiveConnected ? 'live Dollar Tree store locator' : 'starter directory'}</div>
        <div class="small">${row.matches.length ? escapeHtml(row.matches.join(' · ')) : escapeHtml(row.scoreInfo.reason)}</div>
      </div>
      ${scoreHtml}
    </div>`;
  }).join('');
  $('routeBuilder') && ($('routeBuilder').innerHTML = html || '<p class="muted">No stores loaded yet.</p>');
  $('dashboardRoute') && ($('dashboardRoute').innerHTML = html || '<p class="muted">No stores loaded yet.</p>');
}

async function checkStockForRun() {
  const itemIds = [...state.selected.keys()];
  if (!itemIds.length) {
    setMessage('stockStatus', 'Add items to My Run first, then build your route.', true);
    return;
  }
  setMessage('stockStatus', `Finding stores near ZIP ${state.homeZip} and building route for ${itemIds.length} item(s)...`);
  try {
    const data = await api('/api/stock/check-run', {
      method: 'POST',
      body: JSON.stringify({ zip: state.homeZip, itemIds })
    });
    state.stockRun = data;
    setMessage('stockStatus', data.message || 'Route built.');
    renderStockRouteResults();
    renderDashboard();
  } catch (e) {
    setMessage('stockStatus', e.message, true);
  }
}

function statusClassForStock(status) {
  if (status === 'penny_found' || status === 'in_stock') return 'green';
  if (status === 'limited_stock' || status === 'product_not_found') return 'gold';
  if (['out_of_stock', 'normal_price', 'not_found', 'store_pulled'].includes(status)) return 'red';
  return '';
}

function renderStockRouteResults() {
  const box = $('stockRouteResults');
  if (!box) return;
  const selected = [...state.selected.values()];
  $('routeZipLabel') && ($('routeZipLabel').textContent = state.homeZip);
  $('routeItemCount') && ($('routeItemCount').textContent = selected.length);
  if (!selected.length) {
    box.innerHTML = '<p class="muted">Add items to My Run first. Then tap Build My Penny Route.</p>';
    return;
  }
  if (!state.stockRun) {
    box.innerHTML = `<div class="empty-stock-box">
      <h4>${selected.length} item(s) ready to route</h4>
      <p>Tap <strong>Build My Penny Route</strong>. Nearby Dollar Tree stores are pulled live. Route Confidence scores come from community scan reports and hunt results — "No reports yet" means nobody has checked this item at that store yet, not that it isn't there.</p>
    </div>`;
    return;
  }
  const storeNote = state.stockRun.storesLive
    ? '<div class="warning-note">Stores: live from Dollar Tree store locator. Route Confidence: community reports only — no live Dollar Tree inventory.</div>'
    : '<div class="warning-note">Stores: starter directory. Route Confidence: community reports only — no live Dollar Tree inventory.</div>';
  const providerNote = state.stockRun.provider === 'demo'
    ? '<div class="warning-note">Demo mode — results are not real inventory.</div>'
    : storeNote;
  const rows = (state.stockRun.route || []).map((row, idx) => {
    const scoreHtml = row.worthTheDrive === null
      ? '<div class="route-score no-score">—<div class="small">No reports yet</div></div>'
      : `<div class="route-score">${row.worthTheDrive}<div class="small">Route Confidence</div></div>`;
    const itemHtml = row.items.map(it => {
      const itemRef = [...state.selected.values()].find(i => i.id === it.itemId) || state.items.find(i => i.id === it.itemId);
      return `
      <div class="route-item-line">
        <div class="route-img-wrap">${routeItemImageHtml(itemRef)}</div>
        <div class="route-item-info"><strong>${escapeHtml(it.description)}</strong><span>${escapeHtml(it.reason || '')}</span></div>
        <span class="pill ${statusClassForStock(it.status)}">${escapeHtml(statusLabel(it.status))}</span>
      </div>`;
    }).join('');
    return `<div class="route-store-card ${idx === 0 && row.worthTheDrive !== null ? 'best' : ''}">
      <div class="route-store-head">
        <div>
          <h4>${idx === 0 && row.worthTheDrive !== null ? 'Start here: ' : ''}${escapeHtml(row.store.name)} ${row.store.storeNumber ? '#' + escapeHtml(row.store.storeNumber) : ''}</h4>
          <div class="small">${escapeHtml(row.store.address)}, ${escapeHtml(row.store.city)}, ${escapeHtml(row.store.state)} ${escapeHtml(row.store.zip)}${Number.isFinite(row.store.distanceMiles) ? ' · ' + row.store.distanceMiles + ' mi from ' + escapeHtml(state.homeZip) : ''}</div>
          <div class="small">${escapeHtml(row.scoreReason || '')}</div>
        </div>
        ${scoreHtml}
      </div>
      <div class="route-item-grid">${itemHtml}</div>
    </div>`;
  }).join('');
  box.innerHTML = providerNote + rows;
}

function buildRouteView() {
  const selected = [...state.selected.values()];
  $('routeZipLabel') && ($('routeZipLabel').textContent = state.homeZip);
  $('routeItemCount') && ($('routeItemCount').textContent = selected.length);
  const box = $('routeBuilderFull');
  if (!box) return;
  if (!selected.length) {
    box.innerHTML = '<p class="muted">Add items to My Run first.</p>';
    return;
  }
  const rows = state.stores.map(store => {
    const scoreInfo = scoreStoreLocal(store);
    return { store, scoreInfo };
  }).sort((a,b) => {
    if (a.scoreInfo.hasData && !b.scoreInfo.hasData) return -1;
    if (!a.scoreInfo.hasData && b.scoreInfo.hasData) return 1;
    if (a.scoreInfo.hasData && b.scoreInfo.hasData) return b.scoreInfo.score - a.scoreInfo.score;
    return (a.store.distanceMiles ?? 9999) - (b.store.distanceMiles ?? 9999);
  });
  box.innerHTML = rows.map((row, idx) => {
    const scoreHtml = row.scoreInfo.hasData
      ? `<div class="route-score">${row.scoreInfo.score}<div class="small">Route Confidence</div></div>`
      : `<div class="route-score no-score">—<div class="small">No reports yet</div></div>`;
    const itemGrid = selected.map(item => {
      const report = latestReportFor(item.id, row.store.id);
      const label = report ? (report.scanResult !== 'unknown' ? report.scanResult : (report.appStatus !== 'unknown' ? report.appStatus : report.foundStatus)) : 'no_data';
      const labelClass = label === 'penny' || label === 'in_stock' ? 'green' : (label === 'normal' || label === 'out_of_stock' || label === 'not_found' || label === 'store_pulled' ? 'gold' : '');
      return `<div class="route-item-line">
        <div class="route-img-wrap">${routeItemImageHtml(item)}</div>
        <div class="route-item-info"><strong>${escapeHtml(item.description)}</strong><span>Search: ${escapeHtml(preferredSearchTerm(item))}</span></div>
        <span class="pill ${labelClass}">${escapeHtml(statusLabel(label))}</span>
      </div>`;
    }).join('');
    return `<div class="route-store-card ${idx === 0 && row.scoreInfo.hasData ? 'best' : ''}">
      <div class="route-store-head">
        <div>
          <h4>${idx === 0 && row.scoreInfo.hasData ? 'Start here: ' : ''}${escapeHtml(row.store.name)} ${row.store.storeNumber ? '#' + escapeHtml(row.store.storeNumber) : ''}</h4>
          <div class="small">${escapeHtml(row.store.address)}, ${escapeHtml(row.store.city)}, ${escapeHtml(row.store.state)} ${escapeHtml(row.store.zip)}${Number.isFinite(row.store.distanceMiles) ? ' · ' + row.store.distanceMiles + ' mi from ' + escapeHtml(state.homeZip) : ''}</div>
          <div class="source-note">Stores: ${state.storeLiveConnected ? 'live Dollar Tree store locator' : 'starter directory'}</div>
          <div class="small">${escapeHtml(row.scoreInfo.reason)}</div>
        </div>
        ${scoreHtml}
      </div>
      <div class="route-item-grid">${itemGrid}</div>
    </div>`;
  }).join('');
}

function renderDashboard() {
  $('metricItems') && ($('metricItems').textContent = state.items.length);
  $('metricRun') && ($('metricRun').textContent = state.selected.size);
  $('metricReports') && ($('metricReports').textContent = state.reports.length);
  renderRouteBuilder();
}

async function copyTermText(text) {
  await navigator.clipboard.writeText(text).catch(() => {});
}

async function copyTerm(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  const term = preferredSearchTerm(item);
  await navigator.clipboard.writeText(term).catch(() => {});
  alert(`Copied: ${term}`);
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
      sku:$('adminSku').value, description:$('adminDescription').value,
      category:$('adminCategory').value, eventNumber:$('adminEvent').value,
      dropDate:$('adminDrop').value, source:$('adminSource').value,
      confidence:$('adminConfidence').value, searchTerms:$('adminSearchTerms').value
    };
    await api('/api/admin/items', { method:'POST', body: JSON.stringify(payload) });
    $('adminStatus').textContent = 'Item added.';
    ['adminSku','adminDescription','adminCategory','adminSearchTerms','adminEvent','adminDrop','adminSource'].forEach(id => $(id).value='');
    await loadItems();
  } catch(e) { $('adminStatus').textContent = e.message; }
}

async function adminEnrichImages(force = false) {
  const btn = $(force ? 'adminEnrichForceBtn' : 'adminEnrichImagesBtn');
  const status = $('adminEnrichStatus');
  if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }
  if (status) status.textContent = 'Checking Dollar Tree product catalog for all penny items. This can take up to 60 seconds…';
  try {
    const data = await api('/api/admin/enrich-images', { method: 'POST', body: JSON.stringify({ force }) });
    const db = await api('/api/admin/image-debug');
    const lines = [
      `✅ Done on THIS server (${escapeHtml(db.dbPath)})`,
      `Images now saved on this server: ${db.withImage} of ${db.total} items`,
      `New images added this run: ${data.found} | Not in DT catalog: ${data.notFound} | Skipped: ${data.skipped}`,
    ];
    if (data.errors) lines.push(`Errors: ${data.errors}`);
    if (data.foundItems?.length) lines.push('Added: ' + data.foundItems.map(i => escapeHtml(i.description)).join(' · '));
    if (status) status.innerHTML = lines.join('<br>');
    await loadItems();
  } catch(e) {
    if (status) status.textContent = 'Error: ' + e.message;
  }
  if (btn) { btn.disabled = false; btn.textContent = force ? 'Force Refresh All' : 'Find Product Images'; }
}

async function adminDebugImages() {
  const btn = $('adminImageDebugBtn');
  const panel = $('adminImageDebugPanel');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    const d = await api('/api/admin/image-debug');
    const checkRows = d.imageChecks.map(c => {
      const color = c.ok ? '#157347' : '#b42318';
      const label = c.ok ? `HTTP ${c.httpStatus} ✓` : `HTTP ${c.httpStatus} ✗`;
      return `<div style="margin:6px 0;font-size:12px">
        <strong style="color:${color}">${label}</strong> — SKU ${escapeHtml(c.sku)} ${escapeHtml(c.description)}<br>
        <span style="color:#60707a;word-break:break-all">${escapeHtml(c.url)}</span>
        ${c.ok ? `<br><img src="${escapeHtml(c.url)}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:4px" onerror="this.outerHTML='<span style=color:red>image failed to render</span>'" />` : ''}
      </div>`;
    }).join('');
    panel.innerHTML = `
      <div style="background:#f6fafb;border:1px solid #d8e1e6;border-radius:14px;padding:14px">
        <strong>Image Debug — ${escapeHtml(d.dbPath)}</strong><br>
        <span style="font-size:13px">Total items: ${d.total} &nbsp;|&nbsp; With image: <strong style="color:#157347">${d.withImage}</strong> &nbsp;|&nbsp; Missing image: <strong style="color:#b42318">${d.withoutImage}</strong></span>
        <div style="margin-top:10px"><strong>First ${d.imageChecks.length} image URLs (live HTTP check):</strong>${checkRows || '<p style="color:#60707a">No images saved on this server yet.</p>'}</div>
        ${d.allFound.length ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px">All ${d.allFound.length} items with images</summary><div style="font-size:11px;margin-top:6px">${d.allFound.map(i => `<div>${escapeHtml(i.sku)} ${escapeHtml(i.description)}</div>`).join('')}</div></details>` : ''}
      </div>`;
    panel.classList.remove('hidden');
  } catch(e) {
    if (panel) { panel.textContent = 'Error: ' + e.message; panel.classList.remove('hidden'); }
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Debug Image Status'; }
}

// ── Admin photo upload ───────────────────────────────────────────────────────

let _uploadItemsCache = null;

async function initUploadSection() {
  if (!_uploadItemsCache) {
    const data = await api('/api/items');
    _uploadItemsCache = data.items;
  }
  filterUploadItems();
}

function filterUploadItems() {
  const q = ($('uploadSearch')?.value || '').toLowerCase().trim();
  const select = $('uploadItemSelect');
  if (!select || !_uploadItemsCache) return;
  const items = q
    ? _uploadItemsCache.filter(i => i.description.toLowerCase().includes(q) || (i.sku || '').includes(q))
    : _uploadItemsCache;
  select.innerHTML = items.length
    ? items.map(i => `<option value="${i.id}">${i.sku ? i.sku + ' — ' : ''}${escapeHtml(i.description)}</option>`).join('')
    : '<option value="">No items match</option>';
}

function resizeImageToDataUrl(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleUploadFileSelect() {
  const file = $('uploadFileInput')?.files?.[0];
  const preview = $('uploadPreview');
  if (!file || !preview) return;
  preview.innerHTML = '<span class="small muted">Resizing image…</span>';
  preview.dataset.dataUrl = '';
  try {
    const dataUrl = await resizeImageToDataUrl(file);
    preview.innerHTML = `<img class="upload-preview-img" src="${escapeHtml(dataUrl)}" />`;
    preview.dataset.dataUrl = dataUrl;
  } catch(e) {
    preview.innerHTML = '<span class="small" style="color:#b42318">Could not read image</span>';
  }
}

async function adminUploadPhoto() {
  const select = $('uploadItemSelect');
  const preview = $('uploadPreview');
  const status = $('uploadStatus');
  const btn = $('uploadPhotoBtn');
  const itemId = select?.value;
  const dataUrl = preview?.dataset?.dataUrl;

  if (!itemId) { if (status) status.textContent = 'Select an item first.'; return; }
  if (!dataUrl) { if (status) status.textContent = 'Choose a photo first.'; return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
  if (status) status.textContent = 'Uploading…';
  try {
    const data = await api(`/api/admin/items/${encodeURIComponent(itemId)}/photo`, {
      method: 'POST',
      body: JSON.stringify({ imageData: dataUrl })
    });
    const where = data.storage === 'github'
      ? `Saved to GitHub (permanent). URL: ${data.item.imageUrl}`
      : `Saved locally (this server only — set GITHUB_TOKEN on Render for permanent storage). URL: ${data.item.imageUrl}`;
    if (status) status.textContent = `Photo attached to: ${data.item.description} — ${where}`;
    if (preview) { preview.innerHTML = ''; preview.dataset.dataUrl = ''; }
    if ($('uploadFileInput')) $('uploadFileInput').value = '';
    // Bust the cache so the updated item appears immediately
    _uploadItemsCache = null;
    await loadItems();
    await initUploadSection();
  } catch(e) {
    if (status) status.textContent = 'Error: ' + e.message;
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Upload Photo'; }
}

async function adminBulkImport() {
  const rows = $('adminImportRows').value.trim();
  if (!rows) { $('adminImportStatus').textContent = 'Paste rows first.'; return; }
  try {
    const data = await api('/api/admin/import', { method:'POST', body: JSON.stringify({ rows }) });
    const s = data.summary;
    $('adminImportStatus').textContent = `Done. Before: ${s.totalBefore} → After: ${s.totalAfter} | Added: ${s.added} | Updated: ${s.updated} | Skipped (dup): ${s.skippedDuplicate}`;
    $('adminImportRows').value = '';
    await loadItems();
  } catch(e) { $('adminImportStatus').textContent = e.message; }
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

// ── Today's Hunt Map ─────────────────────────────────────────────────────────

const NOTE_PRESETS = [
  'No scanner', 'Has price checker', 'Found penny items',
  'Cleaned out', 'Employee pulled items', 'Worth returning'
];

const huntMap = { instance: null, markers: {}, initialized: false };
let huntEditingStore = null;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getHuntState() {
  return JSON.parse(localStorage.getItem(`dtpr_hunt_${todayStr()}`) || '{}');
}
function saveHuntState(s) {
  localStorage.setItem(`dtpr_hunt_${todayStr()}`, JSON.stringify(s));
}
function getStoreNotes() {
  return JSON.parse(localStorage.getItem('dtpr_store_notes') || '{}');
}
function saveStoreNotes(n) {
  localStorage.setItem('dtpr_store_notes', JSON.stringify(n));
}

function huntMarkerStyle(storeId) {
  const checked = getHuntState()[storeId]?.checked;
  return checked
    ? { radius: 11, color: '#0f5132', fillColor: '#198754', fillOpacity: 0.9, weight: 2 }
    : { radius: 10, color: '#0a253d', fillColor: '#154e8c', fillOpacity: 0.78, weight: 2 };
}

function makePopupHtml(store) {
  const checked = getHuntState()[store.id]?.checked;
  const notes = getStoreNotes()[store.id] || [];
  const mapsUrl = `https://www.google.com/maps?q=${store.latitude},${store.longitude}`;
  const notesHtml = notes.length
    ? `<div style="margin:5px 0 8px">${notes.map(n => `<span style="display:inline-block;background:#eef4f6;border-radius:4px;padding:2px 7px;margin:2px;font-size:11px">${escapeHtml(n)}</span>`).join('')}</div>`
    : '';
  return `<div style="min-width:210px;font-family:Arial,sans-serif;line-height:1.4">
    <strong>${escapeHtml(store.name)}${store.storeNumber ? ' #' + escapeHtml(store.storeNumber) : ''}</strong><br>
    <span style="font-size:12px;color:#60707a">${escapeHtml(store.address)}, ${escapeHtml(store.city)}, ${escapeHtml(store.state)}${Number.isFinite(store.distanceMiles) ? ' · ' + store.distanceMiles + ' mi' : ''}</span>
    ${notesHtml}
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:8px">
      <button onclick="checkStoreToday('${store.id}')"
        style="background:${checked ? '#157347' : '#0d2f4f'};color:white;border:none;border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;font-weight:700">
        ${checked ? '✓ Checked Today — Undo' : 'Mark Checked Today'}
      </button>
      <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener"
        style="display:block;text-align:center;background:#f0f4f6;color:#0d2f4f;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;text-decoration:none">
        Open in Google Maps
      </a>
    </div>
  </div>`;
}

function addHuntMarker(store) {
  if (!store.latitude || !store.longitude || !huntMap.instance) return;
  const marker = L.circleMarker([store.latitude, store.longitude], huntMarkerStyle(store.id))
    .addTo(huntMap.instance)
    .bindPopup(() => makePopupHtml(store), { maxWidth: 290 });
  huntMap.markers[store.id] = marker;
}

function updateHuntMarker(storeId) {
  const marker = huntMap.markers[storeId];
  if (!marker) return;
  marker.setStyle(huntMarkerStyle(storeId));
  if (marker.isPopupOpen()) {
    const store = state.stores.find(s => s.id === storeId);
    if (store) marker.getPopup().setContent(makePopupHtml(store));
  }
}

function initHuntMap() {
  const container = $('huntMapContainer');
  if (!container) return;
  if ($('huntZipLabel')) $('huntZipLabel').textContent = state.homeZip;

  if (typeof L === 'undefined') {
    container.innerHTML = '<p class="muted" style="padding:20px">Map library failed to load. Check your internet connection.</p>';
    return;
  }
  if (!state.stores.length) {
    container.innerHTML = '<p class="muted" style="padding:20px">Enter your ZIP above and tap Save ZIP to load nearby stores.</p>';
    renderHuntSummary();
    renderHuntStoreList();
    return;
  }

  if (huntMap.initialized) {
    // Re-sync markers if store list changed (e.g. new ZIP)
    const currentIds = state.stores.map(s => s.id).sort().join(',');
    const cachedIds = Object.keys(huntMap.markers).sort().join(',');
    if (currentIds !== cachedIds) {
      Object.values(huntMap.markers).forEach(m => m.remove());
      huntMap.markers = {};
      state.stores.forEach(store => addHuntMarker(store));
    } else {
      Object.keys(huntMap.markers).forEach(id => updateHuntMarker(id));
    }
    setTimeout(() => huntMap.instance?.invalidateSize(), 60);
    renderHuntSummary();
    renderHuntStoreList();
    return;
  }

  // First initialization
  const lats = state.stores.map(s => s.latitude).filter(Boolean);
  const lons = state.stores.map(s => s.longitude).filter(Boolean);
  const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const lon = lons.reduce((a, b) => a + b, 0) / lons.length;

  huntMap.instance = L.map('huntMapContainer').setView([lat, lon], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(huntMap.instance);

  huntMap.initialized = true;
  state.stores.forEach(store => addHuntMarker(store));
  setTimeout(() => huntMap.instance?.invalidateSize(), 100);
  renderHuntSummary();
  renderHuntStoreList();
}

function checkStoreToday(storeId) {
  const hunt = getHuntState();
  if (hunt[storeId]?.checked) {
    hunt[storeId] = { checked: false };
  } else {
    hunt[storeId] = { checked: true, checkedAt: new Date().toISOString() };
  }
  saveHuntState(hunt);
  updateHuntMarker(storeId);
  renderHuntSummary();
  renderHuntStoreList();
}

function renderHuntSummary() {
  const box = $('huntSummary');
  if (!box) return;
  const hunt = getHuntState();
  const total = state.stores.length;
  const checked = state.stores.filter(s => hunt[s.id]?.checked).length;
  const remaining = total - checked;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  box.innerHTML = `
    <div class="hunt-summary-grid">
      <div class="hunt-metric"><strong>${total}</strong><span>Nearby stores</span></div>
      <div class="hunt-metric checked"><strong>${checked}</strong><span>Checked today</span></div>
      <div class="hunt-metric"><strong>${remaining}</strong><span>Remaining</span></div>
    </div>
    <p class="small muted" style="margin-top:4px">${escapeHtml(today)} · ZIP ${escapeHtml(state.homeZip)}</p>`;
}

function toggleHuntNoteEdit(storeId) {
  huntEditingStore = huntEditingStore === storeId ? null : storeId;
  renderHuntStoreList();
  if (huntEditingStore) {
    const el = $(`hne_${huntEditingStore}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

function saveStoreNoteEdit(storeId) {
  const panel = $(`hne_${storeId}`);
  if (!panel) return;
  const presets = [...panel.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
  const custom = panel.querySelector('.hunt-custom-input')?.value?.trim();
  if (custom) presets.push(custom);
  const allNotes = getStoreNotes();
  allNotes[storeId] = presets;
  saveStoreNotes(allNotes);
  huntEditingStore = null;
  updateHuntMarker(storeId);
  renderHuntStoreList();
}

function renderHuntStoreList() {
  const box = $('huntStoreList');
  if (!box) return;
  if (!state.stores.length) {
    box.innerHTML = '<p class="muted">No stores loaded yet.</p>';
    return;
  }
  const hunt = getHuntState();
  const allNotes = getStoreNotes();
  // Unchecked first, then checked; within each group sort by distance
  const sorted = [...state.stores].sort((a, b) => {
    const ca = hunt[a.id]?.checked ? 1 : 0;
    const cb = hunt[b.id]?.checked ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
  });

  box.innerHTML = sorted.map(store => {
    const checked = hunt[store.id]?.checked;
    const checkedAt = hunt[store.id]?.checkedAt;
    const notes = allNotes[store.id] || [];
    const editing = huntEditingStore === store.id;
    const mapsUrl = `https://www.google.com/maps?q=${store.latitude},${store.longitude}`;
    const timeStr = checkedAt
      ? new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const existingCustom = notes.find(n => !NOTE_PRESETS.includes(n)) || '';

    const noteChips = notes.length
      ? `<div class="hunt-note-chips">${notes.map(n => `<span class="note-chip">${escapeHtml(n)}</span>`).join('')}</div>`
      : '';

    const editPanel = `
      <div class="hunt-note-edit ${editing ? '' : 'hidden'}" id="hne_${store.id}">
        <div class="note-preset-grid">
          ${NOTE_PRESETS.map(p => `<label class="note-preset-label">
            <input type="checkbox" value="${escapeHtml(p)}" ${notes.includes(p) ? 'checked' : ''}>
            ${escapeHtml(p)}
          </label>`).join('')}
        </div>
        <input class="hunt-custom-input" type="text"
          placeholder="Custom note…"
          value="${escapeHtml(existingCustom)}" />
        <button class="teal" onclick="saveStoreNoteEdit('${store.id}')" style="margin-top:8px">Save Notes</button>
      </div>`;

    return `<div class="hunt-store-card ${checked ? 'checked' : ''}" id="hsc_${store.id}">
      <div class="hunt-store-head">
        <div>
          <strong>${escapeHtml(store.name)}${store.storeNumber ? ' #' + escapeHtml(store.storeNumber) : ''}</strong>
          <div class="small">${escapeHtml(store.address)}, ${escapeHtml(store.city)}, ${escapeHtml(store.state)}${Number.isFinite(store.distanceMiles) ? ' · ' + store.distanceMiles + ' mi' : ''}</div>
        </div>
        <span class="pill ${checked ? 'green' : ''}" style="white-space:nowrap;flex-shrink:0">
          ${checked ? 'Checked' + (timeStr ? ' ' + timeStr : '') : 'Not checked'}
        </span>
      </div>
      ${noteChips}
      <div class="hunt-store-actions">
        <button class="${checked ? 'secondary' : 'teal'}" onclick="checkStoreToday('${store.id}')">
          ${checked ? 'Uncheck' : 'Mark Checked'}
        </button>
        <button class="secondary" onclick="toggleHuntNoteEdit('${store.id}')">
          ${editing ? 'Cancel' : notes.length ? 'Edit Notes' : 'Add Notes'}
        </button>
        <a class="button-link secondary" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Google Maps</a>
      </div>
      ${editPanel}
    </div>`;
  }).join('');
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  $('saveZipBtn').addEventListener('click', saveZip);
  $('itemSearch').addEventListener('input', () => loadItems());
  $('saveHuntBtn').addEventListener('click', saveHunt);
  $('checkStockRunBtn')?.addEventListener('click', checkStockForRun);
  $('quickItem').addEventListener('change', renderCheckHelper);
  $('quickStore').addEventListener('change', renderCheckHelper);
  $('signupBtn').addEventListener('click', signup);
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  $('adminAddItemBtn').addEventListener('click', adminAddItem);
  $('adminImportBtn')?.addEventListener('click', adminBulkImport);
  $('adminEnrichImagesBtn')?.addEventListener('click', () => adminEnrichImages(false));
  $('adminEnrichForceBtn')?.addEventListener('click', () => adminEnrichImages(true));
  $('adminImageDebugBtn')?.addEventListener('click', adminDebugImages);
  $('uploadSearch')?.addEventListener('input', filterUploadItems);
  $('uploadFileInput')?.addEventListener('change', handleUploadFileSelect);
  $('uploadPhotoBtn')?.addEventListener('click', adminUploadPhoto);
}

async function init() {
  $('homeZip').value = state.homeZip;
  renderCategoryChips();
  bindEvents();
  await loadMe();
  await loadItems();
  restoreSelectedLocal();
  await loadStores();
  await loadReports();
  renderSelected();
  renderQuickSelectors();
  renderDashboard();
  buildRouteView();
  renderStockRouteResults();
}

init().catch(err => {
  console.error(err);
  alert('App failed to load: ' + err.message);
});
