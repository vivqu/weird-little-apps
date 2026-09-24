// Does a phone-shaped capture already contain a rendered device (App Store marketing images often do)?
// Run it when adding an entry; a hit means `bezel: true` on that screenshot in index.yaml (see UPLOAD.md).
// Usage: node scripts/bezel.mjs src/content/apps/<id>/*.jpg
// Heuristic: take the corner colour as the background. On several horizontal scan lines, find where
// the row first and last leaves that background for a sustained stretch. A rendered device gives
// edges that are inset from the image sides, mirror each other, and sit at the same x on every line
// (a straight vertical side). Checked against the 43 seed apps: it flags grug's three device renders
// and nothing else. `sharp` comes with Astro.
import sharp from 'sharp';

export async function hasBezel(path) {
  const { data, info } = await sharp(path).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  if (h / w < 1.6) return false; // only phone-shaped images
  const bg = (data[0] + data[w - 1] + data[(h - 1) * w] + data[h * w - 1]) / 4;
  const need = Math.max(3, Math.round(w * 0.012)); // ignore hairline doodles and single glyph strokes
  const lefts = [];
  for (const fy of [0.3, 0.4, 0.5, 0.6, 0.7]) {
    const row = data.subarray(Math.floor(h * fy) * w, Math.floor(h * fy) * w + w);
    const edge = (from, step) => {
      for (let x = from, run = 0; x >= 0 && x < w; x += step) {
        run = Math.abs(row[x] - bg) > 45 ? run + 1 : 0;
        if (run >= need) return x - step * (need - 1);
      }
      return -1;
    };
    const l = edge(0, 1), r = edge(w - 1, -1);
    if (l < 0 || r < 0) continue;
    const inset = l / w > 0.04 && l / w < 0.3;
    const mirrored = Math.abs(l - (w - 1 - r)) / w < 0.03;
    if (inset && mirrored) lefts.push(l);
  }
  return lefts.length >= 4 && (Math.max(...lefts) - Math.min(...lefts)) / w < 0.02;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) console.log((await hasBezel(f)) ? 'bezel   ' : 'no bezel', f);
}
