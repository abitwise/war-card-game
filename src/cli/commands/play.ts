import { Command } from 'commander';
import { runInkPlay } from '../../adapters/inkPlay.js';
import { playInteractiveGame } from '../play/session.js';

type PlayOptions = {
  seed: string;
  autoplay?: boolean;
  ui?: string;
};

export const createPlayCommand = (): Command => {
  const command = new Command('play')
    .description('Interactive War game (player vs CPU).')
    .option('--seed <seed>', 'Seed for deterministic play.', 'interactive')
    .option('--autoplay', 'Start the game in autoplay mode.')
    .option('--ui <mode>', 'UI mode to use (ink | prompt).', 'ink')
    .action(async (options: PlayOptions) => {
      const ui = (options.ui ?? 'ink').toLowerCase();
      if (ui !== 'prompt' && ui !== 'ink') {
        command.error('Invalid UI mode. Use "ink" (default) or "prompt".');
      }

      if (ui === 'ink') {
        await runInkPlay({
          seed: options.seed,
          startAutoplay: Boolean(options.autoplay),
        });
        return;
      }

      await playInteractiveGame({
        seed: options.seed,
        startAutoplay: Boolean(options.autoplay),
      });
    });

  return command;
};
