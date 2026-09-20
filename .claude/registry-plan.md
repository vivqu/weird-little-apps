# Registry plan: initial scaffold

The current roadmap item in `PLAN.md`. Scope:

1. A YAML schema and seed entries.
2. A paginated index of apps.
3. A detail page per app, with previous / next.

Out of scope (see `PLAN.md` → "After the registry scaffold"): search, other browse modes, maker profiles, exhibits, tags.

**State:** one page (`src/pages/index.astro`), no content collection, no shared layout. Astro 7.2.10, zod 4.
**Scale:** 5-10 apps at launch, thousands eventually. Test at 8, 100 and 2,000.

## Pages

| Page | URL | Contents |
|---|---|---|
| Index | `/apps`, `/apps/page/N` | all apps, `collected` descending then id, 24 per page. Pagination: first / previous / "page 3 of 84" / next / last |
| Detail | `/apps/<id>` | all fields for one app; previous / next in index order; link back to the index page containing it |
| Home | `/` | unchanged, except the "next: directory of apps" line links to `/apps` |

`page` is a reserved app id.

## Part 1: Schema

### Rules

1. **Start small.** The schema holds only what the index and detail pages display. Add a field when a design iteration needs it and the data exists for most apps. New fields are always optional, so existing YAML never changes. Candidates: `PLAN.md`.
2. Required fields must be fillable in two minutes by someone new to the repo.
3. `form_factor` is the only enum. Everything else is free text.
4. Anything computable (order, numbering) is derived, never hand-maintained. Display order comes from `collected`; alphabetical is the alternative.
5. We take and store our own screenshots at collection time. No hotlinked images. Entries for dead apps are kept.
6. No software metadata: license, version, releases, price, star counts.

### Files

```
src/content.config.ts
src/content/apps/<id>/
  index.yaml
  screenshot-1.png
```

- The id is the app's folder name, set via `generateId`, so parent folders can be reorganised without changing URLs.
- No `slug` field: Astro treats `data.slug` as an id override.
- **Screenshots live in the repo for now and move to remote hosting (CDN or object storage) when size requires it.**
  - Starting budget, unmeasured: up to 4 per app, 1600px wide max, ~150 KB each. Step 1.2 replaces these with measured numbers.
  - Two limits apply: originals count against the git repo; Astro's optimized output counts against the GitHub Pages site limit (1 GB as documented; re-check). 2,000 apps at the starting budget is ~1.2 GB of originals.
  - Migration must not require hand edits: a script rewrites `image` paths to URLs, and the schema accepts either.
  - Host on our own domain, to keep the no-third-party-requests rule.

### Fields

Required:

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `tagline` | string, ≤ 140 chars | one sentence. The most important field on the index |
| `url` | URL | primary destination: live site, store page, repo, or video |
| `form_factor` | enum or list of enum | `website, web app, ios app, android app, mac app, windows app, command line, browser extension, bot, hardware, other`. List multiple forms, primary first. `website` = read or look at; `web app` = do things in; default to `web app`. Values are display strings. Name is provisional |
| `by` | person or list of persons | maker(s) |
| `why` | string, 1-3 sentences | curator's note, first person: why it was collected |
| `collected` | date | date added. Drives order and accession number. Never backdate after publishing |

Optional:

| Field | Type | Notes |
|---|---|---|
| `description` | string, 1-2 paragraphs | factual background, third person. Plain text |
| `created` | year, `"YYYY-MM"`, or date | when it was made. Often unknown |
| `curator` | person | defaults to Vivian in the schema; omit in YAML |
| `quotes` | list of `{text, url, by?, date?}` | the maker's own words. `by` defaults to the first maker |
| `screenshots` | list of `{image, alt, caption?, taken?}` | `image`: `image()` path, still or GIF. `alt` required. `taken`: capture date. First item is the index cover. Expected for every app; the schema allows none, and the build lists apps without one |

**Person:** a name string, or `{name, url?, links?}`. `links` items are a URL string or `{label, url}`; a bare URL is labelled from its hostname at build time (`x.com` → "twitter", otherwise the domain). Full URLs, not handles, so a new platform needs no schema change.

**Quotes replace embeds.** A tweet embed is a third-party script and disappears with the tweet. Store the text, attribution and source URL. Works for any platform.

### Example

```yaml
# src/content/apps/pocket-metronome/index.yaml  (placeholder content)
name: Pocket Metronome
tagline: a metronome that fits in a browser tab.
url: https://example.com/pocket-metronome
form_factor: [web app, ios app]
by:
  - name: Example Maker
    url: https://example.com
    links:
      - https://github.com/example
      - { label: newsletter, url: https://example.com/news }
why: |
  i keep this open in a tab whenever i practice. it does one thing and has no settings.
collected: 2026-09-20

description: |
  Built in a weekend by a piano teacher. A tempo dial and a start button.
created: 2024
quotes:
  - text: "<exact words, copied from the source>"
    url: https://example.com/post
    date: 2024-06-01
screenshots:
  - image: ./screenshot-1.png
    alt: a large tempo dial set to 96 bpm above a single start button
    caption: the whole app
    taken: 2026-09-20
```

### Implementation notes

From the Astro docs and the installed source. **Not yet verified by a build.**

