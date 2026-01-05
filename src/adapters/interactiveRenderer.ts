import chalk from 'chalk';
import type { Card } from '../engine/cards.js';
import type { RoundEvent } from '../engine/round.js';
import type { GameState, TableCard } from '../engine/state.js';

type Output = (line: string) => void;

export type RendererVerbosity = 'low' | 'normal' | 'high';

const FACE_DOWN_SYMBOL = '🂠';

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

export const formatTableCard = (entry: TableCard): string => (entry.faceDown ? chalk.gray(FACE_DOWN_SYMBOL) : formatCard(entry.card));

const playerName = (state: GameState, playerId: number): string => state.players[playerId]?.name ?? `Player ${playerId + 1}`;

const pileSummary = (state: GameState): string => {
  const segments = state.players.map((player) => {
    const total = player.drawPile.length + player.wonPile.length;
    return `${player.name}: draw ${player.drawPile.length}, won ${player.wonPile.length}, total ${total}`;
  });
  return `Piles: ${segments.join(' | ')}`;
};

const extractRoundNumber = (events: RoundEvent[], fallback?: number): number | undefined => {
  const round = events.find((event) => event.type === 'RoundStarted');
  if (round && round.type === 'RoundStarted') {
    return round.round;
  }
  return fallback;
};

const formatCardSequence = (cards: TableCard[], playerId: number): string => {
  const sequence = cards
    .filter((entry) => entry.playerId === playerId)
    .map((entry) => (entry.faceDown ? chalk.gray(FACE_DOWN_SYMBOL) : formatCard(entry.card)));
  return sequence.length > 0 ? sequence.join(', ') : '—';
};

const formatWarSegments = (
  cards: TableCard[],
  warEvents: Extract<RoundEvent, { type: 'WarStarted' }>[],
  state: GameState,
  trick: Extract<RoundEvent, { type: 'TrickWon' }> | undefined,
  verbosity: RendererVerbosity,
): string[] => {
  const lines: string[] = [];
  const players = state.players.map((player) => player.name);
  let cursor = 0;

  const takeIf = (playerId: number, faceDown: boolean): TableCard | undefined => {
    const next = cards[cursor];
    if (next && next.playerId === playerId && next.faceDown === faceDown) {
      cursor += 1;
      return next;
    }
    return undefined;
  };

  const initialA = takeIf(0, false);
  const initialB = takeIf(1, false);
  if (initialA || initialB) {
    const tie =
      initialA && initialB && initialA.card.rank === initialB.card.rank
        ? ` ${chalk.yellow(`(tie on ${rankLabel(initialA.card.rank)})`)}`
        : '';
    const baseLine = [
      'Flip:',
      `${players[0]}: ${initialA ? formatTableCard(initialA) : '—'}`,
      'vs',
      `${players[1]}: ${initialB ? formatTableCard(initialB) : '—'}${tie}`,
    ]
      .filter(Boolean)
      .join(' ');
    lines.push(baseLine);
  }

  let lastTieRank =
    initialA && initialB && initialA.card.rank === initialB.card.rank ? initialA.card.rank : undefined;

  warEvents.forEach((event, index) => {
    lines.push(chalk.redBright(`WAR! (level ${event.warLevel}${lastTieRank ? `, tie on ${rankLabel(lastTieRank)}` : ''})`));
    const downCount = state.config.tieResolution === 'sudden-death' ? 0 : state.config.warFaceDownCount;
    const downA: TableCard[] = [];
    const downB: TableCard[] = [];
    for (let i = 0; i < downCount; i += 1) {
      const card = takeIf(0, true);
      if (card) downA.push(card);
    }
    const upA = takeIf(0, false);
    for (let i = 0; i < downCount; i += 1) {
      const card = takeIf(1, true);
      if (card) downB.push(card);
    }
    const upB = takeIf(1, false);

    if (downCount > 0 && (downA.length > 0 || downB.length > 0)) {
      lines.push(
        `Down: ${players[0]}: ${downA.length > 0 ? downA.map((card) => formatTableCard(card)).join(', ') : '—'}  ${players[1]}: ${
          downB.length > 0 ? downB.map((card) => formatTableCard(card)).join(', ') : '—'
        }`,
      );
    }

    const isFinalWar = index === warEvents.length - 1;
    const upLineParts = [
      `Up:   ${players[0]}: ${upA ? formatTableCard(upA) : '—'}`,
      `${players[1]}: ${upB ? formatTableCard(upB) : '—'}`,
    ];
    if (isFinalWar && trick && verbosity !== 'low') {
      const winner = playerName(state, trick.winner);
      upLineParts.push(`=> ${winner} wins ${trick.collected.length} card(s)`);
    }
    lines.push(upLineParts.join('  '));

    lastTieRank = upA && upB && upA.card.rank === upB.card.rank ? upA.card.rank : undefined;
  });

  if (verbosity === 'high') {
    const sequences = players
      .map((name, idx) => `${name}: ${formatCardSequence(cards, idx)}`)
      .join(' | ');
    lines.push(`Table: ${sequences}`);
  }

  return lines;
};

