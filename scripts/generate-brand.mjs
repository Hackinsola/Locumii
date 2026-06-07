// Generates brand assets into public/brand/ rendered with the real Geist font via
// headless Chrome (so they match the landing exactly), then sharp-sizes them.
// One-off tool; needs playwright + sharp (install together, --no-save):
//   npm install --no-save sharp playwright && node scripts/generate-brand.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');

const GREEN = '#3ECF8E';
const INK = '#1a1a1a';

// Shift-bars mark at a given pixel height (keeps the Logo.jsx proportions).
const mark = (h) =>
  `<svg width="${(h * 22) / 26}" height="${h}" viewBox="0 0 22 26" fill="none">
     <rect x="0" y="4" width="22" height="9" rx="3" fill="${GREEN}"/>
     <rect x="0" y="15" width="15" height="9" rx="3" fill="${GREEN}" fill-opacity="0.45"/>
   </svg>`;

const lockup = (size) =>
  `<span style="display:inline-flex;align-items:center;gap:${size * 0.28}px">
     ${mark(size * 1.3)}
     <span style="font-family:'Geist';font-weight:800;font-size:${size}px;letter-spacing:-0.03em;color:${INK}">locumii</span>
   </span>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  body{font-family:'Geist',sans-serif;background:transparent}
  #logoWhite{display:inline-flex;padding:56px 64px;background:#fff}
  #logoTrans{display:inline-flex;padding:56px 64px;background:transparent}
  #banner{position:relative;width:1584px;height:396px;background:#fff;overflow:hidden;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;
    background-image:radial-gradient(rgba(0,0,0,0.04) 1px,transparent 1px);background-size:26px 26px}
  #banner .glow{position:absolute;top:-180px;right:-120px;width:620px;height:620px;border-radius:50%;
    background:radial-gradient(closest-side, rgba(62,207,142,0.22), transparent);filter:blur(8px)}
  #banner .inner{position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;text-align:center}
  #banner .tag{font-family:'Geist';font-weight:800;font-size:54px;letter-spacing:-0.02em;color:${INK};line-height:1.05}
  #banner .tag .g{color:${GREEN}}
  #banner .sub{font-family:'Geist';font-weight:500;font-size:24px;color:#6b7280}
</style></head><body>
  <div id="logoWhite">${lockup(64)}</div>
  <div id="logoTrans">${lockup(64)}</div>
  <div id="banner">
    <div class="glow"></div>
    <div class="inner">
      ${lockup(46)}
      <div class="tag">Healthcare shifts, staffed and <span class="g">paid</span> in one place.</div>
      <div class="sub">Verified locum staffing · Abuja FCT · locumii.com</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

await page.locator('#logoWhite').screenshot({ path: join(dir, 'locumii-logo.png') });
await page.locator('#logoTrans').screenshot({ path: join(dir, 'locumii-logo-transparent.png'), omitBackground: true });

const banner = await page.locator('#banner').screenshot();
await browser.close();
await sharp(banner).resize(1584, 396).png().toFile(join(dir, 'locumii-linkedin-banner.png'));

console.log('Wrote logo (white + transparent) and LinkedIn banner to public/brand/');
