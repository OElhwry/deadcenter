import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, 'og-image.svg');
const outPath = resolve(__dirname, '../public/og-image.png');

const svg = readFileSync(svgPath);

await sharp(svg)
  .png({ quality: 95 })
  .toFile(outPath);

console.log('✓ og-image.png written to public/');
