// Site-wide copy and status from src/content/site.yaml.
import { getEntry } from 'astro:content';

export async function getSite() {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('src/content/site.yaml is missing');
  return entry.data;
}
