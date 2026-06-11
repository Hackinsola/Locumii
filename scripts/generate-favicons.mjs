// Generates the favicon + app-icon set Google and browsers expect, downscaled from
// the 1024×1024 brand mark (public/brand/locumii-icon-green.png). One-off tool; needs
// sharp (not a project dependency). Run with:
//   npm install --no-save sharp && node scripts/generate-favicons.mjs
//
// Why: Google's favicon-in-search is most reliable with a square raster PNG that is a
// multiple of 48px, plus an apple-touch-icon. SVG-only is not always picked up.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const src = join(pub, 'brand', 'locumii-icon-green.png');

const sizes = {
  'favicon-48.png': 48, // Google's recommended favicon base size
  'favicon-96.png': 96,
  'apple-touch-icon.png': 180, // iOS home-screen / some crawlers
  'icon-192.png': 192, // PWA manifest
  'icon-512.png': 512, // PWA manifest + Organization logo
};

for (const [name, size] of Object.entries(sizes)) {
  await sharp(src).resize(size, size).png().toFile(join(pub, name));
}

console.log('Wrote', Object.keys(sizes).join(', '), 'to public/');
