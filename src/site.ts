/** Public identity shared by search metadata and the generated social card. */
const name = 'Binagora Week 2026';
const headline = 'The Hive Reunion';
const description = 'The Hive Reunion. Fly across Mar del Plata, gather treats, and join the hive at the Hermitage Hotel.';

export const site = {
  name,
  headline,
  introduction: 'The hive is gathering at the Hermitage. See you there!',
  title: `${name} | ${headline}`,
  description,
  socialDescription: 'Fly across Mar del Plata, gather treats, and join the hive at the Hermitage Hotel.',
  url: 'https://binweek2026.vercel.app/',
  repository: 'https://github.com/joacod/binweek2026',
  socialAlt: 'The Hive Reunion: Binagora’s bee flies over the Mar del Plata coast toward the Hermitage Hotel.',
} as const;
