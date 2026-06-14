import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'favicon.svg');
const svgContent = readFileSync(svgPath, 'utf-8');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { name, size } of sizes) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;overflow:hidden}</style></head><body>${svgContent.replace('viewBox="0 0 100 100"', `viewBox="0 0 100 100" width="${size}" height="${size}"`)}</body></html>`);
  const screenshot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(join(publicDir, name), screenshot);
  console.log(`✓ ${name} (${size}x${size})`);
}

await browser.close();
console.log('Íconos generados.');
