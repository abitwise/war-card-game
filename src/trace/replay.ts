import chalk from 'chalk';
import { createInterface } from 'node:readline';
import { formatTableCard, renderRoundEvents, type RendererVerbosity } from '../adapters/interactiveRenderer.js';
import { createGame } from '../engine/game.js';
import type { StateHashMode } from '../engine/hash.js';
import { playRound, type RoundEvent, type RoundResult } from '../engine/round.js';
import type { TraceEventRecord, TraceMetaRecord } from './trace.js';
import { readTraceFile, type LoadedTrace } from './reader.js';
import { computePlaybackDelayMs, DEFAULT_PLAYBACK_DELAY_MS, hasWarEvent } from '../playback.js';

export type TraceViewFilter = 'all' | 'wars' | 'wins' | 'recycles';
export type TraceVerbosity = RendererVerbosity;

export type TraceViewOptions = {
  from?: number;
  to?: number;
  only?: TraceViewFilter;
  output?: (line: string) => void;
};

export type TraceReplayOptions = {
  from?: number;
  to?: number;
  verbosity?: TraceVerbosity;
  speed?: number;
  delayMs?: number;
  pauseOnWar?: boolean;
  verify?: boolean;
  output?: (line: string) => void;
  waitForContinue?: (message: string) => Promise<void>;
};

const playerName = (players: string[], playerId: number): string => players[playerId] ?? `Player ${playerId + 1}`;

const groupEventsByRound = (events: TraceEventRecord[]): Map<number, RoundEvent[]> => {
  const grouped = new Map<number, RoundEvent[]>();
  events.forEach((record) => {
    const bucket = grouped.get(record.round) ?? [];
    bucket.push(record.event);
    grouped.set(record.round, bucket);
  });
  return grouped;
};

const roundsFromEvents = (events: TraceEventRecord[]): number[] => {
  const rounds = Array.from(new Set(events.map((record) => record.round)));
  rounds.sort((a, b) => a - b);
  return rounds;
};

const shouldRenderEvent = (event: RoundEvent, filter: TraceViewFilter): boolean => {
  if (event.type === 'GameEnded') return true;
  if (filter === 'all') return event.type !== 'RoundStarted';
  if (filter === 'wars') return event.type === 'WarStarted';
  if (filter === 'wins') return event.type === 'TrickWon';
  if (filter === 'recycles') return event.type === 'PileRecycled';
  return false;
};

const formatCardsPlaced = (players: string[], cards: Extract<RoundEvent, { type: 'CardsPlaced' }>) => {
  const grouped = cards.cards.reduce<Record<number, typeof cards.cards>>((acc, entry) => {
    const bucket = acc[entry.playerId] ?? [];
    bucket.push(entry);
    acc[entry.playerId] = bucket;
    return acc;
  }, {});

  const lines: string[] = [];
  Object.entries(grouped).forEach(([id, entries]) => {
    const name = playerName(players, Number.parseInt(id, 10));
    const formatted = entries.map((entry) => formatTableCard(entry)).join(', ');
    lines.push(`${name} played: ${formatted}`);
  });
  return lines;
};

const renderEvent = (event: RoundEvent, players: string[]): string[] => {
  switch (event.type) {
    case 'PileRecycled':
      return [
        `${playerName(players, event.playerId)} ${event.shuffled ? 'shuffled' : 'recycled'} ${event.cards} card(s) from the won pile.`,
      ];
    case 'WarStarted':
      return [chalk.redBright(`WAR! (level ${event.warLevel})`)];
    case 'CardsPlaced':
      return formatCardsPlaced(players, event);
    case 'TrickWon':
      return [`${playerName(players, event.winner)} wins the trick and collects ${event.collected.length} card(s).`];
    case 'StateHashed':
      return [`State hash (${event.mode}) [round ${event.round}]: ${event.hash}`];
    case 'GameEnded': {
      const winner = event.winner !== undefined ? playerName(players, event.winner) : undefined;
      if (event.reason === 'win' && winner) {
        return [chalk.greenBright(`${winner} wins the game!`)];
      }
      if (event.reason === 'timeout') {
        return [chalk.yellow('Game ended due to max rounds timeout.')];
      }
      return [chalk.yellow('Game ended in a stalemate.')];
    }
    default:
      return [];
  }
};

