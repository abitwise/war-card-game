import { Command } from 'commander';
import { runInkPlay } from '../../adapters/inkPlay.js';
import type { RoundResult } from '../../engine/round.js';
import type { GameState } from '../../engine/state.js';
import { playInteractiveGame } from '../play/session.js';
import { createTraceMeta, TraceWriter } from '../../trace/trace.js';

type PlayOptions = {
  seed: string;
  autoplay?: boolean;
  ui?: string;
  trace?: string;
  traceSnapshots?: boolean;
  traceTopCards?: boolean;
};

export const createPlayCommand = (): Command => {
  const command = new Command('play')
    .description('Interactive War game (player vs CPU).')
    .option('--seed <seed>', 'Seed for deterministic play.', 'interactive')
    .option('--autoplay', 'Start the game in autoplay mode.')
    .option('--ui <mode>', 'UI mode to use (ink | prompt).', 'ink')
    .option('--trace <file>', 'Write a JSONL trace for the game.')
    .option('--trace-snapshots', 'Include per-round snapshots in trace output.')
    .option('--trace-top-cards', 'Include top-card details when snapshots are enabled.')
    .action(async (options: PlayOptions) => {
      const ui = (options.ui ?? 'ink').toLowerCase();
      if (ui !== 'prompt' && ui !== 'ink') {
        command.error('Invalid UI mode. Use "ink" (default) or "prompt".');
      }

      if (options.traceTopCards && !options.traceSnapshots) {
        command.error('--trace-top-cards requires --trace-snapshots.');
      }

      const traceCliArgs = {
        command: 'play',
        seed: options.seed,
        ui,
        autoplay: Boolean(options.autoplay),
        traceSnapshots: options.traceSnapshots,
        traceTopCards: options.traceTopCards,
      };

      let traceWriter: TraceWriter | undefined;

      const onGameStart = options.trace
        ? (state: GameState) => {
            traceWriter = new TraceWriter(
              {
                filePath: options.trace as string,
                includeSnapshots: Boolean(options.traceSnapshots),
                includeTopCards: Boolean(options.traceTopCards),
              },
              createTraceMeta({
                seed: options.seed,
                state,
                cliArgs: traceCliArgs,
              }),
            );
          }
        : undefined;

      const onRoundComplete = options.trace
        ? (result: RoundResult) => {
            traceWriter?.recordRound(result);
          }
        : undefined;

      if (ui === 'ink') {
        await runInkPlay({
          seed: options.seed,
          startAutoplay: Boolean(options.autoplay),
          onGameStart,
          onRoundComplete,
        });
        return;
      }

      await playInteractiveGame({
        seed: options.seed,
        startAutoplay: Boolean(options.autoplay),
        onGameStart,
        onRoundComplete,
      });
    });

  return command;
};
