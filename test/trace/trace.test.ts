import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runGame } from '../../src/engine/game.js';
import { createTraceMeta, TraceWriter } from '../../src/trace/trace.js';

describe('TraceWriter', () => {
  it('writes meta and ordered events for a deterministic game', () => {
    const dir = mkdtempSync(join(tmpdir(), 'war-trace-'));
    const tracePath = join(dir, 'game.jsonl');

    let writer: TraceWriter | undefined;

    runGame({
      seed: 'trace-seed',
      collectEvents: false,
      onGameStart: (state) => {
        writer = new TraceWriter(
          { filePath: tracePath, includeSnapshots: true },
          createTraceMeta({
            seed: 'trace-seed',
            state,
            cliArgs: { command: 'simulate', seedBase: 'trace' },
          }),
        );
      },
      onRound: (round) => {
        writer?.recordRound(round);
      },
    });

    const lines = readFileSync(tracePath, 'utf8')
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    expect(lines.length).toBeGreaterThan(1);
    const meta = JSON.parse(lines[0]);
    expect(meta.type).toBe('meta');
    expect(meta.seed).toBe('trace-seed');
    expect(meta.players.length).toBeGreaterThan(0);

    const records = lines.slice(1).map((line) => JSON.parse(line));
    const eventRecords = records.filter((record) => record.type === 'event');
    expect(eventRecords.length).toBeGreaterThan(0);
    expect(eventRecords[0].round).toBe(1);
    expect(eventRecords[0].event.type).toBe('RoundStarted');
    expect(eventRecords[eventRecords.length - 1].event.type).toBe('GameEnded');

    const snapshotRecords = records.filter((record) => record.type === 'snapshot');
    expect(snapshotRecords.length).toBeGreaterThan(0);
    expect(snapshotRecords[0].pileCounts.length).toBeGreaterThan(0);
  });
});
