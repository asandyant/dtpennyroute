#!/usr/bin/env node
// Smart batch import - TikTok penny screenshots batch 1
// Analyzed all 92 images: scanner proofs, product photos, price change reports

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'dtpennyroute-db.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
const IMAGES_DIR = '/tmp/dtpr_batch1/images';

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const stats = {
  itemsBefore: db.items.length,
  existingUpdated: 0,
  newItemsAdded: 0,
  photosAttached: 0,
  duplicatesSkipped: 0,
  reviewQueueItems: 0,
};

function findBySku(sku) {
  if (!sku) return null;
  return db.items.find(i => i.sku && i.sku === String(sku).trim());
}

function findByDescNorm(desc) {
  const norm = desc.toLowerCase().replace(/\s+/g, ' ').trim();
  return db.items.find(i => (i.description || '').toLowerCase().replace(/\s+/g, ' ').trim() === norm);
}

const maxId = db.items.reduce((max, item) => {
  const n = parseInt((item.id || '').replace('item_', ''));
  return isNaN(n) ? max : Math.max(max, n);
}, 0);
let nextId = maxId + 1;
function newId() { return `item_${String(nextId++).padStart(4, '0')}`; }

function upsertItem(sku, description, category, extras = {}) {
  const cleanSku = String(sku || '').trim();
  const cleanDesc = String(description || '').trim().toUpperCase();
  if (!cleanDesc) return null;

  let existing = cleanSku ? findBySku(cleanSku) : null;
  if (!existing) existing = findByDescNorm(cleanDesc);

  if (existing) {
    if (cleanSku && !existing.sku) { existing.sku = cleanSku; stats.existingUpdated++; }
    if (extras.eventNumber && !existing.eventNumber) existing.eventNumber = extras.eventNumber;
    if (!existing.tags) existing.tags = [];
    if (!existing.tags.includes('price change report')) existing.tags.push('price change report');
    if (!existing.source || existing.source === '6/1/26 screenshot') {
      existing.source = 'price change report + 6/1/26 screenshot';
      stats.existingUpdated++;
    }
    const termSet = new Set(existing.searchTerms || []);
    (extras.searchTerms || []).forEach(t => termSet.add(t));
    existing.searchTerms = [...termSet];
    stats.duplicatesSkipped++;
    return existing;
  }

  const item = {
    id: newId(),
    sku: cleanSku,
    description: cleanDesc,
    category: category || 'Household',
    dropDate: extras.dropDate || '2026-06-01',
    eventNumber: extras.eventNumber || '',
    source: extras.source || 'price change report',
    confidence: 'high',
    status: 'active',
    searchTerms: extras.searchTerms && extras.searchTerms.length ? extras.searchTerms : [cleanDesc.toLowerCase()],
    imageUrl: null,
    imageSource: null,
    imageStatus: 'placeholder',
    tags: extras.tags || ['price change report'],
    createdAt: new Date().toISOString(),
  };
  db.items.push(item);
  stats.newItemsAdded++;
  return item;
}

function attachPhoto(descSearch, imageFile, confidence) {
  const item = db.items.find(i => {
    const d = (i.description || '').toLowerCase();
    const s = (i.searchTerms || []).join(' ').toLowerCase();
    const q = descSearch.toLowerCase();
    return d.includes(q) || s.includes(q);
  });
  if (!item) { console.warn(`  [PHOTO] No item found for: "${descSearch}"`); return; }
  if (item.imageSource === 'admin_upload') { console.log(`  [PHOTO] Skip (admin_upload already set): ${item.description}`); return; }

  const srcPath = path.join(IMAGES_DIR, imageFile);
  if (!fs.existsSync(srcPath)) { console.warn(`  [PHOTO] File not found: ${srcPath}`); return; }

  const ext = path.extname(imageFile).toLowerCase() || '.jpg';
  fs.copyFileSync(srcPath, path.join(UPLOADS_DIR, `${item.id}${ext}`));

  item.imageUrl = `/api/images/${item.id}`;
  item.imageSource = 'batch_import';
  item.imageStatus = confidence === 'high' ? 'verified' : 'needs_review';

  stats.photosAttached++;
  console.log(`  [PHOTO] ${imageFile} → ${item.description} (${item.id}) [${confidence}]`);
}

