import chalk from 'chalk';
import type { Card, Rank } from '../engine/cards.js';
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

const getHighestRank = (ranks: (Rank | undefined)[]): Rank | undefined => {
  const available = ranks.filter((rank): rank is Rank => rank !== undefined);
  return available.length > 0 ? (Math.max(...available) as Rank) : undefined;
};

type WarStage = {
  level: number;
  participants: number[];
  down: Record<number, TableCard[]>;
  up: Record<number, TableCard | undefined>;
};

type RoundStructure = {
  participants: number[];
  initial: Record<number, TableCard | undefined>;
  wars: WarStage[];
};

const buildRoundStructure = (
  cards: TableCard[],
  warEvents: Extract<RoundEvent, { type: 'WarStarted' }>[],
  participants: number[],
  warFaceDownCount: number,
  suddenDeath: boolean,
): RoundStructure => {
  let cursor = 0;

  const consumeCard = (playerId: number, faceDown: boolean): TableCard | undefined => {
    const next = cards[cursor];
    if (next && next.playerId === playerId && next.faceDown === faceDown) {
      cursor += 1;
      return next;
    }
    return undefined;
  };

  const initial: Record<number, TableCard | undefined> = {};
  participants.forEach((playerId) => {
    const faceUp = consumeCard(playerId, false);
    if (faceUp) {
      initial[playerId] = faceUp;
    }
  });

  const wars: WarStage[] = warEvents.map((event) => {
    const warParticipants = event.participants && event.participants.length > 0 ? event.participants : participants;
    const down: Record<number, TableCard[]> = {};
    const up: Record<number, TableCard | undefined> = {};
    warParticipants.forEach((playerId) => {
      const downCards: TableCard[] = [];
      if (!suddenDeath) {
        for (let i = 0; i < warFaceDownCount; i += 1) {
          const card = consumeCard(playerId, true);
          if (card) {
            downCards.push(card);
          }
        }
      }
      const faceUp = consumeCard(playerId, false);
      down[playerId] = downCards;
      up[playerId] = faceUp;
    });
    return { level: event.warLevel, participants: warParticipants, down, up };
  });

  return { participants, initial, wars };
};

const formatParticipantsLine = (label: string, entries: string[]): string => {
  return `${label}: ${entries.join('  ')}`;
};

const formatWarSegments = (
  cards: Extract<RoundEvent, { type: 'CardsPlaced' }>,
  warEvents: Extract<RoundEvent, { type: 'WarStarted' }>[],
  state: GameState,
  trick: Extract<RoundEvent, { type: 'TrickWon' }> | undefined,
  verbosity: RendererVerbosity,
): string[] => {
  const participants =
    cards.participants && cards.participants.length > 0 ? cards.participants : state.players.map((_, index) => index);
  const structure = buildRoundStructure(
    cards.cards,
    warEvents,
    participants,
    state.config.warFaceDownCount,
    state.config.tieResolution === 'sudden-death',
  );

  const lines: string[] = [];
  const highestInitial = getHighestRank(structure.participants.map((id) => structure.initial[id]?.card.rank));
  const initialTied =
    highestInitial !== undefined
      ? structure.participants.filter((id) => structure.initial[id]?.card.rank === highestInitial)
      : [];

  if (structure.participants.length > 0) {
    const initialEntries =
      structure.participants.length === 2
        ? [
            `${playerName(state, structure.participants[0])}: ${structure.initial[structure.participants[0]] ? formatTableCard(structure.initial[structure.participants[0]]!) : '—'}`,
            'vs',
            `${playerName(state, structure.participants[1])}: ${structure.initial[structure.participants[1]] ? formatTableCard(structure.initial[structure.participants[1]]!) : '—'}`,
          ]
        : structure.participants.map((id) => {
            const card = structure.initial[id];
            return `${playerName(state, id)}: ${card ? formatTableCard(card) : '—'}`;
          });

    const tieLabel =
      highestInitial !== undefined && initialTied.length > 1 ? ` ${chalk.yellow(`(tie on ${rankLabel(highestInitial)})`)}` : '';
    const joiner = structure.participants.length === 2 ? ' ' : ' | ';
    lines.push(`Flip: ${initialEntries.join(joiner)}${tieLabel}`);
  }

  let lastTieRank: Rank | undefined = initialTied.length > 1 ? highestInitial : undefined;

  structure.wars.forEach((war, index) => {
    const warLabel = `WAR! (level ${war.level}${lastTieRank !== undefined ? `, tie on ${rankLabel(lastTieRank)}` : ''})`;
    lines.push(chalk.redBright(warLabel));

    const downSegments = war.participants.map((id) => {
      const downCards = war.down[id] ?? [];
      return `${playerName(state, id)}: ${
        downCards.length > 0 ? downCards.map((card) => formatTableCard(card)).join(', ') : '—'
      }`;
    });
    const hasDownCards = downSegments.some((segment) => !segment.endsWith('—'));
    const downCount = state.config.tieResolution === 'sudden-death' ? 0 : state.config.warFaceDownCount;
    if (downCount > 0 && hasDownCards) {
      lines.push(formatParticipantsLine('Down', downSegments));
    }

    const upSegments = war.participants.map((id) => {
      const card = war.up[id];
      return `${playerName(state, id)}: ${card ? formatTableCard(card) : '—'}`;
    });
    const isFinal = index === structure.wars.length - 1;
    if (isFinal && trick && verbosity !== 'low') {
      upSegments.push(`=> ${playerName(state, trick.winner)} wins ${trick.collected.length} card(s)`);
    }
    lines.push(formatParticipantsLine('Up', upSegments));

    const warHighest = getHighestRank(war.participants.map((id) => war.up[id]?.card.rank));
    const warTied = warHighest !== undefined ? war.participants.filter((id) => war.up[id]?.card.rank === warHighest) : [];
    lastTieRank = warTied.length > 1 ? warHighest : undefined;
  });

  if (verbosity === 'high') {
    const sequences = structure.participants
      .map((id) => `${playerName(state, id)}: ${formatCardSequence(cards.cards, id)}`)
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
  const stateHashEvents = events.filter((event) => event.type === 'StateHashed') as Extract<
    RoundEvent,
    { type: 'StateHashed' }
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
    lines.push(...formatWarSegments(cardsPlaced, warEvents, state, trick, verbosity));
  }

  if (trick) {
    const winner = playerName(state, trick.winner);
    if (verbosity === 'low') {
      lines.push(`${winner} wins ${trick.collected.length} card(s).`);
    } else if (warEvents.length === 0) {
      lines.push(`${winner} wins the trick and collects ${trick.collected.length} card(s).`);
    }
  }

  stateHashEvents.forEach((event) => {
    lines.push(chalk.gray(`State hash (${event.mode}): ${event.hash}`));
  });

  lines.push(pileSummary(state));

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
  const separator = state.players.length === 2 ? ' vs ' : ' | ';
  output(`Players: ${state.players.map((player) => player.name).join(separator)}`);
  renderHelp(autoplay, output);
};
