/** Locally packaged, required event artwork. Logo is loaded through the same gate. */
export const urls = {
  courier: new URL('./art/courier.webp', import.meta.url).href,
  objects: new URL('./art/objects.webp', import.meta.url).href,
  sky: new URL('./art/coast.webp', import.meta.url).href,
  beach: new URL('./art/beach.webp', import.meta.url).href,
  central: new URL('./art/central.webp', import.meta.url).href,
  hotel: new URL('./art/hotel.webp', import.meta.url).href,
  logo: new URL('./art/binagora-logo.png', import.meta.url).href,
};
export const sizes = { courier: [1024,1024], objects: [1024,1024], sky: [1536,1024], beach: [1536,1024], central: [1536,1024], hotel: [1536,1024], logo: [474,132] } as const;
