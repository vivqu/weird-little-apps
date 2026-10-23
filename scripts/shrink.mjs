// Usage: node scripts/shrink.mjs src/content/apps/<id> [file ...] [--quality 80] [--bg '#ffffff'] [--keep]
// Compresses an entry's screenshots for storage. Every png / jpeg in the folder (or only the files named) becomes a
// JPEG at 1x of a Retina capture: a browser capture 1512 wide, a phone-shaped one (taller than 1.6:1) 804 wide, never
// enlarged, flattened onto --bg. The original is deleted (unless --keep) and index.yaml's image paths are repointed.
// Prints before / after sizes and warns over the ~150 KB budget; pixel art and dense maps need --quality 72 and will
// still land around 250 KB, which is fine (the build re-encodes to webp for visitors). A .jpg that is already 1600 wide
// or narrower is left alone, so running it twice is safe.
import sharp from 'sharp';
import { readdir, stat, readFile, writeFile, unlink, rename } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const flagVals = new Set(['--quality', '--bg'].map((f) => opt(f, null)).filter(Boolean));
const positional = args.filter((a, i) => !a.startsWith('--') && !flagVals.has(a) && !(i > 0 && args[i - 1] === '--quality') && !(i > 0 && args[i - 1] === '--bg'));

const quality = Number(opt('--quality', 80));
const bg = opt('--bg', '#ffffff');
const keep = flag('--keep');
const IMAGE = /\.(png|jpe?g)$/i;
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

if (!positional.length) { console.error('usage: node scripts/shrink.mjs src/content/apps/<id> [file ...] [--quality 80] [--bg #ffffff] [--keep]'); process.exit(1); }
const first = resolve(positional[0]);
const folder = (await stat(first)).isDirectory() ? first : resolve(positional[0], '..');
const files = (await stat(first)).isDirectory()
  ? (await readdir(folder)).filter((f) => IMAGE.test(f)).sort().map((f) => join(folder, f))
  : positional.map((p) => resolve(p));

const renames = new Map(); // old basename -> new basename, for index.yaml
for (const file of files) {
  const { size: before } = await stat(file);
  const meta = await sharp(file).metadata();
  const tall = meta.height / meta.width > 1.6;
  const target = tall ? 804 : 1512;
  const isJpg = /\.jpe?g$/i.test(file);
  if (isJpg && meta.width <= 1600) { console.log(`${basename(file)}  ${kb(before)}  ${meta.width}x${meta.height}  left alone`); continue; }

  const outName = basename(file).replace(IMAGE, '') + '.jpg';
  const out = join(folder, outName);
  const tmp = out + '.tmp';
  await sharp(file).resize({ width: target, withoutEnlargement: true }).flatten({ background: bg }).jpeg({ quality, mozjpeg: true }).toFile(tmp);
  if (!keep && resolve(file) !== resolve(out)) await unlink(file);
  await rename(tmp, out);
  const { size: after } = await stat(out);
  const outMeta = await sharp(out).metadata();
  const warn = after > 160 * 1024 ? '  over budget (pixel art? try --quality 72)' : '';
  console.log(`${basename(file)}  ${kb(before)}  →  ${outName}  ${kb(after)}  ${outMeta.width}x${outMeta.height}${warn}`);
  if (basename(file) !== outName) renames.set(basename(file), outName);
}

// repoint index.yaml at the new files
const yaml = join(folder, 'index.yaml');
try {
  let text = await readFile(yaml, 'utf8');
  let n = 0;
  for (const [from, to] of renames) {
    const next = text.split(`./${from}`).join(`./${to}`);
    if (next !== text) { n++; text = next; }
  }
  if (n) { await writeFile(yaml, text); console.log(`index.yaml  ${n} image path${n === 1 ? '' : 's'} repointed`); }
} catch { /* no index.yaml next to the images; nothing to repoint */ }
