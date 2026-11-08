// Usage: node scripts/social.mjs [--dist dir] [--out public/social.jpg]
// The site-wide share card (og:image for every page but an app's own): the top of the home page, the wordmark over
// the first row of tiles, captured at 1200x630 and written as a JPEG into public/. Run `npm run build` first; rerun
// this when the home page's look changes, and commit the result. Detail pages use their own cover instead.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { serveDist } from './screenshot.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const out = opt('--out', 'public/social.jpg');

const { server, url } = await serveDist(opt('--dist', 'dist'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: 'light' });
await page.goto(url + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot(); // the viewport only: 2400x1260
await browser.close();
server.close();
await sharp(png).resize(1200, 630).jpeg({ quality: 85, mozjpeg: true }).toFile(out);
console.log(`${out}  1200x630  ${Math.round((await stat(out)).size / 1024)} KB`);
