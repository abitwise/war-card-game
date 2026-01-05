import chalk from 'chalk';
import { describe, expect, it, vi } from 'vitest';
import { playInteractiveGame, type PromptAction, type PromptHandler } from '../../src/cli/play/session.js';

const createPrompt = (actions: PromptAction[]): PromptHandler => {
  let index = 0;
  return vi.fn(async () => actions[index++] ?? 'quit');
};

const createRecorder = () => {
  const lines: string[] = [];
  return {
    lines,
    output: (line: string) => lines.push(line),
  };
};

describe('playInteractiveGame', () => {
  it('plays rounds and surfaces stats/help controls', async () => {
    chalk.level = 0;
    const prompt = createPrompt(['next', 'stats', 'help', 'quit']);
    const recorder = createRecorder();

    const state = await playInteractiveGame({
      seed: 'play-test',
      prompt,
      output: recorder.output,
      delayMs: 0,
    });

    expect(recorder.lines.some((line) => line.includes('Round 1'))).toBe(true);
    expect(recorder.lines.some((line) => line.includes('draw pile'))).toBe(true);
    expect(recorder.lines.some((line) => line.includes('Controls'))).toBe(true);
    expect(state.round).toBeGreaterThan(1);
  });

  it('runs autoplay batches when enabled', async () => {
    chalk.level = 0;
    const prompt = createPrompt(['autoplay', 'quit']);
    const recorder = createRecorder();

    const state = await playInteractiveGame({
      seed: 'auto-seed',
      prompt,
      output: recorder.output,
      autoplayBurst: 3,
      delayMs: 0,
    });

    expect(recorder.lines.some((line) => line.includes('Autoplay enabled'))).toBe(true);
    expect(state.round).toBeGreaterThan(1);
  });

  it('pauses autoplay when a war is detected and pause-on-war is enabled', async () => {
    chalk.level = 0;
    const prompt = createPrompt(['quit']);
    const recorder = createRecorder();

    const state = await playInteractiveGame({
      seed: 'war-3',
      prompt,
      output: recorder.output,
      autoplayBurst: 3,
      startAutoplay: true,
      pauseOnWar: true,
      delayMs: 0,
    });

    expect(recorder.lines.some((line) => line.includes('Autoplay paused due to war'))).toBe(true);
    expect(state.round).toBeGreaterThan(1);
  });
});
