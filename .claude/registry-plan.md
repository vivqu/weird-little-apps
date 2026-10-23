# Registry: schema, index and detail pages

**Built 2026-09-24.** All steps in this file are done; it stays as the spec the pages implement and the
record of the decisions taken while building. Roadmap: `PLAN.md`.

Out of scope (see `PLAN.md` → "After the registry scaffold"): search, other browse modes, maker profiles, exhibits, tags.

## Pages

| Page | URL | File | Contents |
|---|---|---|---|
| Index | `/`, `/page/N/` | `src/pages/[...page].astro` | the screenshot wall: all apps, `collected` descending then id, 24 per page, 3 across. Pagination: first / previous / "page 1 of 2" / next / last |
| Compact view | `/compact/`, `/compact/page/N/` | `src/pages/compact/[...page].astro` | the same list as a text-only printout ("register of holdings"); reached from the expanded / compact switch in the header |
| Detail | `/apps/<id>/` | `src/pages/apps/[id].astro` | one app; newer / position / older in index order; the wordmark links back to the index page containing it |
| About | `/about/` | `src/pages/about.astro` | the original work-in-progress page's design (window, admission ticket, motto sticky note) telling the origin; linked from the footer on every page ("est. 2026 · about") |

`/page/1/` and `/compact/page/1/` redirect to their roots (`redirects` in `astro.config.mjs`). Internal links carry a trailing slash, which is the URL GitHub Pages serves (`build.format: 'directory'`), so no redirect hop.

`page`, `compact`, `about` and `apps` are reserved app ids (`generateId` in `src/content.config.ts` rejects them).

## Part 1: Schema

### Rules

1. **Start small.** The schema holds only what the index and detail pages display. Add a field when a design iteration needs it and the data exists for most apps. New fields are always optional, so existing YAML never changes. Candidates: `PLAN.md`.
2. Required fields must be fillable in two minutes by someone new to the repo.
3. `form_factor` is the only enum. Everything else is free text.
4. Anything computable (order, numbering, whether a screenshot is phone-shaped) is derived, never hand-maintained. Display order comes from `collected`.
5. We take and store our own screenshots at collection time. No hotlinked images. Entries for dead apps are kept. Exception: apps listed in a store use the store listing's own images, downloaded into the entry (`UPLOAD.md`).
6. No software metadata: license, version, releases, star counts. The one exception is `price`, and only because it belongs on the visit button ("$2.99 on the App Store ↗"): a paid app should say so before you tap.

### Files

```
src/content.config.ts           the collection and its zod schema
src/content/apps/<id>/
  index.yaml
  screenshot-1.jpg              up to 4; jpg, png or gif
src/lib/apps.ts                 the collection as the pages see it: order, accession numbers, shot kinds, pagination, display helpers
src/lib/fixtures.ts             WLA_FIXTURES padding
src/content/site.yaml           site-wide copy and status (the `site` collection; schema in content.config.ts), read via src/lib/site.ts
```

