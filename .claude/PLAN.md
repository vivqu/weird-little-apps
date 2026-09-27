# weirdlittleapps.com: plan

A static site that showcases small, unusual apps, some built with AI agents. Each app is a YAML file; the site is generated from those files.

## Inspiration

The site grows out of Vivian's post
[Making space for weirdness and fun](https://vivqu.substack.com/p/making-space-for-weirdness-and-fun).
The parts that should shape the site:

- **Fun is the fuel.** Projects survive on "utilitarian net fun" (Mike McQuaid): more enjoyable than tedious, on balance. The site should feel that way to browse and to maintain.
- **Purpose-built, single-use software** made for one specific, sometimes idiosyncratic need is worth celebrating, not apologizing for.
- **AI agents make the tedious parts fun**, which is why some of these apps exist at all. Say so plainly per app.
- **The weird quotient.** Ideas that wouldn't survive a planning meeting are the point.
- **Motto:** "Make the weird thing. The right people will find it."

Apps mentioned in the post are good seed entries: Craig Mod's tax software, Grug, Tiny Tool Town, Heliophilia, Bookpile, Nature this week.

For the content model: every entry should answer *why does this exist* and *what itch does it scratch*, not just *what is it*. Tone of the site copy: lowercase, personal, optimistic, no marketing voice.

## Goals

- Static output, deployable to any static host.
- Adding an app means adding one YAML file plus screenshots. No code changes.
- Small, fast, no client JS by default. The one third-party script is a post embed on a detail page whose entry asks for it (`embed: true` on a quote).
- Maintainable by an AI agent: predictable file layout, schema-validated content, one build command.

## Architecture

**Stack.** Astro 7, static output, no third-party integrations. Node 22 (`.nvmrc`). Dev dependencies: Playwright (only for `scripts/screenshot.mjs`), `@astrojs/check` + `typescript` (only for `npm run check`).

**Content.** One folder per app: `src/content/apps/<id>/index.yaml` plus our own screenshots. A single Astro content collection (`src/content.config.ts`) validates every entry against a zod schema at build time; an invalid entry fails the build. `src/lib/apps.ts` derives everything the schema leaves out (index order, accession numbers, phone-shaped screenshots, pagination) and `WLA_FIXTURES=2000 npm run build` pads it with filler for stress tests. Spec and measurements: `.claude/registry-plan.md`. Screenshot rules: `UPLOAD.md`. Site-wide copy (name, subtitle, lede, motto, the post, the about page's status and next lines) is a second one-entry collection, `src/content/site.yaml`, read through `getSite()`; `{apps}` in the status line becomes "43 apps", linked to the index.

**Routes.**

| Route | Contents |
|---|---|
| `/`, `/page/N/` | the index: a screenshot wall, 24 apps a page, newest first |
| `/compact/`, `/compact/page/N/` | the same list as a text-only printout |
| `/apps/<id>/` | detail page per app, with newer / older |
| `/about/` | origin story, in the original work-in-progress page's design (copy is a draft) |

Pages are `src/pages/*.astro` on `src/layouts/Base.astro`, with the header, footer, pager, view switch and wall tile in `src/components/`. Images go through `astro:assets` (`<Image>`): every screenshot is served as webp at the size each place needs, and an inline integration in `astro.config.mjs` prunes the unreferenced originals from `dist/`. The detail page carries the site's only client JS (eight inline lines: arrow keys page through screenshots; the thumbnails work without it).

**Visual identity.** Defined in `CLAUDE.md` → Style direction. Light only. Fonts self-hosted in `public/fonts/`. Design tokens are in `:root` in `src/styles/site.css`, which is the prototype's stylesheet ported as is. The design record is the commentable prototype linked from `.claude/registry-plan.md`.

**Hosting.** GitHub Pages. Every push to `main` runs `.github/workflows/deploy.yml`: `withastro/action` builds, `actions/deploy-pages` publishes. Pages source is "GitHub Actions". Repo: `vivqu/weird-little-apps` (public).

**Domain.** `weirdlittleapps.com`, an apex domain, so `astro.config.mjs` sets `site` and no `base`. `public/CNAME` holds the domain and must not be deleted. DNS is at Namecheap: four GitHub `A` records on `@`, and `www` CNAME → `vivqu.github.io`. Namecheap's email-forwarding `MX` records are left in place. HTTPS is enforced. `www` and `vivqu.github.io/weird-little-apps` redirect to the apex.

**Operations.**
- Site not loading: run `gh api repos/vivqu/weird-little-apps/pages/health` and check `is_served_by_pages` before changing config. GitHub's Pages IPs can be unreachable while `github.com` works.
- HTTPS certificate missing or stuck: remove and re-add the custom domain (`gh api -X PUT repos/vivqu/weird-little-apps/pages -F cname=`, then `-f cname=weirdlittleapps.com`).
- Optional, not done: verify the domain at the GitHub account level so it can't be claimed if the repo is renamed or deleted.

## Roadmap

1. **Now: content.** The registry scaffold shipped 2026-09-24 with 43 seed apps whose taglines and curator's notes are drafts from the prototype, several makers unverified ("maker unknown"), and `collected` dates spread one a day backwards from 2026-09-20 by the seed script. Rewrite the copy, fix the makers, then deploy. The about page copy is also a draft.
2. **Next:** the items under "After the registry scaffold".
3. **Also wanted:** OG images, a guestbook.

## After the registry scaffold

Out of scope for `.claude/registry-plan.md`. The collection is expected to reach thousands of apps; these get added as it grows. None of it is specified yet.

- **Front page and other browse modes.** A front page showing a small hand-picked or rotating set, in front of the paginated index. Candidates: the index styles not chosen in `.claude/registry-plan.md` → Design brief, plus two patterns not listed there: random (a static "app of the day" chosen at build time with a daily scheduled rebuild, or three picks reshuffled per deploy; true random needs ~5 lines of JS) and category / facet browsing (useful past ~50 apps; needs `tags`).
- **Maker profiles.** `src/content/people/<id>.yaml` and `/makers/<id>`, listing one person's apps and links. `by` would accept a `people` id as well as an inline person, so existing entries don't change. Add when makers start repeating.
- **Exhibits.** A curated group of apps with its own curator's note. One YAML file per exhibit listing app ids, at `/exhibits/<id>`.
- **Tags as navigation.** A tag gets a page and appears as a filter once 3 apps share it. The build reports tags used once and near-duplicates (`music` / `audio`). An optional `src/content/tag-aliases.yaml` merges variants without editing entries. Avoid a tag UI that shows nothing until a tag is clicked (tinytools.directory).
- **Search.** At ~200 apps. Static and self-hosted (Pagefind or similar builds an index into `dist/`), with the script loaded only on the search page. This is client JS, so it is an explicit exception to the no-client-JS rule. Until then, the index pages and Ctrl-F.
- **Recently collected + RSS.** A `/log` view and a feed, both ordered by `collected`.
- **Entry-drafting tool.** Writing entries limits how fast the collection grows. Input: a URL. Output: a draft `index.yaml` (name, tagline, `form_factor`, maker and links, candidate quotes), screenshots taken with Playwright within the size budget, and a Wayback Machine capture. The curator writes `why` and reviews the rest. The tool never drafts `why`.
- **Link checking.** Before ~200 apps. A scheduled job updates one standing issue and writes to a separate status file, not the hand-written YAML. It never blocks PRs. It flags candidates for `status: gone`; a person decides.
- **Contributions.** A `CONTRIBUTING` note and a PR template containing a commented YAML block to paste. The Astro build on PRs validates the schema. Add `submitted_by` if submitter and curator ever differ.
- **Suggestions from visitors.** A way for anyone visiting the site to suggest a weird app, without a GitHub account. Reference: Bookpile's suggest form, https://bookpile.org/suggest?ref=DenseDiscovery-392 (a single page: the url, a note, no login; the `ref` parameter records where the visitor came from). Ours would be a form on the site whose submissions land somewhere the curator reviews (a GitHub issue via a small endpoint, or a hosted form service on our own domain), never straight into the collection. The curator writes the entry; a suggestion is a lead, not a draft. Fits the "est. 2026" voice as a suggestion box or a postcard, not a modal.
- **Files and hosting at scale.** At ~1,000 apps, shard `src/content/apps/` by year collected (the glob pattern becomes `*/*/index.yaml`; ids come from the app's own folder name, so URLs don't change). GitHub's web UI stops listing a directory past 1,000 entries. Screenshots are the size risk: about 100 KB published per screenshot after optimization (measured, `.claude/registry-plan.md`) against GitHub Pages' 1 GB site limit (as documented; re-check), so plan to move images out of the repo around then. A 2,000-app build takes seconds once images are cached; a cold build re-optimizes every image (~10 ms each).
- **Fields to add later.** The scaffold schema has twelve fields by design. Add a field when a design iteration needs it and the data exists for most apps. All are optional, so existing YAML doesn't change.
  - Likely first: `made_with` (`[swift, claude code]`; records agent involvement per app), `status` (`alive` / `napping` / `gone`, with `gone_since`) when the first collected app dies, `archive_url` (a Wayback Machine capture, saved at collection time), `tags` once something links from them.
  - Links: `source`, `writeup`, and `links: [{label, url}]` for anything else. Named fields, not one typed array.
  - Credit: `via` (how it was found), `inspired_by` for remakes and ports.
  - Descriptive, if the data can be gathered: `made_in` ("a weekend"), `time_to_fun`, `vibe`, `needs`, `warning`, `size`.
  - Art: `icon` or an 88x31 `badge`, if a design needs small art per app.
