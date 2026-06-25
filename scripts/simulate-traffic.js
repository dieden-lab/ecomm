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
  { name: 'bounce', weight: 20 },
  { name: 'browse_only', weight: 25 },
  { name: 'add_no_purchase', weight: 20 },
  { name: 'full_purchase', weight: 35 },
];

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

function randomPdpUrl() {
  const id = randomInt(1, 10);
  return `/pdp.html?id=${id}`;
}

async function humanScroll(page) {
  const scrolls = randomInt(2, 5);
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.random() * 400 + 100));
    await sleep(randomInt(500, 1500));
  }
}

async function journeyBounce(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(3000, 8000));
}

async function journeyBrowseOnly(page, source) {
  await page.goto(buildUrl('/', source), { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(2000, 4000));

  await page.goto(SITE_URL + '/plp.html', { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(3000, 6000));

  await page.goto(SITE_URL + randomPdpUrl(), { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(4000, 8000));
}

async function journeyAddNoPurchase(page, source) {
  await journeyBrowseOnly(page, source);

  // Tenta click su "Add to cart"
  const addBtn = page.locator('button').filter({ hasText: /add to cart|aggiungi al carrello/i }).first();
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click();
    await sleep(randomInt(1000, 2000));
  }

  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(5000, 12000));
  // Abbandona qui
}

async function journeyFullPurchase(page, source) {
  await journeyBrowseOnly(page, source);

  // Add to cart
  const addBtn = page.locator('button').filter({ hasText: /add to cart|aggiungi al carrello/i }).first();
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click();
    await sleep(randomInt(1000, 2000));
  }

  // Cart
  await page.goto(SITE_URL + '/cart.html', { waitUntil: 'networkidle' });
  await sleep(randomInt(2000, 4000));

  // Checkout
  await page.goto(SITE_URL + '/checkout.html', { waitUntil: 'networkidle' });
  await humanScroll(page);
  await sleep(randomInt(3000, 6000));

  // Compila anagrafica — adatta i selettori se necessario
  const fields = [
    { selector: 'input[name="name"], input[id="name"], input[placeholder*="nome" i]', value: randomName() },
    { selector: 'input[name="email"], input[type="email"], input[id="email"]', value: randomEmail() },
    { selector: 'input[name="address"], input[id="address"], input[placeholder*="indirizzo" i]', value: randomAddress() },
    { selector: 'input[name="city"], input[id="city"], input[placeholder*="città" i]', value: 'Milano' },
    { selector: 'input[name="zip"], input[id="zip"], input[placeholder*="cap" i]', value: '20100' },
  ];

  for (const field of fields) {
    const el = page.locator(field.selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(field.value);
      await sleep(randomInt(300, 700));
    }
  }

  await sleep(randomInt(2000, 4000));

  // Submit ordine
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /completa|place order|acquista|conferma/i }).first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForURL('**/thankyou**', { timeout: 10000 }).catch(() => {});
  } else {
    await page.goto(SITE_URL + '/thankyou.html', { waitUntil: 'networkidle' });
  }

  await sleep(randomInt(3000, 6000));
}

function randomName() {
  const first = ['Luca', 'Marco', 'Anna', 'Sara', 'Giulia', 'Paolo', 'Elena', 'Matteo'];
  const last = ['Rossi', 'Ferrari', 'Bianchi', 'Romano', 'Colombo', 'Ricci'];
  return `${first[randomInt(0, first.length - 1)]} ${last[randomInt(0, last.length - 1)]}`;
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
    httpCredentials: {
      username: BASIC_AUTH_USER,
      password: BASIC_AUTH_PASS,
    },
  });

  const page = await context.newPage();

  try {
    switch (journey.name) {
      case 'bounce':          await journeyBounce(page, source); break;
      case 'browse_only':     await journeyBrowseOnly(page, source); break;
      case 'add_no_purchase': await journeyAddNoPurchase(page, source); break;
      case 'full_purchase':   await journeyFullPurchase(page, source); break;
    }
    console.log(`[Session ${sessionId}] ✓ completata`);
  } catch (err) {
    console.error(`[Session ${sessionId}] ✗ errore:`, err.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

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
