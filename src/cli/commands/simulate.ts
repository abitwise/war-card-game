import { Command, InvalidArgumentError } from 'commander';
import { runGame } from '../../engine/game.js';

type SimulateOptions = {
  games: number;
  seed: string;
  json?: boolean;
  csv?: boolean;
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

export const runSimulations = (options: { games: number; seedBase: string }): SimulationSummary => {
  const runs: SimulationRun[] = [];
  let totalRounds = 0;
  let totalWars = 0;
  let timeouts = 0;
  let stalemates = 0;
  let players: string[] = [];
  const wins: Record<string, number> = {};

  for (let i = 0; i < options.games; i += 1) {
    const seed = `${options.seedBase}-${i + 1}`;
    const result = runGame({ seed });
    if (players.length === 0) {
      players = result.state.players.map((player) => player.name);
      players.forEach((name) => {
        wins[name] = 0;
      });
    }

    const roundsPlayed = Math.max(result.state.round - 1, 0);
    totalRounds += roundsPlayed;
    totalWars += result.state.stats.wars;

    const endingReasons = endingFromEvents(result.events);
    const reason = determineEndingReason(endingReasons, result.state.winner);
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
    .action((options: SimulateOptions) => {
      if (options.json && options.csv) {
        command.error('Cannot use --json and --csv together.');
      }

      const summary = runSimulations({ games: options.games, seedBase: options.seed });

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
