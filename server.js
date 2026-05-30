const express = require('express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.STORAGE_PATH || process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'dtpennyroute-db.json');

app.use(express.json({ limit: '2mb' }));
app.use(cookieSession({
  name: 'dtpr_session',
  keys: [process.env.SESSION_SECRET || 'dev-change-this-before-public-launch'],
  maxAge: 1000 * 60 * 60 * 24 * 30,
  sameSite: 'lax'
}));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function seedItems() {
  return [
    { sku:'328203', description:'NAVY DBL GLD 8X10', category:'Home / Decor', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['navy gold 8x10','navy 8x10'] },
    { sku:'359319', description:'BOXED CANDLE SOOTHING', category:'Home / Candle', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['boxed candle soothing','soothing candle'] },
    { sku:'375667', description:'3OZ CLR DIAMND JAR W PVC LID', category:'Home / Storage', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['clear diamond jar','3 oz jar pvc lid'] },
    { sku:'377016', description:'RAIN UMBRELLA 9.5', category:'Apparel', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['rain umbrella','umbrella'] },
    { sku:'382583', description:'MDAY POWER BODY MASSAGER', category:'Beauty & Eyewear', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['power body massager','body massager'] },
    { sku:'380864', description:'ESSENTIA WATER 500ML', category:'Beverages', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['essentia water','essentia 500ml'] },
    { sku:'237438', description:'EDUCATIONAL SPINNER', category:'Books & Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['educational spinner'] },
    { sku:'357097', description:'PLAYSCHOOL PRE-K FLASH CARDS', category:'Books & Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['playschool flash cards','pre k flash cards'] },
    { sku:'357098', description:'MULTI LICENSED FLASH CARDS', category:'Books & Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['licensed flash cards','flash cards'] },
    { sku:'375902', description:'POP ART FOIL ADVANCED COLORING', category:'Books & Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['pop art foil coloring','advanced coloring'] },
    { sku:'387913', description:'ADVANCED COLORING BOOK 11X14', category:'Books & Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['advanced coloring book','11x14 coloring book'] },
    { sku:'341109', description:'WH SOUR TAFFY BARS LD 3.59Z E', category:'Candy-NonChoc/Seasonal', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['sour taffy bars','taffy bars'] },
    { sku:'380107', description:'INVISIBLE LIGHT PEN CS 2IN1', category:'Checkouts', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['invisible light pen','2 in 1 pen'] },
    { sku:'252595', description:'CRFTSQ CHERSH LOV & BLIVE STKR', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['cherish love believe sticker','crafter square sticker'] },
    { sku:'267670', description:'STENCIL BRUSH STRAIGHT HANDLE', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['stencil brush','straight handle stencil brush'] },
    { sku:'300761', description:'DNU FELT LETTER AND NUMBERS', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['felt letters numbers','felt letter and numbers'] },
    { sku:'299788', description:'LED BULB 75W EQ A19 1PK', category:'Electronics', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['led bulb 75w','a19 led bulb'] },
    { sku:'378462', description:'SILVER AAA2 DOLLAR TREE TRAY', category:'Electronics', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['silver aaa batteries','aaa2 dollar tree tray'] },
    { sku:'344553', description:'PEACH FRUIT STEM ARTIFCL 21IN', category:'Floral', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['peach fruit stem','artificial peach stem'] },
    { sku:'252480', description:'MAGNETS KITCHEN THEMED', category:'Home Decor', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['kitchen magnets','kitchen themed magnets'] },
    { sku:'367396', description:'BATHROOM CLEANER 3PK', category:'Household Consumables', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['bathroom cleaner 3pk','bathroom cleaner'] },
    { sku:'355110', description:'SCRUB BUD DRY FLOOR CLOTH 15PK', category:'Household Products', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['scrub bud dry floor cloth','dry floor cloth'] },
    { sku:'327645', description:'BLUE FLORAL MUG 12Z', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['blue floral mug','floral mug','12 oz mug'] },
    { sku:'343933', description:'SOFT GREEN DINNER PLT 10.5IN', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['soft green dinner plate','green dinner plate'] },
    { sku:'344034', description:'SOFT GREEN FLORAL PLATE 10.5', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['soft green floral plate','green floral plate'] },
    { sku:'939567', description:'ROSE PETALS WHITE 300CT', category:'Party Celebrations', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['white rose petals','rose petals 300ct'] },
    { sku:'219215', description:'GIFTBOX AO BUTTERFLY', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['butterfly gift box','giftbox butterfly'] },
    { sku:'219216', description:'GIFTBOX AO BASKET W/HANDLE', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['basket gift box','gift box with handle'] },
    { sku:'379958', description:'GIFTBAG XL BABY GENERAL', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['xl baby gift bag','baby gift bag'] },
    { sku:'380311', description:'GIFTBAG BOTTLE ALL OCC GEN', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['bottle gift bag','all occasion bottle gift bag'] },
    { sku:'382956', description:'GIFTBAG LRG AO JUVI', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['large juvenile gift bag','juvi gift bag'] },
    { sku:'383026', description:'GIFTBAG LG ALL OCCASION FLORA', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['large floral gift bag','all occasion floral gift bag'] },
    { sku:'383145', description:'CORAL 13X8 TRAY', category:'Party Paper', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['coral tray','13x8 tray'] },
    { sku:'304352', description:'PURE SILK 3BL RZR 2CT', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['pure silk razor','pure silk razors'] },
    { sku:'355583', description:'AD WIG CAP 3PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['wig cap 3pk','wig cap'] },
    { sku:'356211', description:'SC WAVE CAP 3PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['wave cap 3pk','wave cap'] },
    { sku:'381309', description:'BIC SENSITIVE 3BLD 1PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['bic sensitive razor','bic sensitive'] },
    { sku:'307619', description:'PROTECTIVE WRAP 4X300IN', category:'Stationery', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['protective wrap','4x300 protective wrap'] },
    { sku:'366951', description:'METAL PEARL BALLPOINT PEN 1PC', category:'Stationery', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['metal pearl ballpoint pen','pearl pen'] },
    { sku:'317809', description:'BARBIE PURSES / SHOES / ACCS', category:'Toys Everyday', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['barbie purses shoes accessories','barbie accessories'] },
    { sku:'', description:'POWER STICK ROLL-ON ALUMINUM FREE DEODORANT 1.8 OZ', category:'Beauty', eventNumber:'', dropDate:'2026-05-05', source:'internet list + field confirmed by Anthony', confidence:'field-confirmed', status:'active', searchTerms:['power stick deodorant','aluminum free deodorant'] },
    { sku:'', description:'SASSY + CHIC NAIL POLISH 0.44 OZ COLORS 911 / 943', category:'Beauty', eventNumber:'', dropDate:'2026-05-05', source:'internet list + field confirmed by Anthony', confidence:'field-confirmed', status:'active', searchTerms:['sassy chic nail polish','nail polish 911','nail polish 943'] },
    { sku:'', description:'BRAIN FREEZE FREEZE-DRIED CANDY 0.88 OZ', category:'Food / Candy', eventNumber:'', dropDate:'2026-05-05', source:'internet list + field confirmed by Anthony', confidence:'field-confirmed', status:'active', searchTerms:['freeze dried candy','brain freeze candy'] },
    { sku:'', description:'COASTAL BAY CONFECTIONS BUBBLE GUM 5.5 OZ', category:'Food / Candy', eventNumber:'', dropDate:'2026-05-05', source:'internet list + field confirmed by Anthony', confidence:'field-confirmed', status:'active', searchTerms:['coastal bay bubble gum','bubble gum'] },
    { sku:'', description:'TIC TAC CHEWY SOUR ADVENTURE CANDIES 2.8 OZ', category:'Food / Candy', eventNumber:'', dropDate:'2026-05-05', source:'internet list', confidence:'medium', status:'active', searchTerms:['tic tac chewy sour','sour adventure candies'] }
  ].map((item, index) => ({ id: `item_${String(index + 1).padStart(4, '0')}`, ...item }));
}


const STORE_DIRECTORY = [
  { id:'store_4807', storeNumber:'4807', name:'Dollar Tree - Deptford Crossings', address:'1800 Clements Bridge Rd', city:'Woodbury', state:'NJ', zip:'08096', latitude:39.8397, longitude:-75.1177 },
  { id:'store_deptford_hurffville', storeNumber:'', name:'Dollar Tree - Deptford / Hurffville Rd', address:'1360 Hurffville Rd Unit 2', city:'Deptford', state:'NJ', zip:'08096', latitude:39.8204, longitude:-75.0950 },
  { id:'store_9091', storeNumber:'9091', name:'Dollar Tree - Woodbury', address:'529 N Evergreen Ave', city:'Woodbury', state:'NJ', zip:'08096', latitude:39.8478, longitude:-75.1470 },
  { id:'store_1652', storeNumber:'1652', name:'Dollar Tree - Mantua Pike', address:'736 Mantua Pike', city:'Woodbury', state:'NJ', zip:'08096', latitude:39.8126, longitude:-75.1702 },
  { id:'store_blackwood', storeNumber:'', name:'Dollar Tree - Blackwood', address:'1001 S Black Horse Pike Unit 2B', city:'Blackwood', state:'NJ', zip:'08012', latitude:39.7849, longitude:-75.0550 },
  { id:'store_runnemede', storeNumber:'', name:'Dollar Tree - Runnemede / Acme Plaza', address:'611 E Evesham Rd', city:'Runnemede', state:'NJ', zip:'08078', latitude:39.8567, longitude:-75.0668 },
  { id:'store_bellmawr', storeNumber:'', name:'Dollar Tree - Bellmawr', address:'42 N Black Horse Pike', city:'Bellmawr', state:'NJ', zip:'08031', latitude:39.8672, longitude:-75.0947 },
  { id:'store_turnersville', storeNumber:'', name:'Dollar Tree - Turnersville Area', address:'Black Horse Pike Area', city:'Turnersville', state:'NJ', zip:'08012', latitude:39.7730, longitude:-75.0470 },
  { id:'store_sicklerville', storeNumber:'', name:'Dollar Tree - Sicklerville Area', address:'Sicklerville Area', city:'Sicklerville', state:'NJ', zip:'08081', latitude:39.7170, longitude:-74.9690 },
  { id:'store_cherry_hill', storeNumber:'', name:'Dollar Tree - Cherry Hill Area', address:'Cherry Hill Area', city:'Cherry Hill', state:'NJ', zip:'08002', latitude:39.9348, longitude:-75.0310 },
  { id:'store_mount_lauren', storeNumber:'', name:'Dollar Tree - Mount Laurel Area', address:'Mount Laurel Area', city:'Mount Laurel', state:'NJ', zip:'08054', latitude:39.9340, longitude:-74.8910 },

  // New York / Queens starter stores for ZIP 11385 testing
  { id:'store_middle_village', storeNumber:'', name:'Dollar Tree - Middle Village', address:'7802 Metropolitan Avenue', city:'Middle Village', state:'NY', zip:'11379', latitude:40.7132, longitude:-73.8765 },
  { id:'store_maspeth_4587', storeNumber:'4587', name:'Dollar Tree - Maspeth / Grand Ave', address:'69-10 Grand Ave', city:'Maspeth', state:'NY', zip:'11378', latitude:40.7280, longitude:-73.8940 },
  { id:'store_woodside_tower', storeNumber:'', name:'Dollar Tree - Tower Square', address:'51-02 Northern Blvd', city:'Woodside', state:'NY', zip:'11377', latitude:40.7531, longitude:-73.9121 },
  { id:'store_woodside_big6', storeNumber:'', name:'Dollar Tree - Big 6', address:'63-14 Queens Blvd', city:'Woodside', state:'NY', zip:'11377', latitude:40.7405, longitude:-73.9020 },
  { id:'store_east_new_york_van_sinderen', storeNumber:'', name:'Dollar Tree - Van Sinderen Ave', address:'679 Van Sinderen Ave', city:'Brooklyn', state:'NY', zip:'11207', latitude:40.6634, longitude:-73.9008 },
  { id:'store_brooklyn_utica_d', storeNumber:'', name:'Dollar Tree - Utica & D', address:'1253 Utica Ave', city:'Brooklyn', state:'NY', zip:'11203', latitude:40.6419, longitude:-73.9290 },
  { id:'store_brooklyn_remsen', storeNumber:'', name:'Dollar Tree - Remsen Ave', address:'533 Remsen Ave', city:'Brooklyn', state:'NY', zip:'11236', latitude:40.6502, longitude:-73.9190 },
  { id:'store_flushing_francis_lewis', storeNumber:'', name:'Dollar Tree - Francis Lewis Billiards', address:'34-45 Francis Lewis Blvd', city:'Flushing', state:'NY', zip:'11358', latitude:40.7650, longitude:-73.7892 }
];

const ZIP_COORDS = {
  '08096': { latitude:39.8268, longitude:-75.1238 },
  '08080': { latitude:39.7476, longitude:-75.0890 },
  '08012': { latitude:39.7849, longitude:-75.0550 },
  '08078': { latitude:39.8523, longitude:-75.0671 },
  '08031': { latitude:39.8676, longitude:-75.0946 },
  '08081': { latitude:39.7170, longitude:-74.9690 },
  '08002': { latitude:39.9348, longitude:-75.0310 },
  '08054': { latitude:39.9340, longitude:-74.8910 },
  '19148': { latitude:39.9170, longitude:-75.1570 },
  '19145': { latitude:39.9135, longitude:-75.1820 },

  // NYC / Queens starter ZIPs
  '11385': { latitude:40.7044, longitude:-73.9018 },
  '11379': { latitude:40.7174, longitude:-73.8790 },
  '11378': { latitude:40.7245, longitude:-73.8990 },
  '11377': { latitude:40.7446, longitude:-73.9066 },
  '11207': { latitude:40.6700, longitude:-73.8950 },
  '11236': { latitude:40.6406, longitude:-73.9020 }
};

function milesBetween(aLat, aLon, bLat, bLon) {
  const R = 3958.8;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x = Math.sin(dLat/2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function storesForZip(zip) {
  const cleanZip = String(zip || '08096').slice(0,5);
  const center = ZIP_COORDS[cleanZip] || ZIP_COORDS['08096'];
  return STORE_DIRECTORY
    .map(store => ({
      ...store,
      distanceMiles: Number(milesBetween(center.latitude, center.longitude, store.latitude, store.longitude).toFixed(1))
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 7);
}

function buildFallbackStoreLookup(zip) {
  const cleanZip = String(zip || '08096').replace(/\D/g, '').slice(0, 5) || '08096';
  const mapped = Boolean(ZIP_COORDS[cleanZip]);
  const stores = storesForZip(cleanZip).map(store => ({
    ...store,
    source: mapped ? 'starter_zip_directory' : 'starter_fallback_directory'
  }));
  return {
    zip: cleanZip,
    stores,
    mapped,
    source: mapped ? 'starter_zip_directory' : 'starter_fallback_directory',
    liveConnected: false,
    message: mapped
      ? `Using starter store directory for ${cleanZip}. Live store lookup will retry on next request.`
      : `ZIP ${cleanZip} is not in the starter directory. Showing nearest stores — add your ZIP area to get better coverage.`
  };
}

async function lookupDollarTreeStoresLive(zip) {
  // STORE LOCATOR: Yext powers locations.dollartree.com. The API key below is their
  // embedded Yext "live API key" (read-only, public in their JS bundle at
  // locations.dollartree.com/assets/static/dollartree-CYzSknic.js). It returns the
  // same store list that locations.dollartree.com shows. This is the default connector.
  // Set STORE_PROVIDER=off to skip Yext and use only the static fallback directory.
  //
  // STOCK STATUS (not connected): No accessible public API was found.
  // - dollartree.com/ccstoreui/v1/stockStatus returns HTTP 204 (no data) for all SKU+store combos.
  // - In-store inventory lives in a private POS system, not the web storefront.
  // - sameday.dollartree.com (Instacart) requires user authentication.
  // - The "In Stock / Limited Stock / Out of Stock / Product Not Found" that the DT
  //   mobile app shows comes from a private authenticated API not accessible to third parties.
  // See lookupDollarTreeItemStockLive() below for the stock side of this story.

  if (process.env.STORE_PROVIDER === 'off') return null;

  try {
    const params = new URLSearchParams({
      input: zip,
      experienceKey: 'pages-locator-usa-only',
      api_key: '7a860787290ef5396ebe3ffe229d96c3',
      v: '20220511',
      version: 'PRODUCTION',
      locale: 'en',
      'verticals[dollar-tree-usa][limit]': '10'
    });

    const res = await fetch(`https://liveapi.yext.com/v2/accounts/me/answers/query?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const results = (data?.response?.modules || []).find(m => m.verticalConfigId === 'dollar-tree-usa')?.results || [];
    if (!results.length) return null;

    const stores = results.map(r => {
      const d = r.data;
      const coord = d.yextDisplayCoordinate || d.cityCoordinate || {};
      const distMeters = typeof r.distanceFromFilter === 'number' ? r.distanceFromFilter : null;
      return {
        id: `store_${d.id}`,
        storeNumber: String(d.id),
        name: `Dollar Tree - ${d.address?.city || 'Store'}`,
        address: d.address?.line1 || '',
        city: d.address?.city || '',
        state: d.address?.region || '',
        zip: (d.address?.postalCode || '').slice(0, 5),
        latitude: coord.latitude || 0,
        longitude: coord.longitude || 0,
        distanceMiles: distMeters !== null ? Number((distMeters / 1609.34).toFixed(1)) : null,
        source: 'yext_live'
      };
    }).filter(s => s.latitude && s.longitude);

    if (!stores.length) return null;
    return {
      zip,
      stores,
      mapped: true,
      source: 'yext_live',
      liveConnected: true,
      message: `${stores.length} Dollar Tree stores near ${zip} — live from Dollar Tree store locator.`
    };
  } catch (err) {
    console.error('Yext store lookup failed:', err.message);
    return null;
  }
}

async function lookupStoresForZip(zip) {
  const cleanZip = String(zip || '08096').replace(/\D/g, '').slice(0, 5) || '08096';
  const db = readDb();
  db.storeCache = db.storeCache || {};

  const cached = db.storeCache[cleanZip];
  const cachedAgeHours = cached ? (Date.now() - new Date(cached.updatedAt).getTime()) / 3600000 : Infinity;
  if (cached && cachedAgeHours < 6) {
    return { ...cached, cached: true };
  }

  const live = await lookupDollarTreeStoresLive(cleanZip);
  const result = live || buildFallbackStoreLookup(cleanZip);
  result.updatedAt = new Date().toISOString();
  result.cached = false;

  db.storeCache[cleanZip] = result;
  writeDb(db);
  return result;
}

function initialDb() {
  return {
    createdAt: new Date().toISOString(),
    users: [],
    items: seedItems(),
    reports: [],
    huntLists: [],
    storeCache: {},
    stores: storesForZip('08096')
  };
}

function readDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) writeDb(initialDb());
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, paid: !!user.paid };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

function requireUser(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
  next();
}

function scoreItem(itemId, reports) {
  // Starter database items are verified/known penny leads for this first launch.
  // Community reports will make this dynamic again in a later update.
  return 100;
}
function scoreStore(storeId, reports) {
  const storeReports = reports.filter(r => r.storeId === storeId);
  let score = 40;
  for (const r of storeReports) {
    const ageHours = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
    const freshness = ageHours < 24 ? 1 : ageHours < 72 ? 0.7 : 0.35;
    if (r.scanResult === 'penny') score += 12 * freshness;
    if (r.scanResult === 'normal') score -= 6 * freshness;
    if (r.foundStatus === 'not_found') score -= 7 * freshness;
    if (r.foundStatus === 'store_pulled') score -= 12 * freshness;
    if (r.appStatus === 'in_stock') score += 5 * freshness;
    if (r.appStatus === 'limited_stock') score += 2 * freshness;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}



function deterministicDemoStock(zip, store, item) {
  const seed = crypto.createHash('md5').update(`${zip}|${store.id}|${item.id}`).digest('hex');
  const n = parseInt(seed.slice(0, 2), 16) % 100;
  if (n < 18) return { status: 'in_stock', confidence: 'demo', reason: 'Demo mode estimate only - not live Dollar Tree inventory.' };
  if (n < 32) return { status: 'limited_stock', confidence: 'demo', reason: 'Demo mode estimate only - not live Dollar Tree inventory.' };
  if (n < 45) return { status: 'out_of_stock', confidence: 'demo', reason: 'Demo mode estimate only - not live Dollar Tree inventory.' };
  return { status: 'no_data', confidence: 'demo', reason: 'No demo signal for this item/store.' };
}

async function lookupDollarTreeItemStockLive({ zip, store, item }) {
  // INVESTIGATION RESULT (2026-05-30): No accessible public stock API exists.
  //
  // What was tested:
  //   dollartree.com/ccstoreui/v1/stockStatus?skuId=377016&locationIds=9091
  //     → HTTP 204 No Content for every SKU+store combination tested.
  //       OCC tracks online-order inventory only; in-store stock is a separate system.
  //   dollartree.com/ccstoreui/v1/products?q=displayName+co+"RAIN UMBRELLA"
  //     → Works, returns product IDs. Confirms SKU 377016 = "RAIN UMBRELLA 9.5".
  //       Product catalog only — no stock levels.
  //   sameday.dollartree.com (Instacart-powered same-day delivery)
  //     → Requires user authentication. Not callable from a backend.
  //   Dollar Tree mobile app stock status (In Stock / Limited / Out / Not Found)
  //     → Uses a private authenticated API. No accessible endpoint found.
  //       No public subdomain (api., mobile., app., gateway., services.) responds.
  //
  // Bottom line: live per-store stock lookup is not possible without authenticated
  // access to Dollar Tree's internal inventory system or Instacart's private API.
  // Community/manual reports (the quickReport buttons) are the correct data source
  // until Dollar Tree publishes a partner API or a clean authorized path is found.
  return null;
}

function latestReportForItemStore(reports, itemId, storeId) {
  return reports
    .filter(r => r.itemId === itemId && r.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function reportToStockSignal(report) {
  if (!report) return null;
  if (report.scanResult === 'penny') return { status: 'penny_found', confidence: 'community', reason: 'User/community report: scanned $0.01.' };
  if (report.scanResult === 'normal') return { status: 'normal_price', confidence: 'community', reason: 'User/community report: scanned normal price.' };
  if (report.appStatus === 'in_stock') return { status: 'in_stock', confidence: 'community', reason: 'User/community report: app showed in stock.' };
  if (report.appStatus === 'limited_stock') return { status: 'limited_stock', confidence: 'community', reason: 'User/community report: app showed limited stock.' };
  if (report.appStatus === 'out_of_stock') return { status: 'out_of_stock', confidence: 'community', reason: 'User/community report: app showed out of stock.' };
  if (report.appStatus === 'product_not_found') return { status: 'product_not_found', confidence: 'community', reason: 'User/community report: product not found in app.' };
  if (report.foundStatus === 'not_found') return { status: 'not_found', confidence: 'community', reason: 'User/community report: could not find item in store.' };
  if (report.foundStatus === 'store_pulled') return { status: 'store_pulled', confidence: 'community', reason: 'User/community report: store pulled item.' };
  return null;
}

function stockScoreBoost(status) {
  if (status === 'penny_found') return 35;
  if (status === 'in_stock') return 20;
  if (status === 'limited_stock') return 12;
  if (status === 'product_not_found') return 3;
  if (status === 'out_of_stock') return -18;
  if (status === 'normal_price') return -25;
  if (status === 'not_found') return -16;
  if (status === 'store_pulled') return -30;
  return 0;
}

async function buildStockRun({ zip, itemIds }) {
  const db = readDb();
  const storeLookup = await lookupStoresForZip(zip || '08096');
  const stores = storeLookup.stores || [];
  const items = (Array.isArray(itemIds) ? itemIds : [])
    .map(id => db.items.find(i => i.id === id))
    .filter(Boolean);
  const provider = process.env.STOCK_PROVIDER || 'not_connected';
  const route = [];

  for (const store of stores) {
    const itemResults = [];
    let score = 0;
    let positives = 0;
    let negatives = 0;
    let checked = 0;

    for (const item of items) {
      const report = latestReportForItemStore(db.reports, item.id, store.id);
      let signal = reportToStockSignal(report);
      if (!signal) signal = await lookupDollarTreeItemStockLive({ zip, store, item });
      if (!signal && provider === 'demo') signal = deterministicDemoStock(zip, store, item);
      if (!signal) signal = { status: 'no_data', confidence: 'community', reason: 'No reports yet for this item at this store. Be the first to report.' };

      const boost = stockScoreBoost(signal.status);
      if (signal.status !== 'no_data') checked += 1;
      if (boost > 0) positives += 1;
      if (boost < 0) negatives += 1;
      score += boost;

      itemResults.push({
        itemId: item.id,
        sku: item.sku,
        description: item.description,
        searchTerm: (item.searchTerms || [item.description])[0],
        status: signal.status,
        confidence: signal.confidence,
        reason: signal.reason
      });
    }

    let worthTheDrive = null;
    let scoreReason = 'No reports yet. Use the report buttons after visiting to help rank this store.';
    if (checked > 0) {
      const distancePenalty = Math.min(18, Math.round((store.distanceMiles || 0) * 1.2));
      worthTheDrive = Math.max(0, Math.min(100, Math.round(35 + score + positives * 6 - negatives * 6 - distancePenalty)));
      scoreReason = `${checked} selected item(s) have stock/report data. ${positives} positive, ${negatives} negative.`;
    }

    route.push({
      store,
      worthTheDrive,
      scoreReason,
      checkedCount: checked,
      positiveCount: positives,
      negativeCount: negatives,
      items: itemResults
    });
  }

  route.sort((a, b) => {
    if (a.worthTheDrive !== null && b.worthTheDrive === null) return -1;
    if (a.worthTheDrive === null && b.worthTheDrive !== null) return 1;
    if (a.worthTheDrive !== null && b.worthTheDrive !== null) return b.worthTheDrive - a.worthTheDrive;
    return (a.store.distanceMiles || 9999) - (b.store.distanceMiles || 9999);
  });

  const storesLive = storeLookup.source === 'yext_live';
  return {
    zip,
    provider,
    storesLive,
    storesSource: storeLookup.source,
    itemsCount: items.length,
    message: provider === 'demo'
      ? 'Demo mode — results show the routing workflow only, not real inventory.'
      : storesLive
        ? 'Nearby stores are live from the Dollar Tree store locator. Route confidence scores are built from community scan reports and hunt results — not live inventory.'
        : 'Using starter store directory. Route confidence scores are built from community scan reports and hunt results — not live inventory.',
    route
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'DTPennyRoute' }));

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  const db = readDb();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(400).json({ error: 'Email already exists' });
  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role: db.users.length === 0 ? 'admin' : 'user',
    paid: db.users.length === 0,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !verifyPassword(password || '', user.passwordHash)) return res.status(401).json({ error: 'Invalid login' });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => { req.session = null; res.json({ ok: true }); });

app.get('/api/auth/me', (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.session.userId);
  res.json({ user: publicUser(user) });
});

app.get('/api/items', (req, res) => {
  const db = readDb();
  const q = String(req.query.q || '').toLowerCase().trim();
  const category = String(req.query.category || '').trim();
  const items = db.items
    .filter(item => !q || [item.sku, item.description, item.category, item.eventNumber, ...(item.searchTerms || [])].join(' ').toLowerCase().includes(q))
    .filter(item => !category || item.category === category)
    .map(item => ({ ...item, pennyScore: scoreItem(item.id, db.reports) }));
  res.json({ items });
});

app.get('/api/categories', (req, res) => {
  const db = readDb();
  res.json({ categories: [...new Set(db.items.map(i => i.category))].sort() });
});

app.get('/api/stores', async (req, res) => {
  try {
    const db = readDb();
    const result = await lookupStoresForZip(req.query.zip || '08096');
    const stores = result.stores.map(store => ({
      ...store,
      worthTheDriveScore: scoreStore(store.id, db.reports)
    }));
    res.json({ ...result, stores });
  } catch (err) {
    console.error('Store lookup failed:', err);
    res.status(500).json({ error: 'Store lookup failed' });
  }
});

app.get('/api/stores/lookup', async (req, res) => {
  try {
    const db = readDb();
    const result = await lookupStoresForZip(req.query.zip || '08096');
    const stores = result.stores.map(store => ({
      ...store,
      worthTheDriveScore: scoreStore(store.id, db.reports)
    }));
    res.json({ ...result, stores });
  } catch (err) {
    console.error('Store lookup failed:', err);
    res.status(500).json({ error: 'Store lookup failed' });
  }
});



app.post('/api/stock/check-run', async (req, res) => {
  try {
    const zip = String(req.body.zip || '08096').replace(/\D/g, '').slice(0, 5) || '08096';
    const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : [];
    if (!itemIds.length) return res.status(400).json({ error: 'Add items to My Run first.' });
    const result = await buildStockRun({ zip, itemIds });
    res.json(result);
  } catch (err) {
    console.error('Stock check failed:', err);
    res.status(500).json({ error: 'Stock check failed' });
  }
});

app.get('/api/reports', (req, res) => {
  const db = readDb();
  res.json({ reports: db.reports.slice(-200).reverse() });
});

app.post('/api/reports', (req, res) => {
  const { itemId, storeId, appStatus, scanResult, foundStatus, priceSeen, notes, zip } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item is required' });
  const db = readDb();
  const report = {
    id: crypto.randomUUID(),
    itemId,
    storeId: storeId || '',
    zip: zip || '',
    appStatus: appStatus || 'unknown',
    scanResult: scanResult || 'unknown',
    foundStatus: foundStatus || 'unknown',
    priceSeen: priceSeen || '',
    notes: String(notes || '').slice(0, 500),
    userId: req.session.userId || null,
    createdAt: new Date().toISOString()
  };
  db.reports.push(report);
  writeDb(db);
  res.json({ report });
});

app.get('/api/hunts', (req, res) => {
  const db = readDb();
  const userId = req.session.userId || 'guest';
  res.json({ hunts: db.huntLists.filter(h => h.userId === userId) });
});

app.post('/api/hunts', (req, res) => {
  const { name, zip, itemIds } = req.body;
  const db = readDb();
  const hunt = {
    id: crypto.randomUUID(),
    userId: req.session.userId || 'guest',
    name: name || 'My Penny Run',
    zip: zip || '',
    itemIds: Array.isArray(itemIds) ? itemIds : [],
    createdAt: new Date().toISOString()
  };
  db.huntLists.push(hunt);
  writeDb(db);
  res.json({ hunt });
});



function requireAdmin(req, res, next) {
  const db = readDb();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  req.currentUser = user;
  next();
}

app.post('/api/admin/items', requireAdmin, (req, res) => {
  const { sku, description, category, eventNumber, dropDate, source, confidence, searchTerms } = req.body;
  if (!description || !category) return res.status(400).json({ error: 'Description and category are required' });
  const db = readDb();
  const item = {
    id: crypto.randomUUID(),
    sku: String(sku || '').trim(),
    description: String(description || '').trim().toUpperCase(),
    category: String(category || '').trim(),
    eventNumber: String(eventNumber || '').trim(),
    dropDate: String(dropDate || '').trim(),
    source: String(source || 'manual admin add').trim(),
    confidence: String(confidence || 'high').trim(),
    status: 'active',
    searchTerms: Array.isArray(searchTerms)
      ? searchTerms.map(t => String(t).trim()).filter(Boolean)
      : String(searchTerms || '').split(',').map(t => t.trim()).filter(Boolean),
    createdAt: new Date().toISOString()
  };
  if (!item.searchTerms.length) item.searchTerms = [item.description.toLowerCase()];
  db.items.push(item);
  writeDb(db);
  res.json({ item: { ...item, pennyScore: 100 } });
});

app.listen(PORT, () => {
  console.log(`DTPennyRoute running on port ${PORT}`);
  console.log(`Data file: ${DB_FILE}`);
});
