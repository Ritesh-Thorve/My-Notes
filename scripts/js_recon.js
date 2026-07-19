import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_URL = 'https://pinterest.com';
const OUTPUT_DIR = path.join(__dirname, 'js_recon_output');

// Additional in-scope domains beyond the primary target's own subdomains.
// Confirm each of these against your program's current scope before adding.
const EXTRA_IN_SCOPE_DOMAINS = ['pinimg.com'];

// Optional: path to a JSON file containing cookies exported from your logged-in
// session (e.g. via the "Cookie-Editor" browser extension, "Export" -> JSON).
// Leave as-is if you don't want to crawl authenticated.
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox']
  });

  const page = await browser.newPage();
  const targetDomain = new URL(TARGET_URL).hostname;

  const discoveredUrls = new Set();
  const seenHashes = new Set();
  const manifest = [];

  page.on('response', async (response) => {
    const urlStr = response.url();

    try {
      const urlObj = new URL(urlStr);
      const isJs = urlStr.endsWith('.js') || response.headers()['content-type']?.includes('javascript');

      // Pull scripts from the target domain/subdomains, plus any confirmed
      // in-scope extra domains (e.g. asset CDNs) listed above.
      const isTargetDomain =
        urlObj.hostname.endsWith(targetDomain) ||
        EXTRA_IN_SCOPE_DOMAINS.some((d) => urlObj.hostname.endsWith(d));

      if (isJs && isTargetDomain && !discoveredUrls.has(urlStr)) {
        discoveredUrls.add(urlStr);

        const text = await response.text();
        const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

        if (seenHashes.has(hash)) {
          console.log(`[=] Duplicate content, skipping: ${urlStr}`);
          return;
        }
        seenHashes.add(hash);

        console.log(`[+] Discovered: ${urlStr}`);

        const safeFilename = urlObj.pathname.replace(/[^a-z0-9.]/gi, '_').replace(/^_+|_+$/g, '') || 'index.js';
        const finalFilename = `${urlObj.hostname}_${hash}_${safeFilename}`;
        const finalPath = path.join(OUTPUT_DIR, finalFilename);

        fs.writeFileSync(finalPath, text);
        manifest.push({
          url: urlStr,
          hostname: urlObj.hostname,
          hash,
          savedAs: finalFilename,
          sizeBytes: Buffer.byteLength(text)
        });

        console.log(`    Saved to: ${finalPath}`);
      }
    } catch (err) {
      // Handles aborted requests, 404s, CORS preflights, etc.
    }
  });

  console.log(`[*] Starting recon on: ${TARGET_URL}`);

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const rawCookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
      // Cookie-Editor's export format matches Puppeteer's setCookie shape closely
      // enough, but normalize the couple of fields that commonly differ.
      const cookies = rawCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure ?? true,
        httpOnly: c.httpOnly ?? false,
        sameSite: ['Strict', 'Lax', 'None'].includes(c.sameSite) ? c.sameSite : undefined
      }));
      await page.setCookie(...cookies);
      console.log(`[*] Loaded ${cookies.length} cookies from ${COOKIES_FILE} — crawling authenticated.`);
    } catch (err) {
      console.log(`[!] Failed to load cookies from ${COOKIES_FILE}: ${err.message} — continuing unauthenticated.`);
    }
  } else {
    console.log('[*] No cookies file found — crawling unauthenticated.');
  }

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (err) {
    console.log(`[!] Navigation warning: ${err.message} (continuing — some scripts may still have loaded)`);
  }

  // Pinterest is a heavily lazy-loaded SPA — a lot of its JS only fetches once
  // the feed scrolls, a pin is opened, etc. Simulate that instead of relying
  // on the initial page load alone.
  console.log('[*] Triggering lazy-loaded content (scroll pass)...');
  for (let i = 0; i < 6; i++) {
    try {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    } catch (err) {
      // Page navigated mid-scroll (e.g. auth redirect settling) — wait for it
      // to finish loading, then resume on the next iteration.
      console.log(`[!] Scroll ${i + 1} interrupted by navigation, waiting for it to settle...`);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('[*] Attempting to open a pin to trigger detail-view bundles...');
  try {
    const pinLink = await page.$('a[href^="/pin/"]');
    if (pinLink) {
      await pinLink.click();
      await new Promise((r) => setTimeout(r, 3000));
      await page.goBack().catch(() => {});
    } else {
      console.log('[!] No pin link found to click.');
    }
  } catch (err) {
    console.log(`[!] Pin-click warning: ${err.message}`);
  }

  // Let any remaining in-flight requests settle
  await new Promise((r) => setTimeout(r, 2000));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_manifest.json'),
    JSON.stringify({ target: TARGET_URL, scannedAt: new Date().toISOString(), files: manifest }, null, 2)
  );

  console.log(`\n[*] Recon complete. Found ${discoveredUrls.size} unique target scripts (${manifest.length} unique by content hash).`);
  console.log(`[*] Manifest written to ${path.join(OUTPUT_DIR, '_manifest.json')}`);

  await browser.close();
})();
