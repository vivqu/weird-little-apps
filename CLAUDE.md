# weird little apps

Static site for weirdlittleapps.com: a YAML-driven showcase of small, strange apps.
Astro, no client JS by default, deployed to GitHub Pages via GitHub Actions.

See `.claude/PLAN.md` for the current architecture and what's next. Keep it updated as work lands.
The registry (schema, index, detail pages) is built; its spec and the decisions behind it are in `.claude/registry-plan.md`.

## Commands

```sh
npm run dev          # dev server (Astro picks a port; check the output)
npm run build        # static build into dist/
npm run preview      # serve dist/ locally
npm run check        # type-check .astro files
npm run screenshot   # build, then screenshot / into screenshots/index.png
WLA_FIXTURES=2000 npm run build   # pad the collection with filler for a stress test (nothing written to disk)
WLA_SHOW_HIDDEN=1 npm run build   # include `hidden: true` entries, as the dev server always does; builds into dist-dev/ so dist/ stays production (CI ignores this)
WLA_STATS=1 npm run build         # render the counting pixel, as CI does; a plain local build sends nothing (see .claude/ANALYTICS.md)
node scripts/bezel.mjs src/content/apps/<id>/*.jpg   # does a phone-shaped image already contain a device? (see UPLOAD.md)
node scripts/capture.mjs <id> [--stale]              # take the landing screenshot (1512x860 at 2x, shrunk to 1512 JPEG), matching hand captures
node scripts/shrink.mjs src/content/apps/<id>        # compress an entry's screenshots to 1x JPEGs and repoint index.yaml (see .claude/new-app.md)
node scripts/screenshot.mjs /apps/<id> --all         # after a build: screenshot every capture in the frame and check it's centred
node scripts/morph.mjs /apps/<id> 3 4                # after a build: the window ⇄ phone morph between two slides as a slowed-down contact sheet
```

## Adding an app

The step-by-step (screenshots, compression, alt text, research, created date, frame check) is `.claude/new-app.md`. One folder, `src/content/apps/<id>/`, holding `index.yaml` and up to four screenshots. The folder name is the URL (`/apps/<id>/`). Field reference with an example: `src/content/README.md`. How to capture and flag screenshots: `UPLOAD.md`. The build validates the entry and fails with the file and field named if something is off; it also logs entries without a screenshot. Order, accession numbers and phone-vs-browser framing are derived, never written. An entry with `hidden: true` is kept out of production builds but shown, tagged, on the dev server; unreviewed imports carry it until the curator has been through them.

## Workflow

