import { Command, InvalidArgumentError } from 'commander';
import { runGame } from '../../engine/game.js';
import { createSeededRng } from '../../engine/rng.js';
import type { RoundResult } from '../../engine/round.js';
import type { GameState } from '../../engine/state.js';
import { createTraceMeta, TraceWriter } from '../../trace/trace.js';

type TraceMode = 'single' | 'sampled';

type SimulateOptions = {
  games: number;
  seed: string;
  json?: boolean;
  csv?: boolean;
  trace?: string;
  traceMode?: TraceMode;
  traceSampleRate?: number;
  traceGameIndex?: number;
  traceSnapshots?: boolean;
  traceTopCards?: boolean;
};

type SimulationTraceConfig = {
  filePath: string;
  mode: TraceMode;
  sampleRate?: number;
  gameIndex?: number;
  includeSnapshots?: boolean;
  includeTopCards?: boolean;
};

export type SimulationRun = {
  seed: string;
  winner?: string;
  rounds: number;
  wars: number;
  reason: 'win' | 'timeout' | 'stalemate';
};

export type SimulationSummary = {
  seedBase: string;
  games: number;
  players: string[];
  wins: Record<string, number>;
  timeouts: number;
  stalemates: number;
  averageRounds: number;
  averageWars: number;
  runs: SimulationRun[];
};

const parseGameCount = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('--games must be a positive integer');
  }
  return parsed;
};

const parseSampleRate = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new InvalidArgumentError('--trace-sample-rate must be a number between 0 and 1 (inclusive)');
  }
  return parsed;
};

const parseGameIndex = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('--trace-game-index must be a positive integer');
  }
  return parsed;
};

const endingFromEvents = (events: { type: string; reason?: SimulationRun['reason'] }[]): SimulationRun['reason'][] =>
  events
    .filter(
      (event): event is { type: 'GameEnded'; reason: SimulationRun['reason'] } =>
        event.type === 'GameEnded'
    )
    .map((event) => event.reason);

const determineEndingReason = (events: SimulationRun['reason'][], winner?: number): SimulationRun['reason'] => {
  if (events.includes('timeout')) {
    return 'timeout';
  }
  if (events.includes('stalemate')) {
    return 'stalemate';
  }
  if (events.includes('win')) {
    return 'win';
  }
  return winner === undefined ? 'stalemate' : 'win';
};

const shouldTraceGame = (index: number, options: SimulationTraceConfig, sampler?: () => number): boolean => {
  if (options.mode === 'single') {
    const target = options.gameIndex ?? 1;
    return target === index + 1;
  }
  const rate = options.sampleRate ?? 0;
  const roll = sampler ? sampler() : Math.random();
  return roll < rate;
};

export const runSimulations = (options: {
  games: number;
  seedBase: string;
  trace?: SimulationTraceConfig;
}): SimulationSummary => {
  const runs: SimulationRun[] = [];
  let totalRounds = 0;
  let totalWars = 0;
  let timeouts = 0;
  let stalemates = 0;
  let players: string[] = [];
  const wins: Record<string, number> = {};
  const traceSampler =
    options.trace?.mode === 'sampled' ? createSeededRng(`${options.seedBase}-trace-sampler`) : undefined;

  for (let i = 0; i < options.games; i += 1) {
    const seed = `${options.seedBase}-${i + 1}`;
    const traceConfig = options.trace;
    const traceThisGame = traceConfig ? shouldTraceGame(i, traceConfig, traceSampler) : false;
    const cliArgs = {
      command: 'simulate',
      games: options.games,
      seedBase: options.seedBase,
      traceMode: traceConfig?.mode,
      traceSampleRate: traceConfig?.sampleRate,
      traceGameIndex: traceConfig?.gameIndex,
      traceSnapshots: traceConfig?.includeSnapshots,
      traceTopCards: traceConfig?.includeTopCards,
    };

    let writer: TraceWriter | undefined;
    const endingReasons: SimulationRun['reason'][] = [];
    const onGameStart = traceThisGame
      ? (state: GameState) => {
          if (!traceConfig) {
            throw new Error('Trace config is required when tracing is enabled');
          }
          const meta = createTraceMeta({
            seed,
            state,
            cliArgs: { ...cliArgs, gameIndex: i + 1 },
          });
          // In sampled mode, append game index to filename to avoid multiple meta records in one file
          let traceFilePath = traceConfig.filePath;
          if (traceConfig.mode === 'sampled') {
            const lastSlash = Math.max(traceFilePath.lastIndexOf('/'), traceFilePath.lastIndexOf('\\'));
            const lastDot = traceFilePath.lastIndexOf('.');
            // Only split on extension if dot comes after the last path separator and is not the first char
            if (lastDot > lastSlash && lastDot > 0) {
              traceFilePath = `${traceFilePath.slice(0, lastDot)}-game${i + 1}${traceFilePath.slice(lastDot)}`;
            } else {
              traceFilePath = `${traceFilePath}-game${i + 1}`;
            }
          }
          writer = new TraceWriter(
            {
              filePath: traceFilePath,
              includeSnapshots: traceConfig.includeSnapshots,
              includeTopCards: traceConfig.includeTopCards,
            },
            meta,
          );
        }
      : undefined;
    const result = runGame({
      seed,
      onGameStart,
      onRound: (roundResult: RoundResult) => {
        endingReasons.push(...endingFromEvents(roundResult.events));
        writer?.recordRound(roundResult);
      },
      collectEvents: !traceThisGame,
    });
    if (players.length === 0) {
      players = result.state.players.map((player) => player.name);
      players.forEach((name) => {
        wins[name] = 0;
      });
    }

    const roundsPlayed = Math.max(result.state.round - 1, 0);
    totalRounds += roundsPlayed;
    totalWars += result.state.stats.wars;

    const endingReasonsForResult = endingReasons.length > 0 ? endingReasons : endingFromEvents(result.events);
    const reason = determineEndingReason(endingReasonsForResult, result.state.winner);
    if (reason === 'timeout') {
      timeouts += 1;
    } else if (reason === 'stalemate') {
      stalemates += 1;
    }

    const winnerName = result.state.winner !== undefined ? result.state.players[result.state.winner]?.name : undefined;
    if (winnerName) {
      wins[winnerName] = (wins[winnerName] ?? 0) + 1;
    }

    runs.push({
      seed,
      winner: winnerName,
      rounds: roundsPlayed,
      wars: result.state.stats.wars,
      reason,
    });
  }

  const averageRounds = options.games > 0 ? totalRounds / options.games : 0;
  const averageWars = options.games > 0 ? totalWars / options.games : 0;

  return {
    seedBase: options.seedBase,
    games: options.games,
    players,
    wins,
    timeouts,
    stalemates,
    averageRounds,
    averageWars,
    runs,
  };
};

