import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Card } from '../engine/cards.js';
import type { StateHashMode } from '../engine/hash.js';
import type { RoundEvent, RoundResult } from '../engine/round.js';
import type { GameState } from '../engine/state.js';
import packageJson from '../../package.json' with { type: 'json' };

export const TRACE_VERSION = '1.0';
export const ENGINE_VERSION = packageJson.version;

export type TraceMetaRecord = {
  type: 'meta';
  version: string;
  engineVersion: string;
  timestamp: string;
  seed: string;
  rules: GameState['config'];
  cliArgs: Record<string, unknown>;
  players: string[];
  maxRounds?: number;
  stateHashMode?: StateHashMode;
};

export type TraceEventRecord = {
  type: 'event';
  round: number;
  event: RoundEvent;
};

export type SnapshotPileCount = {
  playerId: number;
  draw: number;
  won: number;
};

export type SnapshotTopCard = {
  playerId: number;
  pile: 'draw' | 'won';
  card: Card;
};

export type TraceSnapshotRecord = {
  type: 'snapshot';
  round: number;
  pileCounts: SnapshotPileCount[];
  topCards?: SnapshotTopCard[];
};

export type TraceRecord = TraceMetaRecord | TraceEventRecord | TraceSnapshotRecord;

export type TraceWriterOptions = {
  filePath: string;
  includeSnapshots?: boolean;
  includeTopCards?: boolean;
};

export const createTraceMeta = (params: {
  seed: string;
  state: GameState;
  cliArgs: Record<string, unknown>;
  timestamp?: string;
  stateHashMode?: StateHashMode;
}): TraceMetaRecord => ({
  type: 'meta',
  version: TRACE_VERSION,
  engineVersion: ENGINE_VERSION,
  timestamp: params.timestamp ?? new Date().toISOString(),
  seed: params.seed,
  rules: params.state.config,
  cliArgs: params.cliArgs,
  players: params.state.players.map((player) => player.name),
  maxRounds: params.state.config.maxRounds,
  stateHashMode: params.stateHashMode,
});

const toLine = (record: TraceRecord): string => `${JSON.stringify(record)}\n`;

const resolveRoundNumber = (result: RoundResult): number => {
  const roundEvent = result.events.find((event) => event.type === 'RoundStarted');
  if (roundEvent && roundEvent.type === 'RoundStarted') {
    return roundEvent.round;
  }
  return result.state.round;
};

const buildSnapshot = (round: number, state: GameState, includeTopCards: boolean): TraceSnapshotRecord => {
  const pileCounts: SnapshotPileCount[] = state.players.map((player, index) => ({
    playerId: index,
    draw: player.drawPile.length,
    won: player.wonPile.length,
  }));

  const snapshot: TraceSnapshotRecord = { type: 'snapshot', round, pileCounts };

  if (includeTopCards) {
    const topCards: SnapshotTopCard[] = [];
    state.players.forEach((player, index) => {
      if (player.drawPile[0]) {
        topCards.push({ playerId: index, pile: 'draw', card: player.drawPile[0] });
      }
      if (player.wonPile[0]) {
        topCards.push({ playerId: index, pile: 'won', card: player.wonPile[0] });
      }
    });

    if (topCards.length > 0) {
      snapshot.topCards = topCards;
    }
  }

  return snapshot;
};

export class TraceWriter {
  private readonly filePath: string;

  private readonly includeSnapshots: boolean;

  private readonly includeTopCards: boolean;

  constructor(options: TraceWriterOptions, meta: TraceMetaRecord) {
    this.filePath = options.filePath;
    this.includeSnapshots = options.includeSnapshots ?? false;
    this.includeTopCards = options.includeTopCards ?? false;

    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, toLine(meta), 'utf8');
  }

  recordRound(result: RoundResult) {
    const round = resolveRoundNumber(result);
    result.events.forEach((event) => {
      appendFileSync(this.filePath, toLine({ type: 'event', round, event }), 'utf8');
    });
    if (this.includeSnapshots) {
      appendFileSync(this.filePath, toLine(buildSnapshot(round, result.state, this.includeTopCards)), 'utf8');
    }
  }
}
