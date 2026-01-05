import { Command, InvalidArgumentError } from 'commander';
import { dirname, extname, basename, join } from 'node:path';
import type { StateHashMode } from '../../engine/hash.js';
import { runGame } from '../../engine/game.js';
import { createSeededRng } from '../../engine/rng.js';
import type { RoundResult } from '../../engine/round.js';
import type { GameState, PlayerState } from '../../engine/state.js';
import { createTraceMeta, TraceWriter } from '../../trace/trace.js';

type TraceMode = 'single' | 'sampled';

type SimulateOptions = {
  games: number;
  seed: string;
  players?: number;
  json?: boolean;
  csv?: boolean;
  hist?: boolean;
  md?: boolean;
  trace?: string;
  traceMode?: TraceMode;
  traceSampleRate?: number;
  traceGameIndex?: number;
  traceSnapshots?: boolean;
  traceTopCards?: boolean;
  stateHash?: string;
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
  maxWarDepth: number;
  recycles: number;
  leadChanges: number;
  biggestSwing: number;
  reason: 'win' | 'timeout' | 'stalemate';
};

type Percentiles = {
  p50: number;
  p90: number;
  p99: number;
};

type HistogramBin = {
  from: number;
  to: number;
  count: number;
};

type ExtremeGame = {
  gameNumber: number;
  seed: string;
  rounds: number;
  reason: SimulationRun['reason'];
  winner?: string;
};

type ExtremeWar = {
  depth: number;
  gameNumber: number;
  seed: string;
  round: number;
};

type ExtremeSwing = {
  swing: number;
  gameNumber: number;
  seed: string;
  round: number;
};

type InterestingMoments = {
  longestGames: ExtremeGame[];
  deepestWars: ExtremeWar[];
  biggestSwings: ExtremeSwing[];
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
  percentiles: {
    rounds: Percentiles;
  };
  warDepthDistribution: Record<number, number>;
  interesting: InterestingMoments;
  histograms: {
    rounds: HistogramBin[];
    wars: HistogramBin[];
  };
  totals: {
    recycles: number;
    leadChanges: number;
  };
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

const parsePlayerCount = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 4) {
    throw new InvalidArgumentError('--players must be an integer between 2 and 4.');
  }
  return parsed;
};

const totalCardsForPlayer = (player: PlayerState): number => player.drawPile.length + player.wonPile.length;

const totalsForPlayers = (state: GameState): number[] => state.players.map((player) => totalCardsForPlayer(player));

const leaderFromTotals = (totals: number[]): number | undefined => {
  if (totals.length === 0) return undefined;
  const max = Math.max(...totals);
  const leaders = totals
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value === max)
    .map((entry) => entry.index);
  return leaders.length === 1 ? leaders[0] : undefined;
};

const spreadFromTotals = (totals: number[]): number => {
  if (totals.length === 0) return 0;
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  return max - min;
};

const resolveRoundNumber = (result: RoundResult): number => {
  const roundEvent = result.events.find((event) => event.type === 'RoundStarted');
  if (roundEvent && roundEvent.type === 'RoundStarted') {
    return roundEvent.round;
  }
  return result.state.round;
};

type RunMetricsTracker = {
  maxWarDepth: number;
  recycles: number;
  leadChanges: number;
  biggestSwing: number;
  biggestSwingRound?: number;
  warDepthCounts: Record<number, number>;
  lastSpread: number;
  lastLeader?: number;
};

const createRunMetricsTracker = (initialState: GameState): RunMetricsTracker => {
  const totals = totalsForPlayers(initialState);
  return {
    maxWarDepth: 0,
    recycles: 0,
    leadChanges: 0,
    biggestSwing: 0,
    biggestSwingRound: undefined,
    warDepthCounts: {},
    lastSpread: spreadFromTotals(totals),
    lastLeader: leaderFromTotals(totals),
  };
};

const updateRunMetrics = (tracker: RunMetricsTracker, result: RoundResult) => {
  const round = resolveRoundNumber(result);
  let roundMaxWarDepth = 0;

  result.events.forEach((event) => {
    if (event.type === 'WarStarted') {
      tracker.warDepthCounts[event.warLevel] = (tracker.warDepthCounts[event.warLevel] ?? 0) + 1;
      roundMaxWarDepth = Math.max(roundMaxWarDepth, event.warLevel);
      tracker.maxWarDepth = Math.max(tracker.maxWarDepth, event.warLevel);
    }
    if (event.type === 'PileRecycled') {
      tracker.recycles += 1;
    }
  });

  const totals = totalsForPlayers(result.state);
  const spread = spreadFromTotals(totals);
  const swing = Math.abs(spread - tracker.lastSpread);
  if (swing > tracker.biggestSwing) {
    tracker.biggestSwing = swing;
    tracker.biggestSwingRound = round;
  }

  const leader = leaderFromTotals(totals);
  if (leader !== undefined && tracker.lastLeader !== undefined && leader !== tracker.lastLeader) {
    tracker.leadChanges += 1;
  }
  if (leader !== undefined) {
    tracker.lastLeader = leader;
  }

  tracker.lastSpread = spread;

  return { round, roundMaxWarDepth };
};

