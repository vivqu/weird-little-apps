// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://weirdlittleapps.com',
  // Apex custom domain on GitHub Pages: no `base` needed.
  output: 'static',
});
