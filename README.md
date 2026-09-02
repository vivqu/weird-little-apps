# weird little apps

Source for [weirdlittleapps.com](https://weirdlittleapps.com). Apps built with purpose.
Tiny by design. Made with love.

Built with [Astro](https://astro.build) and deployed to GitHub Pages.

**Status:** live at [weirdlittleapps.com](https://weirdlittleapps.com) as a work-in-progress
page. The app directory comes next.

## The look

The design borrows from personal homepages on the small web: pages that feel made by one
person, for fun, on a desk rather than in a design tool.

- **Paper, not glass.** Pastel grounds with a graph-paper grid showing through. Nothing glossy, blurred, or gradient-shaded.
- **Things, not layouts.** Content lives in objects you could pick up: a retro browser window, a sticky note, tape, stickers, a ticket stub. They sit slightly askew, as if placed by hand.
- **Ink outlines and hard shadows.** Crisp dark outlines and flat offset shadows, like a risograph print or a sticker sheet.
- **Two typefaces, deliberately mismatched.** An italic display serif for the one big line and a monospace for everything else, so it reads as typed by a person.
- **A few spot colors, used flat.** Each accent belongs to one object. Colors mark things, not hierarchy.
- **Doodles in the margins.** A star, a squiggle, a little wobbly, where someone was idly drawing around the content.
- **Lowercase, plain-spoken copy.** Status lines and shop-sign phrases. A person keeping a homepage, not a company launching a product.
- **Light and bright.** No dark mode.

## Requirements

- Node 22.12 or newer (see `.nvmrc`; run `nvm use` if you use nvm)
- npm

## Running locally

```sh
npm install
npm run dev
```

Then open <http://localhost:4321>. The dev server reloads on file changes.

## Other commands

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run build`   | Builds the static site into `dist/`                       |
| `npm run preview` | Serves the built `dist/` locally, same as production      |
| `npm run check`   | Type-checks `.astro` files and the config                 |
| `npm run screenshot` | Builds, then saves a screenshot of `/` to `screenshots/` |

Screenshots use [Playwright](https://playwright.dev). After `npm install`, download its
browser once with:

```sh
npx playwright install chromium
```

`node scripts/screenshot.mjs --help`-style flags: `--dark`, `--mobile`, a route like `/apps/foo`,
or `--url http://localhost:4321` to point at a running server.

## Project layout

```
.
├── .github/workflows/deploy.yml   # builds and publishes to GitHub Pages on push to main
├── astro.config.mjs               # site URL and Astro settings
├── public/                        # copied to dist/ as-is (CNAME, favicon, robots.txt)
├── scripts/screenshot.mjs         # Playwright screenshot helper
├── src/pages/                     # one .astro file per route
├── .claude/PLAN.md                # project plan and decisions
└── CLAUDE.md                      # working conventions for AI agents (and humans)
```

## Deploying

Every push to `main` runs the deploy workflow, which builds the site and publishes it to
GitHub Pages. There is no manual deploy step.

The custom domain is set by `public/CNAME`. Don't remove that file or the site will fall
back to the `github.io` URL.
