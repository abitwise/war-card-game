import React, { Fragment, type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RenderOptions } from 'ink';
import { Box, Newline, Text, render, useApp, useInput } from 'ink';
import { createGame } from '../engine/game.js';
import type { RoundEvent, RoundResult } from '../engine/round.js';
import { playRound } from '../engine/round.js';
import type { WarRulesInput } from '../engine/rules.js';
import type { GameState, TableCard } from '../engine/state.js';

type LogEntry = { key: string; content: React.ReactNode };

const LOG_LIMIT = 50;

const rankLabel = (rank: number): string => {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return `${rank}`;
};

const suitColor = (suit: string): ComponentProps<typeof Text>['color'] => {
  if (suit === '♥' || suit === '♦') {
    return 'redBright';
  }
  return 'blueBright';
};

const CardText = ({ card, faceDown }: { card: TableCard['card']; faceDown?: boolean }) => {
  if (faceDown) {
    return <Text color="gray">??</Text>;
  }
  return (
    <Text color={suitColor(card.suit)}>
      {rankLabel(card.rank)}
      {card.suit}
    </Text>
  );
};

const playerName = (state: GameState, playerId: number): string => state.players[playerId]?.name ?? `Player ${playerId + 1}`;

const formatCardsPlaced = (state: GameState, cards: TableCard[], createKey: () => string): LogEntry[] => {
  const grouped = cards.reduce<Record<number, TableCard[]>>((acc, entry) => {
    const bucket = acc[entry.playerId] ?? [];
    bucket.push(entry);
    acc[entry.playerId] = bucket;
    return acc;
  }, {});

  return Object.entries(grouped).map(([id, entries]) => ({
    key: createKey(),
    content: (
      <>
        <Text bold>{playerName(state, Number.parseInt(id, 10))}</Text>
        <Text> played: </Text>
        {entries.map((entry, index) => (
          <Fragment key={`${entry.playerId}-${index}`}>
            {index > 0 ? <Text>, </Text> : null}
            <CardText card={entry.card} faceDown={entry.faceDown} />
          </Fragment>
        ))}
      </>
    ),
  }));
};

const formatRoundEvents = (events: RoundEvent[], state: GameState, createKey: () => string): LogEntry[] => {
  const entries: LogEntry[] = [];

  events.forEach((event) => {
    switch (event.type) {
      case 'RoundStarted':
        entries.push({
          key: createKey(),
          content: (
            <Text>
              <Text bold>Round {event.round}</Text>
            </Text>
          ),
        });
        break;
      case 'PileRecycled': {
        const name = playerName(state, event.playerId);
        const action = event.shuffled ? 'shuffled' : 'recycled';
        entries.push({
          key: createKey(),
          content: (
            <Text color="yellow">
              {name} {action} {event.cards} card(s) from the won pile.
            </Text>
          ),
        });
        break;
      }
      case 'WarStarted':
        entries.push({
          key: createKey(),
          content: <Text color="redBright">WAR! (level {event.warLevel})</Text>,
        });
        break;
      case 'CardsPlaced':
        entries.push(...formatCardsPlaced(state, event.cards, createKey));
        break;
      case 'TrickWon': {
        const name = playerName(state, event.winner);
        entries.push({
          key: createKey(),
          content: (
            <Text color="greenBright">
              {name} wins the trick and collects {event.collected.length} card(s).
            </Text>
          ),
        });
        break;
      }
      case 'GameEnded': {
        const winnerName = event.winner !== undefined ? playerName(state, event.winner) : undefined;
        let content: React.ReactNode = <Text color="yellow">Game ended in a stalemate.</Text>;
        if (event.reason === 'timeout') {
          content = <Text color="yellow">Game ended due to max rounds timeout.</Text>;
        } else if (event.reason === 'win' && winnerName) {
          content = <Text color="greenBright">{winnerName} wins the game!</Text>;
        }
        entries.push({ key: createKey(), content });
        break;
      }
      default:
        break;
    }
  });

  return entries;
};