const mergeCounts = (target: Record<number, number>, source: Record<number, number>) => {
  Object.entries(source).forEach(([key, value]) => {
    const depth = Number.parseInt(key, 10);
    target[depth] = (target[depth] ?? 0) + value;
  });
};

const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (upper === lower) {
    return sorted[lower];
  }
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
};

const calculatePercentiles = (values: number[]): Percentiles => ({
  p50: calculatePercentile(values, 50),
  p90: calculatePercentile(values, 90),
  p99: calculatePercentile(values, 99),
});

const buildHistogram = (values: number[], binCount = 10): HistogramBin[] => {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ from: min, to: max, count: values.length }];
  }

  const width = Math.max(1, Math.ceil((max - min + 1) / binCount));
  const bins: HistogramBin[] = [];
  for (let start = min; start <= max; start += width) {
    const end = Math.min(start + width - 1, max);
    bins.push({ from: start, to: end, count: 0 });
  }

  values.forEach((value) => {
    const index = Math.min(bins.length - 1, Math.floor((value - min) / width));
    bins[index].count += 1;
  });

  return bins;
};

const renderHistogram = (label: string, bins: HistogramBin[]): string[] => {
  if (bins.length === 0) {
    return [`${label}: (no data)`];
  }

  const maxCount = Math.max(...bins.map((bin) => bin.count));
  const maxBar = 30;

  return [
    `${label}:`,
    ...bins.map((bin) => {
      const barLength = maxCount > 0 ? Math.max(1, Math.round((bin.count / maxCount) * maxBar)) : 1;
      const rangeLabel = bin.from === bin.to ? `${bin.from}` : `${bin.from}-${bin.to}`;
      return `${rangeLabel.padEnd(10)} | ${'#'.repeat(barLength)} (${bin.count})`;
    }),
  ];
};

const updateTopList = <T>(list: T[], entry: T, compare: (a: T, b: T) => number, limit: number) => {
  list.push(entry);
  list.sort(compare);
  while (list.length > limit) {
    list.pop();
  }
};

