// Usage: node scripts/capture.mjs <id> [<id> ...] [--wait 1500] [--name landing] [--stale]
// Takes the landing screenshot for an entry the same way a human capture comes out: a 1512x860 viewport at 2x
// (a Retina MacBook browser window), then shrunk to a 1512-wide JPEG at quality 80, so it matches hand-taken
// screenshots that went through scripts/shrink.mjs and the detail-page frame keeps one shape across an app.
// Writes <folder>/<name>.jpg, repoints the first screenshot in index.yaml at it (deleting the file it replaced
// when nothing else references it) and sets that screenshot's `taken` to today.
// --stale: instead of ids, every web entry whose first screenshot is still a 1280x800 capture.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const wait = Number(opt('--wait', 1500));
const name = opt('--name', 'landing');
const skip = new Set([opt('--wait', null), opt('--name', null)].filter(Boolean));
let ids = args.filter((a) => !a.startsWith('--') && !skip.has(a));

const APPS = resolve('src/content/apps');
export const VIEWPORT = { width: 1512, height: 860 }; // what a Retina MacBook browser window captures to, at 1x
const today = new Date().toISOString().slice(0, 10);

const entry = async (id) => {
  const file = join(APPS, id, 'index.yaml');
  const text = await readFile(file, 'utf8');
  const url = text.match(/^url:\s*(\S+)/m)?.[1];
  const first = text.match(/^screenshots:\n\s+- image: \.\/(\S+)/m)?.[1];
  return { id, file, text, url, first };
};

if (flag('--stale')) {
  ids = [];
  for (const id of (await readdir(APPS)).sort()) {
    const e = await entry(id).catch(() => null);
    if (!e?.first || !/\.(jpe?g|png)$/i.test(e.first)) continue;
    const m = await sharp(join(APPS, id, e.first)).metadata().catch(() => null);
    if (m && m.width === 1280 && m.height === 800) ids.push(id);
  }
  console.log(`stale: ${ids.join(' ')}`);
}
if (!ids.length) { console.error('usage: node scripts/capture.mjs <id> [...] [--wait ms] [--name landing] | --stale'); process.exit(1); }

const browser = await chromium.launch();
for (const id of ids) {
  const e = await entry(id);
  if (!e.url) { console.log(`${id}: no url`); continue; }
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: 'light', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  let note = '';
  try {
    await page.goto(e.url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (err) {
    note = `  (${err.message.split('\n')[0]})`; // slow pages: capture whatever has rendered
  }
  await page.waitForTimeout(wait);
  // consent banners and "about" dialogs: click the first obvious dismiss control, if any, then let the page settle
  const dismiss = page.locator('button, [role=button], a').filter({ hasText: /^(accept( all)?|allow all|consent|i agree|agree|got it|ok|okay|close|dismiss|continue|×|✕)$/i });
  for (let i = 0, n = await dismiss.count(); i < n; i++) {
    const el = dismiss.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const label = (await el.innerText().catch(() => '')).trim();
    await el.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
    note += `  (dismissed "${label}")`;
    break;
  }
  let png;
  try {
    png = await page.screenshot({ type: 'png' });
  } catch (err) {
    console.log(`${id}: FAILED  ${err.message.split('\n')[0]}  (left as is)`);
    await ctx.close();
    continue;
  }
  await ctx.close();

  const out = join(APPS, id, `${name}.jpg`);
  await sharp(png).resize({ width: VIEWPORT.width }).flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
  const { size } = await stat(out);

  // repoint the first screenshot, set its date, drop the replaced file if it is now unreferenced
  let text = e.text;
  if (e.first && e.first !== `${name}.jpg`) {
    text = text.replace(`- image: ./${e.first}`, `- image: ./${name}.jpg`);
    if (!text.includes(`./${e.first}`)) await unlink(join(APPS, id, e.first)).catch(() => {});
  }
  text = text.replace(new RegExp(`(- image: \\./${name}\\.jpg\\n(?:    .*\\n)*?    taken: )\\S+`), `$1${today}`);
  if (text !== e.text) await writeFile(e.file, text);
  console.log(`${id}: ${name}.jpg ${Math.round(size / 1024)} KB${e.first && e.first !== `${name}.jpg` ? `  (was ${e.first})` : ''}${note}`);
}
await browser.close();
