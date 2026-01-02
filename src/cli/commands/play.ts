import { Command } from 'commander';
import { playInteractiveGame } from '../play/session.js';

export const createPlayCommand = (): Command => {
  return new Command('play')
    .description('Interactive War game (player vs CPU).')
    .option('--seed <seed>', 'Seed for deterministic play.', 'interactive')
    .option('--autoplay', 'Start the game in autoplay mode.')
    .action(async (options: { seed: string; autoplay?: boolean }) => {
      await playInteractiveGame({
        seed: options.seed,
        startAutoplay: Boolean(options.autoplay),
      });
    });
};
