const express = require('express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.STORAGE_PATH || process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'dtpennyroute-db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

app.use(express.json({ limit: '5mb' }));
app.use(cookieSession({
  name: 'dtpr_session',
  keys: [process.env.SESSION_SECRET || 'dev-change-this-before-public-launch'],
  maxAge: 1000 * 60 * 60 * 24 * 30,
  sameSite: 'lax'
}));
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORY_NORMALIZE = {
  'Home / Decor': 'Home Decor', 'Home / Candle': 'Home Decor', 'Home / Storage': 'Household',
  'Beauty & Eyewear': 'Beauty', 'Beverages': 'Candy / Food', 'Beverage': 'Candy / Food',
  'Books & Activity': 'Books / Activity', 'Candy-NonChoc/Seasonal': 'Candy / Food',
  'Food / Candy': 'Candy / Food', 'Checkouts': 'Toys',
  'Party Celebrations': 'Party / Gift Bags', 'Party Paper': 'Party / Gift Bags',
  'Toys Everyday': 'Toys', 'Household Consumables': 'Household', 'Household Products': 'Household',
  'Kitchenware': 'Kitchenware', 'Personal Care': 'Personal Care', 'Beauty': 'Beauty',
  'Crafts': 'Crafts', 'Stationery': 'Stationery', 'Home Decor': 'Home Decor',
  'Household': 'Household', 'Electronics': 'Electronics', 'Toys': 'Toys',
  'Apparel': 'Apparel', 'Floral': 'Floral', 'Seasonal': 'Seasonal',
  'Books / Activity': 'Books / Activity', 'Candy / Food': 'Candy / Food',
  'Party / Gift Bags': 'Party / Gift Bags',
};

const PUBLIC_CATEGORIES = ['All','Kitchenware','Party / Gift Bags','Personal Care','Beauty',
  'Candy / Food','Books / Activity','Crafts','Stationery','Home Decor','Household',
  'Electronics','Toys','Apparel','Floral','Seasonal'];

function normalizeCategory(raw) {
  if (!raw) return 'Household';
  const t = String(raw).trim();
  return CATEGORY_NORMALIZE[t] || t;
}

function publicItem(item) {
  return {
    id: item.id,
    sku: item.sku || '',
    description: item.description,
    category: normalizeCategory(item.category),
    dropDate: item.dropDate || '',
    status: item.status || 'active',
    searchTerms: item.searchTerms || [],
    imageUrl: item.imageUrl || null,
    imageSource: item.imageSource || null,
    imageStatus: item.imageStatus || 'placeholder',
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Known catalog images baked in so they survive fresh Render deploys (ephemeral storage).
// Keyed by SKU. Added to any item missing imageUrl on every readDb() call.
const CATALOG_IMAGES = {
  '357098': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v7273887660137256606/products/357098.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '327645': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v1511361159241041779/products/327645.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '219215': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v6586244193986378383/products/219215.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '219216': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v3145439365837579490/products/219216.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '380311': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v421417442193795234/products/380311.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '304352': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v6361856915017689260/products/304352.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '366951': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v275090998449662859/products/366951.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '317809': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v5880353454024805519/products/317809.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '288908': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v1013814252047511476/products/288908.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '288944': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v4810555286131529090/products/288944.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '288933': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v5621493087014936320/products/288933.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '405806': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v4599289909609522815/products/405806.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '397971': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v6343022812328445628/products/397971.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '397970': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v6598619675851625507/products/397970.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '397973': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v983181986095310221/products/397973.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '397969': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v4738245737994941523/products/397969.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '398459': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v8632750885701646387/products/398459.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
  '398456': { imageUrl:'https://www.dollartree.com/ccstore/v1/images/?source=/file/v6095937345529743556/products/398456.jpg&height=300&width=300', imageSource:'dollartree_catalog', imageStatus:'found' },
};

function seedItems() {
  const base = [
    // --- original 40 items, normalized categories ---
    { sku:'328203', description:'NAVY DBL GLD 8X10', category:'Household', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['navy gold 8x10','navy 8x10'] },
    { sku:'359319', description:'BOXED CANDLE SOOTHING', category:'Home Decor', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['boxed candle soothing','soothing candle'] },
    { sku:'375667', description:'3OZ CLR DIAMND JAR W PVC LID', category:'Household', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['clear diamond jar','3 oz jar pvc lid'] },
    { sku:'377016', description:'RAIN UMBRELLA 9.5', category:'Apparel', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['rain umbrella','umbrella'] },
    { sku:'382583', description:'MDAY POWER BODY MASSAGER', category:'Beauty', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['power body massager','body massager'] },
    { sku:'380864', description:'ESSENTIA WATER 500ML', category:'Candy / Food', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['essentia water','essentia 500ml'] },
    { sku:'237438', description:'EDUCATIONAL SPINNER', category:'Books / Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['educational spinner'] },
    { sku:'357097', description:'PLAYSCHOOL PRE-K FLASH CARDS', category:'Books / Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['playschool flash cards','pre k flash cards'] },
    { sku:'357098', description:'MULTI LICENSED FLASH CARDS', category:'Books / Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['licensed flash cards','flash cards'] },
    { sku:'375902', description:'POP ART FOIL ADVANCED COLORING', category:'Books / Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['pop art foil coloring','advanced coloring'] },
    { sku:'387913', description:'ADVANCED COLORING BOOK 11X14', category:'Books / Activity', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['advanced coloring book','11x14 coloring book'] },
    { sku:'341109', description:'WH SOUR TAFFY BARS LD 3.59Z E', category:'Candy / Food', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['sour taffy bars','taffy bars'] },
    { sku:'380107', description:'INVISIBLE LIGHT PEN CS 2IN1', category:'Toys', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['invisible light pen','2 in 1 pen'] },
    { sku:'252595', description:'CRFTSQ CHERSH LOV & BLIVE STKR', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['cherish love believe sticker','crafter square sticker'] },
    { sku:'267670', description:'STENCIL BRUSH STRAIGHT HANDLE', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['stencil brush','straight handle stencil brush'] },
    { sku:'300761', description:'DNU FELT LETTER AND NUMBERS', category:'Crafts', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['felt letters numbers','felt letter and numbers'] },
    { sku:'299788', description:'LED BULB 75W EQ A19 1PK', category:'Electronics', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['led bulb 75w','a19 led bulb'] },
    { sku:'378462', description:'SILVER AAA2 DOLLAR TREE TRAY', category:'Electronics', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['silver aaa batteries','aaa2 dollar tree tray'] },
    { sku:'344553', description:'PEACH FRUIT STEM ARTIFCL 21IN', category:'Floral', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['peach fruit stem','artificial peach stem'] },
    { sku:'252480', description:'MAGNETS KITCHEN THEMED', category:'Home Decor', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['kitchen magnets','kitchen themed magnets'] },
    { sku:'367396', description:'BATHROOM CLEANER CONCENTRATED PODS 3PK', category:'Household / Cleaning', eventNumber:'40058', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['bathroom cleaner 3pk','bathroom cleaner','bathroom cleaner concentrated pods','bathroom cleaner 3 refills','cleaner pods shower tub'] },
    { sku:'355110', description:'SCRUB BUD DRY FLOOR CLOTH 15PK', category:'Household', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['scrub bud dry floor cloth','dry floor cloth'] },
    { sku:'327645', description:'BLUE FLORAL MUG 12Z', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['blue floral mug','floral mug','12 oz mug'] },
    { sku:'343933', description:'SOFT GREEN DINNER PLT 10.5IN', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['soft green dinner plate','green dinner plate'] },
    { sku:'344034', description:'SOFT GREEN FLORAL PLATE 10.5', category:'Kitchenware', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['soft green floral plate','green floral plate'] },
    { sku:'939567', description:'ROSE PETALS WHITE 300CT', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['white rose petals','rose petals 300ct'] },
    { sku:'219215', description:'GIFTBOX AO BUTTERFLY', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['butterfly gift box','giftbox butterfly'] },
    { sku:'219216', description:'GIFTBOX AO BASKET W/HANDLE', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['basket gift box','gift box with handle'] },
    { sku:'379958', description:'GIFTBAG XL BABY GENERAL', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['xl baby gift bag','baby gift bag'] },
    { sku:'380311', description:'GIFTBAG BOTTLE ALL OCC GEN', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['bottle gift bag','all occasion bottle gift bag'] },
    { sku:'382956', description:'GIFTBAG LRG AO JUVI', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['large juvenile gift bag','juvi gift bag'] },
    { sku:'383026', description:'GIFTBAG LG ALL OCCASION FLORA', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['large floral gift bag','all occasion floral gift bag'] },
    { sku:'383145', description:'CORAL 13X8 TRAY', category:'Party / Gift Bags', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['coral tray','13x8 tray'] },
    { sku:'304352', description:'PURE SILK 3BL RZR 2CT', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['pure silk razor','pure silk razors'] },
    { sku:'355583', description:'AD WIG CAP 3PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['wig cap 3pk','wig cap'] },
    { sku:'356211', description:'SC WAVE CAP 3PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['wave cap 3pk','wave cap'] },
    { sku:'381309', description:'BIC SENSITIVE 3BLD 1PK', category:'Personal Care', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['bic sensitive razor','bic sensitive'] },
    { sku:'307619', description:'PROTECTIVE WRAP 4X300IN', category:'Stationery', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['protective wrap','4x300 protective wrap'] },
    { sku:'366951', description:'METAL PEARL BALLPOINT PEN 1PC', category:'Stationery', eventNumber:'40058', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['metal pearl ballpoint pen','pearl pen'] },
    { sku:'317809', description:'BARBIE PURSES / SHOES / ACCS', category:'Toys', eventNumber:'40059', dropDate:'2026-06-01', source:'6/1/26 screenshot', confidence:'high', status:'active', searchTerms:['barbie purses shoes accessories','barbie accessories'] },
    // --- field-confirmed items (no SKU), normalized categories ---
    { sku:'', description:'POWER STICK ROLL-ON ALUMINUM FREE DEODORANT 1.8 OZ', category:'Beauty', dropDate:'2026-05-05', source:'field confirmed', confidence:'field-confirmed', status:'active', searchTerms:['power stick deodorant','aluminum free deodorant'] },
    { sku:'', description:'SASSY + CHIC NAIL POLISH 0.44 OZ COLORS 911 / 943', category:'Beauty', dropDate:'2026-05-05', source:'field confirmed', confidence:'field-confirmed', status:'active', searchTerms:['sassy chic nail polish','nail polish 911','nail polish 943'] },
    { sku:'', description:'BRAIN FREEZE FREEZE-DRIED CANDY 0.88 OZ', category:'Candy / Food', dropDate:'2026-05-05', source:'field confirmed', confidence:'field-confirmed', status:'active', searchTerms:['freeze dried candy','brain freeze candy'] },
    { sku:'', description:'COASTAL BAY CONFECTIONS BUBBLE GUM 5.5 OZ', category:'Candy / Food', dropDate:'2026-05-05', source:'field confirmed', confidence:'field-confirmed', status:'active', searchTerms:['coastal bay bubble gum','bubble gum'] },
    { sku:'', description:'TIC TAC CHEWY SOUR ADVENTURE CANDIES 2.8 OZ', category:'Candy / Food', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['tic tac chewy sour','sour adventure candies','tic tac chewy sour adventure','tic tac chewy 2.8 oz','sour adventure tic tac'] },
    // --- new items from 2026-06-01 TSV import ---
    { sku:'401350', description:'BLU REACTIVE PRNT PLATE 10.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue reactive print plate'] },
    { sku:'401307', description:'BLUE REACTIVE PRINT BOWL 6IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue reactive print bowl'] },
    { sku:'401420', description:'BLUE REACTIVE PRNT PLATE 7.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue reactive print side plate'] },
    { sku:'401344', description:'REACTIVE GLAZE MUG BLUE 12Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive glaze blue mug'] },
    { sku:'288908', description:'BLACK LINES BOWL 6IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['black lines bowl'] },
    { sku:'288944', description:'BLACK LINES MUG 16OZ', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['black lines mug'] },
    { sku:'288924', description:'BLACK LINES PLATE 10.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['black lines plate'] },
    { sku:'288933', description:'BLACK LINES SIDE PLATE 7.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['black lines side plate'] },
    { sku:'388382', description:'GRAY LINES PLATE 8IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['gray lines plate'] },
    { sku:'388390', description:'GREY LINES PLATE 10.5', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['grey lines plate'] },
    { sku:'405799', description:'GREY SWIRL MUG 12Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['grey swirl mug'] },
    { sku:'405801', description:'GREY SWIRL PLATE 10.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['grey swirl plate'] },
    { sku:'405806', description:'GREY SWIRL SIDE PLATE 7.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['grey swirl side plate'] },
    { sku:'318526', description:'BLUE 2-TONE 8N PLATE', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue two tone plate'] },
    { sku:'401413', description:'MATTE GLAZE 10.5IN PLATE', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['matte glaze plate'] },
    { sku:'401404', description:'MATTE GLAZE DECAL BOWL 5.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['matte glaze decal bowl'] },
    { sku:'401396', description:'MATTE GLAZE DECAL MUG 12Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['matte glaze decal mug'] },
    { sku:'401424', description:'MATTE GLAZE DECAL PLATE 7.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['matte glaze decal side plate'] },
    { sku:'343970', description:'SOFT GREEN FLORAL BOWL 6IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['soft green floral bowl'] },
    { sku:'344033', description:'SOFT GREEN FLORAL MUG 12Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['soft green floral mug'] },
    { sku:'397971', description:'BOWL BLUE HYDRANGEA 5.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea bowl'] },
    { sku:'397970', description:'MUG BLUE HYDRANGEA 14Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea mug'] },
    { sku:'397973', description:'PLATE BLUE HYDRANGEA 10.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea plate'] },
    { sku:'397969', description:'PLATE BLUE HYDRANGEA 7.5IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea side plate'] },
    { sku:'398459', description:'BLUE HYDRANGEA COOLER', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea cooler'] },
    { sku:'398456', description:'BLUE HYDRANGEA STEMLESS WINE', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue hydrangea stemless wine'] },
    { sku:'346419', description:'BLUE FLORAL STMLESS WINE 16.8Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['blue floral stemless wine'] },
    { sku:'308713', description:'SPRING FLING STM5S WINE 16.8Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['spring fling stemless wine'] },
    { sku:'392169', description:'RCTV LOOK BLUE BOWL 6IN', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look blue bowl'] },
    { sku:'392161', description:'RCTV LOOK BLUE MUG 14Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look blue mug'] },
    { sku:'392157', description:'RCTV LOOK BLUE PLATE 10.5', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look blue plate'] },
    { sku:'392154', description:'RCTV LOOK BLUE PLATE 7.5', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look blue side plate'] },
    { sku:'392162', description:'RCTV LOOK GRY BOWL 6N', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look gray bowl'] },
    { sku:'392168', description:'RCTV LOOK GRY MUG 14Z', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look gray mug'] },
    { sku:'392159', description:'RCTV LOOK GRY PLATE 10.5', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look gray plate'] },
    { sku:'392178', description:'RCTV LOOK GRY PLATE 7.5', category:'Kitchenware', dropDate:'2026-06-01', status:'active', searchTerms:['reactive look gray side plate'] },
    // --- scanner confirmed penny items batch 1 (TikTok screenshot proof) ---
    { sku:'', description:'PATRIOTIC STAR BOX 4PK', category:'Party / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['patriotic star box','glitter star gift box','patriotic gift box'] },
    { sku:'', description:'LUAU SIPPER 14Z', category:'Party / Summer', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['luau sipper','tropical sipper cup','palm tree sipper'] },
    { sku:'', description:'FLOWER LEI / PINK BEADED LEIS 40IN', category:'Party / Summer', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['flower lei','pink flower lei','beaded leis 40 inch','luau lei'] },
    { sku:'', description:'SLV NAUTICAL ICONS PK 6', category:'Decor / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['silver nautical icons','nautical icons 6 pack','shore living nautical decorations'] },
    { sku:'', description:'SHELL / MERMAID CUP WITH STRAW', category:'Kitchenware / Summer', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['shell mermaid cup with straw','mermaid cup','shell cup','summer cup with straw'] },
    { sku:'', description:'SUMMER DECALED ICE TEA TUMBLER', category:'Kitchenware / Summer', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['summer decaled ice tea tumbler','ice tea tumbler','summer tumbler','popsicle tumbler'] },
    { sku:'', description:'DISTRESSED SILVER METAL BANNER', category:'Decor / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['distressed silver metal banner','metal banner','galvanized banner','shore living banner'] },
    { sku:'', description:'COASTAL WOOD HANGER ASSORTED', category:'Decor / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['coastal wood hanger','wood hanger assorted','shore living wood hanger','coastal decor'] },
    { sku:'', description:'SHORE LIVING PINS / NAUTICAL PINS', category:'Decor / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['shore living pins','nautical pins','starfish pins','sailboat pins','seahorse pins'] },
    { sku:'', description:'NAPKIN SPRING FLING 18CT', category:'Party / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['napkin spring fling 18ct','spring napkins','happy spring napkins','floral napkins'] },
    { sku:'', description:'INCENSE STICKS HEART 40CT', category:'Home Fragrance', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['incense sticks heart 40ct','heart incense sticks','incense 40 count'] },
    { sku:'', description:'INCENSE STICKS BLESSINGS 40CT', category:'Home Fragrance', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['incense sticks blessings 40ct','blessings incense','incense 40 count'] },
    { sku:'', description:'INCENSE STICK 40CT BALANCE', category:'Home Fragrance', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['incense stick balance 40ct','balance incense sticks','sandalwood incense'] },
    { sku:'', description:'TODAY IS YOUR DAY LIPGLOSS 2PK', category:'Beauty', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['today is your day lipgloss 2pk','lipgloss 2 pack','gloss lipgloss'] },
    { sku:'', description:'SILICONE WITH WOOD MINI TOOLS', category:'Kitchenware', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['silicone with wood mini tools','mini kitchen tools','silicone wood tools'] },
    { sku:'', description:'BIRD SIGN DECOR', category:'Decor / Seasonal', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['bird sign decor','island time bird sign','toucan sign','tropical bird decor'] },
    { sku:'', description:'FUR CLAW CLIPS', category:'Beauty / Accessories', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['fur claw clips','fuzzy claw clips','hair claw clips'] },
    { sku:'', description:'KELLOGGS CRAZY SOCKS', category:'Apparel', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['kelloggs crazy socks','rice krispies crazy socks','cereal socks'] },
    { sku:'', description:'DC SUPER FRIENDS DOUGH & MOLD', category:'Toys', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['dc super friends dough and mold','super friends dough','superhero dough mold'] },
    { sku:'', description:'VOTIVE SUN RIPE BERRY', category:'Candles / Home Fragrance', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['votive sun ripe berry','sun ripe berry candle','luminessence votive'] },
    { sku:'', description:'MONSTER TRUCKS 5 SURPRISE', category:'Toys', dropDate:'2026-06-01', source:'TikTok scanner proof screenshot', confidence:'field-confirmed', fieldConfirmed:true, pennyScore:100, tags:['scanner proof','TikTok screenshot','field confirmed','penny confirmed'], status:'active', searchTerms:['monster trucks 5 surprise','5 surprise monster trucks','zuru monster trucks'] },
    // --- photo candidates / image notes (not yet scanner confirmed) ---
    { sku:'', description:'FROZEN II SHAMPOO', category:'Personal Care', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['frozen 2 shampoo','frozen ii shampoo','disney frozen shampoo'] },
    { sku:'', description:'GREAT NORTHERN BEANS', category:'Candy / Food', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['great northern beans','canned great northern beans'] },
    { sku:'', description:'AMOPE GEL ACTIV HEEL PROTECTORS', category:'Personal Care', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['amope gel activ heel protectors','heel protectors','amope heel'] },
    { sku:'', description:'ANGEL OF MINE BABY ROOM AIR FRESHENER', category:'Household', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['angel of mine baby room air freshener','baby room air freshener'] },
    { sku:'', description:'AIR FRESH LAVENDER & PATCHOULI SCENTED CANDLE', category:'Candles / Home Fragrance', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['air fresh lavender patchouli candle','lavender patchouli scented candle'] },
    { sku:'', description:'AIR FRESH WATERFALL SCENTED CANDLE', category:'Candles / Home Fragrance', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['air fresh waterfall candle','waterfall scented candle'] },
    { sku:'', description:'GOOD & CLEAN DISINFECTANT WIPES', category:'Household / Cleaning', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['good and clean disinfectant wipes','disinfectant wipes'] },
    { sku:'', description:'ZEST SIMPLY OCEAN WAVE BODY WASH', category:'Personal Care', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['zest simply ocean wave body wash','zest ocean wave'] },
    { sku:'', description:'WHITE RAIN OCEAN MIST BODY WASH', category:'Personal Care', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['white rain ocean mist body wash','white rain ocean mist'] },
    { sku:'', description:'HOMELINE CASCADING WATERS AUTOMATIC SPRAY 2-PACK', category:'Household', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['homeline cascading waters automatic spray','cascading waters spray 2 pack','automatic air freshener spray'] },
    { sku:'', description:'MUIR GLEN TOMATO PUREE FIREFIGHTERS CAN', category:'Candy / Food', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['muir glen tomato puree','muir glen firefighters can'] },
    { sku:'', description:'FILLER PAPER 200 SHEETS', category:'Stationery', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['filler paper 200 sheets','loose leaf paper 200'] },
    { sku:'', description:'THINK POSITIVE / BE POSITIVE GRATITUDE JOURNAL', category:'Stationery', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['think positive journal','be positive gratitude journal','gratitude journal'] },
    { sku:'', description:'HOME COLLECTION RED DISH TOWELS', category:'Household', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['home collection red dish towels','red dish towels'] },
    { sku:'', description:'YOU ARE MY PERSON SIGN', category:'Home Decor', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['you are my person sign','my person decor sign'] },
    { sku:'', description:'HOME IS WHEREVER WE ARE TOGETHER SIGN', category:'Home Decor', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['home is wherever we are together sign','home together sign'] },
    { sku:'', description:'SUNNY DAZE DECOR SIGN', category:'Home Decor', dropDate:'2026-06-01', source:'image candidate / photo note', confidence:'unconfirmed', fieldConfirmed:false, pennyScore:null, tags:['image candidate','needs photo'], status:'active', searchTerms:['sunny daze decor sign','sunny daze sign'] },
  ];
  return base.map((item, index) => ({
    id: `item_${String(index + 1).padStart(4, '0')}`,
    imageUrl: null,
    imageStatus: 'placeholder',
    ...item,
  }));
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
      : `ZIP ${cleanZip} is not in the starter directory. Showing nearest stores.`
  };
}

// Dollar Tree product image enrichment via their Oracle Commerce Cloud catalog API.
// Products endpoint works for items still in their active catalog; penny/clearance items
// dropped from the catalog get imageStatus='not_found' and show the placeholder.
const DT_BASE = 'https://www.dollartree.com';
const DT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'X-CCProfileType': 'storefrontUI',
  'Accept': 'application/json'
};

async function fetchDollarTreeProductImage(sku) {
  try {
    const url = `${DT_BASE}/ccstoreui/v1/products/${encodeURIComponent(sku)}?fields=displayName,primarySmallImageURL`;
    const res = await fetch(url, { headers: DT_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const imgPath = data.primarySmallImageURL;
    if (!imgPath || imgPath.includes('no-image')) return null;
    const base = imgPath.replace(/&height=\d+&width=\d+/, '');
    return { url: `${DT_BASE}${base}&height=300&width=300`, source: 'dollartree_catalog', name: data.displayName || '' };
  } catch (e) {
    return null;
  }
}

async function searchDollarTreeProductImage(searchTerm) {
  try {
    const innerUrl = `/search?Nrpp=5&searchType=simple&Nrq=${encodeURIComponent(searchTerm)}`;
    const url = `${DT_BASE}/ccstoreui/v1/search?Nrpp=5&searchType=simple&lang=default&queryURL=${encodeURIComponent(innerUrl)}`;
    const res = await fetch(url, { headers: DT_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const records = data.resultsList?.records || [];
    const keywords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const record of records) {
      const sub = record.records?.[0];
      const attrs = sub?.attributes || {};
      const types = attrs['record.type'] || [];
      if (!types.includes('DollarProductType')) continue;
      const imgPath = attrs['product.primarySmallImageURL']?.[0];
      if (!imgPath || imgPath.includes('no-image')) continue;
      const name = (attrs['product.displayName']?.[0] || '').toLowerCase();
      if (keywords.some(kw => name.includes(kw))) {
        const base = imgPath.replace(/&height=\d+&width=\d+/, '');
        return { url: `${DT_BASE}${base}&height=300&width=300`, source: 'dollartree_search', name: attrs['product.displayName']?.[0] || '' };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function lookupDollarTreeStoresLive(zip) {
  // STORE LOCATOR: Yext powers locations.dollartree.com. The API key below is their
  // embedded Yext "live API key" (read-only, public in their JS bundle at
  // locations.dollartree.com/assets/static/dollartree-CYzSknic.js).
  // Set STORE_PROVIDER=off to skip Yext and use only the static fallback directory.
  //
  // STOCK STATUS: No accessible public API exists. Live per-store stock lookup is not
  // possible without authenticated access to Dollar Tree's internal inventory system.
  // Community/manual reports are the correct data source.

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
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  // Apply baked-in catalog images to any item that is missing one (covers fresh Render deploys).
  let migrated = false;
  for (const item of db.items) {
    if (item.sku && !item.imageUrl && CATALOG_IMAGES[item.sku]) {
      Object.assign(item, CATALOG_IMAGES[item.sku]);
      migrated = true;
    }
  }
  if (migrated) writeDb(db);
  return db;
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
  if (n < 18) return { status: 'in_stock', confidence: 'demo', reason: 'Demo mode estimate only.' };
  if (n < 32) return { status: 'limited_stock', confidence: 'demo', reason: 'Demo mode estimate only.' };
  if (n < 45) return { status: 'out_of_stock', confidence: 'demo', reason: 'Demo mode estimate only.' };
  return { status: 'no_data', confidence: 'demo', reason: 'No demo signal for this item/store.' };
}

async function lookupDollarTreeItemStockLive({ zip, store, item }) {
  // No accessible public stock API exists. Community reports are the correct data source.
  return null;
}

function latestReportForItemStore(reports, itemId, storeId) {
  return reports
    .filter(r => r.itemId === itemId && r.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function reportToStockSignal(report) {
  if (!report) return null;
  if (report.scanResult === 'penny') return { status: 'penny_found', confidence: 'community', reason: 'Community report: scanned $0.01.' };
  if (report.scanResult === 'normal') return { status: 'normal_price', confidence: 'community', reason: 'Community report: scanned normal price.' };
  if (report.appStatus === 'in_stock') return { status: 'in_stock', confidence: 'community', reason: 'Community report: app showed in stock.' };
  if (report.appStatus === 'limited_stock') return { status: 'limited_stock', confidence: 'community', reason: 'Community report: app showed limited stock.' };
  if (report.appStatus === 'out_of_stock') return { status: 'out_of_stock', confidence: 'community', reason: 'Community report: app showed out of stock.' };
  if (report.appStatus === 'product_not_found') return { status: 'product_not_found', confidence: 'community', reason: 'Community report: product not found in app.' };
  if (report.foundStatus === 'not_found') return { status: 'not_found', confidence: 'community', reason: 'Community report: could not find item in store.' };
  if (report.foundStatus === 'store_pulled') return { status: 'store_pulled', confidence: 'community', reason: 'Community report: store pulled item.' };
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
      if (!signal) signal = { status: 'no_data', confidence: 'community', reason: 'No reports yet. Be the first to report.' };

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
      scoreReason = `${checked} selected item(s) have report data. ${positives} positive, ${negatives} negative.`;
    }

    route.push({ store, worthTheDrive, scoreReason, checkedCount: checked, positiveCount: positives, negativeCount: negatives, items: itemResults });
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
        ? 'Nearby stores are live from the Dollar Tree store locator. Route Confidence scores are built from community scan reports and hunt results — not live inventory.'
        : 'Using starter store directory. Route Confidence scores are built from community scan reports and hunt results — not live inventory.',
    route
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'DTPennyRoute' }));

app.get('/api/debug/leaflet', (req, res) => {
  const fp = path.join(__dirname, 'public/vendor/leaflet/leaflet.js');
  const exists = fs.existsSync(fp);
  const size = exists ? fs.statSync(fp).size : 0;
  res.json({ exists, sizeBytes: size, path: fp, vendored: '1.9.4' });
});

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
    .filter(item => item.status !== 'inactive')
    .filter(item => !q || [item.sku, item.description, normalizeCategory(item.category), ...(item.searchTerms || [])].join(' ').toLowerCase().includes(q))
    .filter(item => !category || category === 'All' || normalizeCategory(item.category) === category)
    .map(item => ({ ...publicItem(item), pennyScore: scoreItem(item.id, db.reports) }));
  res.json({ items });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories: PUBLIC_CATEGORIES.filter(c => c !== 'All') });
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
    console.error('Route build failed:', err);
    res.status(500).json({ error: 'Route build failed' });
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
    id: `item_${String(db.items.length + 1).padStart(4, '0')}`,
    sku: String(sku || '').trim(),
    description: String(description || '').trim().toUpperCase(),
    category: normalizeCategory(String(category || '').trim()),
    eventNumber: String(eventNumber || '').trim(),
    dropDate: String(dropDate || '').trim(),
    source: String(source || 'manual admin add').trim(),
    confidence: String(confidence || 'high').trim(),
    status: 'active',
    searchTerms: Array.isArray(searchTerms)
      ? searchTerms.map(t => String(t).trim()).filter(Boolean)
      : String(searchTerms || '').split(',').map(t => t.trim()).filter(Boolean),
    imageUrl: null,
    imageSource: null,
    imageStatus: 'placeholder',
    createdAt: new Date().toISOString()
  };
  if (!item.searchTerms.length) item.searchTerms = [item.description.toLowerCase()];
  db.items.push(item);
  writeDb(db);
  res.json({ item: { ...publicItem(item), pennyScore: 100 } });
});

app.post('/api/admin/import', requireAdmin, (req, res) => {
  const rawText = String(req.body.rows || req.body.text || '').trim();
  if (!rawText) return res.status(400).json({ error: 'No rows provided' });

  const db = readDb();
  const beforeCount = db.items.length;
  const summary = { added: 0, updated: 0, skippedDuplicate: 0, possibleDuplicate: 0 };

  const maxId = db.items.reduce((max, item) => {
    const n = parseInt((item.id || '').replace('item_', ''));
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  let nextId = maxId + 1;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const seenSkusThisImport = new Set();

  for (const line of lines) {
    const sep = line.includes('\t') ? '\t' : '|';
    const parts = line.split(sep).map(p => p.trim());
    if (parts[0] === 'dropDate' || parts[0] === 'drop_date') continue;

    const [dropDate, category, sku, description, searchTermsRaw] = parts;
    if (!description) continue;

    const cleanSku = String(sku || '').trim();
    const cleanDesc = String(description || '').trim().toUpperCase();
    const cleanCategory = normalizeCategory(String(category || '').trim());
    const cleanDropDate = String(dropDate || '').trim();
    const newTerms = String(searchTermsRaw || '').split(',').map(t => t.trim()).filter(Boolean);

    // skip if we already processed this SKU in this import batch
    if (cleanSku && seenSkusThisImport.has(cleanSku)) {
      summary.skippedDuplicate++;
      continue;
    }
    if (cleanSku) seenSkusThisImport.add(cleanSku);

    // 1. Exact SKU match
    if (cleanSku) {
      const existing = db.items.find(i => i.sku === cleanSku);
      if (existing) {
        existing.category = cleanCategory || existing.category;
        if (cleanDropDate) existing.dropDate = cleanDropDate;
        const termSet = new Set(existing.searchTerms || []);
        newTerms.forEach(t => termSet.add(t));
        existing.searchTerms = [...termSet];
        existing.imageUrl = existing.imageUrl || null;
        existing.imageStatus = existing.imageStatus || 'placeholder';
        summary.updated++;
        continue;
      }
    }

    // 2. Exact normalized description match
    const normDesc = cleanDesc.toLowerCase().replace(/\s+/g, ' ');
    const descMatch = db.items.find(i =>
      (i.description || '').toLowerCase().replace(/\s+/g, ' ') === normDesc
    );
    if (descMatch) {
      if (cleanSku && !descMatch.sku) descMatch.sku = cleanSku;
      descMatch.category = cleanCategory || descMatch.category;
      const termSet = new Set(descMatch.searchTerms || []);
      newTerms.forEach(t => termSet.add(t));
      descMatch.searchTerms = [...termSet];
      summary.updated++;
      continue;
    }

    // 3. New item
    const newItem = {
      id: `item_${String(nextId).padStart(4, '0')}`,
      sku: cleanSku,
      description: cleanDesc,
      category: cleanCategory,
      dropDate: cleanDropDate,
      status: 'active',
      searchTerms: newTerms.length ? newTerms : [cleanDesc.toLowerCase()],
      imageUrl: null,
      imageSource: null,
      imageStatus: 'placeholder',
      createdAt: new Date().toISOString()
    };
    db.items.push(newItem);
    nextId++;
    summary.added++;
  }

  writeDb(db);
  res.json({
    ok: true,
    summary: {
      totalBefore: beforeCount,
      added: summary.added,
      updated: summary.updated,
      skippedDuplicate: summary.skippedDuplicate,
      possibleDuplicate: summary.possibleDuplicate,
      totalAfter: db.items.length
    }
  });
});

app.get('/api/admin/image-debug', requireAdmin, async (req, res) => {
  const db = readDb();
  const withImage = db.items.filter(i => i.imageUrl && i.imageStatus === 'found');
  const without = db.items.filter(i => !i.imageUrl || i.imageStatus !== 'found');
  const checks = await Promise.all(withImage.slice(0, 5).map(async item => {
    try {
      const r = await fetch(item.imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return { sku: item.sku, description: item.description.slice(0, 40), url: item.imageUrl, httpStatus: r.status, ok: r.ok };
    } catch (e) {
      return { sku: item.sku, description: item.description.slice(0, 40), url: item.imageUrl, httpStatus: 'error', ok: false, error: e.message };
    }
  }));
  res.json({
    dbPath: DB_FILE,
    total: db.items.length,
    withImage: withImage.length,
    withoutImage: without.length,
    imageChecks: checks,
    allFound: withImage.map(i => ({ id: i.id, sku: i.sku, description: i.description.slice(0, 45), imageUrl: i.imageUrl }))
  });
});

// Upload an image to the GitHub repo via the Contents API.
// Returns the raw.githubusercontent.com URL on success, null on failure.
// Falls back gracefully so local dev (no GITHUB_TOKEN) still works.
async function uploadImageToGitHub(itemId, b64, ext) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'asandyant/dtpennyroute';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) return null;

  const filePath = `public/uploads/${itemId}${ext}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  // Fetch existing SHA so we can overwrite the file if it already exists.
  let sha;
  try {
    const check = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (check.ok) sha = (await check.json()).sha;
  } catch (_) {}

  const body = { message: `Upload item photo: ${itemId}`, content: b64, branch };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: 'PUT', headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${err.message || 'upload failed'}`);
  }
  const data = await res.json();
  return data.content?.download_url ||
    `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
}

// Fallback image server for local dev (no GITHUB_TOKEN). Tries disk, then DB base64.
app.get('/api/images/:itemId', (req, res) => {
  const itemId = req.params.itemId.replace(/[^a-z0-9_-]/gi, '');
  if (!itemId) return res.status(400).end();

  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const fp = path.join(UPLOADS_DIR, itemId + ext);
    if (fs.existsSync(fp)) {
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(fp);
    }
  }

  const db = readDb();
  const item = db.items.find(i => i.id === itemId);
  if (!item?.imageData) return res.status(404).end();

  const [header, b64] = item.imageData.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(Buffer.from(b64, 'base64'));
});

app.post('/api/admin/items/:itemId/photo', requireAdmin, async (req, res) => {
  const itemId = req.params.itemId.replace(/[^a-z0-9_-]/gi, '');
  if (!itemId) return res.status(400).json({ error: 'Invalid item ID' });

  const { imageData } = req.body;
  if (!imageData || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ error: 'imageData must be a valid image DataURL' });
  }

  const db = readDb();
  const item = db.items.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const mime = imageData.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const ext = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg';
  const [, b64] = imageData.split(',');

  let imageUrl;
  let storage;

  try {
    imageUrl = await uploadImageToGitHub(itemId, b64, ext);
    if (imageUrl) storage = 'github';
  } catch (e) {
    console.error('GitHub upload failed, falling back to disk:', e.message);
  }

  if (!imageUrl) {
    // Local dev fallback — write to UPLOADS_DIR and serve via /api/images/:itemId
    ensureDataDir();
    fs.writeFileSync(path.join(UPLOADS_DIR, itemId + ext), Buffer.from(b64, 'base64'));
    imageUrl = `/api/images/${itemId}`;
    storage = 'local';
  }

  // Keep base64 in DB so /api/images/:itemId still works if GitHub is unavailable.
  item.imageData = imageData;
  item.imageUrl = imageUrl;
  item.imageSource = 'admin_upload';
  item.imageStatus = 'verified';

  writeDb(db);
  console.log(`Admin photo saved for ${itemId} via ${storage}: ${imageUrl}`);
  res.json({ ok: true, item: publicItem(item), storage });
});

app.post('/api/admin/enrich-images', requireAdmin, async (req, res) => {
  const force = Boolean(req.body.force);
  const db = readDb();
  const summary = { found: 0, skipped: 0, notFound: 0, errors: 0, foundItems: [] };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  for (const item of db.items) {
    if (!force && item.imageStatus === 'found') {
      summary.skipped++;
      continue;
    }

    let result = null;
    try {
      if (item.sku) {
        result = await fetchDollarTreeProductImage(item.sku);
        await sleep(200);
      }
      if (!result && item.searchTerms?.length) {
        for (const term of item.searchTerms.slice(0, 2)) {
          result = await searchDollarTreeProductImage(term);
          await sleep(200);
          if (result) break;
        }
      }
    } catch (e) {
      console.error(`Enrich error ${item.id}:`, e.message);
      summary.errors++;
    }

    if (result) {
      item.imageUrl = result.url;
      item.imageSource = result.source;
      item.imageStatus = 'found';
      summary.found++;
      summary.foundItems.push({ id: item.id, sku: item.sku || '', description: item.description.slice(0, 50), catalogName: result.name, source: result.source });
    } else {
      if (force) { item.imageUrl = null; item.imageSource = null; }
      item.imageStatus = 'not_found';
      summary.notFound++;
    }
    await sleep(100);
  }

  writeDb(db);
  console.log(`Image enrichment: ${summary.found} found, ${summary.notFound} not found, ${summary.skipped} skipped`);
  res.json({ ok: true, ...summary });
});

app.listen(PORT, () => {
  console.log(`DTPennyRoute running on port ${PORT}`);
  console.log(`Data file: ${DB_FILE}`);
});
