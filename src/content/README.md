# Content

Everything the site shows lives here. The build validates each file against `src/content.config.ts`
and fails, naming the file and field, if something is off.

```
src/content/
  site.yaml            site-wide copy and status (see the comments in the file)
  apps/<id>/
    index.yaml         one app; the folder name is its url: /apps/<id>/
    screenshot-1.jpg   up to four screenshots, jpg / png / gif
```

## `apps/<id>/index.yaml`

Required:

- `name`: the app's name, as its maker writes it
- `tagline`: one lowercase sentence, 140 characters or fewer
  - shown on the index; the most important field
  - voice: the curator's label. Explain what the thing is and does, plainly, with a hint of amusement; distil it from the maker's own words where you can. No jokes at the app's expense, no hype
- `url`: where the visit button goes
  - the live site, store page, repo, or a video
  - the button's label follows the host: `apps.apple.com` → "open in App Store ↗", `play.google.com` → "open in Google Play ↗", `github.com` → "view on GitHub ↗", `chromewebstore.google.com` → "open in Chrome Web Store ↗", anything else → "visit ↗"
  - the index tile's title bar shows this url's domain
- `form_factor`: one of `web` `ios` `android` `mac` `windows` `cli` `extension` `bot` `hardware` `other`, or a list of them
  - primary first: `form_factor: [web, ios]`
  - anything that runs in a browser tab is `web`
- `by`: the maker, or a list of makers
  - a name, or `{ name, url }` to link it
- `why`: the curator's note, 1–3 sentences, first person: why it was collected
  - shown on a sticky note on the detail page
  - voice: the curator off duty. Punchy, opinionated, a little snarky; the reaction, not the explanation. This is where the personality goes
- `collected`: the date it was added, `2026-09-20`
  - sets the index order (newest first; same-day ties by id) and the accession number
  - a timestamp (`2026-09-20T14:30:00Z`) works if the order within a day matters
  - don't backdate once published

Optional:

- `created`: when the app was made, if known
  - a year `2024`, a month `2024-06`, or a date `2024-06-01`
  - shown as "2024", "jun 2024" or "1 jun 2024"; "date unknown" when absent
- `curator`: defaults to Vivian Qu; omit
- `links`: secondary links, shown as "also: label ↗ · label ↗"
  - for open source: `- { label: source code, url: https://github.com/someone/app }`
  - a bare url (labelled from its hostname; `x.com` → "twitter") or `{ label, url }`
- `quotes`: the maker's own words, a list of `{ text, url, by, date }`
  - copy the text exactly; `url` is where it came from
  - `by` defaults to the first maker; `date` is optional
  - use these instead of embeds
- `recs`: where other people recommended or wrote about the app, shown as a list under the maker's words
  - `{ title, url, by, date }`; `by` and `date` are optional. A bare url is titled from its hostname
- `screenshots`: up to four, each with:
  - `image`: `./screenshot-1.jpg`, relative to this file
  - `alt`: what is visible, for someone who can't see it (required)
  - `caption`: a few lowercase words, shown under the frame
  - `taken`: when it was captured
  - `bezel: true`: the image already contains a rendered phone, so it's shown bare rather than inside a drawn one
    - store marketing images often do; `node scripts/bezel.mjs <images>` tells you
  - `panel: true`: a store marketing panel (headline over a device on a full-bleed colour); shown with a thin border, no drawn phone
  - the first screenshot is the cover on the index; an app without any gets a "no picture yet" card
  - phone-shaped (taller than 1.6:1) is detected from the image; `bezel` and `panel` only matter on those
  - capture rules and sizes: `UPLOAD.md` at the repo root

Derived, never written: index position, accession number (`2026.0012`: year collected, then order
within that year), the title-bar domain, the visit button's label, link labels, phone vs browser framing.

Example:

```yaml
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
recs:
  - { title: Pocket Metronome, url: https://example.org/blog/pocket-metronome, by: A Blogger, date: 2024-07-02 }
screenshots:
  - image: ./screenshot-1.jpg
    alt: a large tempo dial set to 96 bpm above a single start button
    caption: the whole app
    taken: 2026-09-20
```

The simplest valid entry is the seven required fields with `by: someone` and `form_factor: web`.

## `site.yaml`

- `name`: the site name, used in page titles
- `subtitle`: the line under the wordmark on every page
- `established`: the year in "est. 2026"
- `lede`: the one-line description on the about page
- `description`: the default meta description
- `post`: the post the site grew out of ("read the post" on the about page)
- `motto`: the about page's sticky note
- `status`: the about page's status line
  - `{apps}` becomes "43 apps", linked to the index
- `next`: the about page's next line; optional