const summarizeTrace = (trace: LoadedTrace) => {
  const warCount = trace.events.filter((entry) => entry.event.type === 'WarStarted').length;
  const recycleCount = trace.events.filter((entry) => entry.event.type === 'PileRecycled').length;
  let endingEvent: Extract<RoundEvent, { type: 'GameEnded' }> | undefined;
  for (let i = trace.events.length - 1; i >= 0; i -= 1) {
    const event = trace.events[i].event;
    if (event.type === 'GameEnded') {
      endingEvent = event;
      break;
    }
  }
  const rounds = roundsFromEvents(trace.events);
  return {
    warCount,
    recycleCount,
    endingEvent,
    roundCount: rounds.length > 0 ? rounds[rounds.length - 1] : 0,
  };
};

const resolveRoundNumber = (result: RoundResult): number => {
  const roundEvent = result.events.find((entry) => entry.type === 'RoundStarted');
  if (roundEvent && roundEvent.type === 'RoundStarted') {
    return roundEvent.round;
  }
  return result.state.round;
};

const generateRoundResults = (meta: TraceMetaRecord, stateHashMode: StateHashMode = 'off'): RoundResult[] => {
  const { state: initialState, rng } = createGame({
    seed: meta.seed,
    rules: meta.rules,
    playerNames: meta.players,
  });

  const results: RoundResult[] = [];
  let state = initialState;
  while (state.active) {
    const result = playRound(state, rng, stateHashMode);
    results.push(result);
    state = result.state;
  }

  return results;
};

const flattenRoundResults = (rounds: RoundResult[]): TraceEventRecord[] => {
  const records: TraceEventRecord[] = [];
  rounds.forEach((result) => {
    const round = resolveRoundNumber(result);
    result.events.forEach((event) => {
      records.push({ type: 'event', round, event });
    });
  });
  return records;
};

