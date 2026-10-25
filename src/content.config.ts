// The `apps` collection: one folder per app under src/content/apps/, holding index.yaml and our
// own screenshots. Spec: .claude/registry-plan.md → Part 1. Everything computable (order, accession
// numbers, whether a screenshot is phone-shaped) is derived in src/lib/apps.ts, not stored here.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const FORM_FACTORS = [
  'web', 'ios', 'android', 'mac', 'windows',
  'cli', 'extension', 'bot', 'hardware', 'other',
] as const;

// ids that would collide with the index routes if detail pages ever moved to the root
const RESERVED_IDS = new Set(['page', 'compact', 'about', 'apps']);

const asList = <T>(v: T | T[]) => (Array.isArray(v) ? v : [v]);

// a bare url is labelled from its hostname, so a new platform never needs a schema change
export function labelFor(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host === 'x.com' || host === 'twitter.com' ? 'twitter' : host;
}

const person = z
  .union([z.string().min(1), z.object({ name: z.string().min(1), url: z.url().optional() })])
  .transform((p) => (typeof p === 'string' ? { name: p } : p));

const link = z
  .union([z.url(), z.object({ label: z.string().min(1), url: z.url() })])
  .transform((l) => (typeof l === 'string' ? { label: labelFor(l), url: l } : l));

// recs: writing about the app by other people. A bare url (titled from its hostname) or {title, url, by?, date?}
const rec = z
  .union([z.url(), z.object({ title: z.string().min(1), url: z.url(), by: z.string().optional(), date: z.coerce.date().optional() })])
  .transform((r) => (typeof r === 'string' ? { title: labelFor(r), url: r } : r));

const apps = defineCollection({
  loader: glob({
    pattern: '*/index.{yaml,yml}',
    base: './src/content/apps',
    // the id is the folder name, so parent folders can be reorganised without changing urls
    generateId: ({ entry }) => {
      const id = entry.split('/').at(-2) ?? '';
      if (RESERVED_IDS.has(id)) throw new Error(`"${id}" is a reserved app id (src/content/apps/${entry})`);
      return id;
    },
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      tagline: z.string().min(1).max(140),
      url: z.url(),
      form_factor: z.union([z.enum(FORM_FACTORS), z.array(z.enum(FORM_FACTORS)).min(1)]).transform(asList),
      by: z.union([person, z.array(person).min(1)]).transform(asList),
      why: z.string().min(1),
      collected: z.coerce.date(),

      // yaml gives `2024` as a number, `2024-06` as a string and `2024-06-01` as a Date
      created: z.union([z.number().int(), z.string().regex(/^\d{4}(-\d{2})?$/), z.date()]).optional(),
      curator: person.default({ name: 'Vivian Qu' }),
      // who sent it in through /suggest/, when that wasn't the curator; shown on the museum label's credit line
      submitted_by: person.optional(),
      // shown on the visit button as written: "$2.99", "£1.49", "free trial"; omit when free
      price: z.string().min(1).optional(),
      // not reviewed yet: left out of the build, except in `astro dev` or a build with WLA_SHOW_HIDDEN=1 (never on CI)
      hidden: z.boolean().optional(),
      // lowercase slugs for filtering later (tools it was built with, themes): `react-native`, not `react native`.
      // collected now, not shown anywhere yet
      tags: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'a lowercase slug, dashes between words')).optional(),
      links: z.array(link).optional(),
      recs: z.array(rec).optional(),
      quotes: z
        .array(
          z.object({
            text: z.string().min(1),
            url: z.url(),
            by: z.string().optional(),
            date: z.coerce.date().optional(),
            // show the post itself (Threads or X, via the provider's script; the text stays as the fallback) or the video (YouTube; the text is the player's title)
            embed: z.boolean().optional(),
          }),
        )
        .optional(),
      screenshots: z
        .array(
          z.object({
            image: image(),
            alt: z.string().min(1),
            caption: z.string().optional(),
            taken: z.coerce.date().optional(),
            // phone-shaped captures only (see UPLOAD.md): the image already contains a rendered
            // device, or is a store marketing panel. Both are shown without our drawn phone.
            bezel: z.boolean().optional(),
            panel: z.boolean().optional(),
          }),
        )
        .max(4)
        .default([]),
    }),
});

// Site-wide copy and status: one file, src/content/site.yaml. Read it with getSite() from src/lib/site.ts.
const site = defineCollection({
  loader: glob({ pattern: 'site.{yaml,yml}', base: './src/content' }),
  schema: z.object({
    name: z.string().min(1),
    subtitle: z.string().min(1),
    established: z.number().int(),
    by: z.object({ name: z.string().min(1), url: z.url().optional() }),
    lede: z.string().min(1),
    description: z.string().min(1),
    post: z.url(),
    motto: z.string().min(1),
    status: z.string().min(1),
    next: z.string().optional(),
    // the suggestion box at /suggest/ (.claude/FORM.md). Without `endpoint` the page says the box isn't out yet and nothing links to it
    suggest: z
      .object({
        endpoint: z.url().nullish(),
        invite: z.string().min(1),
        thanks: z.string().min(1),
        // the second sentence of the thanks: one when they left a way to reach them, one when they didn't
        reach: z.string().min(1),
        noreach: z.string().min(1),
      })
      .optional(),
    // the counting pixel (.claude/ANALYTICS.md): the GoatCounter site, https://<code>.goatcounter.com. Without it nothing is sent
    stats: z.object({ goatcounter: z.url().nullish() }).optional(),
  }),
});

export const collections = { apps, site };
