// @ts-check
import { defineConfig } from 'astro/config';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Screenshots referenced from content entries are copied into dist/_astro/ as originals alongside
// the optimized variants, and Astro only prunes originals it knows the source path of (not the
// case for collection images). Delete any image in dist/_astro/ that no page or stylesheet refers
// to, so the published site holds the webp variants only.
/** @param {{ dir: URL, logger: import('astro').AstroIntegrationLogger }} options */
async function pruneUnreferencedImages({ dir, logger }) {
  const root = dir.pathname;
  /** @type {string[]} */
  const files = await readdir(root, { recursive: true });
  const text = await Promise.all(files.filter((f) => /\.(html|css|js|xml)$/.test(f)).map((f) => readFile(join(root, f), 'utf8')));
  const referenced = text.join('\n');
  let n = 0;
  for (const f of files) {
    if (!/^_astro\/.*\.(jpe?g|png|gif|webp|avif)$/.test(f) || referenced.includes('/' + f)) continue;
    await unlink(join(root, f));
    n++;
  }
  if (n) logger.info(`pruned ${n} unreferenced image(s) from ${root}_astro/`);
}

// https://astro.build/config
export default defineConfig({
  site: 'https://weirdlittleapps.com',
  // Apex custom domain on GitHub Pages: no `base` needed.
  output: 'static',
  // page 1 of each index lives at its root
  redirects: { '/page/1': '/', '/compact/page/1': '/compact' },
  integrations: [{ name: 'prune-images', hooks: { 'astro:build:done': pruneUnreferencedImages } }],
});
