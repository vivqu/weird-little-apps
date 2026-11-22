// Usage: node scripts/screenshot.mjs [path] [--dark] [--mobile] [--all] [--out file.png] [--url http://host:port] [--dist dir]
// Serves dist/ from an in-process static server (run `npm run build` first), unless --url is given. --dist dist-dev
// serves the build that includes hidden entries (`WLA_SHOW_HIDDEN=1 npm run build` writes there).
// --all, on a detail page, also clicks through every thumbnail: one screenshot of the mat per capture
// (<out>-1.png, -2.png, ...) and a line per capture saying whether the frame sits inside the stage, centred.
// Note: we deliberately do NOT spawn `astro preview`. In Astro 7 it daemonizes and reuses any
// running instance regardless of --port, which makes screenshots hit stale builds.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

const path = args.find((a) => a.startsWith('/')) ?? '/';
const dark = flag('--dark');
const mobile = flag('--mobile');
let url = opt('--url', null);
const out = opt('--out', `screenshots/${path === '/' ? 'index' : path.replace(/\//g, '_')}${dark ? '-dark' : ''}${mobile ? '-mobile' : ''}.png`);

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json', '.xml': 'application/xml', '.xsl': 'application/xml' };
export async function serveDist(dir = 'dist') {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(root, p);
      if (!file.startsWith(root)) throw new Error('bad path');
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let server;
  if (!url) ({ server, url } = await serveDist(opt('--dist', 'dist')));
  await mkdir('screenshots', { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  // `load` first, then a best-effort wait for the network to settle (a page that keeps a request open would otherwise time out)
  await page.goto(url + path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // lazy images below the fold only start loading once scrolled to; walk the page, wait for every image, then go back up
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
    await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
    scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
  if (flag('--all')) {
    const labels = page.locator('.thumbs label');
    const n = await labels.count();
    if (!n) console.log('--all: no thumbnails on this page (one capture, or not a detail page)');
    for (let i = 0; i < n; i++) {
      await labels.nth(i).click();
      await page.waitForTimeout(600); // the frame morphs over .35s and the cover fades over .3s
      const f = await page.locator('.frame').boundingBox();
      const s = await page.locator('.stage').boundingBox();
      const file = out.replace(/\.png$/, `-${i + 1}.png`);
      await page.locator('.mat').screenshot({ path: file });
      const r = (v) => Math.round(v);
      const gaps = [f.x - s.x, s.x + s.width - f.x - f.width, f.y - s.y, s.y + s.height - f.y - f.height];
      const inside = gaps.every((g) => g >= -1);
      const centred = Math.abs(gaps[0] - gaps[1]) <= 2 && Math.abs(gaps[2] - gaps[3]) <= 2;
      console.log(`${file}  frame ${r(f.width)}x${r(f.height)} in stage ${r(s.width)}x${r(s.height)}${inside ? '' : '  NOT INSIDE THE STAGE'}${centred ? '' : '  OFF-CENTRE'}`);
    }
  }
  await browser.close();
  server?.close();
}