- **Plan first, in `.claude/PLAN.md`.** It describes the current architecture and what's next, not history; when something changes, rewrite the affected section. Detailed specs for larger items live next to it (`.claude/registry-plan.md` for the registry).
- **Always report the dev server URL.** After starting or restarting `npm run dev`, tell the user the address from the "Dev server running at ..." line (normally http://localhost:4321). If you stop a server, say so.
- **The user commits.** Don't run `git commit` or `git push` unless asked. Leave the working tree in a state that's ready to commit.
- **Verify visually with Playwright, not the Chrome extension.** Use `node scripts/screenshot.mjs` (see below) and read the PNG. It's faster, headless, and doesn't touch the user's browser. Only reach for `claude-in-chrome` when a page needs the user's logged-in session (e.g. a private Kinopio board).
- **Astro 7 servers are daemons.** `astro dev` and `astro preview` detach and keep running; a second invocation reuses the existing one and ignores `--port`. Stop them with `npx astro dev stop` / `npx astro preview stop` (or `pkill -f astro`). The screenshot script serves `dist/` itself for this reason.
- **Stale dev content.** After changing `src/content.config.ts` (a new field, a new collection), the running dev server keeps its old parsed entries and new fields don't show up. Fix: `npx astro dev stop && rm -f .astro/data-store.json && npx astro dev`. The build is unaffected.
- **Stale dev CSS.** The dev server can keep serving an old `<style>` block after an edit (HTML updates, CSS doesn't). If a style change doesn't appear, restart with `npx astro dev stop && npx astro dev` before debugging the CSS, and tell the user to hard-refresh.
- **Content is config.** Adding an app must never require code changes; it's one YAML file plus an optional screenshot. If a feature would break that, rethink it. Site-wide words (subtitle, lede, motto, the about page's status and next lines) live in `src/content/site.yaml`, not in templates.
- **Keep it small.** No third-party integrations, frameworks, or client JS unless the plan actually calls for them. The only client JS is eight inline lines on the detail page (arrow-key paging) and the suggest page's submit handler (posts the postcard in the background and locks it with a postmark; the form works without it), and the only integration is the inline image-pruning hook in `astro.config.mjs`. The one exception is embeds: a quote with `embed: true` loads the Threads or X embed script on that detail page only, on viewports of 616px and up, with the quote text as the fallback; for a YouTube url it renders the player as a plain iframe instead.
- **No third-party requests at runtime.** Fonts are self-hosted in `public/fonts/` and preloaded with `font-display: block` so text never flashes in a fallback face. Don't add Google Fonts `<link>`s back. Post embeds (above), the suggest page's submit (a POST to the Apps Script endpoint in `site.yaml`, only when the visitor presses send) and the counting pixel (a 1×1 GIF from the GoatCounter site in `site.yaml`, on every page, production builds only; the visit buttons go through a counted `/go/<id>/` hop; `.claude/ANALYTICS.md`) are the only exceptions.

## Screenshots

`scripts/screenshot.mjs` serves `dist/` from an in-process static server, captures a full-page 2x PNG, and exits. Run `npm run build` first (or use `npm run screenshot`, which does both).

```sh
npm run build
node scripts/screenshot.mjs                 # /  -> screenshots/index.png (1280x800, light)
node scripts/screenshot.mjs --dark          # dark color scheme
node scripts/screenshot.mjs --mobile        # 390x844 viewport
node scripts/screenshot.mjs /apps/foo       # another route
node scripts/screenshot.mjs --url http://localhost:4321   # use an already-running server
node scripts/screenshot.mjs /apps/foo --all   # also one shot of the mat per capture, with an inside / centred check
node scripts/screenshot.mjs /apps/foo --dist dist-dev   # screenshot a hidden entry from the WLA_SHOW_HIDDEN build
```

Always check desktop and mobile after a visual change (there is no dark mode). `screenshots/` is gitignored.

**The frame morph.** On a detail page with both window and phone captures, the frame changes shape when you pick a
thumbnail. Every duration in it keys off `--morph` (.35s, in `:root`). To check it after touching the frame CSS:

```sh
node scripts/morph.mjs /apps/bingebrowse 3 4 --dist dist-dev    # slide 3 (window) → slide 4 (phone); 12 frames over 3s
node scripts/morph.mjs /apps/bingebrowse 4 3 --dist dist-dev    # and back
```

It overrides `--morph` at runtime, so the stylesheet stays at production speed; `--seconds 6` slows it further. Read
the sheet for: ink lines keeping their weight throughout (never thickening, fading or re-drawing), the peach body
thinning and the corners rounding, the title bar's lines / dots / url fading in over the second half, the island fading
in last, and the capture cropped from its centre while the shape is wrong for it. To watch it live, in the browser
console: `document.documentElement.style.setProperty('--morph', '3s')`. BingeBrowse is the test entry (three window
captures and one phone capture).

## Style direction

Why the site exists: https://vivqu.substack.com/p/making-space-for-weirdness-and-fun (summarized in `.claude/PLAN.md` → Inspiration).
Visual inspiration board: https://kinopio.club/august-4-2026-pxZyv4GmlSQmiCd_CcgVz (private; needs the user's login).
The registry pages were designed as a clickable prototype and ported from it; the design record is the Artifact linked from `.claude/registry-plan.md`. Don't redesign them.

### The mood

Personal homepages from the small web: pages that feel made by one person, for fun, on a desk
rather than in a design tool.

- **Paper, not glass.** Pastel grounds in mint, periwinkle, butter, and pale pink, often with a graph-paper or dot grid showing through. Nothing glossy, blurred, or gradient-shaded.
- **Things, not layouts.** Content lives in objects you could pick up: retro OS windows with title bars, index cards, sticky notes, tape, stickers, ticket stubs. They sit slightly askew, as if placed by hand.
- **Ink outlines and hard shadows.** Everything has a crisp dark outline and a flat offset shadow, like a risograph print or a sticker sheet. No soft drop shadows.
- **Two typefaces, deliberately mismatched.** A display serif, usually italic, for the one big line, and a monospace for everything else. The mono makes it feel typed by a person rather than set by a template.
- **A few spot colors, used flat.** Solid fills on stickers and underlines. Colors are assigned to objects, not to hierarchy.
- **Doodles in the margins.** Stars, squiggles, arrows. Hand-drawn strokes, a little wobbly, placed where someone was idly drawing around the content.
- **Lowercase, plain-spoken copy.** Status lines, shop signs, "est. 2026." The voice is a person keeping a homepage, not a company launching a product.
- **Two voices per app.** The `tagline` is the museum label: restrained, explanatory, a hint of amusement, distilled from the maker's own words. The `why` is the curator's sticky note: punchy, opinionated, vivacious. Keep them distinct; the contrast is the point. **Both are hand-written by the curator and off limits to agents**: never draft, rewrite, trim or "fix" a `tagline` or `why`, even for punctuation, unless the user asks for that specific edit.
- **Light and bright.** Nearly every reference is a light page. Dark mode isn't part of the vocabulary.

### How to apply it here

- Ground is pale aqua (#d3f0f1) with a faint teal dot grid. Paper is a whisper of peach (#fffaf7) with a slightly deeper peach title bar (#fff0e8). Ink is indigo (#2b2d6b), never black. Shadows are deep aqua (#6fbcc0, #4aa3a8 on hover), never black or grey.
- Each accent belongs to one object: azure (#3d9be6 / tint #9fd8f8) for "little", the title underline, the view switch, the visit button and link hovers; pink for the admission ticket; yellow for sticky notes (the motto, the curator's note); periwinkle for tape and quote rules; lime for the star; mint for the compact view's row stripes; red for the postal marks (the suggest page's postmark and its error line). Don't add an accent without giving it a new object, and don't reuse one on a second object.
- New elements should be things: a card, a label, a note, a stamp. The site already has a retro window (index tiles, the detail frame, the about page), a drawn phone, a paper mat, a printout with sprocket holes, a perforated pager strip, a museum label, a sticky note, a ticket, tape, and a postcard with a sheet of stamps and a postmark. If a new component would be a bordered box with a heading, rethink it as an object from a desk.
- Keep the hand-placed feel: rotations of one to six degrees, offsets that break the grid slightly, one or two doodles per view. More than that stops reading as doodling.
- Fonts are Instrument Serif (display) and IBM Plex Mono (everything else), self-hosted in `public/fonts/`. Don't introduce a third.
- Light only. The page declares `color-scheme: light` and has no dark variant.

Tokens live in `:root` in `src/styles/site.css`, the one stylesheet, imported by `src/layouts/Base.astro`. It's the prototype's CSS ported as is; the detail frame's window / phone / bare morph took several rounds to get right, so change it with care.

## Layout

```
.claude/PLAN.md                 architecture + roadmap
.claude/registry-plan.md        the registry's spec, schema, measurements and design record
.claude/ANALYTICS.md            the analytics plan: GoatCounter via a counting pixel and a /go/ hop for the visit buttons
.claude/FORM.md                 the suggestion box: the Apps Script, the curator's setup steps, the page spec and its prototype
.github/workflows/deploy.yml    build with withastro/action, publish with deploy-pages
UPLOAD.md                       how screenshots are captured, flagged and framed (browser vs mobile)
astro.config.mjs                site: https://weirdlittleapps.com, static output, /page/1 redirects, image pruning hook
public/                         copied verbatim: CNAME (custom domain), favicon.svg, robots.txt
public/fonts/                   self-hosted woff2 (Instrument Serif, IBM Plex Mono); preloaded, font-display: block
scripts/screenshot.mjs          playwright screenshot helper
scripts/morph.mjs               the detail frame's window ⇄ phone morph, slowed down, as a contact sheet
scripts/bezel.mjs               heuristic: does a phone-shaped image already contain a rendered device?
scripts/capture.mjs             playwright landing capture of an entry's url at the hand-capture size (1512x860 @2x → 1512 JPEG)
scripts/shrink.mjs              compress an entry's screenshots for storage (1512 / 804 wide JPEGs), repoint index.yaml
src/content.config.ts           the `apps` and `site` collections and their schemas
src/content/README.md           field reference for index.yaml and site.yaml
src/content/site.yaml           site-wide copy and status: name, subtitle, lede, motto, the post, the about page's status / next lines
src/content/apps/<id>/          one app: index.yaml + screenshots
src/lib/apps.ts                 the collection in index order with derived fields, pagination, display helpers
src/lib/site.ts                 getSite(): site.yaml as the pages see it
src/lib/fixtures.ts             WLA_FIXTURES filler
src/layouts/Base.astro          document shell (head, fonts, stylesheet)
src/styles/site.css             the one stylesheet; tokens in :root
src/components/                 SiteHeader, SiteFooter, Doodles, Pager, ViewSwitch, Tile, Stamp, Beacon (the counting pixel)
src/pages/                      [...page] (index), compact/[...page], apps/[id], about, suggest, go/[...slug] (the counted hop behind a visit button)
```

`public/CNAME` must contain `weirdlittleapps.com`; deleting it drops the custom domain.