const verifyTraceEvents = (
  trace: LoadedTrace,
  generatedRounds?: RoundResult[],
  stateHashMode: StateHashMode = 'off',
) => {
  const generated = flattenRoundResults(generatedRounds ?? generateRoundResults(trace.meta, stateHashMode));
  if (generated.length !== trace.events.length) {
    throw new Error(`Trace verification failed: expected ${trace.events.length} events, got ${generated.length}.`);
  }

  for (let i = 0; i < trace.events.length; i += 1) {
    const expected = trace.events[i];
    const actual = generated[i];
    if (expected.round !== actual.round || JSON.stringify(expected.event) !== JSON.stringify(actual.event)) {
      throw new Error(
        `Trace verification failed at event #${i + 1}: expected ${JSON.stringify(
          expected,
        )}, received ${JSON.stringify(actual)}.`,
      );
    }
  }
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEnter = async (message: string) =>
  new Promise<void>((resolve) => {
    if (!process.stdin.isTTY) {
      resolve();
      return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });

export const viewTrace = async (filePath: string, options: TraceViewOptions = {}) => {
  const output = options.output ?? console.log;
  const trace = await readTraceFile(filePath);
  const summary = summarizeTrace(trace);
  const rounds = roundsFromEvents(trace.events);
  const from = options.from ?? rounds[0] ?? 1;
  const to = options.to ?? rounds[rounds.length - 1] ?? from;
  const filter: TraceViewFilter = options.only ?? 'all';

  output(`Trace: ${filePath}`);
  output(`Seed: ${trace.meta.seed}`);
  output(`Players: ${trace.meta.players.join(' vs ')}`);
  output(`Rounds recorded: ${summary.roundCount} | Wars: ${summary.warCount} | Recycles: ${summary.recycleCount}`);
  if (summary.endingEvent) {
    const winner = summary.endingEvent.winner !== undefined ? playerName(trace.meta.players, summary.endingEvent.winner) : undefined;
    const endingLabel =
      summary.endingEvent.reason === 'win' && winner
        ? `${winner} won`
        : summary.endingEvent.reason === 'timeout'
          ? 'Timeout'
          : 'Stalemate';
    output(`Ending: ${endingLabel}`);
  }
  output('');
  output(`Showing rounds ${from} to ${to}${filter !== 'all' ? ` (filter: ${filter})` : ''}`);

  const grouped = groupEventsByRound(trace.events);
  rounds
    .filter((round) => round >= from && round <= to)
    .forEach((round) => {
      output('');
      output(chalk.bold(`Round ${round}`));
      const events = grouped.get(round) ?? [];
      events.forEach((event) => {
        if (shouldRenderEvent(event, filter)) {
          renderEvent(event, trace.meta.players).forEach((line) => output(line));
        }
      });
    });
};

export const replayTrace = async (filePath: string, options: TraceReplayOptions = {}) => {
  const output = options.output ?? console.log;
  const verbosity: TraceVerbosity = options.verbosity ?? 'normal';
  const trace = await readTraceFile(filePath);
  const stateHashMode = trace.meta.stateHashMode ?? 'off';
  const roundResults = generateRoundResults(trace.meta, stateHashMode);
  if (options.verify) {
    verifyTraceEvents(trace, roundResults, stateHashMode);
    output(chalk.green('Trace verification succeeded.'));
  }

  const rounds = roundsFromEvents(trace.events);
  const from = options.from ?? rounds[0] ?? 1;
  const to = options.to ?? rounds[rounds.length - 1] ?? from;
  const grouped = groupEventsByRound(trace.events);
  const resultByRound = new Map<number, RoundResult>();
  roundResults.forEach((result) => {
    resultByRound.set(resolveRoundNumber(result), result);
  });
  const seedInitialState = createGame({ seed: trace.meta.seed, rules: trace.meta.rules, playerNames: trace.meta.players }).state;
  const initialState = roundResults[0]?.state ?? seedInitialState;
  const fallbackState = roundResults[roundResults.length - 1]?.state ?? initialState;
  const waitForContinue = options.waitForContinue ?? waitForEnter;
  const playbackDelayMs = computePlaybackDelayMs(options.speed, options.delayMs, DEFAULT_PLAYBACK_DELAY_MS);

  output(`Replaying trace for seed ${trace.meta.seed}`);
  output(`Players: ${trace.meta.players.join(' vs ')}`);
  const speedLabel = options.speed && options.speed !== 1 ? ` | speed x${options.speed}` : '';
  const delayLabel = playbackDelayMs > 0 ? ` | ${playbackDelayMs}ms delay` : '';
  output(`Rounds ${from}-${to}${options.pauseOnWar ? ' | pause on war' : ''}${speedLabel}${delayLabel}`);

  for (const round of rounds) {
    if (round < from || round > to) continue;
    const roundEvents = grouped.get(round) ?? [];
    let state;
    if (resultByRound.has(round)) {
      state = resultByRound.get(round)!.state;
    } else {
      output(chalk.yellow(`Warning: no RoundResult found for round ${round}; using fallback final state for rendering.`));
      state = fallbackState;
    }
    renderRoundEvents(roundEvents, state, output, verbosity);
    if (options.pauseOnWar && hasWarEvent(roundEvents)) {
      await waitForContinue('War detected. Press Enter to continue...');
    }
    if (playbackDelayMs > 0) {
      await delay(playbackDelayMs);
    }
  }

  output(chalk.blueBright('Replay complete.'));
};