export const renderRoundEvents = (
  events: RoundEvent[],
  state: GameState,
  output: Output = console.log,
  verbosity: RendererVerbosity = 'normal',
) => {
  const lines: string[] = [];
  const roundNumber = extractRoundNumber(events, state.round);
  lines.push('');
  if (roundNumber !== undefined) {
    lines.push(chalk.bold(`Round ${roundNumber}`));
  }

  const trick = events.find((event) => event.type === 'TrickWon') as Extract<RoundEvent, { type: 'TrickWon' }> | undefined;
  const cardsPlaced = events.find((event) => event.type === 'CardsPlaced') as
    | Extract<RoundEvent, { type: 'CardsPlaced' }>
    | undefined;
  const warEvents = events.filter((event) => event.type === 'WarStarted') as Extract<RoundEvent, { type: 'WarStarted' }>[];
  const pileRecycledEvents = events.filter((event) => event.type === 'PileRecycled') as Extract<
    RoundEvent,
    { type: 'PileRecycled' }
  >[];
  const gameEnded = events.find((event) => event.type === 'GameEnded') as Extract<
    RoundEvent,
    { type: 'GameEnded' }
  > | null;

  if (verbosity !== 'low') {
    pileRecycledEvents.forEach((event) => {
      const name = playerName(state, event.playerId);
      const action = event.shuffled ? 'shuffled' : 'recycled';
      lines.push(`${name} ${action} ${event.cards} card(s) from the won pile.`);
    });
  }

  if (cardsPlaced && verbosity !== 'low') {
    lines.push(...formatWarSegments(cardsPlaced.cards, warEvents, state, trick, verbosity));
  }

  if (trick) {
    const winner = playerName(state, trick.winner);
    if (verbosity === 'low') {
      lines.push(`${winner} wins ${trick.collected.length} card(s).`);
    } else if (warEvents.length === 0) {
      lines.push(`${winner} wins the trick and collects ${trick.collected.length} card(s).`);
    }
  }

  if (state && verbosity === 'low') {
    lines.push(pileSummary(state));
  } else if (state && verbosity !== 'low' && cardsPlaced) {
    lines.push(pileSummary(state));
  }

  if (gameEnded) {
    const winner = gameEnded.winner !== undefined ? playerName(state, gameEnded.winner) : undefined;
    if (gameEnded.reason === 'win' && winner) {
      lines.push(chalk.greenBright(`${winner} wins the game!`));
    } else if (gameEnded.reason === 'timeout') {
      lines.push(chalk.yellow('Game ended due to max rounds timeout.'));
    } else {
      lines.push(chalk.yellow('Game ended in a stalemate.'));
    }
  }

  lines.forEach((line) => output(line));
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
  output('| Enter: play next round |');
  output(`| a: toggle autoplay (${autoplay ? 'on' : 'off'}) |`);
  output('| s: show stats |');
  output('| q: quit |');
  output('| ?: help |');
};

export const renderIntro = (seed: string, state: GameState, output: Output = console.log, autoplay = false) => {
  output(chalk.magentaBright(`Starting War (seed: ${seed})`));
  output(`Players: ${state.players.map((player) => player.name).join(' vs ')}`);
  renderHelp(autoplay, output);
};