- Config: `src/content.config.ts`. `defineCollection` from `astro:content`, `glob` from `astro/loaders`, `z` from `astro/zod`. zod 4: `z.url()`.
- Loader: `glob({ pattern: '**/*.{yaml,yml}', base: './src/content/apps', generateId })`. `base` is relative to the project root. `generateId` returns the entry's folder name and rejects `page`.
- Schema is a function: `({ image }) => z.object({...})`. `image()` paths resolve relative to the entry file; files must be under `src/`. Documented for Markdown frontmatter only; YAML uses the same code path (step 1.2 confirms).
- Animated GIFs may not survive optimization; if not, serve them unoptimized.
- YAML dates: `2026-08-04` → Date, `2024` → number, `2024-06` → string. Use `z.coerce.date()` for `collected` and `taken`; `created` is a union, normalised in one helper.
- Normalise `form_factor` and `by` to arrays with a transform. `curator` uses `.default()`.
- Pagination: `paginate()` in `getStaticPaths`. If `/apps/page/N` collides with `/apps/<id>`, move pagination to `/page/N`.
- Schema errors fail `astro build`, naming the file and field. No other validation tooling.
- Dev server may not pick up edits to entries in subfolders (withastro/astro #17991, unverified). Fix: `npx astro dev stop && npx astro dev`.
- Docs: https://docs.astro.build/en/guides/content-collections/ · https://docs.astro.build/en/reference/content-loader-reference/ · https://docs.astro.build/en/guides/images/ · https://docs.astro.build/en/guides/routing/

### Steps

- [ ] 1.1 `src/content.config.ts` with the `apps` collection.
- [ ] 1.2 Verify `image()` from a YAML entry: build one entry with a screenshot and confirm an optimized image is emitted. Test a GIF. Record original and `dist/` sizes for 3-4 real captures; set the screenshot budget from them.
- [ ] 1.3 Seed entries from Vivian's list, with our own screenshots. Include edge cases: no screenshot, hardware or bot, very long name, two makers, multiple form factors.
- [ ] 1.4 Fixtures: `WLA_FIXTURES=2000 npm run build` pads the collection at query time, never on disk. Vary name length and `form_factor`; omit screenshots on some.
- [ ] 1.5 `npm run check` and `npm run build` pass. A broken YAML fails the build with a readable error.

## Part 2: Index and detail pages

### Design brief

**UI is mocked in Claude Design before any page code is written.** Pages are built once, from the chosen mock.

Follow the style direction in `CLAUDE.md`. Mock at desktop and 390px.

- **Index styles to mock.** Each is one page of up to 24 apps in `collected` order; pagination is the same for all. Mock each with and without cover images, in two states: 8 apps, and a full page of 24 (page N of 84).

  | Style | Layout | Reference | Risk |
  |---|---|---|---|
  | Card catalog | index cards, text-led: accession number, name, tagline, maker, form factor; small taped-on image if present | Everest Pipkin's tools list, Robin Sloan's lab | plain if the cards carry too little |
  | Ledger | one dense list as a single paper object (receipt, printout, checkout card): one row per app | 512kb.club, Low-tech Magazine archive | thin at 8 rows; no room for images |
  | Shelf | grid of objects, one per app, image or icon led; fallback graphic if no image | 100r.co projects, neal.fun, wholeearth.info | depends on every app having usable art |
  | Screenshot wall | image-led tiles in small window frames, name and tagline beneath | itch.io, Neocities browse | apps without screenshots look second-class |
  | Programme guide | printed TV listings: rows grouped by `form_factor` as channels, apps as slots | hypertext.tv | groups are uneven; reads empty at 8 |
  | Desk | objects placed at varied angles and offsets, positions derived from the id | Space Jam 1996, windows93 | 24 per page is near its limit; needs a stacked layout at 390px |

  Pick one as the index. The others stay candidates for a later front page (`PLAN.md`).
- **Pagination:** first / previous / position / next / last. Never a full list of page numbers.
- **Detail page:** screenshots (cover, then the rest with captions) beside a museum-style label, plus previous / next / back to index. Mock the fullest and the barest seed entry.

Detail label contents. Non-field values are derived at build time:

| Shown | Source |
|---|---|
| maker, title, date | `by`, `name`, `created` ("date unknown" if absent) |
| form | `form_factor`, joined |
| credit line | "collected by `curator`, `collected` year" |
| accession number | `YYYY.NNNN`: `collected` year + order within that year, ties broken by id |
| background | `description` |
| curator's note | `why`; visible without scrolling on desktop |
| maker's words | `quotes` |

References: see the end of this file.

### Steps

- [ ] 2.1 **Finalize the UI.** In Claude Design, using the seed entries: mock the six index styles, narrow to one, then mock pagination and the detail page to match it. Update `PLAN.md` → Architecture with the chosen design. No page code before this.
- [ ] 2.2 Reconcile the schema with the final UI: add fields it needs, drop fields it never shows. Update seed entries.
- [ ] 2.3 Shared base layout: fonts, tokens, background.
- [ ] 2.4 Index with `paginate()`. Confirm there is no route collision with the detail route.
- [ ] 2.5 Detail page: `src/pages/apps/[id].astro`.
- [ ] 2.6 Link home to `/apps`.
- [ ] 2.7 At 2,000 fixtures: build time, index page weight, pagination and previous / next correct at both ends.
- [ ] 2.8 Screenshot `/apps`, `/apps/page/2` and a detail page (desktop and mobile); compare with the mocks. Update `PLAN.md` → Architecture and Roadmap.

## Blocked on

- Vivian's starter list of apps (step 1.3).

## References

Design input for the mocks. Assessed from fetched page text, not viewed rendered. All loaded when fetched unless flagged.

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
