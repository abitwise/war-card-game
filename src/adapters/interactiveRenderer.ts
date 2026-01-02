import chalk from 'chalk';
import type { Card } from '../engine/cards.js';
import type { RoundEvent } from '../engine/round.js';
import type { GameState, TableCard } from '../engine/state.js';

type Output = (line: string) => void;

const rankLabel = (rank: Card['rank']): string => {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return `${rank}`;
};

const colorSuit = (suit: Card['suit']): string => {
  if (suit === '♥' || suit === '♦') {
    return chalk.red(suit);
  }
  return chalk.blueBright(suit);
};

export const formatCard = (card: Card): string => `${rankLabel(card.rank)}${colorSuit(card.suit)}`;

export const formatTableCard = (entry: TableCard): string => (entry.faceDown ? chalk.gray('??') : formatCard(entry.card));

const playerName = (state: GameState, playerId: number): string => state.players[playerId]?.name ?? `Player ${playerId + 1}`;

const renderCardsPlaced = (state: GameState, cards: TableCard[], output: Output) => {
  const grouped = cards.reduce<Record<number, TableCard[]>>((acc, entry) => {
    const bucket = acc[entry.playerId] ?? [];
    bucket.push(entry);
    acc[entry.playerId] = bucket;
    return acc;
  }, {});

  Object.entries(grouped).forEach(([id, entries]) => {
    const name = playerName(state, Number.parseInt(id, 10));
    const formatted = entries.map((entry) => formatTableCard(entry)).join(', ');
    output(`${name} played: ${formatted}`);
  });
};

export const renderRoundEvents = (events: RoundEvent[], state: GameState, output: Output = console.log) => {
  events.forEach((event) => {
    switch (event.type) {
      case 'RoundStarted':
        output('');
        output(chalk.bold(`Round ${event.round}`));
        break;
      case 'PileRecycled': {
        const name = playerName(state, event.playerId);
        const action = event.shuffled ? 'shuffled' : 'recycled';
        output(`${name} ${action} ${event.cards} card(s) from the won pile.`);
        break;
      }
      case 'WarStarted':
        output(chalk.redBright(`WAR! (level ${event.warLevel})`));
        break;
      case 'CardsPlaced':
        renderCardsPlaced(state, event.cards, output);
        break;
      case 'TrickWon': {
        const winner = playerName(state, event.winner);
        output(`${winner} wins the trick and collects ${event.collected.length} card(s).`);
        break;
      }
      case 'GameEnded': {
        const winner = event.winner !== undefined ? playerName(state, event.winner) : undefined;
        if (event.reason === 'win' && winner) {
          output(chalk.greenBright(`${winner} wins the game!`));
        } else if (event.reason === 'timeout') {
          output(chalk.yellow('Game ended due to max rounds timeout.'));
        } else {
          output(chalk.yellow('Game ended in a stalemate.'));
        }
        break;
      }
      default:
        break;
    }
  });
};

export const renderStats = (state: GameState, output: Output = console.log) => {
  output('');
  output(chalk.cyanBright(`Round: ${state.round}`));
  output(chalk.cyanBright(`Wars: ${state.stats.wars} | Flips: ${state.stats.flips}`));
  state.players.forEach((player) => {
    output(
      `${player.name}: draw pile ${player.drawPile.length}, won pile ${player.wonPile.length}, total ${
        player.drawPile.length + player.wonPile.length
      }`,
    );
  });
};

export const renderHelp = (autoplay: boolean, output: Output = console.log) => {
  output('');
  output('Controls:');
  output('- Enter: play next round');
  output(`- a: toggle autoplay (${autoplay ? 'on' : 'off'})`);
  output('- s: show stats');
  output('- q: quit');
  output('- ?: help');
};

export const renderIntro = (seed: string, state: GameState, output: Output = console.log, autoplay = false) => {
  output(chalk.magentaBright(`Starting War (seed: ${seed})`));
  output(`Players: ${state.players.map((player) => player.name).join(' vs ')}`);
  renderHelp(autoplay, output);
};
