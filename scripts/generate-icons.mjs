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

// The shift-bars mark centered on a background. `shape` is 'square' (rounded square)
// or 'circle' (true round, transparent corners). `border` adds a faint ring so a
// white backdrop stays visible on white surfaces.
const icon = (bg, bar, shape = 'square', border = false) => {
  const stroke = border ? ' stroke="#e5e5e5" stroke-width="1.5"' : '';
  const backdrop =
    shape === 'circle'
      ? `<circle cx="50" cy="50" r="${border ? 49 : 50}" fill="${bg}"${stroke}/>`
      : `<rect x="${border ? 1 : 0}" y="${border ? 1 : 0}" width="${border ? 98 : 100}" height="${border ? 98 : 100}" rx="22" fill="${bg}"${stroke}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">
  ${backdrop}
  <rect x="22" y="30" width="56" height="15" rx="6" fill="${bar}"/>
  <rect x="22" y="53" width="38" height="15" rx="6" fill="${bar}" opacity="0.5"/>
</svg>`;
};

const GREEN = '#3ECF8E';
const BLACK = '#1a1a1a';
const WHITE = '#ffffff';

// Rounded-square variants.
await sharp(Buffer.from(icon(GREEN, BLACK))).png().toFile(join(dir, 'locumii-icon-green.png'));
await sharp(Buffer.from(icon(BLACK, GREEN))).png().toFile(join(dir, 'locumii-icon-dark.png'));
await sharp(Buffer.from(icon(WHITE, GREEN, 'square', true)))
  .png()
  .toFile(join(dir, 'locumii-icon-white.png'));
// Circle variants (transparent outside the circle).
await sharp(Buffer.from(icon(GREEN, BLACK, 'circle')))
  .png()
  .toFile(join(dir, 'locumii-icon-green-circle.png'));
await sharp(Buffer.from(icon(BLACK, GREEN, 'circle')))
  .png()
  .toFile(join(dir, 'locumii-icon-dark-circle.png'));
await sharp(Buffer.from(icon(WHITE, GREEN, 'circle', true)))
  .png()
  .toFile(join(dir, 'locumii-icon-white-circle.png'));
// Scalable sources.
await writeFile(join(dir, 'locumii-icon.svg'), icon(GREEN, BLACK));
await writeFile(join(dir, 'locumii-icon-circle.svg'), icon(GREEN, BLACK, 'circle'));
await writeFile(join(dir, 'locumii-icon-white-circle.svg'), icon(WHITE, GREEN, 'circle', true));

console.log('Wrote green/dark/white × square/circle icon variants + SVGs to public/brand/');
