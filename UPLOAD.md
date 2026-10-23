# Uploading screenshots

How screenshots are chosen, captured and shown for each app. These rules were decided while
prototyping the index and detail pages (2026-09-20) and the pages implement them (spec:
`.claude/registry-plan.md`). Screenshots live in the entry folder, `src/content/apps/<id>/`, and are
listed under `screenshots:` in its `index.yaml`.

Every screenshot is one of two kinds, and the kind decides the frame it is shown in.

| Kind | What it is | Shown as |
|---|---|---|
| Browser | a wide capture of a website | a retro browser window: title bar with the app's domain, capture cropped from the top left |
| Mobile | a phone-shaped image of an iOS or Android app | a phone: our drawn iPhone-style frame, or the image on its own if it already contains a device |

The first screenshot in an entry is the cover. It appears on the index (screenshot wall) and as the
opening image on the detail page. Up to 4 screenshots per app.

## Browser screenshots

- **We take our own.** Capture at 1280x800, 1x, JPEG, with headless Playwright (`chromium.launch()`, a 1280x800 context, `page.goto(url, { waitUntil: 'networkidle' })`, `page.screenshot({ type: 'jpeg', quality: 80 })`; `scripts/screenshot.mjs` is the same idea pointed at our own site).
- **Show the app, not a popup.** Dismiss cookie banners, consent walls and "about" dialogs before capturing. Wait for slow pages to finish loading (Plein Air paints for a few seconds first).
- **Capture the thing that makes it odd.** The default is the top of the page. If the interesting part is further down or after a click, capture that instead, and use the other slots for the rest.
- **Shown cropped on the index, whole on the detail page.** The index tile is 16:10 and crops from the top left, so keep what matters in the upper part of the capture. A wider capture (a Retina screenshot is usually 1.75:1) keeps its left edge there, where sidebars and menus tend to be, and loses the right. The detail page's window frame takes the shape of whichever capture is picked (between 4:3 and 2:1), so nothing is cropped there: the first landscape capture sets the stage's size, and a differently shaped one is fitted inside it, centred.
- **Title bar text is derived**, never written: the domain of `url` without `www.` on the index (`walzr.com`), domain plus path on the detail page.
- A phone-width capture of a website (390px wide) counts as a mobile screenshot and gets the phone frame.

## Mobile screenshots

- **For an app listed in a store, use the store listing's own images**, not a capture of the store page or of the app's marketing site. For the App Store they come from the public lookup endpoint: `https://itunes.apple.com/lookup?id=<app id>` returns `screenshotUrls`; replace the size suffix (`320x480bb.jpg`) with `600x1300bb.jpg`. Download them into the entry folder like any other screenshot. We still store our own copy; nothing is hotlinked.
  - This is a deliberate exception to "we take and store our own screenshots" (schema rule 5). The maker chose these images to represent the app, and a headless browser cannot run a phone app.
- **The app's `url` is the store link**, so the visit button reads "open in App Store ↗" (or "open in Google Play ↗"). The label is derived from the url's host; a plain website gets "visit ↗". If the app also has its own website, keep it as a secondary link (`links: [{ label: website, url }]`), shown on the label as "also: website ↗".
- **Phone-shaped is derived, not written.** An image taller than 1.6:1 is treated as a mobile screenshot at build time; nothing to set in the entry.
- **Frame.** A phone-shaped screenshot is shown in a drawn phone in the same line style as the browser window: a thin 2px ink outline, a slim peach body, large rounded corners, a pill at the top of the screen, no side buttons. Proportions are 9:19.5.
- **Images that already contain a phone are shown bare.** Store marketing images often include a rendered device. Framing those again puts a phone inside a phone, so flag them with `bezel: true` and the site drops its frame: the image is shown whole, its margin trimmed slightly, its white ground blended into the paper mat.
  - `node scripts/bezel.mjs src/content/apps/<id>/*.jpg` tells you which images to flag: it takes the corner colour as the background, then on five horizontal scan lines finds where the row leaves that background. A rendered device gives left and right edges that are inset, mirror each other, and sit at the same x on every line. Checked against the 43 seed apps: it flags Grug's three device renders and nothing else. (It's a script rather than a build step because Astro hands the build image dimensions but not pixels.)
- **Store marketing panels get a thin border, not a phone.** A panel is a headline over a device on a full-bleed colour (Heliophilia, Lightpage, Cat Collector). Putting it in our drawn phone gives a phone inside a phone, and the bezel heuristic does not catch it, so flag it by hand with `panel: true`. It is shown as it is, phone-shaped, with a 2px ink edge and slightly rounded corners, plus the usual hard shadow on the index.

## How they are shown

- **Index (screenshot wall).** Browser covers sit in small windows; a mobile cover is a small phone standing in the same space. The compact (ledger) view shows no screenshots at all.
- **Detail page.** One static frame on a paper mat. Thumbnails under it pick the screenshot; the image cross-fades inside the frame, and the frame itself changes shape between window, phone and bare as needed. The mat never changes size. This uses radio buttons and CSS only. Left / right arrow keys also page through the screenshots; that is the page's only JavaScript (about eight lines) and everything works without it.
- **Caption line.** "2 of 4 · caption" on the left, the visit button on the right.
- **No screenshot.** Allowed. The entry gets a "no picture yet" card, and the build logs entries without one.

## Every screenshot needs

| | |
|---|---|
| `image` | path to the file in the entry folder (`./screenshot-1.jpg`); jpg, png or gif (animation is kept) |
| `alt` | what is visible, for someone who cannot see it. Required |
| `caption` | optional, lowercase, a few words |
| `taken` | optional capture date |
| `bezel` | `true` when a phone-shaped image already contains a rendered device |
| `panel` | `true` for a store marketing panel |

Size budget: up to 4 per app, 1600px wide at most, around 150 KB each as stored. The build converts every image to webp at the sizes the pages use (about 100 KB published per screenshot across all sizes; measured in `.claude/registry-plan.md`), so what matters is the stored original.
