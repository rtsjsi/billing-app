import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../frontend/public');
const svg = await readFile(path.join(publicDir, 'icon.svg'));

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'favicon-32.png', size: 32 },
];

await mkdir(publicDir, { recursive: true });

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(path.join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

await sharp(svg).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
console.log('Generated favicon.ico');
