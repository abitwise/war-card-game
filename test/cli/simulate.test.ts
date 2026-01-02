import { describe, expect, it, vi } from 'vitest';
import { createSimulateCommand, runSimulations } from '../../src/cli/commands/simulate.js';

describe('runSimulations', () => {
  it('derives seeds from base and remains deterministic', () => {
    const first = runSimulations({ games: 2, seedBase: 'cli-seed' });
    const second = runSimulations({ games: 2, seedBase: 'cli-seed' });

    expect(first.runs.map((run) => run.seed)).toEqual(['cli-seed-1', 'cli-seed-2']);
    expect(second).toEqual(first);
  });
});

describe('simulate command', () => {
  it('prints JSON when requested', async () => {
    const command = createSimulateCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--seed', 'json-seed', '--json'], {
      from: 'user',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.games).toBe(1);
    expect(payload.seedBase).toBe('json-seed');

    logSpy.mockRestore();
  });

  it('rejects incompatible output flags', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--json', '--csv'], { from: 'user' }),
    ).rejects.toThrow();
  });

  it('validates games input', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(command.parseAsync(['node', 'war', 'simulate', '--games', '0'], { from: 'user' })).rejects.toThrow(
      /positive integer/,
    );
  });
});
