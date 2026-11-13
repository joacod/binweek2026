import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const file = name => fileURLToPath(new URL(name, import.meta.url));
// Fixed complete-sheet resize retains authored pivots; never trim individual bee cels.
for (const [source, role] of [['bee','courier'],['objects','objects']]) {
  await sharp(file(`sources/${source}.png`)).resize(1024,1024).webp({lossless:true,effort:6}).toFile(file(`${role}.webp`));
}
for (const role of ['coast','beach','central','hotel']) {
  await sharp(file(`sources/${role}.png`)).resize(1536,1024).webp({quality:90,effort:6}).toFile(file(`${role}.webp`));
}
