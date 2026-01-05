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

  it('supports multi-player simulations with per-player win tracking', () => {
    const summary = runSimulations({ games: 2, seedBase: 'three-player', playerCount: 3 });
    const repeat = runSimulations({ games: 2, seedBase: 'three-player', playerCount: 3 });

    expect(summary.players).toEqual(['Player 1', 'Player 2', 'Player 3']);
    expect(Object.keys(summary.wins)).toHaveLength(3);
    expect(summary).toEqual(repeat);
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

  it('computes percentiles, distributions, and interesting moments', () => {
    const summary = runSimulations({ games: 3, seedBase: 'stats-seed' });

    expect(summary.percentiles.rounds.p50).toBe(228);
    expect(summary.percentiles.rounds.p90).toBeCloseTo(401.6, 3);
    expect(summary.percentiles.rounds.p99).toBeCloseTo(440.66, 2);
    expect(summary.warDepthDistribution).toEqual({ 1: 50, 2: 2 });
    expect(summary.interesting.longestGames[0]).toEqual({
      gameNumber: 3,
      seed: 'stats-seed-3',
      rounds: 445,
      reason: 'win',
      winner: 'Player 2',
    });
    expect(summary.interesting.deepestWars[0]).toEqual({
      depth: 2,
      gameNumber: 2,
      seed: 'stats-seed-2',
      round: 49,
    });
    expect(summary.interesting.biggestSwings[0]).toEqual({
      swing: 10,
      gameNumber: 2,
      seed: 'stats-seed-2',
      round: 49,
    });
    expect(summary.histograms.rounds[0]).toEqual({ from: 140, to: 170, count: 1 });
    expect(summary.histograms.wars[summary.histograms.wars.length - 1]).toEqual({ from: 25, to: 25, count: 1 });
    expect(summary.totals.recycles).toBe(82);
    expect(summary.totals.leadChanges).toBe(34);
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
    expect(payload.percentiles.rounds.p50).toBeDefined();

    logSpy.mockRestore();
  });

  it('rejects incompatible output flags', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--json', '--csv'], { from: 'user' }),
    ).rejects.toThrow();
  });

  it('rejects markdown combined with JSON output', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--md', '--json'], { from: 'user' }),
    ).rejects.toThrow(/md cannot be combined/);
  });

  it('validates games input', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(command.parseAsync(['node', 'war', 'simulate', '--games', '0'], { from: 'user' })).rejects.toThrow(
      /positive integer/,
    );
  });

  it('validates player count', async () => {
    const command = createSimulateCommand().exitOverride();

    await expect(
      command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--players', '1'], { from: 'user' }),
    ).rejects.toThrow(/players must be an integer between 2 and 4/);
    await expect(
      command.parseAsync(['node', 'war', 'simulate', '--games', '1', '--players', '5'], { from: 'user' }),
    ).rejects.toThrow(/players must be an integer between 2 and 4/);
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

  it('prints histograms when requested', async () => {
    const command = createSimulateCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await command.parseAsync(
      ['node', 'war', 'simulate', '--games', '3', '--seed', 'stats-seed', '--hist'],
      { from: 'user' },
    );

    const output = logSpy.mock.calls.map((call) => call[0] as string).join('\n');
    expect(output).toContain('Rounds per game');
    expect(output).toContain('Wars per game');

    logSpy.mockRestore();
  });

  it('renders markdown output', async () => {
    const command = createSimulateCommand().exitOverride();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await command.parseAsync(['node', 'war', 'simulate', '--games', '2', '--seed', 'md-seed', '--md'], {
      from: 'user',
    });

    const output = logSpy.mock.calls.map((call) => call[0] as string).join('\n');
    expect(output).toContain('| Metric | Value |');
    expect(output).toContain('### Interesting Moments');

    logSpy.mockRestore();
  });
});
