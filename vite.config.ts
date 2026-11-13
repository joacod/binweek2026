import { defineConfig } from 'vite';
import { generateSiteAssets, siteHtml } from './scripts/site-assets.mjs';

export default defineConfig(async () => {
  await generateSiteAssets();
  return {
    base: './',
    optimizeDeps: { include: ['audiobits'] },
    plugins: [{ name: 'binweek-site', transformIndexHtml: { order: 'pre', handler: siteHtml } }],
  };
});
