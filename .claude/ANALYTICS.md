# analytics

Status: built 2026-10-25; referrers added 2026-11-08. The site url is in `site.yaml` → `stats.goatcounter`.

Goal: site visits, where they come from, and clicks per app. Tool: GoatCounter (goatcounter.com),
hosted, free for non-commercial sites. Counts via a 1×1 image request; a few inline first-party
lines add the referrer, which only the browser knows. The same endpoint records events, so
outbound clicks can be counted too. No cookies or persistent identifiers, so no consent
banner. Open source, CSV export, self-hostable.

Rejected: Google Analytics (cookies + consent banner, ~90 KB script, blocked by all ad blockers);
Cloudflare Web Analytics (pageviews only, no events); Plausible ($9/mo) and Umami (both need a
script); Cloudflare proxy (sampled, no clicks, moves DNS).

Rule change: one more runtime third-party request (the pixel) next to post embeds and the suggest
POST, and a few inline lines of first-party JS (`CLAUDE.md` → Keep it small lists them).

## Counted

| event | GoatCounter row |
|---|---|
| page view | path: `/`, `/compact/`, `/apps/<id>/`, `/about/` |
| visit button or framed-screenshot click on `/apps/<id>/` | event: `visit/<id>`, `visit/<id>/app-store`, `visit/<id>/play-store` |

GoatCounter derives visits (per visitor per day, salted hash of IP + UA, not stored), country,
browser, screen size, and filters known bots. Referrers come from `document.referrer`, sent as `r`:
the `<img>` request's own `Referer` header is always our page, so a plain pixel can't carry them
(that was the first version; its dashboard showed every hit as "(unknown)"). Visitors with JS off
still count, referrer-less, through the `<noscript>` image. Hits on `/go/<id>/` carry our own
detail page as the referrer, which GoatCounter treats as none.

## Mechanism

**Pixel.** `Base.astro`, before `</body>`, renders `Beacon.astro`: an inline script with the pixel url
in `data-count`, and the same url in a `<noscript>` image.

```html
<script data-count="https://<code>.goatcounter.com/count?p=%2Fapps%2Fbingebrowse%2F&t=BingeBrowse">
  // reads data-count, appends r=document.referrer and s=screen.width,screen.height,devicePixelRatio,
  // creates a 1×1 .beacon <img> with that src and inserts it after the script
</script>
<noscript><img class="beacon" src="https://<code>.goatcounter.com/count?p=%2Fapps%2Fbingebrowse%2F&t=BingeBrowse" alt="" width="1" height="1" aria-hidden="true"></noscript>
```

`p` = `Astro.url.pathname`, `t` = page title, URL-encoded. Only one of the two images ever loads, so a
view is never counted twice. The image is inserted into the document (not just created) so the hop
page's load event, and therefore its refresh, waits for it. `.beacon`: `position: absolute; width: 1px;
height: 1px; opacity: 0`. Not `display: none` (some browsers skip the fetch). The endpoint sends
`cache-control: no-store`; no cache buster needed.

**Outbound hop.** Visit buttons and the frame link point at `/go/<id>/` (the entry's `url`) and
`/go/<id>/app-store/` / `/go/<id>/play-store/` (store listings in `links`, same host test as the
button label). `src/pages/go/[...slug].astro` builds one page per button from `getApps()`:

```html
<meta http-equiv="refresh" content="0; url=https://bingebrowse.net/">
<meta name="robots" content="noindex">
<p>off to <a href="https://bingebrowse.net/">bingebrowse.net ↗</a></p>
<img class="beacon" src="https://<code>.goatcounter.com/count?p=visit%2Fbingebrowse&e=1" ...>
```

`refresh` fires only after the document has completely loaded, images included, so the hit is
recorded before navigation. Cost: one round trip (~100 ms). The `<p>` is the fallback when refresh
is disabled. `public/robots.txt`: `Disallow: /go/`.

Not chosen: `<a ping>` (Firefox default off, uBlock blocks it, POST recording untested) and
`count.js` + `data-goatcounter-click` (3.3 KB gz third-party script on every page).

## Configuration

`src/content/site.yaml`:

```yaml
# counting pixel endpoint (.claude/ANALYTICS.md). Omit to send nothing
stats:
  goatcounter: https://<code>.goatcounter.com
```

Schema: `stats: z.object({ goatcounter: z.url().nullish() }).optional()`.

Render the pixel only when `stats.goatcounter` is set **and** (`process.env.CI` or `WLA_STATS=1`),
so dev, local builds, screenshots and the `WLA_SHOW_HIDDEN` build send nothing.

## Changes

| file | change |
|---|---|
| `src/components/Beacon.astro` | `{ path, title?, event? }` → inline script + `<noscript>` `<img>`, or nothing when unconfigured / not production |
| `src/layouts/Base.astro` | `<Beacon path={Astro.url.pathname} title={fullTitle} />`; `count` prop to override `{ path, event }` |
| `src/lib/apps.ts` | `visits(app)` adds `go` (the `/go/…/` path) next to `href`, `label` |
| `src/pages/apps/[id].astro` | frame link and both `.visits` blocks use `b.go` |
| `src/pages/go/[...slug].astro` | `getStaticPaths` over apps × `visits(app)`; `Base` with `count={{ path: 'visit/…', event: true }}`, refresh meta, one line |
| `public/robots.txt` | `Disallow: /go/` |
| `src/styles/site.css` | `.beacon`; the go page line |
| `site.yaml`, `content.config.ts`, `src/content/README.md` | `stats` block |
| `CLAUDE.md`, `.claude/PLAN.md` | rule exceptions, layout lines |

## Setup (curator, once)

1. https://www.goatcounter.com/signup. No card. (Done.)
2. Settings → Ignore IPs: home IP.
3. `site.yaml` → `stats.goatcounter`, push, load the live site, confirm a row.
4. Optional: custom domain. Namecheap `stats` CNAME → `<code>.goatcounter.com`; GoatCounter
   Settings → Custom domain `stats.weirdlittleapps.com`; `site.yaml` → `https://stats.weirdlittleapps.com`.
   `*.goatcounter.com` is on EasyPrivacy; expect ~⅓ undercount without this.
5. Optional: Settings → public dashboard, plus a `stats` footer link.

## Checks

```sh
WLA_STATS=1 npm run build
grep -o 'count?[^"]*' dist/index.html dist/apps/bingebrowse/index.html dist/go/bingebrowse/index.html
# p=%2F   p=%2Fapps%2Fbingebrowse%2F&t=…   p=visit%2Fbingebrowse&e=1   (each twice: script + noscript)
npm run build && grep -rl goatcounter dist | wc -l    # 0
```

After deploy: click a visit button in Safari and Firefox, confirm the event row. Arrive from a link on
another site and confirm the referrer shows on the dashboard. To check the request locally: serve
`dist/` with `scripts/screenshot.mjs`'s `serveDist` in a Playwright script that routes
`*.goatcounter.com/**`, load `/apps/<id>/` with a `referer`, then `/go/<id>/`; the two requests
should carry `r` and `s`, and with `javaScriptEnabled: false` the same two without them.
