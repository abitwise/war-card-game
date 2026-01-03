import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createSimulateCommand, runSimulations } from '../../src/cli/commands/simulate.js';

describe('runSimulations', () => {
  it('derives seeds from base and remains deterministic', () => {
    const first = runSimulations({ games: 2, seedBase: 'cli-seed' });
    const second = runSimulations({ games: 2, seedBase: 'cli-seed' });

    expect(first.runs.map((run) => run.seed)).toEqual(['cli-seed-1', 'cli-seed-2']);
    expect(second).toEqual(first);
  });

  it('writes separate files for each traced game in sampled mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'war-sampled-trace-'));
    const basePath = join(dir, 'games.jsonl');

    runSimulations({
      games: 5,
      seedBase: 'sampled-test',
      trace: {
        filePath: basePath,
        mode: 'sampled',
        sampleRate: 1.0, // Trace all games to ensure we get multiple files
        includeSnapshots: false,
        includeTopCards: false,
      },
    });

    // Check that separate files were created for each game
    const expectedFiles = [
      join(dir, 'games-game1.jsonl'),
      join(dir, 'games-game2.jsonl'),
      join(dir, 'games-game3.jsonl'),
      join(dir, 'games-game4.jsonl'),
      join(dir, 'games-game5.jsonl'),
    ];

    expectedFiles.forEach((filePath) => {
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);
      const meta = JSON.parse(lines[0]);
      expect(meta.type).toBe('meta');
      expect(meta.seed).toMatch(/^sampled-test-\d+$/);
    });
  });

  it('handles filenames without extensions in sampled mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'war-sampled-trace-'));
    const basePath = join(dir, 'tracefile');

    runSimulations({
      games: 2,
      seedBase: 'no-ext-test',
      trace: {
        filePath: basePath,
        mode: 'sampled',
        sampleRate: 1.0,
        includeSnapshots: false,
        includeTopCards: false,
      },
    });

    // Should append suffix even without extension
    expect(existsSync(join(dir, 'tracefile-game1'))).toBe(true);
    expect(existsSync(join(dir, 'tracefile-game2'))).toBe(true);
  });

  it('validates trace-game-index is within range', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(
        ['node', 'war', 'simulate', '--games', '10', '--trace', 'out.jsonl', '--trace-game-index', '15'],
        { from: 'user' },
      ),
    ).rejects.toThrow(/trace-game-index must be an integer between 1 and 10/);
  });

  it('allows sample rate of 0', async () => {
    const command = createSimulateCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dir = mkdtempSync(join(tmpdir(), 'war-zero-rate-'));
    const tracePath = join(dir, 'games.jsonl');

    await command.parseAsync(
      [
        'node',
        'war',
        'simulate',
        '--games',
        '5',
        '--trace',
        tracePath,
        '--trace-mode',
        'sampled',
        '--trace-sample-rate',
        '0',
      ],
      { from: 'user' },
    );

    // Should not create any trace files when sample rate is 0
    expect(existsSync(tracePath)).toBe(false);
    expect(existsSync(join(dir, 'games-game1.jsonl'))).toBe(false);

    logSpy.mockRestore();
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

  it('validates trace sampling arguments', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(
        ['node', 'war', 'simulate', '--games', '1', '--trace-mode', 'sampled', '--trace', 'out.jsonl'],
        { from: 'user' },
      ),
    ).rejects.toThrow(/trace-sample-rate/);
  });

  it('requires snapshots when requesting top-card traces', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(
        ['node', 'war', 'simulate', '--games', '1', '--trace', 'out.jsonl', '--trace-top-cards'],
        { from: 'user' },
      ),
    ).rejects.toThrow(/trace-top-cards requires --trace-snapshots/);
  });
});
