// Usage: node scripts/screenshot.mjs [path] [--dark] [--mobile] [--out file.png] [--url http://host:port]
// Serves dist/ from an in-process static server (run `npm run build` first), unless --url is given.
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

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' };
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
  if (!url) ({ server, url } = await serveDist());
  await mkdir('screenshots', { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.goto(url + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  server?.close();
  console.log(out);
}