function addReview(filename, notes, type) {
  if (!db.photoReviewQueue) db.photoReviewQueue = [];
  db.photoReviewQueue.push({
    id: `review_${String(stats.reviewQueueItems + 1).padStart(3,'0')}`,
    filename,
    type,
    notes,
    status: 'pending',
    addedAt: new Date().toISOString(),
  });
  stats.reviewQueueItems++;
}

// ── STEP 1: New items from official store 7591 price change report 06/01/2026 ──

console.log('\n[STEP 1] Importing items from price change reports...');

// Decor (page 3)
upsertItem('383200','SLV DECK MDF WALL PLAQUE','Home Decor',{eventNumber:'40058',searchTerms:['silver deck mdf wall plaque','wall plaque']});
upsertItem('383210','WAVY METAL WALL DECO','Home Decor',{eventNumber:'40058',searchTerms:['wavy metal wall deco','metal wall decoration']});
upsertItem('383213','SLV TRI BD HANG DECOR','Home Decor',{eventNumber:'40058',searchTerms:['silver tri bead hanging decor','hanging bead decor']});
upsertItem('383214','SLV HANGING MEDALLION DECOR','Home Decor',{eventNumber:'40058',searchTerms:['silver hanging medallion decor','medallion wall decor']});
upsertItem('383220','SLV CSTL MDF WALL 3D PLAQUE','Home Decor',{eventNumber:'40058',searchTerms:['silver coastal mdf wall 3d plaque','coastal wall plaque 3d']});

// Household Products / Consumables (pages 3 & 4)
upsertItem('381824','GSCENTS WAX ORNGBLSSM HNY 8CT','Household',{eventNumber:'40059',searchTerms:['scents wax orange blossom honey 8ct','orange blossom honey wax melts']});
upsertItem('164334','ESSNTLS JUMBO CLOTHESPINS ASTD','Household',{eventNumber:'40059',searchTerms:['essentials jumbo clothespins assorted','jumbo clothespins']});
upsertItem('288110','MICROFIBER DUSTER & MOP PAD','Household',{eventNumber:'40059',searchTerms:['microfiber duster mop pad','duster and mop']});
upsertItem('336550','TOTE WITH GROMMET MEDIUM GREY','Household',{eventNumber:'40059',searchTerms:['tote with grommet medium grey','grey tote bag grommet']});
upsertItem('354995','TOTE W/GROMMET MEDIUM MINT','Household',{eventNumber:'40059',searchTerms:['tote with grommet medium mint','mint tote bag']});
upsertItem('354996','TOTE W/GROMMET MEDIUM NAVY','Household',{eventNumber:'40059',searchTerms:['tote with grommet medium navy','navy tote bag']});
upsertItem('361710','BASKET W/HANDLE BLACK SMALL','Household',{eventNumber:'40059',searchTerms:['basket with handle black small','black basket handle']});
upsertItem('376462','ESSNTLS WOOD CLOTHESPINS 54PK','Household',{eventNumber:'40059',searchTerms:['essentials wood clothespins 54 pack','wooden clothespins 54']});
upsertItem('378668','COLLAPSIBLE STRG PRNTD ASTD SF','Household',{eventNumber:'40059',searchTerms:['collapsible storage printed assorted','storage cube collapsible']});
upsertItem('382654','PRINTED TRAY SHORE LIVING ASTD','Household',{eventNumber:'40059',searchTerms:['printed tray shore living assorted','shore living serving tray']});
upsertItem('335357','PVC SOAP SAVER 2PK','Household',{eventNumber:'40058',searchTerms:['pvc soap saver 2 pack','soap dish saver pvc']});
upsertItem('364241','BCH CHR TOWEL CLIPS CS 2PK','Household',{eventNumber:'40058',searchTerms:['beach chair towel clips 2 pack','towel clips beach chair']});

