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

// `hidden: true` entries are left out of the build. The dev server shows them (marked), as does a local build with
// WLA_SHOW_HIDDEN=1; a CI build never does, so a hidden entry can't reach production by accident.
export const showingHidden = import.meta.env.DEV || (!!import.meta.env.WLA_SHOW_HIDDEN && !process.env.CI && !process.env.GITHUB_ACTIONS);

// index order: newest first, ties by id. Accession numbers count up from the oldest, over every entry including
// hidden ones, so a number doesn't change when its entry is unhidden.
export function arrange(entries: { id: string; data: Entry }[], showHidden = showingHidden): App[] {
  const all = entries
    .map(({ id, data: { screenshots, ...data } }) => ({ ...data, id, shots: screenshots.map(deriveShot), accession: '', index: 0 }))
    .sort((a, b) => b.collected.getTime() - a.collected.getTime() || a.id.localeCompare(b.id));
  const byYear: Record<number, number> = {};
  for (const a of [...all].reverse()) {
    const y = a.collected.getUTCFullYear();
    byYear[y] = (byYear[y] ?? 0) + 1;
    a.accession = `${y}.${String(byYear[y]).padStart(4, '0')}`;
  }
  const apps = showHidden ? all : all.filter((a) => !a.hidden);
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
    const hidden = entries.filter((e) => e.data.hidden).length;
    if (hidden) console.log(`[apps] ${hidden} hidden ${showingHidden ? '(shown: dev / WLA_SHOW_HIDDEN)' : '(left out of this build)'}`);
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

// the visit button's label comes from where the url points, so entries never spell it out.
// with a `price`, a store label becomes "$2.99 on the App Store"; anywhere else, "visit · $2.99"
// when it shares the row with a store button, the plain url's label is "website" (a place, like "app store")
// [host, label on its own, name after a price, short label when it shares the row with another store button]
const STORES: [RegExp, string, string?, string?][] = [
  [/(^|\.)apps\.apple\.com$/, 'open in App Store', 'the App Store', 'app store'],
  [/(^|\.)play\.google\.com$/, 'open in Google Play', 'Google Play', 'play store'],
  [/(^|\.)github\.com$/, 'view on GitHub'],
  [/(^|\.)chromewebstore\.google\.com$/, 'open in Chrome Web Store', 'the Chrome Web Store', 'chrome web store'],
];
export const visitLabel = (a: App, url = a.url, short = false) => {
  const store = STORES.find(([re]) => re.test(new URL(url).hostname));
  const plain = short ? 'website' : 'visit';
  const label = short && store?.[3] ? store[3] : !a.price ? (store?.[1] ?? plain) : store?.[2] ? `${a.price} on ${store[2]}` : `${plain} · ${a.price}`;
  return label + ' ↗';
};
// the visit buttons: `url`, then any link to an app store (the same app listed elsewhere). Every other link stays under
// "also". Two or more buttons use the short labels ("website", "app store", "play store") so they fit on one line
const APP_STORE = /(^|\.)(apps\.apple\.com|play\.google\.com|chromewebstore\.google\.com)$/;
const isStoreLink = (url: string) => APP_STORE.test(new URL(url).hostname);
// `go` is the counted hop in front of `href` (/go/<id>/ for `url`, /go/<id>/app-store/ for a store; .claude/ANALYTICS.md)
const STORE_SLUG: [RegExp, string][] = [[/apps\.apple\.com$/, 'app-store'], [/play\.google\.com$/, 'play-store'], [/chromewebstore\.google\.com$/, 'chrome-web-store']];
export const visits = (a: App) => {
  const hrefs = [a.url, ...(a.links ?? []).map((l) => l.url).filter((u) => u !== a.url && isStoreLink(u))];
  const slugs = new Set<string>();
  return hrefs.map((href, i) => {
    let slug = i === 0 ? '' : (STORE_SLUG.find(([re]) => re.test(new URL(href).hostname))?.[1] ?? 'store');
    if (slugs.has(slug)) slug = `${slug}-${i}`;
    slugs.add(slug);
    return { href, label: visitLabel(a, href, hrefs.length > 1), go: `/go/${a.id}/${slug && slug + '/'}` };
  });
};
export const alsoLinks = (a: App) => (a.links ?? []).filter((l) => l.url === a.url || !isStoreLink(l.url));

// a quote with `embed: true` is shown as the post itself. For Threads and X the provider's script
// swaps our blockquote for its iframe; without it the quote stays as written. A YouTube url is an
// iframe straight away (no script; the quote's text is the player's title). Only these three are known.
export type Embed = { cls: string; attrs: Record<string, string>; script: string } | { iframe: string };
const videoId = (url: URL) => url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).at(-1);
const EMBEDS: [RegExp, (url: URL) => Embed][] = [
  [/(^|\.)threads\.(com|net)$/, (url) => ({ cls: 'text-post-media', attrs: { 'data-text-post-permalink': url.href, 'data-text-post-version': '0' }, script: 'https://www.threads.com/embed.js' })],
  [/(^|\.)(x|twitter)\.com$/, () => ({ cls: 'twitter-tweet', attrs: {}, script: 'https://platform.twitter.com/widgets.js' })],
  [/(^|\.)(youtube\.com|youtu\.be)$/, (url) => ({ iframe: `https://www.youtube-nocookie.com/embed/${videoId(url)}` })],
];
export const embedFor = (a: App, q: { url: string; embed?: boolean }): Embed | undefined => {
  if (!q.embed) return;
  const url = new URL(q.url);
  const hit = EMBEDS.find(([re]) => re.test(url.hostname));
  if (!hit) throw new Error(`${a.id}: embed: true needs a Threads or X post url or a YouTube video url, got ${q.url}`);
  return hit[1](url);
};

/** snake_case names get a break opportunity after each underscore */
export const nameParts = (name: string) => name.split(/(?<=_)/);
