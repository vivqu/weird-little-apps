# suggestion box

`/suggest/`: a form where a visitor suggests an app. Submissions go to a Google Sheet via an Apps
Script web app. A suggestion is a lead; the curator writes the entry.

**Why Apps Script.** Free, no submission cap, officially supported, our own HTML on the page, no
Google script loaded. Rejected: Google Forms (branded or iframe), Tally (same), Formspree (50/mo),
Web3Forms (250/mo, no Sheet), Astro Actions (needs a server adapter; GitHub Pages is static).

## Google side (curator, once)

1. New Sheet at https://sheets.new, name `wla suggestions`. Leave empty.
2. Extensions → Apps Script. Replace `Code.gs` with the script below. Save.
3. Optional: set `NOTIFY` to your email.
4. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Authorize
   (Advanced → Go to project → Allow).
5. Copy the `/exec` URL into `src/content/site.yaml` as `suggest.endpoint`. (Done 2026-10-25.)
6. Test, then delete the row:

   ```sh
   curl -sL '<exec url>' -d url=https://example.com -d note=test -d format=json
   # no -X POST: Apps Script answers with a 302 and curl must follow it as a GET, which -X would override
   # {"ok":true}; a "suggestions" tab appears with a header row and one row
   ```

Columns: `when`, then `FIELDS` in order, then `published`, which the script never writes. The
curator fills it with the `/apps/<id>/` url once an entry is live.

Script edits are not live until Deploy → Manage deployments → edit → New version → Deploy.
The URL does not change.

### `Code.gs`

```js
const SHEET = 'suggestions';
const NOTIFY = '';   // email for an alert per row, or ''
const FIELDS = ['url', 'note', 'links', 'maker', 'from', 'contact', 'stamp', 'ref'];
const MAX = 2000;
const SITE = 'https://weirdlittleapps.com/';

function doPost(e) {
  const p = (e && e.parameter) || {};
  const json = p.format === 'json';
  if (p.website) return reply(true, json);
  if (!String(p.url || '').trim()) return reply(false, json, 'url is required');

  const row = [new Date(), ...FIELDS.map((f) => String(p[f] || '').trim().slice(0, MAX))];
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.appendRow(['when', ...FIELDS, 'published']);
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  if (NOTIFY) MailApp.sendEmail(NOTIFY, 'wla suggestion', FIELDS.map((f, i) => `${f}: ${row[i + 1]}`).join('\n'));
  return reply(true, json);
}

function doGet() { return reply(true, false); }

function reply(ok, json, error) {
  if (json) {
    return ContentService.createTextOutput(JSON.stringify(error ? { ok, error } : { ok }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // no-JS fallback page after a plain form post
  const line = ok ? 'got it. thank you.' : `that didn't go through: ${error}`;
  return HtmlService.createHtmlOutput(
    `<!doctype html><meta charset="utf-8"><title>weird little apps</title>` +
    `<body style="font:16px/1.5 ui-monospace,monospace;padding:2rem;color:#2b2d6b;background:#d3f0f1">` +
    `<p>${line}</p><p><a href="${SITE}" target="_top">back</a></p>`
  );
}
```

## Site side (agent)

Design record: the clickable prototype at https://claude.ai/artifact/R9HW1cV82R9CT7UdjDtWEe (private
Artifact, version 19, ~26 rounds of comments; form, sent and error states). The page was ported from it on
2026-10-25: `src/pages/suggest.astro`, `src/components/Stamp.astro`, the `suggest:` section of
`src/styles/site.css`. Change the page, not the prototype.

- `src/pages/suggest.astro`, linked from the footer and about page. Copy in `site.yaml`
  (`suggest.*`). A static page always builds; without `suggest.endpoint` it says the box isn't out
  yet and nothing links to it.
- Styled as a postcard (ink outline, hard shadow, askew), per CLAUDE.md → Style direction.
- Fields, only `url` required: `url` (`type="url"`), `note` (textarea: what's weird about it or
  what impressed you), `links` (textarea: a launch post, a writeup), `maker` (checkbox: i made it),
  `from` (name or handle), `contact` (a way to reach you or a site to credit), `stamp` (radio: which
  of the four stamps they picked; `star` if none), `ref` hidden, filled from `?ref=`. No uploads, no
  tags (the curator derives tags from `links`).
- The card: heading and two notes on the left, "post card", the stamp corner and the address lines
  on the right at a fixed height; a sheet of four stamps beside the card (above it under 68rem); on
  phones the heading, then the address half, then the notes. Sent: the card locks as filled in with
  blank lines dropped, a red postmark over the stamp, "back to the apps" in place of the button, and
  the second sentence of the thanks depends on whether `contact` was given.
- `<form method="post" action={endpoint}>` works without JS (lands on the script's fallback
  page). Inline JS: intercept submit, append `format=json`, `fetch` with the `FormData` body,
  on `ok` replace the form with a thank-you; on failure show the error and keep the form.
- Verify: `npm run build`, `node scripts/screenshot.mjs /suggest` and `--mobile`, one real
  submission.
- Schema: add optional `submitted_by: {name, url}` to `index.yaml`, rendered on the museum card.
- Docs: CLAUDE.md "Keep it small" and PLAN.md gain the client-JS exception; PLAN.md routes table
  gains `/suggest/`; `src/content/README.md` documents `suggest.*` and `submitted_by`; `site.yaml`
  `next` updated.

## Gotchas

- CORS: Apps Script redirects the POST to `script.googleusercontent.com`, which sends
  `Access-Control-Allow-Origin: *`. Only simple requests work: `FormData` or url-encoded body,
  no custom headers, no `application/json` (no OPTIONS handler).
- "Anyone" means anyone can post. The Sheet's own sharing is unchanged.
- Quotas: ~20k web-app calls/day, 100 `MailApp` mails/day on a personal account. Rows still
  land when mail is exhausted.

## About page (open)

The site footer lost "made by vivian qu" (2026-10-25) and now reads "est. 2026 · about · suggest an app". The
maker credit and a way to the suggestion box still need a home on the about page, as an object rather than a
second footer or a row in the window's status block (tried both, rejected). Experiments at https://claude.ai/artifact/VrGyPwG7zSZ5tkSDVLc9MH (private
Artifact, version 4). Settled there: the way to the box is a small postcard on its own peach paper peeking out
from under the window's right edge, with a mono "suggest an app" under an arrow (the suggest page's own
object). The maker credit (with a link to vivqu.com) is still being placed. In
the experiment, four objects to switch between, none a receipt: A a playbill tucked behind the window under
the admission ticket, B a hang tag on a string from the window's corner, C a rubber stamp pressed on the desk,
D a little shop sign hanging from the window's bottom edge. Rejected: a second footer, a row in the status
block, a signature on the sticky note, a calling card, a colophon, index cards, a second window, footnotes,
a receipt. A section for method and fine print is not needed now; add it when there is something to say.