// Kitchenware (page 3 — items not already in list)
upsertItem('327652','BLUE FLORAL SALAD PLATE 7.5IN','Kitchenware',{eventNumber:'40059',searchTerms:['blue floral salad plate 7.5 inch','blue floral side plate']});
upsertItem('327661','BLUE FLORAL BOWL 6IN','Kitchenware',{eventNumber:'40059',searchTerms:['blue floral bowl 6 inch','blue floral bowl']});
upsertItem('370484','SLV HIGH BALL GLASS 16Z','Kitchenware',{eventNumber:'40059',searchTerms:['silver high ball glass 16oz','highball glass 16oz']});

// Party / Gift Bags (pages 2 & 3)
upsertItem('180112','CUTERLY LIGHT GOLD ASTD','Party / Gift Bags',{eventNumber:'40059',searchTerms:['cutlery light gold assorted','gold plastic cutlery']});
upsertItem('237310','METALLIC RED NECKLACE 5CT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['metallic red necklace 5 count','red metallic bead necklace']});
upsertItem('237319','METALLIC NECKLACE BLUE 5CT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['metallic blue necklace 5 count','blue metallic necklace']});
upsertItem('237326','MAROON NECKLACE 5CT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['maroon necklace 5 count','burgundy bead necklace']});
upsertItem('195835','ROLL WRAP BIRTHDAY 15 SQ FT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['roll wrap birthday 15 square feet','birthday wrapping paper roll']});
upsertItem('196180','GIFTBAG SMALL KRAFT BROWN 3PK','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag small kraft brown 3 pack','kraft brown gift bags small']});
upsertItem('197694','ROLL WRAP BIRTHDAY A','Party / Gift Bags',{eventNumber:'40059',searchTerms:['roll wrap birthday','birthday wrap']});
upsertItem('197697','ROLL WRAP BIRTHDAY B','Party / Gift Bags',{eventNumber:'40059',searchTerms:['birthday roll wrap assorted','wrapping paper birthday']});
upsertItem('301937','SMALL BRGUNDY KRAFT GFTBAG 3PK','Party / Gift Bags',{eventNumber:'40059',searchTerms:['small burgundy kraft gift bag 3 pack','burgundy kraft bags']});
upsertItem('327625','PLATES 10.25 CLR DOT DCL','Party / Gift Bags',{eventNumber:'40059',searchTerms:['plates 10.25 clear dot decal','clear dot plates']});
upsertItem('344011','CURLY BOWS 3CT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['curly bows 3 count','gift bows curly ribbon']});
upsertItem('379952','GIFTBAG LG BABY GENERAL','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag large baby general','large baby shower gift bag']});
upsertItem('380229','GIFTBAG XL BABY','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag xl baby extra large','xl baby gift bag']});
upsertItem('380234','GIFTBAG XL BRIDAL','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag xl bridal extra large','bridal gift bag xl']});
upsertItem('380249','LARGE BIRTHDAY CONFETTI HAPPY','Party / Gift Bags',{eventNumber:'40059',searchTerms:['large birthday confetti happy','happy birthday confetti pack']});
upsertItem('382823','GIFTBAG SM AO FLORAL VERTI 3PK','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag small all occasion floral vertical 3 pack','floral gift bags 3pk']});
upsertItem('383015','GIFT BAG XL BABY VERT','Party / Gift Bags',{eventNumber:'40059',searchTerms:['gift bag xl baby vertical','xl baby bag vertical design']});
upsertItem('383146','CORAL PLASTIC SCOOP SETS','Party / Gift Bags',{eventNumber:'40059',searchTerms:['coral plastic scoop set','party scoops coral']});
upsertItem('383165','BRIGHT MINT 14IN ROUND TRAY','Party / Gift Bags',{eventNumber:'40059',searchTerms:['bright mint 14 inch round tray','mint party tray']});
upsertItem('383166','CORAL 14IN ROUND TRAY','Party / Gift Bags',{eventNumber:'40059',searchTerms:['coral 14 inch round tray','coral round serving tray']});
upsertItem('383176','BRIGHT MINT PLASTIC SCOOP SETS','Party / Gift Bags',{eventNumber:'40059',searchTerms:['bright mint plastic scoop set','mint party scoops']});

