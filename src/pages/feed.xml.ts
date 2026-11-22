// The feed: the newest apps as RSS at /feed.xml, built from the same collection the pages use, so an entry
// turns up in readers the day it's collected. Each item is the app's name, its first browser capture (the
// detail page's share card, so no extra image is generated), the maker and form, the curator's note, a cut of the
// maker's own words from the museum label, and links to the app and the entry; the tagline is the item's summary.
// Readers keep the newest items, so the feed carries the last LIMIT and the rest live in the collection. The head
// link in Base.astro lets readers find it from any page.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { getApps, makers, host, fmtDate, visits, type App } from '../lib/apps';
import { getSite } from '../lib/site';

const LIMIT = 50;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// the curator's note may link one phrase, markdown-style: `my [reading habit](https://…)`
const note = (why: string) => esc(why).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

// the maker's own words, from the museum label: the first quote, cut to a sentence or two at a word boundary, with who said
// it and a link to where. A quote whose url is a YouTube video is skipped: its text is the video's title, not words
const WORDS_MAX = 200;
const VIDEO = /(^|\.)(youtube\.com|youtu\.be)$/;
function words(a: App) {
  const q = (a.quotes ?? []).find((q) => !VIDEO.test(new URL(q.url).hostname));
  if (!q) return;
  let text = q.text.replace(/\s+/g, ' ').trim();
  if (text.length > WORDS_MAX) text = text.slice(0, text.lastIndexOf(' ', WORDS_MAX)).replace(/[\s,;:.!?…-]+$/, '') + '…';
  const who = `${q.by ?? a.by[0].name}${q.date ? `, ${fmtDate(q.date)}` : ''}`;
  return `<p>maker’s words: “${esc(text)}” <a href="${esc(q.url)}">— ${esc(who)}</a></p>`;
}

// Links out of an item: the entry's page tagged `?ref=feed`, so GoatCounter credits the visit to the feed (the counting pixel
// sends the query string; .claude/ANALYTICS.md → Tagged links), and the app's own url tagged `?ref=weirdlittleapps` the way the
// visit buttons tag it (store urls stay plain), so the maker's stats see where the visit came from. Straight to the app, not
// through the counted /go/ hop: a hop page flashing inside a reader's in-app browser isn't worth the count. The item's `link`
// stays the clean permalink: the feed package derives the guid from it, and a guid must never change
async function item(a: App, site: URL, pubDate: Date) {
  const link = new URL(`/apps/${a.id}/`, site).href;
  const entry = `${link}?ref=feed`;
  const cover = a.shots.find((s) => !s.tall) ?? a.shots[0];
  const card = cover && (await getImage({ src: cover.image, width: Math.min(1200, cover.image.width), format: 'jpg' }));
  const content = [
    card && `<p><a href="${entry}"><img src="${new URL(card.src, site).href}" alt="${esc(cover.alt)}" width="${card.attributes.width}" height="${card.attributes.height}"></a></p>`,
    // the tagline is the item's summary (readers show it under the title), so the body opens with who and what kind
    `<p>by ${esc(makers(a))} · ${a.form_factor.join(', ')}</p>`,
    // the note and the maker's words read as a pair, each labelled the way the museum label labels them; readers strip styles,
    // so a bare blockquote above "maker’s words" would read as the maker's too
    `<p>curator’s note: ${note(a.why)}</p>`,
    words(a),
    `<p><a href="${esc(visits(a)[0].href)}">visit ${esc(host(a))}</a> · <a href="${entry}">see it in the collection</a></p>`,
  ].filter(Boolean).join('\n');
  return {
    title: a.name,
    link,
    pubDate,
    description: `${a.tagline} · by ${makers(a)}`,
    content,
    categories: a.form_factor,
    // the cover as Media RSS too, for readers that show a thumbnail without parsing the body
    customData: card && `<media:content url="${new URL(card.src, site).href}" medium="image" width="${card.attributes.width}" height="${card.attributes.height}"/>`,
  };
}

export async function GET({ site }: APIContext) {
  if (!site) throw new Error('astro.config.mjs needs `site` for the feed');
  const [apps, copy] = await Promise.all([getApps(), getSite()]);
  const items = await Promise.all(apps.slice(0, LIMIT).map((a, i, newest) => item(a, site, pubDate(a, newest, i))));
  const self = new URL('/feed.xml', site).href;
  return rss({
    title: copy.name,
    description: copy.description,
    site,
    items,
    // no stylesheet: in a browser the link opens the raw xml. An XSLT page was built and removed the same day (2026-11-22),
    // because Chrome shows a full-width warning on any page that uses XSLT ahead of removing it; see .claude/PLAN.md → RSS
    xmlns: { media: 'http://search.yahoo.com/mrss/', atom: 'http://www.w3.org/2005/Atom' },
    // the feed's own address, which validators expect and some readers use to stay pointed at it
    customData: `<language>en</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}

// `collected` is usually a bare date, so apps collected the same day share a midnight timestamp and a reader may order them
// however it likes. Giving the n entries of a day the times 00:00:n-1 … 00:00:00, in index order, keeps the site's order in
// readers too. An entry whose `collected` carries a time of its own is left alone
const DAY = 86_400_000;
function pubDate(a: App, apps: App[], i: number): Date {
  const t = a.collected.getTime();
  if (t % DAY) return a.collected;
  const day = (b: App) => Math.floor(b.collected.getTime() / DAY);
  const first = apps.findIndex((b) => day(b) === day(a));
  const n = apps.filter((b) => day(b) === day(a)).length;
  return new Date(t + (n - 1 - (i - first)) * 1000);
}
