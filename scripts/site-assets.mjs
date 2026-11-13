import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { site } from '../src/site.ts';

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${body}</svg>`);
const art = name => fileURLToPath(new URL(`../src/game/art/${name}`, import.meta.url));
const publicFile = name => new URL(`../public/${name}`, import.meta.url);

/** Wrap a sentence into short lines that fit the share card's text column. */
function linesOf(value, width) {
  const lines = [];
  let line = '';
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > width) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Derived files stay out of git and are recreated for both dev and production. */
export async function generateSiteAssets() {
  await mkdir(new URL('../public/', import.meta.url), { recursive: true });
  const icon = art('binagora-icon.png');
  const coast = await sharp(art('central.webp')).resize(760, 630, { fit: 'cover', position: 'centre' }).png().toBuffer();
  const glide = await sharp(art('courier.webp')).extract({ left: 0, top: 0, width: 512, height: 512 }).png().toBuffer();
  const bee = await sharp(glide).trim({ threshold: 12 }).resize({ height: 290 }).png().toBuffer();
  const beeBox = await sharp(bee).metadata();
  const logo = await sharp(art('binagora-logo.png')).resize({ width: 248 }).png().toBuffer();
  const blurb = linesOf(site.socialDescription, 42).map((line, index) =>
    `<tspan x="48" dy="${index === 0 ? 0 : 30}">${escape(line)}</tspan>`).join('');
  const card = await sharp(svg('<rect width="1200" height="630" fill="#fff8e9"/>')).composite([
    { input: coast, left: 500, top: 0 },
    { input: svg('<defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#fff8e9"/><stop offset="1" stop-color="#fff8e9" stop-opacity="0"/></linearGradient></defs><rect x="500" width="150" height="630" fill="url(#fade)"/>') },
    { input: bee, left: 1200 - (beeBox.width ?? 0) - 28, top: 630 - (beeBox.height ?? 0) - 18 },
    { input: logo, left: 48, top: 40 },
    { input: svg(`<g fill="#323232" font-family="sans-serif"><text x="48" y="188" fill="#946020" font-size="15" font-weight="700" letter-spacing="2.4">MAR DEL PLATA</text><text x="48" y="258" font-size="46" font-weight="700" letter-spacing="-1.2">${escape(site.headline)}</text><rect x="48" y="278" width="64" height="4" fill="#F59E2B"/><text x="48" y="332" fill="#58574e" font-size="18">${blurb}</text><text x="48" y="572" fill="#995500" font-size="16" font-weight="700">${escape(new URL(site.url).host)}</text></g>`) },
  ]).png({ compressionLevel: 9, effort: 7 }).toBuffer();
  await Promise.all([
    writeFile(publicFile('social.png'), card),
    sharp(icon).resize(32, 32).png().toFile(fileURLToPath(publicFile('icon-32.png'))),
    sharp(icon).resize(180, 180).flatten({ background: '#fff8e9' }).png().toFile(fileURLToPath(publicFile('apple-touch-icon.png'))),
    writeFile(publicFile('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`),
    writeFile(publicFile('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.url}</loc></url></urlset>\n`),
  ]);
}

/** Search and link previews receive metadata in the initial HTML, without JavaScript. */
export function siteHtml(html) {
  const schema = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url,
    description: site.description, sameAs: site.repository };
  const metadata = [
    `<title>${escape(site.title)}</title>`,
    `<meta name="description" content="${escape(site.description)}">`,
    `<link rel="canonical" href="${site.url}">`,
    ...Object.entries({ 'og:type': 'website', 'og:site_name': site.name, 'og:title': site.title,
      'og:description': site.description, 'og:url': site.url, 'og:image': `${site.url}social.png`,
      'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': site.socialAlt,
    }).map(([property, value]) => `<meta property="${property}" content="${escape(value)}">`),
    ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': site.title,
      'twitter:description': site.description, 'twitter:image': `${site.url}social.png`, 'twitter:image:alt': site.socialAlt,
    }).map(([name, value]) => `<meta name="${name}" content="${escape(value)}">`),
    `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
  const introduction = `<main class="binweek-introduction"><p class="binweek-introduction-place">Mar del Plata, Argentina</p><h1>${escape(site.headline)}</h1><p>${escape(site.introduction)}</p><p>${escape(site.socialDescription)}</p><noscript><p>Enable JavaScript to play.</p></noscript></main>`;
  return html.replace('<!--site-metadata-->', metadata).replace('<!--game-introduction-->', introduction);
}
