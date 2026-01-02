import { describe, expect, it } from 'vitest';
import { runInkPlay } from '../../src/adapters/inkPlay.js';

describe('runInkPlay', () => {
  it('can autoplay a game to completion', async () => {
    const finalState = await runInkPlay({
      seed: 'ink-autoplay',
      startAutoplay: true,
      autoplayBurst: 100,
      rules: { maxRounds: 200 },
      quiet: true,
      headless: true,
    });

    expect(finalState.active).toBe(false);
    expect(finalState.round).toBeGreaterThan(1);
  }, 15000);
});
