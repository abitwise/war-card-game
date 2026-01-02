import { Command } from 'commander';

export const createPlayCommand = (): Command => {
  return new Command('play')
    .description('Interactive War game (player vs CPU).')
    .action(() => {
      // Placeholder implementation until P1-6.
      console.log('Interactive play is not implemented yet. Stay tuned!');
    });
};
