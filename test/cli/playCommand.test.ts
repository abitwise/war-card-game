import type { Command } from 'commander';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createPlayCommand } from '../../src/cli/commands/play.js';
import { defaultWarRules } from '../../src/engine/rules.js';

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
    expect(runInkPlay).toHaveBeenCalledWith(expect.objectContaining({ seed: 'default-seed', startAutoplay: false }));
  });

  it('routes to the prompt UI when requested', async () => {
    const command = createPlayCommand().exitOverride();
    await parseCommand(command, ['--ui', 'prompt', '--seed', 'prompt-seed', '--autoplay']);

    const { playInteractiveGame } = await import('../../src/cli/play/session.js');
    expect(playInteractiveGame).toHaveBeenCalledWith(
      expect.objectContaining({ seed: 'prompt-seed', startAutoplay: true }),
    );
  });

  it('throws on invalid UI option', async () => {
    const command = createPlayCommand().exitOverride();
    await expect(parseCommand(command, ['--ui', 'unknown'])).rejects.toThrow();
  });
});
