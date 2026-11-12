/** Required artwork URLs and decoded sheet dimensions. */
export const urls = {
  courier: new URL('./art/courier.webp', import.meta.url).href,
  pillar: new URL('./art/pillar.webp', import.meta.url).href,
  mine: new URL('./art/mine.webp', import.meta.url).href,
  fragment: new URL('./art/fragment.webp', import.meta.url).href,
  cloud: new URL('./art/cloud.webp', import.meta.url).href,
  sky: new URL('./art/sky.webp', import.meta.url).href,
  checkpoint: new URL('./art/checkpoint.webp', import.meta.url).href,
};
export const sizes = { courier: [1024, 1024], pillar: [192, 480], mine: [256, 256], fragment: [192, 288], cloud: [640, 252], sky: [1536, 1024], checkpoint: [1024, 1024] } as const;
