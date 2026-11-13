import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { generateSiteAssets, siteHtml } from '../../scripts/site-assets.mjs';
import { site } from '../../src/site.ts';

const quoted = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('"', '&quot;');

test('link previews receive the game identity before JavaScript runs', async () => {
  const html = siteHtml('<!doctype html><html><head><!--site-metadata--></head><body><div id="app"><!--game-introduction--></div></body></html>');
  assert.match(html, new RegExp(`<title>${quoted(site.title)}</title>`));
  assert.match(html, new RegExp(`<meta name="description" content="${quoted(site.description)}">`));
  assert.match(html, new RegExp(`<link rel="canonical" href="${quoted(site.url)}">`));
  for (const [property, value] of Object.entries({
    'og:type': 'website', 'og:site_name': site.name, 'og:title': site.title, 'og:description': site.description,
    'og:url': site.url, 'og:image': `${site.url}social.png`, 'og:image:type': 'image/png',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': site.socialAlt,
  })) assert.match(html, new RegExp(`<meta property="${property}" content="${quoted(value)}">`));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${quoted(`${site.url}social.png`)}">`));
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, new RegExp(`"sameAs":"${quoted(site.repository)}"`));
  assert.match(html, new RegExp(quoted(site.introduction)));
  assert.doesNotMatch(html, /<!--site-metadata-->|<!--game-introduction-->/);

  await generateSiteAssets();
  const card = await sharp(await readFile(new URL('../../public/social.png', import.meta.url))).metadata();
  assert.equal(card.width, 1200);
  assert.equal(card.height, 630);
  assert.equal(card.format, 'png');
  const robots = await readFile(new URL('../../public/robots.txt', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${site.url}sitemap.xml`));
  assert.match(sitemap, new RegExp(`<loc>${site.url}</loc>`));
});
