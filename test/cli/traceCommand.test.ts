import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createTraceCommand } from '../../src/cli/commands/trace.js';
import { runGame } from '../../src/engine/game.js';
import { createTraceMeta, TraceWriter } from '../../src/trace/trace.js';

const createTraceFile = (seed = 'trace-command-test') => {
  const dir = mkdtempSync(join(tmpdir(), 'war-trace-cli-'));
  const tracePath = join(dir, 'game.jsonl');

  let writer: TraceWriter | undefined;

  runGame({
    seed,
    collectEvents: false,
    onGameStart: (state) => {
      writer = new TraceWriter(
        { filePath: tracePath, includeSnapshots: false },
        createTraceMeta({ seed, state, cliArgs: { command: 'test' } }),
      );
    },
    onRound: (round) => writer?.recordRound(round),
  });

  return tracePath;
};

describe('trace command group', () => {
  it('renders a summary for trace view with filters applied', async () => {
    const tracePath = createTraceFile();
    const command = createTraceCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await command.parseAsync(['view', tracePath, '--only', 'wins'], { from: 'user' });

    const output = logSpy.mock.calls.map((call) => (call[0] as string)?.toString()).join('\n');
    expect(output).toContain('Trace:');
    expect(output).toMatch(/Rounds recorded/i);
    expect(output).toMatch(/filter: wins/i);
    expect(output).toMatch(/wins the trick/i);

    logSpy.mockRestore();
  });

  it('replays and verifies a trace', async () => {
    const tracePath = createTraceFile('verify-trace');
    const command = createTraceCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await command.parseAsync(['replay', tracePath, '--verify', '--verbosity', 'low', '--speed', '0'], {
      from: 'user',
    });

    const output = logSpy.mock.calls.map((call) => (call[0] as string)?.toString()).join('\n');
    expect(output).toMatch(/verification succeeded/i);
    expect(output).toMatch(/Replay complete/i);

    logSpy.mockRestore();
  });

  it('fails verification when the trace is tampered', async () => {
    const tracePath = createTraceFile('tamper-trace');
    const lines = readFileSync(tracePath, 'utf8').trim().split('\n');
    const firstEvent = JSON.parse(lines[1]);
    firstEvent.event.type = 'PileRecycled';
    lines[1] = JSON.stringify(firstEvent);
    writeFileSync(tracePath, `${lines.join('\n')}\n`, 'utf8');

    const command = createTraceCommand().exitOverride();

    await expect(command.parseAsync(['replay', tracePath, '--verify'], { from: 'user' })).rejects.toThrow(
      /Trace verification failed/,
    );
  });
});
