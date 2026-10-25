# analytics

Goal: site visits, and clicks per app. Tool: GoatCounter (goatcounter.com), hosted, free for
non-commercial sites. Counts via a 1×1 image request, so no client JS; the same endpoint records
events, so outbound clicks can be counted too. No cookies or persistent identifiers, so no consent
banner. Open source, CSV export, self-hostable.

Rejected: Google Analytics (cookies + consent banner, ~90 KB script, blocked by all ad blockers);
Cloudflare Web Analytics (pageviews only, no events); Plausible ($9/mo) and Umami (both need a
script); Cloudflare proxy (sampled, no clicks, moves DNS).

Rule change: one more runtime third-party request (the pixel) next to post embeds and the suggest
POST. Still no client JS. Update `CLAUDE.md` → No third-party requests when this lands.

## Counted

| event | GoatCounter row |
|---|---|
| page view | path: `/`, `/compact/`, `/apps/<id>/`, `/about/` |
| visit button or framed-screenshot click on `/apps/<id>/` | event: `visit/<id>`, `visit/<id>/app-store`, `visit/<id>/play-store` |

GoatCounter derives visits (per visitor per day, salted hash of IP + UA, not stored), country,
browser, and filters known bots. No referrers: the `<img>` request's `Referer` is our own page, and
the `r` param would have to be filled from `document.referrer`, i.e. JS. If referrers are wanted
later: ~3 inline first-party lines that set the `src` with `r` and `s`, `<noscript>` pixel as fallback.

## Mechanism

**Pixel.** `Base.astro`, before `</body>`:

```html
<img class="beacon" src="https://weirdlittleapps.goatcounter.com/count?p=%2Fapps%2Fbingebrowse%2F&t=BingeBrowse" alt="" width="1" height="1" aria-hidden="true">
```

`p` = `Astro.url.pathname`, `t` = page title, URL-encoded. `.beacon`: `position: absolute; width: 1px;
height: 1px; opacity: 0`. Not `display: none` (some browsers skip the fetch). The endpoint sends
`cache-control: no-store`; no cache buster needed.

**Outbound hop.** Visit buttons and the frame link point at `/go/<id>/` (the entry's `url`) and
`/go/<id>/app-store/` / `/go/<id>/play-store/` (store listings in `links`, same host test as the
button label). `src/pages/go/[...slug].astro` builds one page per button from `getApps()`:

```html
<meta http-equiv="refresh" content="0; url=https://bingebrowse.net/">
<meta name="robots" content="noindex">
<p>off to <a href="https://bingebrowse.net/">bingebrowse.net ↗</a></p>
<img class="beacon" src="https://weirdlittleapps.goatcounter.com/count?p=visit%2Fbingebrowse&e=1" ...>
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
  goatcounter: https://weirdlittleapps.goatcounter.com
```

Schema: `stats: z.object({ goatcounter: z.url().nullish() }).optional()`.

Render the pixel only when `stats.goatcounter` is set **and** (`process.env.CI` or `WLA_STATS=1`),
so dev, local builds, screenshots and the `WLA_SHOW_HIDDEN` build send nothing.

## Changes

| file | change |
|---|---|
| `src/components/Beacon.astro` | `{ path, title?, event? }` → `<img>`, or nothing when unconfigured / not production |
| `src/layouts/Base.astro` | `<Beacon path={Astro.url.pathname} title={fullTitle} />`; `count` prop to override `{ path, event }` |
| `src/lib/apps.ts` | `visits(app)` adds `go` (the `/go/…/` path) next to `href`, `label` |
| `src/pages/apps/[id].astro` | frame link and both `.visits` blocks use `b.go` |
| `src/pages/go/[...slug].astro` | `getStaticPaths` over apps × `visits(app)`; `Base` with `count={{ path: 'visit/…', event: true }}`, refresh meta, one line |
| `public/robots.txt` | `Disallow: /go/` |
| `src/styles/site.css` | `.beacon`; the go page line |
| `site.yaml`, `content.config.ts`, `src/content/README.md` | `stats` block |
| `CLAUDE.md`, `.claude/PLAN.md` | rule exceptions, layout lines |

## Setup (curator, once)

1. https://www.goatcounter.com/signup, code `weirdlittleapps`. No card.
2. Settings → Ignore IPs: home IP.
3. `site.yaml` → `stats.goatcounter`, push, load the live site, confirm a row.
4. Optional: custom domain. Namecheap `stats` CNAME → `weirdlittleapps.goatcounter.com`; GoatCounter
   Settings → Custom domain `stats.weirdlittleapps.com`; `site.yaml` → `https://stats.weirdlittleapps.com`.
   `*.goatcounter.com` is on EasyPrivacy; expect ~⅓ undercount without this.
5. Optional: Settings → public dashboard, plus a `stats` footer link.

## Checks

```sh
WLA_STATS=1 npm run build
grep -o 'count?[^"]*' dist/index.html dist/apps/bingebrowse/index.html dist/go/bingebrowse/index.html
# p=%2F   p=%2Fapps%2Fbingebrowse%2F&t=…   p=visit%2Fbingebrowse&e=1
npm run build && grep -rl goatcounter dist | wc -l    # 0
```

After deploy: click a visit button in Safari and Firefox, confirm the event row.
