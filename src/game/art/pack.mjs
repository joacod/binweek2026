import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const file = name => fileURLToPath(new URL(name, import.meta.url));
// Fixed complete-sheet resize retains authored pivots; never trim individual bee cels.
await sharp(file('sources/bee.png')).resize(1024,1024).webp({lossless:true,effort:6}).toFile(file('courier.webp'));
// Preserve the two original food cels as complete objects in padded runtime cells.
const crops = [
  { left: 0, top: 0, width: 627, height: 627 },
  { left: 627, top: 0, width: 627, height: 627 },
];
const objects = await Promise.all(crops.map(async (crop, index) => ({
  input: await sharp(file('sources/objects.png')).extract(crop)
    .resize(448,448,{fit:'contain',background:'#00000000'})
    .extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer(),
  left: index % 2 * 512, top: Math.floor(index / 2) * 512,
})));
// Rabas replace the souvenir. The bird has its own stable-body animation strip.
objects.push({input: await sharp(file('sources/snacks-gull.png')).extract({left:0,top:0,width:627,height:627})
  .resize(448,448).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer(), left:0, top:512});
objects.push({input: await sharp(file('sources/beer.png'))
  .resize(448,448,{fit:'contain',background:'#00000000'})
  .extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png().toBuffer(), left:512, top:512});
await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}})
  .composite(objects).webp({lossless:true,effort:6}).toFile(file('objects.webp'));
const birdCels = [
  {left:627,top:0,pivotX:320,pivotY:408},
  {left:0,top:627,pivotX:320,pivotY:300},
  {left:627,top:627,pivotX:320,pivotY:280},
];
const birds = await Promise.all(birdCels.map(async ({left,top,pivotX,pivotY}, index) => ({
  input: await sharp(file('sources/snacks-gull.png')).extract({left,top,width:627,height:627})
    .resize(401,401).png().toBuffer(),
  left:index*512+Math.round(256-pivotX*401/627), top:Math.round(280-pivotY*401/627),
})));
await sharp({create:{width:1536,height:512,channels:4,background:'#00000000'}})
  .composite(birds).webp({lossless:true,effort:6}).toFile(file('gull.webp'));
await sharp(file('sources/scenery.png')).resize(1024,1024).webp({quality:92,alphaQuality:100,effort:6}).toFile(file('scenery.webp'));
await sharp(file('sources/reviewer.png')).resize(768,384,{fit:'contain',background:'#00000000'})
  .webp({quality:92,alphaQuality:100,effort:6}).toFile(file('reviewer.webp'));
await sharp(file('sources/quartzite.png')).resize(512,512).webp({quality:90,effort:6}).toFile(file('quartzite.webp'));
for (const role of ['coast','grande','varese','beach','central','hotel']) {
  await sharp(file(`sources/${role}.png`)).resize(1536,1024).webp({quality:90,effort:6}).toFile(file(`${role}.webp`));
}