const formatStats = (state: GameState, createKey: () => string): LogEntry[] => [
  {
    key: createKey(),
    content: (
      <Text color="cyanBright">
        Round {state.round} | Wars: {state.stats.wars} | Flips: {state.stats.flips}
      </Text>
    ),
  },
  ...state.players.map((player, index) => ({
    key: createKey(),
    content: (
      <Text>
        {player.name}: draw {player.drawPile.length}, won {player.wonPile.length}, total{' '}
        {player.drawPile.length + player.wonPile.length}
        {state.winner === index ? ' (winner)' : ''}
      </Text>
    ),
  })),
];

const Controls = ({ autoplay }: { autoplay: boolean }) => (
  <Box flexDirection="column" marginTop={1}>
    <Text bold>Controls</Text>
    <Text>Enter: play next round</Text>
    <Text>a: toggle autoplay ({autoplay ? 'on' : 'off'})</Text>
    <Text>s: show stats</Text>
    <Text>q: quit</Text>
    <Text>?: toggle controls</Text>
  </Box>
);

type InkPlayProps = {
  seed: string;
  startAutoplay?: boolean;
  autoplayBurst?: number;
  rules?: WarRulesInput;
  playerNames?: string[];
  quiet?: boolean;
  onComplete?: (state: GameState) => void;
  onGameStart?: (state: GameState) => void;
  onRoundComplete?: (result: RoundResult) => void;
};