const renderTextSummary = (summary: SimulationSummary) => {
  console.log(`Simulated ${summary.games} game(s) with seed base "${summary.seedBase}".`);
  console.log('');
  console.log('Wins:');
  summary.players.forEach((player) => {
    console.log(`- ${player}: ${summary.wins[player] ?? 0}`);
  });
  console.log(`- Timeouts: ${summary.timeouts}`);
  console.log(`- Stalemates: ${summary.stalemates}`);
  console.log('');
  console.log('Averages per game:');
  console.log(`- Rounds: ${summary.averageRounds.toFixed(2)}`);
  console.log(`- Wars: ${summary.averageWars.toFixed(2)}`);
};

const renderCsv = (summary: SimulationSummary): string => {
  const winEntries = summary.players.map((player) => [`wins.${player}`, `${summary.wins[player] ?? 0}`]);
  const lines: string[][] = [
    ['metric', 'value'],
    ['games', `${summary.games}`],
    ['seedBase', summary.seedBase],
    ...winEntries,
    ['timeouts', `${summary.timeouts}`],
    ['stalemates', `${summary.stalemates}`],
    ['averageRounds', summary.averageRounds.toFixed(2)],
    ['averageWars', summary.averageWars.toFixed(2)],
  ];

  return lines.map((line) => line.join(',')).join('\n');
};

export const createSimulateCommand = (): Command => {
  const command = new Command('simulate')
    .description('Run War game simulations.')
    .option('--games <count>', 'Number of games to simulate.', parseGameCount, 1)
    .option('--seed <seed>', 'Base seed used to derive per-game seeds.', 'base')
    .option('--json', 'Output results as JSON.')
    .option('--csv', 'Output results as CSV.')
    .option('--trace <file>', 'Write a JSONL trace file for simulated games.')
    .option('--trace-mode <mode>', 'Trace mode: single (default) or sampled.', 'single')
    .option('--trace-sample-rate <rate>', 'Sample rate for tracing games when using sampled mode.', parseSampleRate)
    .option('--trace-game-index <index>', 'Game index to trace in single mode (1-based).', parseGameIndex)
    .option('--trace-snapshots', 'Include per-round snapshots in the trace.')
    .option('--trace-top-cards', 'Include top-card details when snapshots are enabled.')
    .action((options: SimulateOptions) => {
      if (options.json && options.csv) {
        command.error('Cannot use --json and --csv together.');
      }

      const traceMode = (options.traceMode ?? 'single').toLowerCase();
      if (traceMode !== 'single' && traceMode !== 'sampled') {
        command.error('Invalid --trace-mode. Use "single" or "sampled".');
      }

      if (!options.trace && (options.traceSampleRate !== undefined || options.traceGameIndex !== undefined)) {
        command.error('Trace sampling options require --trace to be provided.');
      }

      if (options.traceTopCards && !options.traceSnapshots) {
        command.error('--trace-top-cards requires --trace-snapshots.');
      }

      if (traceMode === 'sampled' && options.traceGameIndex !== undefined) {
        command.error('--trace-game-index is only valid for single trace mode.');
      }

      if (traceMode === 'single' && options.traceSampleRate !== undefined) {
        command.error('--trace-sample-rate is only valid for sampled trace mode.');
      }

      if (traceMode === 'sampled' && options.trace && options.traceSampleRate === undefined) {
        command.error('--trace-sample-rate is required when --trace-mode sampled is used.');
      }

      if (options.traceGameIndex !== undefined) {
        if (!Number.isInteger(options.traceGameIndex) || options.traceGameIndex < 1 || options.traceGameIndex > options.games) {
          command.error(`--trace-game-index must be an integer between 1 and ${options.games}.`);
        }
      }

      const traceConfig: SimulationTraceConfig | undefined = options.trace
        ? {
            filePath: options.trace,
            mode: traceMode as TraceMode,
            sampleRate: traceMode === 'sampled' ? options.traceSampleRate : undefined,
            gameIndex: traceMode === 'single' ? options.traceGameIndex : undefined,
            includeSnapshots: Boolean(options.traceSnapshots),
            includeTopCards: Boolean(options.traceTopCards),
          }
        : undefined;

      const summary = runSimulations({ games: options.games, seedBase: options.seed, trace: traceConfig });

      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      if (options.csv) {
        console.log(renderCsv(summary));
        return;
      }

      renderTextSummary(summary);
    });

  return command;
};
