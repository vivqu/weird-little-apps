# weirdlittleapps.com — Plan

A static site that showcases interesting small-scale apps (some built with AI agents).
Every app is described in YAML config; the site is generated from that config.

## Inspiration

The site grows out of Vivian's post
[Making space for weirdness and fun](https://vivqu.substack.com/p/making-space-for-weirdness-and-fun).
The parts that should shape the site:

- **Fun is the fuel.** Projects survive on "utilitarian net fun" (Mike McQuaid): more enjoyable than tedious, on balance. The site should feel that way to browse and to maintain.
- **Purpose-built, single-use software** made for one specific, sometimes idiosyncratic need is worth celebrating, not apologizing for.
- **AI agents make the tedious parts fun**, which is why some of these apps exist at all. Say so plainly per app.
- **The weird quotient.** Ideas that wouldn't survive a planning meeting are the point.
- **Motto:** "Make the weird thing. The right people will find it."

Apps mentioned in the post are good seed entries: Craig Mod's tax software, Grug, Tiny Tool Town, Heliophilia, Bookpile, Nature this week.

Implications for the content model (Decision 2): every entry should answer *why does this exist* and *what itch does it scratch*, not just *what is it*. Add fields for that. Tone of the site copy: lowercase, personal, optimistic, no marketing voice.

## Goals

- Static output, deployable to any static host (Cloudflare Pages, Netlify, GitHub Pages, Vercel).
- Adding a new app should mean adding one YAML entry (plus an optional screenshot). No code changes.
- Small, fast, low-JS. Content-first.
- Easy for an AI agent to maintain: predictable file layout, schema-validated config, one command to build.

## Decision 1: Static site framework

**Status: DECIDED — Astro.** (2026-09-02)

Why: hosting is GitHub Pages (see Decision 3), which rules Jekyll in by default but
anything else works via a GitHub Actions build. Astro's YAML content collections with
schema validation are the best fit for a config-driven showcase, and Node 22 is already
installed. Astro ships an official GitHub Pages deploy action (`withastro/action`).

Constraints from the environment: Node 22 is installed. Hugo is not installed. Ruby is the macOS system Ruby (old), so Jekyll would need a Ruby toolchain first.

| Option | YAML data support | Templating | Pros | Cons |
|---|---|---|---|---|
| **Astro** (recommended) | Content collections with the `glob()` loader read `.yml`/`.yaml` files natively; schema validated with Zod | `.astro` components (HTML + JSX-like) | Zero JS shipped by default, typed schemas catch bad YAML at build time, image optimization built in, huge ecosystem, easy to grow into per-app pages/tags/RSS | Slightly heavier toolchain than 11ty; concepts (collections, loaders) to learn |
| **Eleventy (11ty)** | `_data/*.yml` global data works out of the box (with a one-line YAML plugin); or a directory of YAML files via a custom data extension | Nunjucks / Liquid / WebC | Smallest mental model, very little config, pure HTML output | No schema validation without extra work; less structured as the site grows |
| **Hugo** | `data/*.yml` built in | Go templates | Single binary, fastest builds | Not installed; Go templates are awkward; harder for agents to iterate on |
| **Jekyll** | `_data/*.yml` built in | Liquid | GitHub Pages native | Needs a Ruby toolchain; slow; ecosystem stagnant |

Recommendation: **Astro**. The YAML-first, schema-validated content collection is exactly the "config drives the site" model we want, and it stays static with zero client JS unless we opt in.

## Decision 2: Content model (after framework)

Sketch of one app entry (to refine):

```yaml
# src/content/apps/pocket-metronome.yml
name: Pocket Metronome
slug: pocket-metronome
tagline: A metronome that fits in a browser tab.
url: https://example.com
repo: https://github.com/...
platform: [web]            # web | ios | macos | cli | ...
built_with: [claude-code]  # optional: which AI agents/tools were used
tags: [music, tools]
screenshot: ./screenshots/pocket-metronome.png
added: 2026-09-02
featured: false
why: |
  The itch it scratches. One or two sentences on why this exists at all.
description: |
  Longer markdown-ish description.
```

Open questions:
- One YAML file per app vs. one big `apps.yml`? (Leaning: one file per app; easier diffs and agent edits.)
- Do we want per-app detail pages, or just a single index/grid?
- Tag/filter pages? Search (client-side)?

## Decision 3: Hosting & domain

**Status: DECIDED — GitHub Pages, deployed from GitHub Actions.**

- Workflow: `.github/workflows/deploy.yml` on push to `main` → `withastro/action` (build) → `actions/deploy-pages` (publish). No Jekyll; repo settings set Pages source to "GitHub Actions".
- Custom domain: `public/CNAME` containing `weirdlittleapps.com` so it survives every deploy. Set `site: 'https://weirdlittleapps.com'` in `astro.config.mjs`; `base` stays `/` because it's an apex domain, not a `/repo-name/` project page.
- DNS: A/AAAA records for the apex pointing at GitHub Pages IPs, plus a `www` CNAME to `<user>.github.io`. Enable "Enforce HTTPS" once the cert is issued.
- Add `.nojekyll` is not needed when Pages source is Actions, but harmless.

## Milestone 0: Domain wired up + "work in progress" page

Goal: `https://weirdlittleapps.com` serves a simple placeholder page, built by Astro and
deployed from GitHub Actions. Everything after this is just replacing the page content.

Repo facts: `vivqu/weird-little-apps`, public, no commits yet, `gh` CLI authenticated.

### Steps

1. ✅ **Scaffold a minimal Astro project** (no template extras, no integrations).
   - `package.json` with `astro` as the only dependency; scripts `dev`, `build`, `preview`.
   - `astro.config.mjs` with `site: 'https://weirdlittleapps.com'` (no `base`, apex domain).
   - `.gitignore` for `node_modules/`, `dist/`, `.astro/`.
   - Pin Node in `.nvmrc` (22) so the Actions runner matches local.
2. ✅ **WIP page** at `src/pages/index.astro`.
   - Single static page: site name, one line ("a collection of weird little apps, coming soon"), no JS.
   - Inline CSS, respects `prefers-color-scheme`. Keep it tiny; it gets replaced in Milestone 3.
   - `public/favicon.svg` and `public/robots.txt` so the placeholder doesn't 404 on those.
3. ✅ **Custom domain file**: `public/CNAME` containing exactly `weirdlittleapps.com`.
   Astro copies `public/` verbatim, so this lands in `dist/` on every build and GitHub reads it.
4. ✅ **Deploy workflow** at `.github/workflows/deploy.yml`.
   - Trigger: push to `main` + `workflow_dispatch`.
   - Permissions: `contents: read`, `pages: write`, `id-token: write`.
   - Jobs: `build` (checkout → `withastro/action@v3`) then `deploy` (`actions/deploy-pages@v4`, environment `github-pages`).
   - Concurrency group `pages` so overlapping pushes cancel.
5. ✅ **Verify locally**: `npm install && npm run build`, confirm `dist/index.html` and `dist/CNAME` exist.
6. ✅ **First commit + push to `main`.** This triggers the workflow; expect it to succeed at build but Pages won't serve until step 7.
7. ✅ **GitHub repo settings → Pages** (can be done via `gh api`):
   - Source: **GitHub Actions** (`build_type: workflow`), not "deploy from branch".
   - Custom domain: `weirdlittleapps.com`. The CNAME file sets this too, but setting it explicitly avoids a race on the first deploy.
   - Leave "Enforce HTTPS" off until the certificate is issued (it's greyed out until DNS resolves).
8. ✅ **DNS at the registrar** (only step that can't be done from this repo — needs whoever controls the zone):
   - Apex `weirdlittleapps.com` → four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - Optional IPv6 `AAAA`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
   - `www` → `CNAME` to `vivqu.github.io` (GitHub will redirect www → apex).
   - Remove any existing A/AAAA/ALIAS records for the apex that point elsewhere (registrar parking pages are the usual culprit).
9. ✅ **Wait for propagation, then check** (`dig weirdlittleapps.com +short` should show the four IPs; GitHub's Pages settings shows "DNS check successful").
10. ⏳ **Turn on "Enforce HTTPS"** once GitHub has provisioned the Let's Encrypt cert (usually minutes to an hour after DNS is right). Confirm `curl -I https://weirdlittleapps.com` returns 200 and `http://` redirects.
11. **Optional hardening**: verify the domain at the account level (GitHub → Settings → Pages → "Add a domain") so nobody else can claim it if the repo is ever renamed or deleted.

### Done when

- `https://weirdlittleapps.com` and `https://www.weirdlittleapps.com` both show the WIP page over HTTPS.
- Pushing to `main` redeploys automatically with no manual steps.

### Current state (updated 2026-09-02, evening)

- **Live at http://weirdlittleapps.com.** Both the apex and `www` are served by GitHub Pages; `www` and `vivqu.github.io/weird-little-apps` 301 to the apex.
- **DNS done** at Namecheap: four GitHub `A` records on `@`, `www` CNAME → `vivqu.github.io`. The Namecheap email-forwarding `MX` records were left in place.
- **GitHub Pages** is enabled with source = GitHub Actions and custom domain = `weirdlittleapps.com`. GitHub's domain health check passes for both hosts.
- **HTTPS pending.** Port 443 answers but with GitHub's generic `*.github.io` certificate until the domain cert is issued. `https_enforced` stays off until then. Once `.https_certificate.state` is `approved`, set `https_enforced: true` via `gh api -X PUT repos/vivqu/weird-little-apps/pages -F https_enforced=true` and confirm `http://` redirects.
- **Gotcha seen today:** connectivity from this Mac to GitHub's Pages IPs (185.199.108–111.153) was flaky for ~20 minutes while `github.com` itself worked. If the site "isn't loading", check with `gh api repos/vivqu/weird-little-apps/pages/health` (`is_served_by_pages`) before assuming a config problem.

## Milestones

0. ⏳ Domain + WIP page — everything done except "Enforce HTTPS", which is waiting on GitHub's certificate. See Milestone 0 above.
1. ✅ Pick framework (Astro), scaffold, commit.
2. Define YAML schema + 2–3 sample apps (fields sketched in Decision 2; add `why`).
3. Index page: grid of app cards. Reuse the window/sticker/sticky-note vocabulary from the WIP page.
4. ✅ Visual identity — landed on the WIP page (see `CLAUDE.md` → Style direction). Extract tokens to a shared layout when page 2 arrives.
5. ✅ Deploy + DNS (GitHub Actions → Pages, Namecheap DNS).
6. Nice-to-haves: per-app pages, tags, RSS feed, OG images, a guestbook.

## Decision 4: Visual identity

**Status: DECIDED (2026-09-02).** Small-web, hand-placed, paper-not-glass. Aqua graph-paper ground, peach window, indigo ink, one accent per object. Full description and hex values live in `CLAUDE.md` under "Style direction"; the mood summary is in `README.md` under "The look". Light only, no dark mode.