- The id is the app's folder name (`generateId`), so parent folders can be reorganised without changing URLs. The glob pattern is `*/index.{yaml,yml}`: one entry per folder, directly under `src/content/apps/`.
- No `slug` field: Astro treats `data.slug` as an id override.
- **Screenshots live in the repo** and move to remote hosting on our own domain when size requires it. Measured 2026-09-24 with the 43 seed apps (58 images):
  - Originals: 7.3 MB, avg 125 KB. Browser captures are 1280×800 JPEG; store images 600×1300.
  - Published: every image becomes webp. Full size (detail page) avg 67 KB for browser captures, 37 KB for phone; the 720px index cover avg 25 KB; 200px thumbnail avg 9 KB. **~100 KB published per screenshot**, so 2,000 apps × 2 screenshots ≈ 400 MB on Pages (limit 1 GB) and ≈ 500 MB of originals in git. Revisit hosting around 1,000 apps, as `PLAN.md` says.
  - Unreferenced originals are pruned from `dist/_astro/` by the inline `prune-images` integration in `astro.config.mjs` (Astro copies collection images into the output as well as the variants and doesn't know to delete them; without the hook the site was twice the size).
  - Animated GIFs come through as animated webp (frames, loop and delays kept); verified with a 2-frame test.
  - Migration must not require hand edits: a script would rewrite `image` paths to URLs, and the schema would accept either.

### Fields

The reference for writing entries is `src/content/README.md`; this is the spec it follows.

Required:

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `tagline` | string, ≤ 140 chars | one sentence. The most important field on the index. Voice: the museum label, restrained and explanatory with a hint of amusement, distilled from the maker's words |
| `url` | URL | primary destination: live site, store page, repo, or video. The visit button's label is derived from its host ("open in App Store ↗", "open in Google Play ↗", "view on GitHub ↗", "open in Chrome Web Store ↗", else "visit ↗") |
| `form_factor` | enum or list of enum | `web, ios, android, mac, windows, cli, extension, bot, hardware, other`. List multiple forms, primary first. Anything that runs in a browser tab is `web`. Values are display strings |
| `by` | person or list of persons | maker(s) |
| `why` | string, 1-3 sentences | curator's note, first person: why it was collected. Voice: punchy, opinionated, snarky; the contrast with the tagline is deliberate |
| `collected` | date | date added. Drives order and accession number. Never backdate after publishing |

Optional:

| Field | Type | Notes |
|---|---|---|
| `created` | year, `"YYYY-MM"`, or date | when it was made. Often unknown. Shown as "2025", "may 2026" or "12 may 2026"; "date unknown" if absent |
| `curator` | person | defaults to Vivian Qu in the schema; omit in YAML |
| `price` | string | what it costs, as shown (`$2.99`). Store labels become "$2.99 on the App Store ↗" / "$2.99 on Google Play ↗" / "$2.99 on the Chrome Web Store ↗"; other urls "visit · $2.99 ↗". Omit when free |
| `links` | list of links | secondary links, shown on the label as "also: label ↗ · label ↗". A link is a URL string (labelled from its hostname at build time; `x.com` → "twitter") or `{label, url}` |
| `quotes` | list of `{text, url, by?, date?}` | the maker's own words. `by` defaults to the first maker |
| `recs` | list of `{title, url, by?, date?}` (or bare URLs) | where other people recommended or wrote about the app, listed under the maker's words |
| `screenshots` | list of `{image, alt, caption?, taken?, bezel?, panel?}` | `image`: path relative to the entry, still or GIF. `alt` required. `taken`: capture date. First item is the index cover. Expected for every app; the schema allows none, and the build lists apps without one. `bezel` / `panel`: see `UPLOAD.md`; only meaningful on phone-shaped images |

**Person:** a name string, or `{name, url?}`. Shown as the name, linked when `url` is present.

**Derived, never written:** whether a screenshot is phone-shaped (`tall`: height / width > 1.6), the accession number, the index position, the domain in a tile's title bar, the visit label, link labels.

**Quotes carry embeds.** Every quote stores the text, attribution and source URL, so nothing disappears with the post. A quote with `embed: true` (decided 2026-09-27) is additionally shown as the post itself: the blockquote carries the provider's class and data attributes, the provider's script (Threads `embed.js`, X `widgets.js`) is loaded on that page only, and it swaps the blockquote for its iframe. Without the script the quote reads as written; the script is only loaded on viewports of 616px (38.5rem) and up: below that the label squeezes the card under its 540px and the Threads header overlaps itself. Supported hosts: threads.com / threads.net, x.com / twitter.com; any other host with `embed: true` fails the build.

**Dropped while reconciling with the final UI (2.2):** `description` (never shown), person-level `links` (never shown; app-level `links` replaced them).

### Example

```yaml
# src/content/apps/pocket-metronome/index.yaml  (placeholder content)
name: Pocket Metronome
tagline: a metronome that fits in a browser tab.
url: https://example.com/pocket-metronome
form_factor: [web, ios]
by:
  - name: Example Maker
    url: https://example.com
why: i keep this open in a tab whenever i practice. it does one thing and has no settings.
collected: 2026-09-20

created: 2024
links:
  - { label: source code, url: https://github.com/example/pocket-metronome }
  - { label: newsletter, url: https://example.com/news }
quotes:
  - text: "<exact words, copied from the source>"
    url: https://example.com/post
    date: 2024-06-01
screenshots:
  - image: ./screenshot-1.jpg
    alt: a large tempo dial set to 96 bpm above a single start button
    caption: the whole app
    taken: 2026-09-20
```

### Implementation notes (verified by the build)

- Config: `src/content.config.ts`. `defineCollection` from `astro:content`, `glob` from `astro/loaders`, `z` from `astro/zod` (zod 4: `z.url()`; `.default()` returns its value without parsing, so defaults are given in output shape).
- YAML is parsed by js-yaml: `2026-08-04` → Date, `2024` → number, `2024-06` → string. `collected`, `taken` and quote dates use `z.coerce.date()`; `created` is a union formatted by `fmtCreated`.
- `image()` works from YAML entries exactly as from Markdown frontmatter. At query time an image is `ImageMetadata` (`src`, `width`, `height`, `format`) with no filesystem path, which is why `bezel` is a hand flag rather than detected at build time (`scripts/bezel.mjs` runs the heuristic when adding an entry).
- Pagination is hand-rolled (`paginate()` in `src/lib/apps.ts`) because Astro's `paginate()` can't put page 1 at `/` and the rest at `/page/N`. The routes are rest params: `[...page].astro` with `page` undefined or `page/N`.
- Fixtures: `WLA_FIXTURES=2000 npm run build` pads the collection at query time (`import.meta.env.WLA_FIXTURES`); nothing is written to disk. Fixture covers borrow real screenshots; a fifth have none. Measured 2026-09-24: 2,169 pages in 1.5 s (images cached), index page 14 KB of HTML, first / last / newer / older correct at both ends.
- Schema errors fail `astro build` with exit 1, naming the file and each bad field. No other validation tooling.
- Dev server may not pick up edits to entries in subfolders. Fix: `npx astro dev stop && npx astro dev`.
- Docs: https://docs.astro.build/en/guides/content-collections/ · https://docs.astro.build/en/reference/content-loader-reference/ · https://docs.astro.build/en/guides/images/ · https://docs.astro.build/en/guides/routing/

### Steps

- [x] 1.1 `src/content.config.ts` with the `apps` collection.
- [x] 1.2 `image()` from YAML verified; GIF verified; sizes measured (above).
- [x] 1.3 43 seed entries generated from the prototype's data (taglines and `why` notes are drafts for Vivian to rewrite; several makers are "maker unknown"). Edge cases present: hardware (apartment-birds), very long name (a-pint-near-me), two makers (grug, in-the-weights), multiple form factors (pi-fyi, talktyl), snake_case name (has_not_been_viewed_much). None lacks a screenshot; fixtures cover that.
- [x] 1.4 Fixtures.
- [x] 1.5 `npm run check` and `npm run build` pass (`@astrojs/check` + `typescript` added as dev dependencies); a broken YAML fails the build readably.

## Part 2: Index and detail pages

### Design

**Decided and built.** The UI was mocked as a clickable prototype (2026-09-20/21, ~50 rounds of comments) and the pages were ported from it; the prototype source (`mocks/`) was deleted once they matched (2026-09-24). The commentable prototype remains at https://claude.ai/artifact/HekHRU75TE2AwN9hbrvgDG (private Artifact, version 50) as the design record. The stylesheet `src/styles/site.css` is the prototype's CSS; the frame construction, phone morph and bezel handling took several rounds to get right, so change them with care.

**The design, in words** (exact values are in `site.css`):

- **Ground:** pale aqua `#d3f0f1` with a faint teal dot grid (24px), hard shadows `#6fbcc0`.
- **Header, every page:** wordmark (3.4rem, "little" with the hand-drawn azure underline, lime star and azure squiggle hanging off it) over the subtitle "purveyors of fine apps". Right side: on the index, the expanded / compact switch (small azure pills) with "43 apps · newest first" under it; on a detail page, the newer / position / older pager. On a phone the right side stacks under the subtitle, left-aligned, with the detail pager centred.
- **Footer, every page except about:** a short centred dashed rule, then "est. 2026 · made by vivian qu · about" (plain underlines; the name links to vivqu.com, from `site.yaml`).
- **Index (wall):** 3 tiles across (2 on a tablet, 1 on a phone), 24 per page. A tile is a retro window (2px indigo frame built as an indigo block with the title bar and capture inset 2px; title bar shows the app's domain without `www.`) holding the cover at 1512:860 (the shape of a Retina browser capture; any other shape is cropped from the top left), tilted a degree or so, hard shadow; below it the name (serif), tagline and "by maker". A phone-shaped cover gets a drawn phone (thin outline, peach body, pill at the top) instead of a window; a store marketing panel gets a thin bordered image; a capture that already contains a device is shown bare. Hover: the tile rises 1px and its shadow deepens one shade. Pagination strip at the bottom is level (only screenshots tilt); on a phone "first" / "last" collapse to their arrows.
- **Compact view:** one paper printout with sprocket-hole strips down both sides, headed "REGISTER OF HOLDINGS" over a short dashed rule and "page N of M · date range" in muted ink. One row per app: accession number, name over tagline, maker, form, date collected. No thumbnails. Mint row stripes.
- **Detail page:** stacked. The cover sits in one static frame on a plain paper mat, centred; with several screenshots, thumbnails under the frame pick the capture (labels for hidden radio buttons, so no JS) and the image cross-fades while the frame morphs between window, phone and bare as the capture's kind requires; left / right arrow keys also page (the page's only JS, inline, optional). Caption line "N of M · caption" left, visit button right. The curator's note is a tilted sticky note on the mat's edge. Below: the museum label (maker, name, date · form, tagline, optional "also: website ↗" secondary links, maker's words as a quote, credit line and accession number). On a phone the mat keeps the page margins and sits level, the visit button moves under the thumbnails, and the note hangs off the mat's bottom edge (changed from the prototype's edge-to-edge mat, 2026-09-24).
- **About page:** the original home page's design (window with `weirdlittleapps.com/about` in its title bar, wordmark, subtitle, lede, admission-free ticket, star and squiggle, motto sticky note with "read the post") with a short origin text and a quote from the post styled like maker's words. Copy is a draft.

Detail label contents. Non-field values are derived at build time:

| Shown | Source |
|---|---|
| date · form, title, maker | `created` ("date unknown" if absent), `name`, `by` |
| form | `form_factor`, joined |
| credit line | "collected by `curator`" (the year is in the accession number) |
| accession number | `YYYY.NNNN`: `collected` year + order of collection within that year, ties broken by id |
| curator's note | `why`; visible without scrolling on desktop |
| maker's words | `quotes` |
| recs | `recs`, as "→ title · by (date)" |
| secondary links | `links`, as "also: label ↗" |

### Steps

- [x] 2.1 Finalize the UI (prototype).
- [x] 2.2 Schema reconciled: `links` added, `bezel` / `panel` hints added, `tall` derived, `description` and person `links` dropped, rule 5 amended for store images.
- [x] 2.3 Shared layout (`src/layouts/Base.astro`, `src/styles/site.css`, `src/components/`); the old `index.astro` became `/about`.
- [x] 2.4 Index and compact view with pagination.
- [x] 2.5 Detail page.
- [x] 2.6 Arrow-key paging.
- [x] 2.7 2,000-fixture build measured.
- [x] 2.8 Screenshots compared with the prototype on desktop and mobile; `mocks/` deleted.

## References

Design input for the prototype. Assessed from fetched page text, not viewed rendered.

| Site | Relevant for | Notes |
|---|---|---|
| https://github.com/everestpipkin/tools-list | card catalog | text-only item: `Name - one sentence`; 500+ entries |
| https://www.robinsloan.com/lab/ | card catalog | title, date, subtitle; works with 5 items |
| https://512kb.club, https://1mb.club | ledger | ranked table; one quantitative field sets the sort order |
| https://solar.lowtechmagazine.com/archives/ | ledger | 300+ items in one static page |
| https://100r.co/site/projects.html | shelf | icon + tagline per item, grouped by type; fully static |
| https://neal.fun | shelf | custom art per tile does the work; no navigation aids past ~60 items |
| https://wholeearth.info | shelf | rows by series tolerate uneven counts; needs cover art |
| https://itch.io/games/tag-bitsy | screenshot wall | thumbnail, tagline, author; paginated index at scale |
| https://neocities.org/browse | screenshot wall | paginated, thousands of items; sort options include random |
| https://hypertext.tv | programme guide | 9 channels x half-hour slots; a listings grid needs no JS |
| https://ytch.tv | programme guide | channel surfing; fully JS |
| https://www.spacejam.com/1996/ | desk | icons placed by hand around a logo; works only at 5-12 items |
| https://www.windows93.net | desk | desktop icons; window management needs JS, static icons linking to pages do not |
| https://diagram.website | desk | hand-drawn map; regions act as categories; every item needs a position |
| https://www.cameronsworld.net | desk | scrolling GIF collage; no text per item, so nothing can be found twice |
| https://usesthis.com | detail page, pagination | 1,300+ entries; fixed detail template; weak numbered pagination |
| https://pudding.cool/archives/, https://internetphonebook.net | accession numbers | per-item numbers |
| https://xn--sr8hvo.ws | previous / next | ring navigation without JS |
| https://theuselessweb.com | later: random | single random button; no overview; keeps an archive of dead sites |
| https://wiby.me | later: random | "surprise me..." as a plain text link |
| https://webring.xxiivv.com | later: random, badges | numbered member list; optional 88x31 badge; members join by pull request |
| https://tinytools.directory | later: tags | shows nothing until a tag is clicked; JS required. Avoid |
| https://href.cool | later: categories | unusual category names (Crimes, Tapes, Supernatural). Entries did not appear in the fetch |
| https://maggieappleton.com/garden | later: status, filters | growth stage as status; filters by topic and type |
| https://www.naiveweekly.com | later: browse by maker | one archive browsable by Sites / People / Places |
| https://special.fish | later: front page | index shows each person's latest post, not a description |

Not confirmed: ooh.directory (403; from search snippets, it offers categories, random, recently added and recently updated over one dataset), cloudhiker.net (403), Marginalia explore (redirect loop), poolsuite.net / mmm.page / are.na explore (JS-only, nothing readable). Glitch's discover page no longer exists; the service shut down in July 2025.
