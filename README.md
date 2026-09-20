# weird little apps

Source for [weirdlittleapps.com](https://weirdlittleapps.com). Apps built with purpose.
Tiny by design. Made with love.

Built with [Astro](https://astro.build), deployed to GitHub Pages on every push to `main`.

## The look

Personal homepages from the small web: pages that feel made by one person, for fun, on a
desk rather than in a design tool.

- **Paper, not glass.** Pastel grounds with a graph-paper grid showing through.
- **Things, not layouts.** A retro browser window, a sticky note, tape, stickers, a ticket stub, all slightly askew.
- **Ink outlines and hard shadows.** Like a risograph print or a sticker sheet.
- **Two typefaces, deliberately mismatched.** An italic serif for the one big line, monospace for everything else.
- **A few spot colors, used flat.** Each accent belongs to one object.
- **Doodles in the margins.** A star, a squiggle, a little wobbly.
- **Lowercase, plain-spoken copy.** A person keeping a homepage, not a company launching a product.
- **Light and bright.** No dark mode.

## Running locally

Needs Node 22.12 or newer.

```sh
npm install
npm run dev        # http://localhost:4321
```

```sh
npm run build      # static site into dist/
npm run preview    # serve dist/
npm run screenshot # build, then screenshot / into screenshots/ (needs: npx playwright install chromium)
```

## Project layout

```
.
├── .github/workflows/deploy.yml   # builds and publishes on push to main
├── astro.config.mjs               # site URL and Astro settings
├── public/                        # copied to dist/ as-is (CNAME, favicon, fonts, robots.txt)
├── scripts/screenshot.mjs         # Playwright screenshot helper
├── src/pages/                     # one .astro file per route
├── .claude/PLAN.md                # architecture and roadmap
└── CLAUDE.md                      # working conventions for AI agents (and humans)
```
