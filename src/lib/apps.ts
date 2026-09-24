// The registry as the pages see it: the `apps` collection in index order, with everything the
// schema leaves to be derived (accession numbers, screenshot kinds, index positions), padded with
// fixtures when WLA_FIXTURES is set. Loaded once per build.
import { getCollection, type CollectionEntry } from 'astro:content';
import { makeFixtures } from './fixtures';

export const PER_PAGE = 24;

export type Entry = CollectionEntry<'apps'>['data'];
export type Shot = Entry['screenshots'][number] & {
  /** phone-shaped (taller than 1.6:1): shown in a drawn phone, or bare / as a panel when flagged */
  tall: boolean;
};
export interface App extends Omit<Entry, 'screenshots'> {
  id: string;
  shots: Shot[];
  /** YYYY.NNNN: year collected, then order of collection within that year */
  accession: string;
  /** position in index order, from 0 (newest) */
  index: number;
}

export function deriveShot(s: Entry['screenshots'][number]): Shot {
  const tall = s.image.height / s.image.width > 1.6;
  return { ...s, tall, bezel: tall && s.bezel, panel: tall && s.panel };
}

// index order: newest first, ties by id. Accession numbers count up from the oldest.
export function arrange(entries: { id: string; data: Entry }[]): App[] {
  const apps = entries
    .map(({ id, data: { screenshots, ...data } }) => ({ ...data, id, shots: screenshots.map(deriveShot), accession: '', index: 0 }))
    .sort((a, b) => b.collected.getTime() - a.collected.getTime() || a.id.localeCompare(b.id));
  const byYear: Record<number, number> = {};
  for (const a of [...apps].reverse()) {
    const y = a.collected.getUTCFullYear();
    byYear[y] = (byYear[y] ?? 0) + 1;
    a.accession = `${y}.${String(byYear[y]).padStart(4, '0')}`;
  }
  apps.forEach((a, i) => (a.index = i));
  return apps;
}

let cache: Promise<App[]> | undefined;
export function getApps(): Promise<App[]> {
  return (cache ??= (async () => {
    const entries = await getCollection('apps');
    const fixtures = Number(import.meta.env.WLA_FIXTURES) || 0;
    const apps = arrange([...entries, ...makeFixtures(entries, fixtures)]);
    const bare = apps.filter((a) => !a.shots.length);
    if (bare.length) console.log(`[apps] ${bare.length} without a screenshot: ${bare.map((a) => a.id).join(', ')}`);
    return apps;
  })());
}

// ---------- pagination ----------
export interface Page {
  n: number;
  pages: number;
  items: App[];
  href: string;
}
export const pageHref = (n: number, base = '') => (n === 1 ? `${base}/` : `${base}/page/${n}/`);
export const pageOf = (app: App) => Math.floor(app.index / PER_PAGE) + 1;

export function paginate(apps: App[], base = ''): Page[] {
  const pages = Math.max(1, Math.ceil(apps.length / PER_PAGE));
  return Array.from({ length: pages }, (_, i) => ({
    n: i + 1,
    pages,
    items: apps.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
    href: pageHref(i + 1, base),
  }));
}

// ---------- display helpers ----------
export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toLowerCase();

/** `created` as written: a year, a month, or a day */
export function fmtCreated(c: Entry['created']) {
  if (c === undefined) return 'date unknown';
  if (c instanceof Date) return fmtDate(c);
  if (typeof c === 'number') return String(c);
  const [y, m] = c.split('-');
  return m ? `${new Date(Date.UTC(+y, +m - 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toLowerCase()}` : y;
}

export const makers = (a: App) => a.by.map((p) => p.name).join(' & ');
/** the domain of `url` without `www.`: the title bar of the index tile */
export const domain = (a: App) => new URL(a.url).hostname.replace(/^www\./, '');
/** `url` without scheme or trailing slash: the title bar on the detail page */
export const host = (a: App) => a.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

// the visit button's label comes from where the url points, so entries never spell it out
const STORES: [RegExp, string][] = [
  [/(^|\.)apps\.apple\.com$/, 'open in App Store'],
  [/(^|\.)play\.google\.com$/, 'open in Google Play'],
  [/(^|\.)github\.com$/, 'view on GitHub'],
  [/(^|\.)chromewebstore\.google\.com$/, 'open in Chrome Web Store'],
];
export const visitLabel = (a: App) => (STORES.find(([re]) => re.test(new URL(a.url).hostname))?.[1] ?? 'visit') + ' ↗';

/** snake_case names get a break opportunity after each underscore */
export const nameParts = (name: string) => name.split(/(?<=_)/);
