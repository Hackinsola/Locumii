// Captures public/og.png (1200×630) as a real screenshot of the landing page — so the
// social card matches the live site exactly. One-off tool; needs playwright + sharp
// (not project deps). Run the dev server, then:
//   OG_URL=http://localhost:5175/ node scripts/og-screenshot.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.env.OG_URL || 'http://localhost:5173/';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2200); // let entrance animations settle
const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

// Downscale the 2x capture to exactly 1200×630 for a crisp OG asset.
await sharp(buffer).resize(1200, 630).png().toFile(out);
console.log('Wrote', out);
