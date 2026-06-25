const { chromium } = require('playwright');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SITE_URL = process.env.SITE_URL || 'https://your-merkle-shop.vercel.app';
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || '';
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || '';
const TOTAL_SESSIONS = parseInt(process.env.SESSIONS || '100');
const CONCURRENCY = 3; // sessioni parallele

// ─── DATI FAKE ─────────────────────────────────────────────────────────────
const SOURCES = [
  { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand' },
  { utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'spring_sale' },
  { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'weekly' },
  { utm_source: 'google', utm_medium: 'organic', utm_campaign: null },
  { utm_source: '(direct)', utm_medium: '(none)', utm_campaign: null },
  { utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'retargeting' },
];

const DEVICES = [
  // Mobile (60%)
  { name: 'iPhone 14', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 }, isMobile: true, weight: 20 },
  { name: 'Samsung Galaxy S23', userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36', viewport: { width: 360, height: 780 }, isMobile: true, weight: 20 },
  { name: 'iPhone 13 Mini', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1', viewport: { width: 375, height: 812 }, isMobile: true, weight: 20 },
  // Desktop (30%)
  { name: 'Windows Chrome', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', viewport: { width: 1440, height: 900 }, isMobile: false, weight: 15 },
  { name: 'MacOS Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15', viewport: { width: 1280, height: 800 }, isMobile: false, weight: 15 },
  // Tablet (10%)
  { name: 'iPad Air', userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1', viewport: { width: 820, height: 1180 }, isMobile: true, weight: 10 },
];

// Journey types con probabilità diverse
const JOURNEYS = [
  { name: 'bounce', weight: 20 },           // homepage + bounce
  { name: 'browse_only', weight: 25 },       // homepage → PLP → PDP
  { name: 'add_no_purchase', weight: 20 },   // → cart → abbandono
  { name: 'full_purchase', weight: 35 },     // → checkout → thank you
];

// ─── UTILS ─────────────────────────────────────────────────────────────────
function weightedRandom(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildUrl(path, source) {
  const url = new URL(SITE_URL + path);
  if (source.utm_source && source.utm_source !== '(direct)') {
    url.searchParams.set('utm_source', source.utm_source);
    url.searchParams.set('utm_medium', source.utm_medium);
    if (source.utm_campaign) url.searchParams.set('utm_campaign', source.utm_campaign);
  }
  return url.toString();
}

async function humanScroll(page) {
  const scrolls = randomInt(2, 5);
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.random() * 400 + 100));
    await sleep(randomInt(500, 1500));
  }
}

// ─── JOURNEY HANDLERS ──────────────────────────────────────────────────────
async function journeyBounce(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(3000, 8000));
}

async function journeyBrowseOnly(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(2000, 4000));

  // Vai alla PLP (adatta il path al tuo sito)
  const plpLinks = ['/category.html', '/products.html', '/shop.html'];
  const plpPath = plpLinks[randomInt(0, plpLinks.length - 1)];
  await page.goto(SITE_URL + plpPath, { waitUntil: 'networkidle' }).catch(() => {});
  await humanScroll(page);
  await sleep(randomInt(3000, 6000));

  // Vai a una PDP
  const pdpLinks = ['/product.html', '/product-detail.html'];
  const pdpPath = pdpLinks[randomInt(0, pdpLinks.length - 1)];
  await page.goto(SITE_URL + pdpPath, { waitUntil: 'networkidle' }).catch(() => {});
  await humanScroll(page);
  await sleep(randomInt(4000, 8000));
}

async function journeyAddNoPurchase(page, source) {
  await journeyBrowseOnly(page, source);

  // Add to cart
  const addBtn = page.locator('button').filter({ hasText: /add to cart|aggiungi/i }).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await sleep(randomInt(1000, 2000));
  }

  // Vai al cart
  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'networkidle' }).catch(() => {});
  await humanScroll(page);
  await sleep(randomInt(5000, 12000));
  // Abbandona (non fa checkout)
}

