# Adding or updating an app

One entry in `src/content/apps/<id>/`. Step 1 is the human's; 2-7 are the agent's, in order. Fields: `src/content/README.md`.
Screenshot rules: `UPLOAD.md`. The user commits. **Never edit `tagline` or `why`**: they are hand-curated. Only the human
changes them.

## 1. Screenshots (human, or `node scripts/capture.mjs <id>` for the landing shot)

- Hand captures: Retina MacBook browser content area (3024x~1720). `capture.mjs` produces the same shape (1512x860 at 2x),
  so mixing the two is fine.
- Same dimensions within an app. The first landscape capture sizes the frame; others within 5% share it exactly, anything
  further off is letterboxed inside it.
- Raw phone screens get the drawn phone automatically. `panel: true` only for store marketing images; `bezel: true` only when
  the image contains a rendered device (`node scripts/bezel.mjs <images>`).
- Index tile is 1512:860; a capture of another shape is cropped from the top left.

## 2. Compress and describe (agent)

Read every image first.

- `node scripts/shrink.mjs src/content/apps/<id>`: PNG/JPEG → JPEG at 1512 wide (phone-shaped: 804), originals deleted,
  `index.yaml` repointed. Target ~150 KB. `--bg '#hex'` for dark apps. Pixel art / dense maps: `--quality 72`, accept ~250 KB.
- Filenames say what the image shows (`landing`, `floppies`), not `screenshot-N`.
- `alt`: one lowercase sentence per image, distinct, naming the headline, main object and one or two specifics. Rewrite when
  the image changes.
- `caption`: a few lowercase words. Must match the image (retake centred on New York ≠ "from london").
- `taken`: capture date. Files added today are dated today.
- Drop flags that no longer apply.

## 3. Research the museum card (agent)

Fill `links`, `quotes`, `recs`:

- Maker's writeup → `links: writeup` + 1-3 verbatim sentences as a `quote` (keep curly quotes; use `text: |-` when the text
  has a colon; blank line = paragraph break).
- Source → `links: source code`. Successor / fork → `a similar project` / `a fork`. Blog label page → `all the blog posts`.
- Launch post on X / Threads, or the maker's YouTube video → `quote` with `embed: true` (text / video title as fallback).
  Embeds render blank headless; check in a real browser.
- Coverage → `recs: { title, url, by, date }`, `by` = the outlet only ("The Verge", never "Author for The Verge"). Oldest first; undated ones last. HN threads, press, personal blogs. Skip link-only
  posts.
- Facts with no field (models used, etc.) go in as a maker's quote, not a new field; tags come last, step 7.

Fetching (WebFetch is blocked for most of these):

- HN: `hacker-news.firebaseio.com/v0/item/<id>.json`; maker comments under `kids`.
- X / YouTube: oEmbed (`publish.twitter.com/oembed?url=`, `youtube.com/oembed?url=&format=json`).
- Else `curl -sL -A "Mozilla/5.0 …"` → `og:title`, `article:published_time` / `datePublished`, `name="author"`. READMEs via
  `raw.githubusercontent.com`.
- Reddit, Forbes, Boing Boing, Vercel/Cloudflare-fronted sites refuse: title and date from the URL, flag it in the report.

## 4. Created date (agent)

Skip if `created` is already set. Otherwise, month precision: first commit (GitHub API / `git log --reverse`) → oldest
first-party post (launch post, Show HN, tweet) → oldest coverage. Say which.

## 5. Check the frames (agent)

`npm run build && node scripts/screenshot.mjs /apps/<id> --all` (plus `--mobile` once). A hidden entry: `WLA_SHOW_HIDDEN=1 npm run build`
then add `--dist dist-dev`; dist/ stays the production build. `--all` clicks every thumbnail,
saves `…-N.png` per capture and flags `NOT INSIDE THE STAGE` / `OFF-CENTRE`. Read the PNGs: nothing cropped, phone narrow and
centred, wider capture letterboxed. Check the index tile once (`node scripts/screenshot.mjs /`).

## 6. Before handing back

- Reviewed and ready to publish: remove `hidden: true`. Leave it on anything still unreviewed.

- `git status`: old screenshots deleted, no stray PNGs, nothing outside the entry folder unless the task was code.
- Links resolve (`curl -sI`). `url` is the live app, not the writeup.
- Report sizes before/after, anything guessed (slug titles, dates), anything to eyeball in a real browser.

## 7. Tags (agent, last)

Scan what the entry now links to for `tags` (conventions in `src/content/README.md`): the maker's writeup, a methodology /
about / "how it was built" page (look for one even if nothing links it yet: `/methodology`, `/about`, `/why`, `/faq`), the
README and language stats of the source repo, the launch post, and the page's own markup for the framework.

- Only what a source says. `vibe-coded` needs the maker saying so (an agent wrote it, "vibecoded", "I didn't write a line");
  a model tag needs the model named; a framework tag needs the repo, writeup or markup to show it.
- Keep it high-level: `vibe-coded`, the agent (`cursor`), the model family (`claude`, `gemini`), the exact model when
  named (`claude-opus-4-5`), the one main framework (`next-js`, `swift`). No libraries, no databases, no languages.
- Nothing citable → no `tags` line. Never infer from the maker's other work or the era.
- Found a methodology / about page on the way? Add it to `links` as `how it was built` / `how it works`.
- Report each tag with the sentence or file it came from.
