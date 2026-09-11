const { chromium } = require('playwright');

const SITE_URL = process.env.SITE_URL || 'https://ecomm-pi-ivory.vercel.app';
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'merkle';
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || '';
const TOTAL_SESSIONS = parseInt(process.env.SESSIONS || '100');
const CONCURRENCY = 3;

const SOURCES = [
  { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand' },
  { utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'spring_sale' },
  { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'weekly' },
  { utm_source: 'google', utm_medium: 'organic', utm_campaign: null },
  { utm_source: '(direct)', utm_medium: '(none)', utm_campaign: null },
  { utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'retargeting' },
];

const DEVICES = [
  { name: 'iPhone 14', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 }, isMobile: true, weight: 20 },
  { name: 'Samsung Galaxy S23', userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36', viewport: { width: 360, height: 780 }, isMobile: true, weight: 20 },
  { name: 'iPhone 13 Mini', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1', viewport: { width: 375, height: 812 }, isMobile: true, weight: 20 },
  { name: 'Windows Chrome', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', viewport: { width: 1440, height: 900 }, isMobile: false, weight: 15 },
  { name: 'MacOS Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15', viewport: { width: 1280, height: 800 }, isMobile: false, weight: 15 },
  { name: 'iPad Air', userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1', viewport: { width: 820, height: 1180 }, isMobile: true, weight: 10 },
];

const JOURNEYS = [
  { name: 'bounce',          weight: 20 },
  { name: 'browse_only',     weight: 25 },
  { name: 'add_no_purchase', weight: 20 },
  { name: 'full_purchase',   weight: 35 },
];

function weightedRandom(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildUrl(path, source) {
  const url = new URL(SITE_URL + path);
  if (source.utm_source && source.utm_source !== '(direct)') {
    url.searchParams.set('utm_source', source.utm_source);
    url.searchParams.set('utm_medium', source.utm_medium);
    if (source.utm_campaign) url.searchParams.set('utm_campaign', source.utm_campaign);
  }
  return url.toString();
}

function randomPdpUrl() { return `/pdp.html?id=${randomInt(1, 10)}`; }

async function humanScroll(page) {
  const scrolls = randomInt(2, 5);
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.random() * 400 + 100));
    await sleep(randomInt(500, 1500));
  }
}

function randomFirstName() {
  const names = ['Luca', 'Marco', 'Anna', 'Sara', 'Giulia', 'Paolo', 'Elena', 'Matteo', 'Chiara', 'Davide'];
  return names[randomInt(0, names.length - 1)];
}
function randomLastName() {
  const names = ['Rossi', 'Ferrari', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Esposito', 'Bruno'];
  return names[randomInt(0, names.length - 1)];
}
function randomEmail() {
  const domains = ['gmail.com', 'yahoo.it', 'hotmail.com', 'libero.it'];
  const rand = Math.random().toString(36).substring(2, 8);
  return `test.${rand}@${domains[randomInt(0, domains.length - 1)]}`;
}
function randomAddress() {
  const streets = ['Via Roma', 'Corso Italia', 'Via Garibaldi', 'Piazza Duomo', 'Via Manzoni'];
  return `${streets[randomInt(0, streets.length - 1)]} ${randomInt(1, 100)}`;
}

// ── FIX Bug 1: seleziona taglia prima di cliccare add-btn ──────────
async function addToCart(page) {
  const sizeBtn = page.locator('.size-btn').first();
  const sizeVisible = await sizeBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (sizeVisible) {
    await sizeBtn.click();
    await sleep(randomInt(500, 1000));
    console.log('  → size selected');
  }

  const addBtn = page.locator('#add-btn').first();
  const addVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (addVisible) {
    const isDisabled = await addBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      await addBtn.click();
      await sleep(randomInt(1000, 2000));
      console.log('  → add_to_cart fired');
      return true;
    }
  }
  console.log('  → add_to_cart SKIPPED (btn not ready)');
  return false;
}

// ── JOURNEY: bounce ────────────────────────────────────────────────
async function journeyBounce(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(500, 1000));
  await humanScroll(page);
  await sleep(randomInt(3000, 8000));
}

// ── JOURNEY: browse only ───────────────────────────────────────────
async function journeyBrowseOnly(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(500, 1000));
  await humanScroll(page);
  await sleep(randomInt(2000, 4000));

  await page.goto(SITE_URL + '/plp.html', { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(500, 1000));
  await humanScroll(page);
  await sleep(randomInt(3000, 6000));

  await page.goto(SITE_URL + randomPdpUrl(), { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(500, 1000));
  await humanScroll(page);
  await sleep(randomInt(4000, 8000));
}

// ── JOURNEY: add no purchase ───────────────────────────────────────
async function journeyAddNoPurchase(page, source) {
  await journeyBrowseOnly(page, source);
  await addToCart(page);

  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(500, 1000));
  await humanScroll(page);
  await sleep(randomInt(5000, 12000));
  // Abbandona — non clicca proceed
}

// ── JOURNEY: full purchase ─────────────────────────────────────────
async function journeyFullPurchase(page, source) {
  await journeyBrowseOnly(page, source);

  // FIX Bug 1: size selection + add to cart
  const added = await addToCart(page);
  if (!added) {
    console.log('  → full_purchase aborted: could not add to cart');
    return;
  }

  // Cart page
  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'domcontentloaded' });
  await sleep(randomInt(1000, 2000));
  await humanScroll(page);
  await sleep(randomInt(2000, 4000));

  // FIX Bug 2: clicca "Proceed to Checkout" → triggera begin_checkout
  const checkoutBtn = page.locator('button').filter({ hasText: /proceed to checkout/i }).first();
  const checkoutBtnVisible = await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (checkoutBtnVisible) {
    await checkoutBtn.click();
    await page.waitForURL('**/checkout**', { timeout: 8000 }).catch(() => {});
    console.log('  → begin_checkout fired');
    await sleep(randomInt(1000, 2000));
  } else {
    await page.goto(SITE_URL + '/checkout.html', { waitUntil: 'domcontentloaded' });
    console.log('  → checkout direct nav (begin_checkout NOT fired)');
  }

  await sleep(randomInt(1000, 2000));
  await humanScroll(page);

  // Compila form — IDs aggiornati con prefisso f-
  const fields = [
    { selector: '#f-email',   value: randomEmail() },
    { selector: '#f-fname',   value: randomFirstName() },
    { selector: '#f-lname',   value: randomLastName() },
    { selector: '#f-address', value: randomAddress() },
    { selector: '#f-city',    value: 'Milano' },
    { selector: '#f-zip',     value: String(randomInt(10000, 99999)) },
  ];

  for (const field of fields) {
    const el = page.locator(field.selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(field.value);
      await sleep(randomInt(300, 600));
    }
  }

  // FIX Bug 3: clicca Express → change event → add_shipping_info
  const shippingOptions = page.locator('input[name="ship"]');
  const shipCount = await shippingOptions.count();
  if (shipCount > 1) {
    await shippingOptions.nth(1).click();
    await sleep(randomInt(500, 1000));
    console.log('  → add_shipping_info fired (express)');
  }

  // Dati carta (decorativi)
  const cardFields = [
    { selector: '#f-card', value: '4111 1111 1111 1111' },
    { selector: '#f-exp',  value: '12 / 27' },
    { selector: '#f-cvv',  value: String(randomInt(100, 999)) },
  ];
  for (const field of cardFields) {
    const el = page.locator(field.selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(field.value);
      await sleep(randomInt(200, 500));
    }
  }
  // Attendi beacon add_payment_info prima di procedere
  await waitForGA4Beacon(page, 4000);
  console.log('  → add_payment_info fired');

  await sleep(randomInt(1000, 2000));

  // Place Order
  const submitBtn = page.locator('#place-btn').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForURL('**/thankyou**', { timeout: 10000 }).catch(() => {});
    console.log('  → purchase fired');
    await sleep(randomInt(3000, 6000));
  } else {
    console.log('  → place-btn NOT found');
  }
}