const InkPlayApp = ({
  seed,
  rules,
  playerNames,
  startAutoplay,
  autoplayBurst = 5,
  quiet,
  onComplete,
  onGameStart,
  onRoundComplete,
}: InkPlayProps) => {
  const { exit } = useApp();
  const { state: initialState, rng } = useMemo(
    () => createGame({ seed, rules, playerNames }),
    [seed, rules, playerNames],
  );

  const stateRef = useRef<GameState>(initialState);
  const rngRef = useRef(rng);
  const completedRef = useRef(false);
  const keyCounter = useRef(0);
  const nextKey = useCallback(() => {
    keyCounter.current += 1;
    return `log-${keyCounter.current}`;
  }, []);

  useEffect(() => {
    onGameStart?.(initialState);
  }, [initialState, onGameStart]);

  const [renderState, setRenderState] = useState<GameState>(initialState);
  const [autoplay, setAutoplay] = useState<boolean>(startAutoplay ?? false);
  const [showHelp, setShowHelp] = useState(true);
  const [log, setLog] = useState<LogEntry[]>(() => [
    { key: `intro-1`, content: <Text color="magentaBright">Starting War (seed: {seed})</Text> },
    {
      key: `intro-2`,
      content: <Text>Players: {initialState.players.map((player) => player.name).join(' vs ')}</Text>,
    },
  ]);

  const appendLog = useCallback(
    (entries: LogEntry[]) => {
      if (quiet) return;
      if (entries.length === 0) return;
      setLog((current) => {
        const next = [...current, ...entries];
        return next.slice(-LOG_LIMIT);
      });
    },
    [quiet],
  );

  const completeGame = useCallback(
    (finalState: GameState) => {
      if (completedRef.current) return;
      completedRef.current = true;
      appendLog(formatStats(finalState, nextKey));
      onComplete?.(finalState);
      exit();
    },
    [appendLog, exit, nextKey, onComplete],
  );

  const steppingRef = useRef(false);
  const playRounds = useCallback(
    (count: number) => {
      if (steppingRef.current || completedRef.current) {
        return;
      }
      steppingRef.current = true;
      let state = stateRef.current;
      const batchedEntries: LogEntry[] = [];
      for (let i = 0; i < count && state.active; i += 1) {
        const result = playRound(state, rngRef.current);
        state = result.state;
        onRoundComplete?.(result);
        batchedEntries.push(...formatRoundEvents(result.events, result.state, nextKey));
      }
      appendLog(batchedEntries);
      stateRef.current = state;
      setRenderState(state);
      steppingRef.current = false;
      if (!state.active) {
        completeGame(state);
      }
    },
    [appendLog, completeGame, nextKey],
  );

  const toggleAutoplay = useCallback(() => {
    setAutoplay((current) => {
      const next = !current;
      appendLog([{ key: nextKey(), content: <Text>Autoplay {next ? 'enabled' : 'disabled'}.</Text> }]);
      return next;
    });
  }, [appendLog, nextKey]);

  useEffect(() => {
    if (startAutoplay) {
      appendLog([{ key: nextKey(), content: <Text>Autoplay enabled.</Text> }]);
    }
  }, [appendLog, nextKey, startAutoplay]);

  useEffect(() => {
    if (!autoplay || completedRef.current) {
      return;
    }

    let cancelled = false;

    const runBurst = () => {
      if (cancelled || completedRef.current || !stateRef.current.active) {
        return;
      }
      playRounds(autoplayBurst);
      if (!cancelled && !completedRef.current && stateRef.current.active && autoplay) {
        setTimeout(runBurst, 0);
      }
    };

    const timerId = setTimeout(runBurst, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [autoplay, autoplayBurst, playRounds]);

  useInput((input, key) => {
    if (key.return) {
      playRounds(1);
      return;
    }
    if (input === 'a') {
      toggleAutoplay();
      return;
    }
    if (input === 's') {
      appendLog(formatStats(stateRef.current, nextKey));
      return;
    }
    if (input === '?') {
      setShowHelp((current) => !current);
      return;
    }
    if (input === 'q') {
      appendLog([{ key: nextKey(), content: <Text>Quitting game. Thanks for playing!</Text> }]);
      completeGame(stateRef.current);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="magentaBright">
        War (seed: {seed}) <Text color="white">| UI: ink | Autoplay: {autoplay ? 'on' : 'off'}</Text>
      </Text>
      <Text>Players: {renderState.players.map((player) => player.name).join(' vs ')}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Recent events</Text>
        {log.slice(-10).map((entry) => (
          <Text key={entry.key}>{entry.content}</Text>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyanBright" bold>
          Stats
        </Text>
        <Text color="cyanBright">
          Round {renderState.round} | Wars: {renderState.stats.wars} | Flips: {renderState.stats.flips}
        </Text>
        {renderState.players.map((player, index) => (
          <Text key={player.name}>
            {player.name}: draw {player.drawPile.length}, won {player.wonPile.length}, total{' '}
            {player.drawPile.length + player.wonPile.length}
            {renderState.winner === index ? ' (winner)' : ''}
          </Text>
        ))}
      </Box>
      {showHelp && <Controls autoplay={autoplay} />}
      {!renderState.active && (
        <Box marginTop={1}>
          <Text color="greenBright">
            Game ended. Press Ctrl+C to exit or wait for the session to close automatically.<Newline />
          </Text>
        </Box>
      )}
    </Box>
  );
};

export type InkPlayOptions = {
  seed?: string;
  rules?: WarRulesInput;
  playerNames?: string[];
  startAutoplay?: boolean;
  autoplayBurst?: number;
  renderOptions?: RenderOptions;
  quiet?: boolean;
  headless?: boolean;
  onGameStart?: (state: GameState) => void;
  onRoundComplete?: (result: RoundResult) => void;
};

export const runInkPlay = async (options: InkPlayOptions = {}): Promise<GameState> => {
  if (options.headless) {
    const { state: initialState, rng } = createGame({
      seed: options.seed ?? 'interactive',
      rules: options.rules,
      playerNames: options.playerNames,
    });
    options.onGameStart?.(initialState);
    let state = initialState;
    while (state.active) {
      const result = playRound(state, rng);
      options.onRoundComplete?.(result);
      state = result.state;
    }
    return state;
  }

  let resolveState: (state: GameState) => void = () => {};
  const statePromise = new Promise<GameState>((resolve) => {
    resolveState = resolve;
  });

  const instance = render(
    <InkPlayApp
      seed={options.seed ?? 'interactive'}
      rules={options.rules}
      playerNames={options.playerNames}
      startAutoplay={options.startAutoplay}
      autoplayBurst={options.autoplayBurst}
      quiet={options.quiet}
      onGameStart={options.onGameStart}
      onRoundComplete={options.onRoundComplete}
      onComplete={resolveState}
    />,
    options.renderOptions,
  );

  await instance.waitUntilExit();
  return statePromise;
};