// Personal Care (page 2)
upsertItem('312485','BATH BMB HEART 3PK','Personal Care',{eventNumber:'40058',searchTerms:['bath bomb heart 3 pack','heart bath bombs 3pk']});
upsertItem('329819','FACIAL WIPES-HIBISCUS ROSE','Personal Care',{eventNumber:'40058',searchTerms:['facial wipes hibiscus rose','hibiscus rose face wipes']});
upsertItem('333561','COMB-IN TEMP HAIR COLOR PDQ','Personal Care',{eventNumber:'40058',searchTerms:['comb in temporary hair color','temp hair color comb']});
upsertItem('333562','SEMI PERMANENT HAIR COLOR','Personal Care',{eventNumber:'40058',searchTerms:['semi permanent hair color','semi-permanent hair dye']});
upsertItem('333609','SG ORANGE SHEET MASK 1CT','Personal Care',{eventNumber:'40058',searchTerms:['sg orange sheet mask','orange face sheet mask']});
upsertItem('340498','MJM CHARCOAL SEAWEED FACE MSK','Personal Care',{eventNumber:'40058',searchTerms:['charcoal seaweed face mask','mjm charcoal seaweed mask']});
upsertItem('367265','YS CICA SHEET MASK','Personal Care',{eventNumber:'40058',searchTerms:['cica sheet mask','ys cica face mask']});
upsertItem('367358','MS RETINOL ANTI AGING SHT MASK','Personal Care',{eventNumber:'40058',searchTerms:['retinol anti aging sheet mask','retinol face mask']});
upsertItem('367359','MS CHARCOAL DTOX FCL SHT MASK','Personal Care',{eventNumber:'40058',searchTerms:['charcoal detox face sheet mask','charcoal detox mask']});
upsertItem('368377','BOLERO HAND CREAM 4OZ','Personal Care',{eventNumber:'40058',searchTerms:['bolero hand cream 4oz','hand lotion bolero 4oz']});
upsertItem('370426','GBC HYDROGEL FACE MASKS ASTD','Personal Care',{eventNumber:'40058',searchTerms:['hydrogel face masks assorted','gel face mask hydrogel']});
upsertItem('381725','BOL BB&SHWR TAB VANILLA HONEY','Personal Care',{eventNumber:'40058',searchTerms:['bath bomb shower tab vanilla honey','vanilla honey shower tab']});
upsertItem('382638','MDAY CARNATION FIZZER 7PC','Personal Care',{eventNumber:'40058',searchTerms:["mother's day carnation fizzer 7 pack",'carnation bath fizzer']});
upsertItem('382764','BP MDAY BATH SOAK W FLORAL','Personal Care',{eventNumber:'40058',searchTerms:["bath soak mothers day with flowers",'floral bath soak']});
upsertItem('382767','SS BP FRUITY SOAPS ASTD','Personal Care',{eventNumber:'40058',searchTerms:['fruity soaps assorted','fruity bath soaps']});
upsertItem('382768','BP PINEAPPLE BATH BOMB','Personal Care',{eventNumber:'40058',searchTerms:['pineapple bath bomb','bath bomb pineapple']});
upsertItem('217563','STUDIO ELF SHIMMER LIP GLS DRM','Beauty',{eventNumber:'40058',searchTerms:['studio elf shimmer lip gloss','shimmer lip gloss drama']});
upsertItem('347413','IONI BROW GEL CLR SCULPTING','Beauty',{eventNumber:'40058',searchTerms:['ioni brow gel clear sculpting','brow gel sculpting']});
upsertItem('382584','MDAY VIBRATING FACIAL MASSAGER','Beauty',{eventNumber:'40058',searchTerms:["mother's day vibrating facial massager",'vibrating face massager']});

