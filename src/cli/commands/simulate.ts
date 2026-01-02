import { Command } from 'commander';

type SimulateOptions = {
  games?: string;
};

export const createSimulateCommand = (): Command => {
  return new Command('simulate')
    .description('Run War game simulations.')
    .option('--games <count>', 'Number of games to simulate (placeholder).', '1')
    .action((options: SimulateOptions) => {
      const requestedGames = Number.parseInt(options.games ?? '1', 10);
      const games = Number.isNaN(requestedGames) ? 1 : requestedGames;

      // Placeholder implementation until P1-5.
      console.log(`Simulating ${games} game(s)... (not implemented yet)`);
    });
};