async function journeyFullPurchase(page, source) {
  await journeyBrowseOnly(page, source);

  // Add to cart
  const addBtn = page.locator('button').filter({ hasText: /add to cart|aggiungi/i }).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await sleep(randomInt(1000, 2000));
  }

  // Cart
  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(randomInt(2000, 4000));

  // Checkout
  await page.goto(SITE_URL + '/checkout.html', { waitUntil: 'networkidle' }).catch(() => {});
  await humanScroll(page);
  await sleep(randomInt(8000, 15000));

  // Compila form checkout (adatta i selettori al tuo sito)
  const fields = [
    { selector: 'input[name="name"], input[placeholder*="name" i], #name', value: randomName() },
    { selector: 'input[name="email"], input[type="email"], #email', value: randomEmail() },
    { selector: 'input[name="address"], input[placeholder*="address" i], #address', value: randomAddress() },
  ];
  for (const field of fields) {
    const el = page.locator(field.selector).first();
    if (await el.isVisible().catch(() => false)) {
      await el.fill(field.value);
      await sleep(randomInt(300, 700));
    }
  }

  // Submit
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /place order|completa|acquista/i }).first();
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    await page.waitForURL('**/thank-you**', { timeout: 10000 }).catch(() => {});
  } else {
    // Vai direttamente alla thank-you se il form non è compilabile
    await page.goto(SITE_URL + '/thank-you.html', { waitUntil: 'networkidle' }).catch(() => {});
  }

  await sleep(randomInt(3000, 6000));
}

// ─── FAKE DATA GENERATORS ──────────────────────────────────────────────────
function randomName() {
  const first = ['Luca', 'Marco', 'Anna', 'Sara', 'Giulia', 'Paolo', 'Elena', 'Matteo'];
  const last = ['Rossi', 'Ferrari', 'Bianchi', 'Romano', 'Colombo', 'Ricci'];
  return `${first[randomInt(0, first.length - 1)]} ${last[randomInt(0, last.length - 1)]}`;
}

function randomEmail() {
  const domains = ['gmail.com', 'yahoo.it', 'hotmail.com', 'libero.it', 'outlook.com'];
  const rand = Math.random().toString(36).substring(2, 8);
  return `test.${rand}@${domains[randomInt(0, domains.length - 1)]}`;
}

function randomAddress() {
  const streets = ['Via Roma', 'Corso Italia', 'Via Garibaldi', 'Piazza Duomo', 'Via Manzoni'];
  return `${streets[randomInt(0, streets.length - 1)]} ${randomInt(1, 100)}, Milano`;
}

// ─── SESSION RUNNER ─────────────────────────────────────────────────────────
async function runSession(sessionId) {
  const device = weightedRandom(DEVICES);
  const source = SOURCES[randomInt(0, SOURCES.length - 1)];
  const journey = weightedRandom(JOURNEYS);

  console.log(`[Session ${sessionId}] Device: ${device.name} | Journey: ${journey.name} | Source: ${source.utm_source}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: device.userAgent,
    viewport: device.viewport,
    isMobile: device.isMobile,
    ...(BASIC_AUTH_USER ? { httpCredentials: { username: BASIC_AUTH_USER, password: BASIC_AUTH_PASS } } : {}),
  });

  const page = await context.newPage();

  try {
    switch (journey.name) {
      case 'bounce':           await journeyBounce(page, source); break;
      case 'browse_only':      await journeyBrowseOnly(page, source); break;
      case 'add_no_purchase':  await journeyAddNoPurchase(page, source); break;
      case 'full_purchase':    await journeyFullPurchase(page, source); break;
    }
    console.log(`[Session ${sessionId}] ✓ completata`);
  } catch (err) {
    console.error(`[Session ${sessionId}] ✗ errore:`, err.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Avvio simulazione: ${TOTAL_SESSIONS} sessioni, concurrency ${CONCURRENCY}`);

  const queue = Array.from({ length: TOTAL_SESSIONS }, (_, i) => i + 1);
  let active = 0;
  let completed = 0;

  await new Promise((resolve) => {
    function next() {
      while (active < CONCURRENCY && queue.length > 0) {
        const id = queue.shift();
        active++;
        // Delay random tra sessioni (0-30s) per evitare burst
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

  console.log('✅ Simulazione completata');
}

main().catch(console.error);
