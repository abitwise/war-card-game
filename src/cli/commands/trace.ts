import { Command, InvalidArgumentError } from 'commander';
import type { TraceVerbosity, TraceViewFilter } from '../../trace/replay.js';
import { replayTrace, viewTrace } from '../../trace/replay.js';

const parseRoundNumber = (label: string) => (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError(`${label} must be a positive integer.`);
  }
  return parsed;
};

const parseDelay = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new InvalidArgumentError('--speed must be a non-negative integer (milliseconds).');
  }
  return parsed;
};

const ensureRoundRange = (from?: number, to?: number) => {
  if (from !== undefined && to !== undefined && from > to) {
    throw new InvalidArgumentError('--from must be less than or equal to --to.');
  }
};

const normalizeVerbosity = (value: string | undefined): TraceVerbosity => {
  const level = (value ?? 'normal').toLowerCase();
  if (level !== 'low' && level !== 'normal' && level !== 'high') {
    throw new InvalidArgumentError('--verbosity must be one of: low, normal, high.');
  }
  return level;
};

const normalizeFilter = (value: string | undefined): TraceViewFilter => {
  const filter = (value ?? 'all').toLowerCase();
  if (filter !== 'all' && filter !== 'wars' && filter !== 'wins' && filter !== 'recycles') {
    throw new InvalidArgumentError('--only must be one of: all, wars, wins, recycles.');
  }
  return filter;
};

export const createTraceCommand = (): Command => {
  const command = new Command('trace').description('Trace utilities: view and replay recorded games.');

  command
    .command('view')
    .description('Render a human-readable summary of a trace file.')
    .argument('<file>', 'Trace file to read.')
    .option('--from <round>', 'First round to display (inclusive).', parseRoundNumber('--from'))
    .option('--to <round>', 'Last round to display (inclusive).', parseRoundNumber('--to'))
    .option('--only <filter>', 'Filter events to show (all|wars|wins|recycles).', 'all')
    .action(async (file: string, options: { from?: number; to?: number; only?: string }) => {
      ensureRoundRange(options.from, options.to);
      const filter = normalizeFilter(options.only);
      await viewTrace(file, { from: options.from, to: options.to, only: filter });
    });

  command
    .command('replay')
    .description('Replay a trace file, optionally verifying it against the engine.')
    .argument('<file>', 'Trace file to replay.')
    .option('--from <round>', 'First round to display (inclusive).', parseRoundNumber('--from'))
    .option('--to <round>', 'Last round to display (inclusive).', parseRoundNumber('--to'))
    .option('--verbosity <level>', 'Output verbosity (low|normal|high).', 'normal')
    .option('--speed <ms>', 'Delay in milliseconds between rounds.', parseDelay, 0)
    .option('--pause-on-war', 'Pause playback when a war starts until Enter is pressed.')
    .option('--verify', 'Re-run the engine using the trace metadata and verify event parity.')
    .action(
      async (
        file: string,
        options: {
          from?: number;
          to?: number;
          verbosity?: string;
          speed?: number;
          pauseOnWar?: boolean;
          verify?: boolean;
        },
      ) => {
        ensureRoundRange(options.from, options.to);
        const verbosity = normalizeVerbosity(options.verbosity);
        await replayTrace(file, {
          from: options.from,
          to: options.to,
          verbosity,
          speedMs: options.speed,
          pauseOnWar: Boolean(options.pauseOnWar),
          verify: Boolean(options.verify),
        });
      },
    );

  return command;
};
