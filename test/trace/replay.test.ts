import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runGame } from '../../src/engine/game.js';
import { replayTrace } from '../../src/trace/replay.js';
import { createTraceMeta, TraceWriter } from '../../src/trace/trace.js';

const createTraceWithWar = () => {
  const dir = mkdtempSync(join(tmpdir(), 'war-replay-'));
  const tracePath = join(dir, 'game.jsonl');

  let writer: TraceWriter | undefined;

  runGame({
    seed: 'war-3',
    collectEvents: false,
    rules: { maxRounds: 10 },
    onGameStart: (state) => {
      writer = new TraceWriter({ filePath: tracePath }, createTraceMeta({ seed: 'war-3', state, cliArgs: { command: 'test' } }));
    },
    onRound: (round) => writer?.recordRound(round),
  });

  return tracePath;
};

describe('replayTrace', () => {
  it('invokes the pause handler when pause-on-war is enabled', async () => {
    const tracePath = createTraceWithWar();
    const pauseSpy = vi.fn(async () => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await replayTrace(tracePath, { pauseOnWar: true, waitForContinue: pauseSpy, verbosity: 'low', delayMs: 0 });

    expect(pauseSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
