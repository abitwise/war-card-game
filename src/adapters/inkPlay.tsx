import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RenderOptions } from 'ink';
import { Box, Newline, Text, render, useApp, useInput } from 'ink';
import { createGame } from '../engine/game.js';
import type { StateHashMode } from '../engine/hash.js';
import type { RoundEvent, RoundResult } from '../engine/round.js';
import { playRound } from '../engine/round.js';
import type { WarRulesInput } from '../engine/rules.js';
import type { GameState } from '../engine/state.js';
import { renderRoundEvents, type RendererVerbosity } from './interactiveRenderer.js';
import { computePlaybackDelayMs, hasWarEvent } from '../playback.js';

type LogEntry = { key: string; content: React.ReactNode };

const LOG_LIMIT = 50;

const formatRoundEvents = (
  events: RoundEvent[],
  state: GameState,
  createKey: () => string,
  verbosity: RendererVerbosity,
): LogEntry[] => {
  const lines: string[] = [];
  renderRoundEvents(events, state, (line) => lines.push(line), verbosity);
  return lines
    .filter((line) => line !== '')
    .map((line) => ({
      key: createKey(),
      content: <Text>{line}</Text>,
    }));
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
  verbosity?: RendererVerbosity;
  onComplete?: (state: GameState) => void;
  onGameStart?: (state: GameState) => void;
  onRoundComplete?: (result: RoundResult) => void;
  delayMs?: number;
  speed?: number;
  pauseOnWar?: boolean;
  stateHashMode?: StateHashMode;
};

const InkPlayApp = ({
  seed,
  rules,
  playerNames,
  startAutoplay,
  autoplayBurst = 5,
  quiet,
  verbosity = 'normal',
  onComplete,
  onGameStart,
  onRoundComplete,
  delayMs,
  speed,
  pauseOnWar,
  stateHashMode = 'off',
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
    (count: number): boolean => {
      if (steppingRef.current || completedRef.current) {
        return false;
      }
      steppingRef.current = true;
      let state = stateRef.current;
      const batchedEntries: LogEntry[] = [];
      let warDetected = false;
      for (let i = 0; i < count && state.active; i += 1) {
        const result = playRound(state, rngRef.current, stateHashMode);
        state = result.state;
        onRoundComplete?.(result);
        warDetected ||= !!pauseOnWar && hasWarEvent(result.events);
        batchedEntries.push(...formatRoundEvents(result.events, result.state, nextKey, verbosity));
      }
      appendLog(batchedEntries);
      stateRef.current = state;
      setRenderState(state);
      steppingRef.current = false;
      if (!state.active) {
        completeGame(state);
      }
      return warDetected;
    },
    [appendLog, completeGame, nextKey, onRoundComplete, pauseOnWar, verbosity],
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
    const delay = computePlaybackDelayMs(speed, delayMs);

    const runBurst = () => {
      if (cancelled || completedRef.current || !stateRef.current.active) {
        return;
      }
      const warTriggered = playRounds(autoplayBurst);
      if (warTriggered && pauseOnWar) {
        setAutoplay(false);
        appendLog([{ key: nextKey(), content: <Text>Autoplay paused due to war.</Text> }]);
        return;
      }
      if (!cancelled && !completedRef.current && stateRef.current.active && autoplay) {
        setTimeout(runBurst, delay);
      }
    };

    const timerId = setTimeout(runBurst, delay);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [appendLog, autoplay, autoplayBurst, delayMs, nextKey, pauseOnWar, playRounds, speed]);

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
  verbosity?: RendererVerbosity;
  onGameStart?: (state: GameState) => void;
  onRoundComplete?: (result: RoundResult) => void;
  delayMs?: number;
  speed?: number;
  pauseOnWar?: boolean;
  stateHashMode?: StateHashMode;
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
      const result = playRound(state, rng, options.stateHashMode ?? 'off');
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
      verbosity={options.verbosity}
      onGameStart={options.onGameStart}
      onRoundComplete={options.onRoundComplete}
      onComplete={resolveState}
      delayMs={options.delayMs}
      speed={options.speed}
      pauseOnWar={options.pauseOnWar}
      stateHashMode={options.stateHashMode}
    />,
    options.renderOptions,
  );

  await instance.waitUntilExit();
  return statePromise;
};