// ── RUNNER ─────────────────────────────────────────────────────────
async function runSession(sessionId) {
  const device  = weightedRandom(DEVICES);
  const source  = SOURCES[randomInt(0, SOURCES.length - 1)];
  const journey = weightedRandom(JOURNEYS);

  console.log(`[S${sessionId}] ${device.name} | ${journey.name} | ${source.utm_source}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: device.userAgent,
    viewport: device.viewport,
    isMobile: device.isMobile,
    httpCredentials: { username: BASIC_AUTH_USER, password: BASIC_AUTH_PASS },
  });

  const page = await context.newPage();

  try {
    switch (journey.name) {
      case 'bounce':           await journeyBounce(page, source);         break;
      case 'browse_only':      await journeyBrowseOnly(page, source);      break;
      case 'add_no_purchase':  await journeyAddNoPurchase(page, source);   break;
      case 'full_purchase':    await journeyFullPurchase(page, source);    break;
    }
    console.log(`[S${sessionId}] ✓`);
  } catch (err) {
    console.error(`[S${sessionId}] ✗`, err.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  console.log(`🚀 ${TOTAL_SESSIONS} sessioni, concurrency ${CONCURRENCY}`);
  const queue = Array.from({ length: TOTAL_SESSIONS }, (_, i) => i + 1);
  let active = 0, completed = 0;

  await new Promise(resolve => {
    function next() {
      while (active < CONCURRENCY && queue.length > 0) {
        const id = queue.shift();
        active++;
        const delay = randomInt(0, 30000);
        sleep(delay).then(() => runSession(id)).then(() => {
          active--;
          completed++;
          console.log(`Progress: ${completed}/${TOTAL_SESSIONS}`);
          if (completed === TOTAL_SESSIONS) resolve();
          else next();
        });
      }
    }
    next();
  });

  console.log('✅ Completato');
}

main().catch(console.error);
