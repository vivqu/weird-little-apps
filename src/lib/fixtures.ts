// Deterministic filler for stress tests: `WLA_FIXTURES=2000 npm run build` pads the collection to
// that many apps at query time. Nothing is written to disk. Covers are borrowed from real entries.
import type { CollectionEntry } from 'astro:content';

type Entry = CollectionEntry<'apps'>;

const ADJ = ['pocket', 'tiny', 'slow', 'paper', 'midnight', 'secret', 'lazy', 'one-button', 'loud', 'polite', 'haunted', 'sunday', 'spare', 'wobbly', 'quiet', 'portable', 'tidy', 'feral', 'local', 'homemade'];
const NOUN = ['metronome', 'almanac', 'tide clock', 'soup timer', 'moon phone', 'bird radio', 'dice', 'stamp album', 'weather vane', 'jukebox', 'label maker', 'mixtape', 'compass', 'lighthouse', 'pager', 'seed catalog', 'dream log', 'bus oracle', 'kettle', 'fax machine'];
const LONG = ['for the kitchen windowsill', 'and other small ceremonies', '(unofficial, unaffiliated, unbothered)'];
const TAG = [
  'does one thing and has no settings.', 'built in a weekend for an audience of one.', 'tells you when, never why.',
  'a small machine for a very specific sunday problem.', 'it only works on tuesdays, on purpose.',
  'turns a chore into a tiny ceremony.', 'for the three people who need exactly this.', 'prints a receipt for your feelings.',
  'a button. press it. that is the app.', 'keeps count so you do not have to.',
];
const MAKER = ['Example Maker', 'A. Tinkerer', 'Sam Placeholder', 'R. Fixture', 'Kit & Pat Sample', 'Dana Lorem', 'Io Mockwell'];
const FORMS = ['web', 'web', 'web', 'web', 'ios', 'mac', 'cli', 'extension', 'bot', 'hardware', 'android'] as const;

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function makeFixtures(real: Entry[], total: number): Entry[] {
  const out: Entry[] = [];
  if (total <= real.length) return out;
  const used = new Set(real.map((e) => e.id));
  const covers = real.filter((e) => e.data.screenshots.length).map((e) => e.data.screenshots[0]);
  for (let i = 0; real.length + out.length < total; i++) {
    const h = hash('fx' + i);
    let name = `${ADJ[h % ADJ.length]} ${NOUN[(h >>> 5) % NOUN.length]}`;
    if (h % 7 === 0) name += ' ' + LONG[(h >>> 2) % LONG.length];
    let id = name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (used.has(id)) { name += ` ${(h % 89) + 2}`; id += `-${(h % 89) + 2}`; }
    if (used.has(id)) continue;
    used.add(id);
    const form = FORMS[(h >>> 9) % FORMS.length];
    const url = form === 'ios' ? `https://apps.apple.com/app/${id}` : form === 'android' ? `https://play.google.com/store/apps/${id}` : form === 'cli' ? `https://github.com/example/${id}` : `https://example.com/${id}`;
    const cover = covers[(h >>> 15) % covers.length];
    out.push({
      id,
      collection: 'apps',
      data: {
        name, url,
        tagline: TAG[(h >>> 13) % TAG.length],
        form_factor: (h >>> 3) % 9 === 0 ? [form, 'ios'] : [form],
        by: [{ name: MAKER[(h >>> 17) % MAKER.length] }],
        why: 'placeholder curator’s note. one to three sentences, first person, about why this was collected.',
        collected: new Date(Date.UTC(2026, 7, 1) - i * 36e5 * 19), // roughly one every 19 hours, going back
        created: (h >>> 7) % 3 ? 2015 + (h % 12) : undefined,
        curator: { name: 'Vivian Qu' },
        screenshots: (h >>> 11) % 5 === 0 || !cover ? [] : [{ ...cover, caption: 'borrowed placeholder capture' }],
      },
    });
  }
  return out;
}
