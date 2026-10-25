// Captures the detail frame's window ⇄ phone morph as a contact sheet, slowed down so each step is visible.
// Serves dist/ (or --dist dist-dev) like screenshot.mjs, opens the page, picks the `from` thumbnail, then the `to`
// thumbnail, and screenshots the stage every 250ms over a 3s morph (the --morph token is overridden at runtime,
// the stylesheet is untouched). Output: screenshots/morph-<id>-<from>-<to>.png, 12 frames tiled four across.
//
//   npm run build && node scripts/morph.mjs /apps/bingebrowse 3 4            # window (slide 3) → phone (slide 4)
//   node scripts/morph.mjs /apps/bingebrowse 4 3 --dist dist-dev             # back again, from the hidden build
//   node scripts/morph.mjs /apps/bingebrowse 3 4 --seconds 6                 # slower still
//
// Read the sheet for: lines keeping their weight (never thickening or fading), the body thinning, corners rounding,
// the bar's lines / dots / url fading in over the second half, the island fading in last, the capture cropped from
// its centre while the shape is wrong for it. To watch it live instead, in the browser console:
//   document.documentElement.style.setProperty('--morph', '3s')
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { serveDist } from './screenshot.mjs';

const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const [route, from, to] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!route || !from || !to) { console.error('usage: node scripts/morph.mjs /apps/<id> <from slide> <to slide> [--dist dist-dev] [--seconds 3]'); process.exit(1); }
const seconds = Number(opt('--seconds', 3));
const frames = 12, cols = 4;

const { server, url } = await serveDist(opt('--dist', 'dist'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.goto(url + route, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: `:root { --morph: ${seconds}s !important; }` });
const labels = page.locator('.thumbs label');
await labels.nth(Number(from) - 1).click();
await page.waitForTimeout(seconds * 1000 + 300);

const shots = [];
const t0 = Date.now();
await labels.nth(Number(to) - 1).click();
for (let i = 0; i < frames; i++) {
  const at = (i * seconds * 1000) / (frames - 1);
  while (Date.now() - t0 < at) await page.waitForTimeout(5);
  shots.push(await page.locator('.stage').screenshot());
}
await browser.close(); server.close();

const meta = await sharp(shots[0]).metadata();
const w = meta.width, h = meta.height, rows = Math.ceil(frames / cols);
const id = route.replace(/^\/apps\/|\/$/g, '');
await mkdir('screenshots', { recursive: true });
const file = `screenshots/morph-${id}-${from}-${to}.png`;
await sharp({ create: { width: w * cols, height: h * rows, channels: 3, background: '#fffaf7' } })
  .composite(shots.map((input, i) => ({ input, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
  .png().toFile(file);
console.log(`${file}  ${frames} frames over ${seconds}s, ${cols} across, read left to right`);
