import seedrandom from 'seedrandom';

export type RNG = () => number;

export const createSeededRng = (seed: string): RNG => {
  const seeded = seedrandom(seed);
  return () => seeded.quick();
};
