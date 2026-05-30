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

function initialDb() {
  return {
    createdAt: new Date().toISOString(),
    users: [],
    items: seedItems(),
    reports: [],
    huntLists: [],
    stores: [
      { id:'store_4807', storeNumber:'4807', name:'Dollar Tree - Deptford Crossings', address:'1800 Clements Bridge Rd', city:'Woodbury', state:'NJ', zip:'08096' },
      { id:'store_deptford_hurffville', storeNumber:'', name:'Dollar Tree - Deptford / Hurffville Rd', address:'1360 Hurffville Rd Unit 2', city:'Deptford', state:'NJ', zip:'08096' },
      { id:'store_9091', storeNumber:'9091', name:'Dollar Tree - Woodbury', address:'529 N Evergreen Ave', city:'Woodbury', state:'NJ', zip:'08096' },
      { id:'store_1652', storeNumber:'1652', name:'Dollar Tree - Mantua Pike', address:'736 Mantua Pike', city:'Woodbury', state:'NJ', zip:'08096' }
    ]
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
  const itemReports = reports.filter(r => r.itemId === itemId);
  let score = 50;
  for (const r of itemReports) {
    const ageHours = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
    const freshness = ageHours < 24 ? 1 : ageHours < 72 ? 0.7 : 0.35;
    if (r.scanResult === 'penny') score += 18 * freshness;
    if (r.scanResult === 'normal') score -= 18 * freshness;
    if (r.foundStatus === 'not_found') score -= 8 * freshness;
    if (r.foundStatus === 'store_pulled') score -= 15 * freshness;
    if (r.appStatus === 'in_stock') score += 8 * freshness;
    if (r.appStatus === 'limited_stock') score += 4 * freshness;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
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

app.get('/api/stores', (req, res) => {
  const db = readDb();
  const stores = db.stores.map(store => ({ ...store, worthTheDriveScore: scoreStore(store.id, db.reports) }));
  res.json({ stores });
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

app.listen(PORT, () => {
  console.log(`DTPennyRoute running on port ${PORT}`);
  console.log(`Data file: ${DB_FILE}`);
});
