# weird little apps

Static site for weirdlittleapps.com: a YAML-driven showcase of small, strange apps.
Astro, no client JS by default, deployed to GitHub Pages via GitHub Actions.

See `.claude/PLAN.md` for decisions, milestones, and what's next. Keep it updated as work lands.

## Commands

```sh
npm run dev          # dev server (Astro picks a port; check the output)
npm run build        # static build into dist/
npm run preview      # serve dist/ locally
npm run check        # type-check .astro files
npm run screenshot   # build, then screenshot / into screenshots/index.png
```

## Workflow

- **Plan first, in `.claude/PLAN.md`.** Decisions go there with a date and a one-line why. Tick off milestone steps as they're done.
- **Always report the dev server URL.** After starting or restarting `npm run dev`, tell the user the address from the "Dev server running at ..." line (normally http://localhost:4321). If you stop a server, say so.
- **The user commits.** Don't run `git commit` or `git push` unless asked. Leave the working tree in a state that's ready to commit.
- **Verify visually with Playwright, not the Chrome extension.** Use `node scripts/screenshot.mjs` (see below) and read the PNG. It's faster, headless, and doesn't touch the user's browser. Only reach for `claude-in-chrome` when a page needs the user's logged-in session (e.g. a private Kinopio board).
- **Astro 7 servers are daemons.** `astro dev` and `astro preview` detach and keep running; a second invocation reuses the existing one and ignores `--port`. Stop them with `npx astro dev stop` / `npx astro preview stop` (or `pkill -f astro`). The screenshot script serves `dist/` itself for this reason.
- **Stale dev CSS.** The dev server can keep serving an old `<style>` block after an edit (HTML updates, CSS doesn't). If a style change doesn't appear, restart with `npx astro dev stop && npx astro dev` before debugging the CSS, and tell the user to hard-refresh.
- **Content is config.** Adding an app must never require code changes; it's one YAML file plus an optional screenshot. If a feature would break that, rethink it.
- **Keep it small.** No integrations, frameworks, or client JS unless a milestone actually needs them.
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

- Ground is aqua (#9ddde0) with a teal grid. The window is a whisper of peach (#fffaf7) with a slightly deeper peach title bar (#fff0e8). Ink is indigo (#2b2d6b), never black. Shadows are deep aqua, never black or grey.
- Each accent belongs to one object: azure (#3d9be6 / tint #9fd8f8) for "little", the cursor, the status tag, and the title underline; pink for the admission ticket; yellow for the sticky note; periwinkle for the tape; lime for the star. Don't add an accent without giving it a new object, and don't reuse one on a second object.
- New elements should be things: a card, a label, a note, a stamp. If a new component would be a bordered box with a heading, rethink it as an object from a desk.
- Keep the hand-placed feel: rotations of one to six degrees, offsets that break the grid slightly, one or two doodles per view. More than that stops reading as doodling.
- Fonts are Instrument Serif (display) and IBM Plex Mono (everything else), self-hosted in `public/fonts/`. Don't introduce a third.
- Light only. The page declares `color-scheme: light` and has no dark variant.

Tokens live in `:root` in `src/pages/index.astro` for now; extract to a shared layout when there's more than one page.

## Layout

```
.claude/PLAN.md                 plan + decisions
.github/workflows/deploy.yml    build with withastro/action, publish with deploy-pages
astro.config.mjs                site: https://weirdlittleapps.com, static output
public/                         copied verbatim: CNAME (custom domain), favicon.svg, robots.txt
public/fonts/                   self-hosted woff2 (Instrument Serif, IBM Plex Mono); preloaded, font-display: block
scripts/screenshot.mjs          playwright screenshot helper
src/pages/                      one .astro file per route
```

`public/CNAME` must contain `weirdlittleapps.com`; deleting it drops the custom domain.
