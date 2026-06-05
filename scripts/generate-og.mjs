// Generates public/og.png (1200×630) — the social link-preview card for locumii.com.
// One-off build tool: needs sharp, which is NOT a project dependency. Run with:
//   npm install --no-save sharp && node scripts/generate-og.mjs
// Text uses a generic sans (the renderer's system font), which is fine for a static
// card; the brand colours (matte black, vibrant green, white) carry the identity.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

const BG = '#131313';
const GREEN = '#3ECF8E';
const WHITE = '#ffffff';
const MUTED = '#9aa0a6';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="78%" cy="18%" r="55%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Logo: shift-bars mark + wordmark -->
  <g transform="translate(80,70)">
    <rect x="0" y="6" width="34" height="14" rx="5" fill="${GREEN}"/>
    <rect x="0" y="24" width="23" height="14" rx="5" fill="${GREEN}" fill-opacity="0.45"/>
    <text x="50" y="34" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="800" fill="${WHITE}">locumii</text>
  </g>
  <text x="1120" y="102" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500" fill="${MUTED}">locumii.com</text>

  <!-- Pre-launch pill -->
  <g transform="translate(80,200)">
    <rect x="0" y="0" width="372" height="46" rx="23" fill="${GREEN}" fill-opacity="0.12" stroke="${GREEN}" stroke-opacity="0.4"/>
    <circle cx="26" cy="23" r="5" fill="${GREEN}"/>
    <text x="44" y="31" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600" fill="${GREEN}">Now in pre-launch · Abuja FCT</text>
  </g>

  <!-- Headline -->
  <text font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="${WHITE}" letter-spacing="-1">
    <tspan x="80" y="350">Healthcare shifts,</tspan>
    <tspan x="80" y="430">staffed and <tspan fill="${GREEN}">paid</tspan></tspan>
    <tspan x="80" y="510">in one place.</tspan>
  </text>

  <!-- Subtitle -->
  <text x="80" y="572" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500" fill="${MUTED}">Verified professionals · escrow payments · ratings, built in.</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Wrote', out);
