# weird little apps

Source for [weirdlittleapps.com](https://weirdlittleapps.com). Apps built with purpose.
Tiny by design. Made with love.

A hand-picked collection of small, strange software, one YAML file per app. Built with
[Astro](https://astro.build), deployed to GitHub Pages on every push to `main`.

## The look

Personal homepages from the small web: pages that feel made by one person, for fun, on a
desk rather than in a design tool.

- **Paper, not glass.** A pale aqua ground with a dot grid showing through.
- **Things, not layouts.** Retro browser windows, a drawn phone, a paper mat, a printout with sprocket holes, sticky notes, tape, a ticket stub, all slightly askew.
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

## Adding an app

Make a folder `src/content/apps/<id>/` with an `index.yaml` and up to four screenshots. The folder
name is the URL. The build validates the entry and tells you what's missing. Field reference:
`.claude/registry-plan.md`; screenshot rules: `UPLOAD.md`.

## Project layout

```
.
├── .github/workflows/deploy.yml   # builds and publishes on push to main
├── astro.config.mjs               # site URL and Astro settings
├── public/                        # copied to dist/ as-is (CNAME, favicon, fonts, robots.txt)
├── scripts/                       # screenshot helper; bezel check for phone screenshots
├── src/content/apps/<id>/         # one app: index.yaml + screenshots
├── src/content.config.ts          # the schema every entry is checked against
├── src/lib/                       # index order, accession numbers, pagination
├── src/pages/, layouts/, components/, styles/
├── UPLOAD.md                      # how screenshots are captured and framed
├── .claude/PLAN.md                # architecture and roadmap
└── CLAUDE.md                      # working conventions for AI agents (and humans)
```