// Books & Activity (pages 1 & 3)
upsertItem('212220','CRAYOLA CLASSIC 16PK CRAYONS','Books / Activity',{eventNumber:'40058',searchTerms:['crayola classic 16 pack crayons','crayons 16 pack']});
upsertItem('279567','LEARNING ACTIVITY WORKBOOK','Books / Activity',{eventNumber:'40058',searchTerms:['learning activity workbook','kids activity workbook']});
upsertItem('306872','DR SEUSS LASER CUT SHARPENER','Books / Activity',{eventNumber:'40058',searchTerms:['dr seuss laser cut sharpener','pencil sharpener dr seuss']});
upsertItem('320685','LARGE PRINT WORDSEARCH 96PG','Books / Activity',{eventNumber:'40058',searchTerms:['large print word search 96 page','large print wordsearch book']});
upsertItem('331603','BLANK BOOKS-8X8 4PK','Books / Activity',{eventNumber:'40058',searchTerms:['blank books 8x8 4 pack','blank journal 4 pack 8x8']});
upsertItem('355956','PBS ARTHUR 6X6 BOARD BOOK','Books / Activity',{eventNumber:'40058',searchTerms:['pbs arthur 6x6 board book','arthur board book kids']});
upsertItem('357103','JUMBO GLUE STICKS 2 PACK','Crafts',{eventNumber:'40058',searchTerms:['jumbo glue sticks 2 pack','large glue stick']});
upsertItem('357118','KIDS KLEENEARTH 5IN SCISSOR','Books / Activity',{eventNumber:'40058',searchTerms:['kids kleenearth 5 inch scissors','eco friendly kids scissors']});
upsertItem('366831','INSP GIFT BOOKS MOTHERS DAY','Books / Activity',{eventNumber:'40058',searchTerms:["inspirational gift books mothers day",'mothers day book gift']});
upsertItem('367147','SMALL POP-UP PLAYHOUSES','Toys',{eventNumber:'40058',searchTerms:['small pop up playhouse','popup playhouse toy']});
upsertItem('381934','DOLLAR TREE CRITTER CLUB ASTD','Books / Activity',{eventNumber:'40058',searchTerms:['dollar tree critter club assorted','critter club book assorted']});

// Crafts (page 1)
upsertItem('237370','CRFTSQ CORRUGATED WORDS STICKR','Crafts',{eventNumber:'40058',searchTerms:['crafters square corrugated word stickers','corrugated letters stickers']});
upsertItem('268192','CRFTSQ PMPKN ORNG ARYLC PNT 3Z','Crafts',{eventNumber:'40058',searchTerms:['crafters square orange acrylic paint 3oz','pumpkin orange paint']});
upsertItem('270343','CRFTSQ STENCIL SHEET ASTD','Crafts',{eventNumber:'40058',searchTerms:['crafters square stencil sheet assorted','stencil sheets crafts']});
upsertItem('296412','CRFTSQ STICKERS ETCHD GLSS ASTD','Crafts',{eventNumber:'40058',searchTerms:['crafters square etched glass stickers','etched glass sticker craft']});
upsertItem('318064','ACRYLIC YARN','Crafts',{eventNumber:'40058',searchTerms:['acrylic yarn','craft yarn']});
upsertItem('327852','CRFTSQ PALETTE SHEETS 15CT','Crafts',{eventNumber:'40058',searchTerms:['crafters square palette sheets 15 count','paint palette sheets']});
upsertItem('329495','CL JUST YARN ACRYLIC EMBER','Crafts',{eventNumber:'40058',searchTerms:['just yarn acrylic ember','ember acrylic yarn craft']});
upsertItem('333086','CRFTSQ WOOD BLACKBOARD ASTD','Crafts',{eventNumber:'40058',searchTerms:['crafters square wood blackboard assorted','wood chalkboard sign']});
upsertItem('337357','CRFTSQ FLRL GEM MNDR STKR ASTD','Crafts',{eventNumber:'40058',searchTerms:['crafters square floral gem meander sticker assorted','floral gem sticker sheet']});
upsertItem('343531','FABRIC CUTS 18X21 IN PDQ SLIDL','Crafts',{eventNumber:'40058',searchTerms:['fabric cuts 18x21 inch','fat quarter fabric cuts']});
upsertItem('344472','DRM RAINBOW MACRAME CRAFT KIT','Crafts',{eventNumber:'40058',searchTerms:['dream rainbow macrame craft kit','macrame kit rainbow diy']});
upsertItem('361100','MET GREEN ACRYLIC PAINT 3Z','Crafts',{eventNumber:'40058',searchTerms:['metallic green acrylic paint 3oz','green metallic craft paint']});

