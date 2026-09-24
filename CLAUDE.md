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
node scripts/bezel.mjs src/content/apps/<id>/*.jpg   # does a phone-shaped image already contain a device? (see UPLOAD.md)
```

## Adding an app

One folder, `src/content/apps/<id>/`, holding `index.yaml` and up to four screenshots. The folder name is the URL (`/apps/<id>/`). Fields, with an example: `.claude/registry-plan.md` → Fields. How to capture and flag screenshots: `UPLOAD.md`. The build validates the entry and fails with the file and field named if something is off; it also logs entries without a screenshot. Order, accession numbers and phone-vs-browser framing are derived, never written.

## Workflow

- **Plan first, in `.claude/PLAN.md`.** It describes the current architecture and what's next, not history; when something changes, rewrite the affected section. Detailed specs for larger items live next to it (`.claude/registry-plan.md` for the registry).
- **Always report the dev server URL.** After starting or restarting `npm run dev`, tell the user the address from the "Dev server running at ..." line (normally http://localhost:4321). If you stop a server, say so.
- **The user commits.** Don't run `git commit` or `git push` unless asked. Leave the working tree in a state that's ready to commit.
- **Verify visually with Playwright, not the Chrome extension.** Use `node scripts/screenshot.mjs` (see below) and read the PNG. It's faster, headless, and doesn't touch the user's browser. Only reach for `claude-in-chrome` when a page needs the user's logged-in session (e.g. a private Kinopio board).
- **Astro 7 servers are daemons.** `astro dev` and `astro preview` detach and keep running; a second invocation reuses the existing one and ignores `--port`. Stop them with `npx astro dev stop` / `npx astro preview stop` (or `pkill -f astro`). The screenshot script serves `dist/` itself for this reason.
- **Stale dev CSS.** The dev server can keep serving an old `<style>` block after an edit (HTML updates, CSS doesn't). If a style change doesn't appear, restart with `npx astro dev stop && npx astro dev` before debugging the CSS, and tell the user to hard-refresh.
- **Content is config.** Adding an app must never require code changes; it's one YAML file plus an optional screenshot. If a feature would break that, rethink it. Site-wide words (subtitle, lede, motto, the about page's status and next lines) live in `src/content/site.yaml`, not in templates.
- **Keep it small.** No third-party integrations, frameworks, or client JS unless the plan actually calls for them. The only client JS is eight inline lines on the detail page (arrow-key paging), and the only integration is the inline image-pruning hook in `astro.config.mjs`.
- **No third-party requests at runtime.** Fonts are self-hosted in `public/fonts/` and preloaded with `font-display: block` so text never flashes in a fallback face. Don't add Google Fonts `<link>`s back.

## Screenshots

`scripts/screenshot.mjs` serves `dist/` from an in-process static server, captures a full-page 2x PNG, and exits. Run `npm run build` first (or use `npm run screenshot`, which does both).

```sh
npm run build
node scripts/screenshot.mjs                 # /  -> screenshots/index.png (1280x800, light)
node scripts/screenshot.mjs --dark          # dark color scheme
node scripts/screenshot.mjs --mobile        # 390x844 viewport
node scripts/screenshot.mjs /apps/foo       # another route
node scripts/screenshot.mjs --url http://localhost:4321   # use an already-running server
```

Always check desktop and mobile after a visual change (there is no dark mode). `screenshots/` is gitignored.

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
- **Light and bright.** Nearly every reference is a light page. Dark mode isn't part of the vocabulary.

### How to apply it here

- Ground is pale aqua (#d3f0f1) with a faint teal dot grid. Paper is a whisper of peach (#fffaf7) with a slightly deeper peach title bar (#fff0e8). Ink is indigo (#2b2d6b), never black. Shadows are deep aqua (#6fbcc0, #4aa3a8 on hover), never black or grey.
- Each accent belongs to one object: azure (#3d9be6 / tint #9fd8f8) for "little", the title underline, the view switch, the visit button and link hovers; pink for the admission ticket; yellow for sticky notes (the motto, the curator's note); periwinkle for tape and quote rules; lime for the star; mint for the compact view's row stripes. Don't add an accent without giving it a new object, and don't reuse one on a second object.
- New elements should be things: a card, a label, a note, a stamp. The site already has a retro window (index tiles, the detail frame, the about page), a drawn phone, a paper mat, a printout with sprocket holes, a perforated pager strip, a museum label, a sticky note, a ticket and tape. If a new component would be a bordered box with a heading, rethink it as an object from a desk.
- Keep the hand-placed feel: rotations of one to six degrees, offsets that break the grid slightly, one or two doodles per view. More than that stops reading as doodling.
- Fonts are Instrument Serif (display) and IBM Plex Mono (everything else), self-hosted in `public/fonts/`. Don't introduce a third.
- Light only. The page declares `color-scheme: light` and has no dark variant.

Tokens live in `:root` in `src/styles/site.css`, the one stylesheet, imported by `src/layouts/Base.astro`. It's the prototype's CSS ported as is; the detail frame's window / phone / bare morph took several rounds to get right, so change it with care.

## Layout

```
.claude/PLAN.md                 architecture + roadmap
.claude/registry-plan.md        the registry's spec, schema, measurements and design record
.github/workflows/deploy.yml    build with withastro/action, publish with deploy-pages
UPLOAD.md                       how screenshots are captured, flagged and framed (browser vs mobile)
astro.config.mjs                site: https://weirdlittleapps.com, static output, /page/1 redirects, image pruning hook
public/                         copied verbatim: CNAME (custom domain), favicon.svg, robots.txt
public/fonts/                   self-hosted woff2 (Instrument Serif, IBM Plex Mono); preloaded, font-display: block
scripts/screenshot.mjs          playwright screenshot helper
scripts/bezel.mjs               heuristic: does a phone-shaped image already contain a rendered device?
src/content.config.ts           the `apps` and `site` collections and their schemas
src/content/site.yaml           site-wide copy and status: name, subtitle, lede, motto, the post, the about page's status / next lines
src/content/apps/<id>/          one app: index.yaml + screenshots
src/lib/apps.ts                 the collection in index order with derived fields, pagination, display helpers
src/lib/site.ts                 getSite(): site.yaml as the pages see it
src/lib/fixtures.ts             WLA_FIXTURES filler
src/layouts/Base.astro          document shell (head, fonts, stylesheet)
src/styles/site.css             the one stylesheet; tokens in :root
src/components/                 SiteHeader, SiteFooter, Doodles, Pager, ViewSwitch, Tile
src/pages/                      [...page] (index), compact/[...page], apps/[id], about
```

`public/CNAME` must contain `weirdlittleapps.com`; deleting it drops the custom domain.
