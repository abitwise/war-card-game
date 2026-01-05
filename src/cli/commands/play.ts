import { Command, InvalidArgumentError } from 'commander';
import { runInkPlay } from '../../adapters/inkPlay.js';
import type { StateHashMode } from '../../engine/hash.js';
import type { RoundResult } from '../../engine/round.js';
import type { GameState } from '../../engine/state.js';
import { playInteractiveGame } from '../play/session.js';
import { createTraceMeta, TraceWriter } from '../../trace/trace.js';
import type { RendererVerbosity } from '../../adapters/interactiveRenderer.js';
import { DEFAULT_PLAYBACK_DELAY_MS } from '../../playback.js';

type PlayOptions = {
  seed: string;
  players?: string;
  autoplay?: boolean;
  ui?: string;
  trace?: string;
  traceSnapshots?: boolean;
  traceTopCards?: boolean;
  verbosity?: RendererVerbosity | string;
  speed?: number;
  delayMs?: number;
  pauseOnWar?: boolean;
  stateHash?: string;
};

export const createPlayCommand = (): Command => {
  const command = new Command('play')
    .description('Interactive War game (supports 2-4 players).')
    .option('--seed <seed>', 'Seed for deterministic play.', 'interactive')
    .option('--players <names>', 'Comma-separated player names (2-4 players).')
    .option('--autoplay', 'Start the game in autoplay mode.')
    .option('--ui <mode>', 'UI mode to use (ink | prompt).', 'ink')
    .option('--trace <file>', 'Write a JSONL trace for the game.')
    .option('--trace-snapshots', 'Include per-round snapshots in trace output.')
    .option('--trace-top-cards', 'Include top-card details when snapshots are enabled.')
    .option('--verbosity <level>', 'Output verbosity (low|normal|high).', 'normal')
    .option('--state-hash <mode>', 'State hash mode: off|counts|full.', 'off')
    .option(
      '--speed <multiplier>',
      'Autoplay speed multiplier (higher is faster).',
      (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new InvalidArgumentError('--speed must be a positive number.');
        }
        return parsed;
      },
      1,
    )
    .option(
      '--delay-ms <ms>',
      'Delay between autoplay bursts in milliseconds (before applying speed).',
      (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new InvalidArgumentError('--delay-ms must be a non-negative integer.');
        }
        return parsed;
      },
      DEFAULT_PLAYBACK_DELAY_MS,
    )
    .option('--pause-on-war', 'Pause autoplay when a war starts.')
    .action(async (options: PlayOptions) => {
      const ui = (options.ui ?? 'ink').toLowerCase();
      if (ui !== 'prompt' && ui !== 'ink') {
        command.error('Invalid UI mode. Use "ink" (default) or "prompt".');
      }

      if (options.traceTopCards && !options.traceSnapshots) {
        command.error('--trace-top-cards requires --trace-snapshots.');
      }

      const verbosity = (options.verbosity ?? 'normal').toLowerCase();
      if (verbosity !== 'low' && verbosity !== 'normal' && verbosity !== 'high') {
        command.error('--verbosity must be one of: low, normal, high.');
      }

      let playerNames: string[] | undefined;
      if (options.players) {
        playerNames = options.players
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name.length > 0);
        if (playerNames.length < 2 || playerNames.length > 4) {
          command.error('--players requires between 2 and 4 player names.');
        }
      }

      const speed = options.speed ?? 1;
      const delayMs = options.delayMs ?? DEFAULT_PLAYBACK_DELAY_MS;
      const pauseOnWar = Boolean(options.pauseOnWar);
      const stateHashInput = (options.stateHash ?? 'off').toLowerCase();
      if (stateHashInput !== 'off' && stateHashInput !== 'counts' && stateHashInput !== 'full') {
        command.error('--state-hash must be one of: off, counts, full.');
      }
      const stateHashMode = stateHashInput as StateHashMode;

      const traceCliArgs = {
        command: 'play',
        seed: options.seed,
        players: playerNames ?? undefined,
        ui,
        autoplay: Boolean(options.autoplay),
        traceSnapshots: options.traceSnapshots,
        traceTopCards: options.traceTopCards,
        verbosity,
        speed,
        delayMs,
        pauseOnWar,
        stateHashMode,
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
                stateHashMode,
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
          playerNames: playerNames ?? undefined,
          startAutoplay: Boolean(options.autoplay),
          onGameStart,
          onRoundComplete,
          verbosity: verbosity as RendererVerbosity,
          speed,
          delayMs,
          pauseOnWar,
          stateHashMode,
        });
        return;
      }

      await playInteractiveGame({
        seed: options.seed,
        playerNames: playerNames ?? undefined,
        startAutoplay: Boolean(options.autoplay),
        onGameStart,
        onRoundComplete,
        verbosity: verbosity as RendererVerbosity,
        speed,
        delayMs,
        pauseOnWar,
        stateHashMode,
      });
    });

  return command;
};