// Stationery (pages 1 & 4)
upsertItem('375273','FIVE COLUMN COLUMNAR PAD','Stationery',{eventNumber:'40058',searchTerms:['five column columnar pad','accounting columnar pad']});
upsertItem('375274','RETRACTABLE ERASERS 2PC','Stationery',{eventNumber:'40058',searchTerms:['retractable erasers 2 piece','click eraser retractable']});
upsertItem('375325','TIME CARD 50SH 8.9X3.4IN','Stationery',{eventNumber:'40058',searchTerms:['time card 50 sheets','employee time cards']});
upsertItem('178402','POSTER TACK 2 OZ','Stationery',{eventNumber:'40058',searchTerms:['poster tack 2 oz','adhesive putty poster']});

// Toys (page 4)
upsertItem('110144','ORIGAMI PLAY SETS','Toys',{eventNumber:'40059',searchTerms:['origami play sets','origami paper kit']});
upsertItem('171851','ART KIT SAND BOTTLE MAKEUROWN','Toys',{eventNumber:'40059',searchTerms:['art kit sand bottle make your own','sand art bottle diy']});
upsertItem('279861','SQUEEZE BEADS BALL PDQ','Toys',{eventNumber:'40059',searchTerms:['squeeze beads ball','squish bead ball toy']});
upsertItem('336401','BRB FARM UNICORN ASTD','Toys',{eventNumber:'40059',searchTerms:['barbie farm unicorn assorted','barbie unicorn toy']});
upsertItem('339115','BRB DREAMTOPIA ACCS ASTD','Toys',{eventNumber:'40059',searchTerms:['barbie dreamtopia accessories assorted','dreamtopia barbie set']});
upsertItem('383662','BO CYLINDER PROJECTOR PDQ','Toys',{eventNumber:'40059',searchTerms:['cylinder projector toy pdq','mini projector toy kids']});

console.log(`  Items from price reports: +${stats.newItemsAdded} new, ${stats.duplicatesSkipped} already existed`);

// ── STEP 2: Add new items confirmed from product photos ──

console.log('\n[STEP 2] Adding items confirmed from product photos...');

const beforeStep2 = db.items.length;
upsertItem('','NONSLIP SHELF LINER 12X72IN','Household',{
  source:'TikTok penny haul Part 2 - product photo confirmed',
  searchTerms:['nonslip shelf liner 12x72','non slip shelf liner','cabinet liner non-adhesive'],
  tags:['batch import','photo confirmed'],
});
upsertItem('','LUMINESSENCE GREEN TEA AND BAMBOO WAX MELTS 6PC','Candles / Home Fragrance',{
  source:'TikTok penny haul Part 2 - product photo confirmed',
  searchTerms:['luminessence green tea bamboo wax melts 6','wax melts green tea bamboo','scented wax melts 6 count'],
  tags:['batch import','photo confirmed'],
});
upsertItem('','CAREUS NASAL STRIPS 8CT','Personal Care',{
  source:'TikTok penny haul Part 2 - product photo confirmed',
  searchTerms:['careus nasal strips 8 count','nasal breathing strips','anti snoring strips careus'],
  tags:['batch import','photo confirmed'],
});
console.log(`  +${db.items.length - beforeStep2} items from product photos`);

