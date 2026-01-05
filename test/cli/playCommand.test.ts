import type { Command } from 'commander';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createPlayCommand } from '../../src/cli/commands/play.js';
import { defaultWarRules } from '../../src/engine/rules.js';
import { DEFAULT_PLAYBACK_DELAY_MS } from '../../src/playback.js';

vi.mock('../../src/cli/play/session.js', () => ({
  playInteractiveGame: vi.fn(async () => defaultWarRules),
}));

vi.mock('../../src/adapters/inkPlay.js', () => ({
  runInkPlay: vi.fn(async () => defaultWarRules),
}));

const parseCommand = async (command: Command, args: string[]) => {
  return command.parseAsync(['node', 'test', ...args], { from: 'user' });
};

describe('createPlayCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('uses the ink UI by default', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, ['--seed', 'default-seed']);

    const { runInkPlay } = await import('../../src/adapters/inkPlay.js');
    expect(runInkPlay).toHaveBeenCalledWith(
      expect.objectContaining({
        seed: 'default-seed',
        startAutoplay: false,
        verbosity: 'normal',
        speed: 1,
        delayMs: DEFAULT_PLAYBACK_DELAY_MS,
        pauseOnWar: false,
      }),
    );
  });

  it('routes to the prompt UI when requested', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, ['--ui', 'prompt', '--seed', 'prompt-seed', '--autoplay']);

    const { playInteractiveGame } = await import('../../src/cli/play/session.js');
    expect(playInteractiveGame).toHaveBeenCalledWith(
      expect.objectContaining({ seed: 'prompt-seed', startAutoplay: true, verbosity: 'normal' }),
    );
  });

  it('passes playback controls through to the selected UI', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, [
      '--ui',
      'prompt',
      '--seed',
      'controls-seed',
      '--speed',
      '3',
      '--delay-ms',
      '10',
      '--pause-on-war',
    ]);

    const { playInteractiveGame } = await import('../../src/cli/play/session.js');
    expect(playInteractiveGame).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 3, delayMs: 10, pauseOnWar: true }),
    );
  });

  it('throws on invalid UI option', async () => {
    const command = createPlayCommand().exitOverride();
    await expect(parseCommand(command, ['--ui', 'unknown'])).rejects.toThrow();
  });

  it('passes verbosity flag through to the renderer', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, ['--verbosity', 'high']);

    const { runInkPlay } = await import('../../src/adapters/inkPlay.js');
    expect(runInkPlay).toHaveBeenCalledWith(expect.objectContaining({ verbosity: 'high' }));
  });

  it('passes player names to the selected UI', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, ['--players', 'Alice,Bob,Charlie']);

    const { runInkPlay } = await import('../../src/adapters/inkPlay.js');
    expect(runInkPlay).toHaveBeenCalledWith(
      expect.objectContaining({ playerNames: ['Alice', 'Bob', 'Charlie'], seed: 'interactive' }),
    );
  });

  it('rejects invalid player counts', async () => {
    const command = createPlayCommand().exitOverride();

    await expect(parseCommand(command, ['--players', 'Solo'])).rejects.toThrow(/players requires between 2 and 4/);
  });
});
