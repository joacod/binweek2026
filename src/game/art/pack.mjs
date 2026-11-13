import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const file = name => fileURLToPath(new URL(name, import.meta.url));
// Fixed complete-sheet resize retains authored pivots; never trim individual bee cels.
await sharp(file('sources/bee.png')).resize(1024,1024).webp({lossless:true,effort:6}).toFile(file('courier.webp'));
// The gull's snack extends left of the source's nominal quadrant. These authored
// rectangles include each WHOLE object, then contain it inside a padded runtime cel.
const crops = [
  { left: 0, top: 0, width: 627, height: 627 },
  { left: 627, top: 0, width: 627, height: 627 },
  { left: 0, top: 627, width: 575, height: 627 },
  { left: 575, top: 627, width: 679, height: 627 },
];
const objects = await Promise.all(crops.map(async (crop, index) => ({
  input: await sharp(file('sources/objects.png')).extract(crop)
    .resize(448,448,{fit:'contain',background:'#00000000'})
    .extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer(),
  left: index % 2 * 512, top: Math.floor(index / 2) * 512,
})));
await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}})
  .composite(objects).webp({lossless:true,effort:6}).toFile(file('objects.webp'));
for (const role of ['coast','beach','central','hotel']) {
  await sharp(file(`sources/${role}.png`)).resize(1536,1024).webp({quality:90,effort:6}).toFile(file(`${role}.webp`));
}