// ── STEP 3: Update SKUs for existing items where back labels showed SKU ──

console.log('\n[STEP 3] Updating SKUs from back label photos...');
const angelOfMine = db.items.find(i => i.description && i.description.includes('ANGEL OF MINE'));
if (angelOfMine && !angelOfMine.sku) {
  angelOfMine.sku = '378417';
  stats.existingUpdated++;
  console.log(`  Updated SKU for ANGEL OF MINE: 378417`);
}

// ── STEP 4: Attach clean product photos ──

console.log('\n[STEP 4] Attaching product photos...');

const photoMap = [
  // [descriptionKeyword, imageFile, confidence]
  ['THINK POSITIVE',                      'batch1_023.jpeg', 'high'],
  ['HOME COLLECTION RED DISH TOWELS',     'batch1_024.jpeg', 'high'],
  ['MONSTER TRUCKS 5 SURPRISE',           'batch1_030.jpeg', 'high'],
  ['BATHROOM CLEANER CONCENTRATED PODS',  'batch1_031.jpeg', 'high'],
  ['WHITE RAIN OCEAN MIST BODY WASH',     'batch1_032.jpeg', 'high'],
  ['HOME IS WHEREVER WE ARE TOGETHER',    'batch1_040.jpeg', 'high'],
  ['YOU ARE MY PERSON SIGN',              'batch1_042.jpeg', 'high'],
  ['MUIR GLEN TOMATO PUREE',              'batch1_044.jpeg', 'high'],
  ['HOMELINE CASCADING WATERS',           'batch1_046.jpeg', 'high'],
  ['GOOD & CLEAN DISINFECTANT WIPES',     'batch1_051.jpeg', 'high'],
  ['ZEST SIMPLY OCEAN WAVE',              'batch1_052.jpeg', 'high'],
  ['AIR FRESH LAVENDER & PATCHOULI',      'batch1_054.jpeg', 'high'],
  ['FILLER PAPER 200 SHEETS',             'batch1_056.jpeg', 'high'],
  ['AIR FRESH WATERFALL SCENTED CANDLE',  'batch1_057.jpeg', 'high'],
  ['ANGEL OF MINE BABY ROOM',             'batch1_069.jpeg', 'high'],
  ['AMOPE GEL ACTIV HEEL PROTECTORS',     'batch1_070.jpeg', 'high'],
  ['GREAT NORTHERN BEANS',                'batch1_078.jpeg', 'high'],
  ['FROZEN II SHAMPOO',                   'batch1_079.jpeg', 'high'],
  ['SUNNY DAZE DECOR SIGN',               'batch1_004.jpeg', 'medium'],
  // New items from step 2 also get their photos
  ['NONSLIP SHELF LINER',                 'batch1_045.jpeg', 'high'],
  ['LUMINESSENCE GREEN TEA AND BAMBOO',   'batch1_060.jpeg', 'high'],
  ['CAREUS NASAL STRIPS',                 'batch1_064.jpeg', 'high'],
];

for (const [keyword, file, conf] of photoMap) {
  attachPhoto(keyword, file, conf);
}

// ── STEP 5: Admin review queue for low-confidence / ambiguous images ──

console.log('\n[STEP 5] Building admin review queue...');

db.photoReviewQueue = db.photoReviewQueue || [];
// Clear any stale entries from this batch before re-adding
db.photoReviewQueue = db.photoReviewQueue.filter(e => !e.id.startsWith('review_'));