const INTERESTING_TOP_N = 3;

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
  stateHashMode?: StateHashMode;
  playerCount?: number;
}): SimulationSummary => {
  const playerCount = options.playerCount ?? 2;
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    throw new Error('Simulations support between 2 and 4 players.');
  }
  const defaultPlayerNames = Array.from({ length: playerCount }, (_, index) => `Player ${index + 1}`);
  const runs: SimulationRun[] = [];
  let totalRounds = 0;
  let totalWars = 0;
  let totalRecycles = 0;
  let totalLeadChanges = 0;
  let timeouts = 0;
  let stalemates = 0;
  let players: string[] = [...defaultPlayerNames];
  const wins: Record<string, number> = {};
  players.forEach((name) => {
    wins[name] = 0;
  });
  const warDepthDistribution: Record<number, number> = {};
  const interesting: InterestingMoments = { longestGames: [], deepestWars: [], biggestSwings: [] };
  const traceSampler =
    options.trace?.mode === 'sampled' ? createSeededRng(`${options.seedBase}-trace-sampler`) : undefined;
  const compareLongestGames = (a: ExtremeGame, b: ExtremeGame) =>
    b.rounds - a.rounds || a.gameNumber - b.gameNumber;
  const compareDeepestWars = (a: ExtremeWar, b: ExtremeWar) =>
    b.depth - a.depth || a.gameNumber - b.gameNumber || a.round - b.round;
  const compareBiggestSwings = (a: ExtremeSwing, b: ExtremeSwing) =>
    b.swing - a.swing || a.gameNumber - b.gameNumber || a.round - b.round;

  for (let i = 0; i < options.games; i += 1) {
    const seed = `${options.seedBase}-${i + 1}`;
    const traceConfig = options.trace;
    const traceThisGame = traceConfig ? shouldTraceGame(i, traceConfig, traceSampler) : false;
    const cliArgs = {
      command: 'simulate',
      games: options.games,
      seedBase: options.seedBase,
      players: playerCount,
      traceMode: traceConfig?.mode,
      traceSampleRate: traceConfig?.sampleRate,
      traceGameIndex: traceConfig?.gameIndex,
      traceSnapshots: traceConfig?.includeSnapshots,
      traceTopCards: traceConfig?.includeTopCards,
      stateHashMode: options.stateHashMode ?? 'off',
    };

    let writer: TraceWriter | undefined;
    let runTracker: RunMetricsTracker | undefined;
    const endingReasons: SimulationRun['reason'][] = [];
    const onGameStart = (state: GameState) => {
      runTracker = createRunMetricsTracker(state);
      if (traceThisGame) {
        // traceConfig is guaranteed to be defined when traceThisGame is true
        const config = traceConfig!;
        const meta = createTraceMeta({
          seed,
          state,
          cliArgs: { ...cliArgs, gameIndex: i + 1 },
          stateHashMode: options.stateHashMode,
        });
        // In sampled mode, append game index to filename to avoid multiple meta records in one file
        let traceFilePath = config.filePath;
        if (config.mode === 'sampled') {
          const ext = extname(traceFilePath);
          const base = basename(traceFilePath, ext);
          const dir = dirname(traceFilePath);
          traceFilePath = join(dir, `${base}-game${i + 1}${ext}`);
        }
        writer = new TraceWriter(
          {
            filePath: traceFilePath,
            includeSnapshots: config.includeSnapshots,
            includeTopCards: config.includeTopCards,
          },
          meta,
        );
      }
    };
    const result = runGame({
      seed,
      onGameStart,
      onRound: (roundResult: RoundResult) => {
        endingReasons.push(...endingFromEvents(roundResult.events));
        if (!runTracker) {
          runTracker = createRunMetricsTracker(roundResult.state);
        }
        const { round, roundMaxWarDepth } = updateRunMetrics(runTracker, roundResult);
        if (roundMaxWarDepth > 0) {
          updateTopList(
            interesting.deepestWars,
            { depth: roundMaxWarDepth, gameNumber: i + 1, seed, round },
            compareDeepestWars,
            INTERESTING_TOP_N,
          );
        }
        writer?.recordRound(roundResult);
      },
      collectEvents: !traceThisGame,
      stateHashMode: options.stateHashMode,
      playerNames: defaultPlayerNames,
    });
    runTracker = runTracker ?? createRunMetricsTracker(result.state);

    players = result.state.players.map((player) => player.name);
    players.forEach((name) => {
      wins[name] = wins[name] ?? 0;
    });

    const roundsPlayed = Math.max(result.state.round - 1, 0);
    totalRounds += roundsPlayed;
    totalWars += result.state.stats.wars;
    totalRecycles += runTracker.recycles;
    totalLeadChanges += runTracker.leadChanges;
    mergeCounts(warDepthDistribution, runTracker.warDepthCounts);

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
      maxWarDepth: runTracker.maxWarDepth,
      recycles: runTracker.recycles,
      leadChanges: runTracker.leadChanges,
      biggestSwing: runTracker.biggestSwing,
      reason,
    });

    updateTopList(
      interesting.longestGames,
      { gameNumber: i + 1, seed, rounds: roundsPlayed, reason, winner: winnerName },
      compareLongestGames,
      INTERESTING_TOP_N,
    );
    if (runTracker.biggestSwing > 0) {
      updateTopList(
        interesting.biggestSwings,
        {
          swing: runTracker.biggestSwing,
          gameNumber: i + 1,
          seed,
          round: runTracker.biggestSwingRound ?? Math.max(result.state.round - 1, 1),
        },
        compareBiggestSwings,
        INTERESTING_TOP_N,
      );
    }
  }

  const averageRounds = options.games > 0 ? totalRounds / options.games : 0;
  const averageWars = options.games > 0 ? totalWars / options.games : 0;
  const roundCounts = runs.map((run) => run.rounds);
  const warCounts = runs.map((run) => run.wars);
  const percentiles = { rounds: calculatePercentiles(roundCounts) };
  const histograms = { rounds: buildHistogram(roundCounts), wars: buildHistogram(warCounts) };

  return {
    seedBase: options.seedBase,
    games: options.games,
    players,
    wins,
    timeouts,
    stalemates,
    averageRounds,
    averageWars,
    percentiles,
    warDepthDistribution,
    interesting,
    histograms,
    totals: {
      recycles: totalRecycles,
      leadChanges: totalLeadChanges,
    },
    runs,
  };
};

