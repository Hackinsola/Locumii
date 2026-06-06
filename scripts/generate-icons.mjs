// Generates downloadable brand profile icons into public/brand/. One-off tool; needs
// sharp (not a project dependency). Run with:
//   npm install --no-save sharp && node scripts/generate-icons.mjs
// Produces 1024×1024 PNGs (green + dark variants) plus a scalable SVG — square so they
// work as profile pictures whether shown square or cropped to a circle.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');
await mkdir(dir, { recursive: true });

// The shift-bars mark on a rounded-square background, centered. `bg`/`bar` are hex.
const icon = (bg, bar) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${bg}"/>
  <rect x="22" y="30" width="56" height="15" rx="6" fill="${bar}"/>
  <rect x="22" y="53" width="38" height="15" rx="6" fill="${bar}" opacity="0.5"/>
</svg>`;

const GREEN = '#3ECF8E';
const BLACK = '#1a1a1a';

// Green background + black mark (vibrant "brand colours" avatar).
await sharp(Buffer.from(icon(GREEN, BLACK))).png().toFile(join(dir, 'locumii-icon-green.png'));
// Black background + green mark (premium dark avatar).
await sharp(Buffer.from(icon(BLACK, GREEN))).png().toFile(join(dir, 'locumii-icon-dark.png'));
// Scalable source.
await writeFile(join(dir, 'locumii-icon.svg'), icon(GREEN, BLACK));

console.log('Wrote public/brand/{locumii-icon-green.png, locumii-icon-dark.png, locumii-icon.svg}');