addReview('batch1_035.jpeg','Back label of pink gradient box (Old Williamsburgh Candle Corp). Could not identify scent/product from back label alone. Front photo needed.','unclear');
addReview('batch1_036.jpeg','Novelty dinosaur (teal stegosaurus) pen on pink card. Dollar Tree Huge Penny Haul Part 2. Possible penny item — confirm item name and add to list.','new_item_candidate');
addReview('batch1_037.jpeg','Novelty avocado pen (avocado charm, pink handle) on pink card. Dollar Tree Huge Penny Haul Part 2. Possible penny item.','new_item_candidate');
addReview('batch1_038.jpeg','Novelty rainbow pen (rainbow charm, light blue handle). Dollar Tree Huge Penny Haul Part 2. Possible penny item.','new_item_candidate');
addReview('batch1_041.jpeg','Two items on table: (1) "Enjoy the Little Things in Life" stemless wine glass with blue script, (2) solid dark navy ceramic mug. Both from TikTok haul — confirm if penny items.','new_item_candidate');
addReview('batch1_061.jpeg','Multiple women\'s flip flops/sandals on hangers: watermelon stripe, lemon print, orange print, tie-dye, tropical leaf. Multiple possible new items.','new_item_candidate');
addReview('batch1_063.jpeg','Product back label only — Shanghai Care US Medical Product Co Ltd, barcode 6970285515787, SKU 554897 2305. Product type unknown without front.','unclear');
addReview('batch1_065.jpeg','Product back label only — Greenbrier International Inc, barcode 6392774327974, SKU 259399 2009. Could not identify product.','unclear');
addReview('batch1_066.jpeg','Blurry photo of toothbrushes with tray & holder 6-pack in clear bag. Possible new item — photo too blurry to add confidently.','blurry');
addReview('batch1_067.jpeg','Very blurry multi-item table shot — multiple products visible including packaging for personal care items. Too blurry to identify.','blurry');
addReview('batch1_077.jpeg','Women\'s Juncture brand flip flop hang tag: size M (7/8), SKU 288635 2317, UPC 195464098684. New apparel item from Penny Haul Part 2.','new_item_candidate');
addReview('batch1_080.jpeg','Blurry action shot of Juncture KIDS flip flops. Different item from the adult version (077). Needs clean photo.','blurry');

console.log(`  ${stats.reviewQueueItems} items added to admin review queue`);

// ── STEP 6: Save batch import summary ──

db.batchImports = db.batchImports || [];
db.batchImports = db.batchImports.filter(b => b.id !== 'batch1_tiktok');
db.batchImports.push({
  id: 'batch1_tiktok',
  name: 'TikTok penny screenshots batch 1',
  zipFile: 'dtpennyroute_uploaded_screenshots_batch1.zip',
  processedAt: new Date().toISOString(),
  stats: {
    imagesTotal: 92,
    scannerProofsFound: 22,
    productPhotosUsable: 23,
    priceChangeReportPages: 6,
    appScreenshotsSkipped: 10,
    existingItemsMatched: stats.duplicatesSkipped,
    existingItemsUpdated: stats.existingUpdated,
    newItemsCreated: stats.newItemsAdded,
    photosAttached: stats.photosAttached,
    adminReviewItems: stats.reviewQueueItems,
    itemsBefore: stats.itemsBefore,
    itemsAfter: db.items.length,
  }
});

// ── Save ──

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

console.log('\n╔════════════════════════════════════════╗');
console.log('║      BATCH IMPORT COMPLETE             ║');
console.log('╚════════════════════════════════════════╝');
console.log(`  Images processed:        92`);
console.log(`  Items before:            ${stats.itemsBefore}`);
console.log(`  New items added:         ${stats.newItemsAdded}`);
console.log(`  Existing matched/tagged: ${stats.duplicatesSkipped}`);
console.log(`  Existing SKUs updated:   ${stats.existingUpdated}`);
console.log(`  Product photos attached: ${stats.photosAttached}`);
console.log(`  Scanner proofs found:    22`);
console.log(`  Admin review queue:      ${stats.reviewQueueItems} images`);
console.log(`  Items after:             ${db.items.length}`);