const formatWarDepthDistribution = (distribution: Record<number, number>): string =>
  Object.keys(distribution).length === 0
    ? 'None'
    : Object.entries(distribution)
        .sort(([a], [b]) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
        .map(([depth, count]) => `depth ${depth}: ${count}`)
        .join(', ');

const formatExtremeGame = (game: ExtremeGame): string => {
  const winner = game.winner ? `, winner ${game.winner}` : '';
  return `Game #${game.gameNumber} (${game.seed}): ${game.rounds} rounds (${game.reason}${winner})`;
};

const formatExtremeWar = (war: ExtremeWar): string =>
  `Game #${war.gameNumber} (${war.seed}) round ${war.round}: depth ${war.depth}`;

const formatExtremeSwing = (swing: ExtremeSwing): string =>
  `Game #${swing.gameNumber} (${swing.seed}) round ${swing.round}: swing ${swing.swing} cards`;

const renderInterestingText = <T>(
  label: string,
  items: T[],
  formatter: (value: T) => string,
  indent = '  ',
) => {
  if (items.length === 0) {
    console.log(`${indent}- ${label}: none`);
    return;
  }
  console.log(`${indent}- ${label}:`);
  items.forEach((item, index) => {
    console.log(`${indent}  ${index + 1}. ${formatter(item)}`);
  });
};

const renderTextSummary = (summary: SimulationSummary, options?: { hist?: boolean }) => {
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
  console.log(`- Recycles: ${(summary.totals.recycles / summary.games).toFixed(2)}`);
  console.log(`- Lead changes: ${(summary.totals.leadChanges / summary.games).toFixed(2)}`);
  console.log('');
  console.log(
    `Rounds percentiles (p50/p90/p99): ${summary.percentiles.rounds.p50.toFixed(2)} / ${summary.percentiles.rounds.p90.toFixed(2)} / ${summary.percentiles.rounds.p99.toFixed(2)}`,
  );
  console.log(`War depth distribution: ${formatWarDepthDistribution(summary.warDepthDistribution)}`);
  console.log('');
  console.log('Interesting moments:');
  renderInterestingText('Longest games', summary.interesting.longestGames, formatExtremeGame);
  renderInterestingText('Deepest wars', summary.interesting.deepestWars, formatExtremeWar);
  renderInterestingText('Biggest swings', summary.interesting.biggestSwings, formatExtremeSwing);

  if (options?.hist) {
    console.log('');
    renderHistogram('Rounds per game', summary.histograms.rounds).forEach((line) => console.log(line));
    console.log('');
    renderHistogram('Wars per game', summary.histograms.wars).forEach((line) => console.log(line));
  }
};

const renderMarkdownSummary = (summary: SimulationSummary, includeHist: boolean): string => {
  const lines: string[] = [
    '| Metric | Value |',
    '| --- | --- |',
    `| Games | ${summary.games} |`,
    `| Seed Base | ${summary.seedBase} |`,
    `| Average Rounds | ${summary.averageRounds.toFixed(2)} |`,
    `| Average Wars | ${summary.averageWars.toFixed(2)} |`,
    `| Rounds p50/p90/p99 | ${summary.percentiles.rounds.p50.toFixed(2)} / ${summary.percentiles.rounds.p90.toFixed(2)} / ${summary.percentiles.rounds.p99.toFixed(2)} |`,
    `| War Depth Distribution | ${formatWarDepthDistribution(summary.warDepthDistribution)} |`,
    `| Recycles (total) | ${summary.totals.recycles} |`,
    `| Lead Changes (total) | ${summary.totals.leadChanges} |`,
    `| Timeouts | ${summary.timeouts} |`,
    `| Stalemates | ${summary.stalemates} |`,
  ];

  lines.push('\n### Interesting Moments\n');
  lines.push('| Type | Details |');
  lines.push('| --- | --- |');
  lines.push(
    `| Longest Games | ${summary.interesting.longestGames.map(formatExtremeGame).join('<br>') || 'none'} |`,
  );
  lines.push(`| Deepest Wars | ${summary.interesting.deepestWars.map(formatExtremeWar).join('<br>') || 'none'} |`);
  lines.push(`| Biggest Swings | ${summary.interesting.biggestSwings.map(formatExtremeSwing).join('<br>') || 'none'} |`);

  if (includeHist) {
    const roundHist = renderHistogram('Rounds per game', summary.histograms.rounds)
      .map((line) => line.replace(' | ', ' │ '))
      .join('\n');
    const warHist = renderHistogram('Wars per game', summary.histograms.wars)
      .map((line) => line.replace(' | ', ' │ '))
      .join('\n');
    lines.push('\n```\n' + roundHist + '\n' + warHist + '\n```');
  }

  return lines.join('\n');
};

const renderCsv = (summary: SimulationSummary): string => {
  const winEntries = summary.players.map((player) => [`wins.${player}`, `${summary.wins[player] ?? 0}`]);
  const warDepthEntries = Object.entries(summary.warDepthDistribution)
    .sort(([a], [b]) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
    .map(([depth, count]) => [`warDepth.depth${depth}`, `${count}`]);
  const longestEntries = summary.interesting.longestGames.map((game, index) => [
    `interesting.longest.${index + 1}`,
    formatExtremeGame(game),
  ]);
  const deepestEntries = summary.interesting.deepestWars.map((war, index) => [
    `interesting.deepest.${index + 1}`,
    formatExtremeWar(war),
  ]);
  const swingEntries = summary.interesting.biggestSwings.map((swing, index) => [
    `interesting.swing.${index + 1}`,
    formatExtremeSwing(swing),
  ]);
  const histogramRoundsEntries = summary.histograms.rounds.map((bin) => [
    `hist.rounds.${bin.from}-${bin.to}`,
    `${bin.count}`,
  ]);
  const histogramWarsEntries = summary.histograms.wars.map((bin) => [`hist.wars.${bin.from}-${bin.to}`, `${bin.count}`]);

  const lines: string[][] = [
    ['metric', 'value'],
    ['games', `${summary.games}`],
    ['seedBase', summary.seedBase],
    ...winEntries,
    ['timeouts', `${summary.timeouts}`],
    ['stalemates', `${summary.stalemates}`],
    ['averageRounds', summary.averageRounds.toFixed(2)],
    ['averageWars', summary.averageWars.toFixed(2)],
    ['percentiles.rounds.p50', summary.percentiles.rounds.p50.toFixed(2)],
    ['percentiles.rounds.p90', summary.percentiles.rounds.p90.toFixed(2)],
    ['percentiles.rounds.p99', summary.percentiles.rounds.p99.toFixed(2)],
    ['totals.recycles', `${summary.totals.recycles}`],
    ['totals.leadChanges', `${summary.totals.leadChanges}`],
    ...warDepthEntries,
    ...longestEntries,
    ...deepestEntries,
    ...swingEntries,
    ...histogramRoundsEntries,
    ...histogramWarsEntries,
  ];

  return lines.map((line) => line.join(',')).join('\n');
};

export const createSimulateCommand = (): Command => {
  const command = new Command('simulate')
    .description('Run War game simulations.')
    .option('--games <count>', 'Number of games to simulate.', parseGameCount, 1)
    .option('--seed <seed>', 'Base seed used to derive per-game seeds.', 'base')
    .option('--players <count>', 'Number of players (2-4).', parsePlayerCount, 2)
    .option('--json', 'Output results as JSON.')
    .option('--csv', 'Output results as CSV.')
    .option('--md', 'Output results as Markdown tables.')
    .option('--hist', 'Print ASCII histograms for rounds and wars per game.')
    .option('--trace <file>', 'Write a JSONL trace file for simulated games.')
    .option('--trace-mode <mode>', 'Trace mode: single (default) or sampled.', 'single')
    .option('--trace-sample-rate <rate>', 'Sample rate for tracing games when using sampled mode.', parseSampleRate)
    .option('--trace-game-index <index>', 'Game index to trace in single mode (1-based).', parseGameIndex)
    .option('--trace-snapshots', 'Include per-round snapshots in the trace.')
    .option('--trace-top-cards', 'Include top-card details when snapshots are enabled.')
    .option('--state-hash <mode>', 'State hash mode: off|counts|full.', 'off')
    .action((options: SimulateOptions) => {
      if (options.json && options.csv) {
        command.error('Cannot use --json and --csv together.');
      }
      if (options.md && (options.json || options.csv)) {
        command.error('--md cannot be combined with --json or --csv.');
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

      const stateHashInput = (options.stateHash ?? 'off').toLowerCase();
      if (stateHashInput !== 'off' && stateHashInput !== 'counts' && stateHashInput !== 'full') {
        command.error('--state-hash must be one of: off, counts, full.');
      }
      const stateHashMode = stateHashInput as StateHashMode;

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

      const playerCount = options.players ?? 2;

      const summary = runSimulations({
        games: options.games,
        seedBase: options.seed,
        trace: traceConfig,
        stateHashMode,
        playerCount,
      });

      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      if (options.csv) {
        console.log(renderCsv(summary));
        return;
      }

      if (options.md) {
        console.log(renderMarkdownSummary(summary, Boolean(options.hist)));
        return;
      }

      renderTextSummary(summary, { hist: Boolean(options.hist) });
    });

  return command;
};
