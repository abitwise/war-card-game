import { input } from '@inquirer/prompts';
import {
  renderHelp,
  renderIntro,
  renderRoundEvents,
  renderStats,
  type RendererVerbosity,
} from '../../adapters/interactiveRenderer.js';
import { createGame } from '../../engine/game.js';
import type { RoundEvent } from '../../engine/round.js';
import { playRound } from '../../engine/round.js';
import type { WarRulesInput } from '../../engine/rules.js';
import type { GameState } from '../../engine/state.js';

export type PromptAction = 'next' | 'autoplay' | 'stats' | 'quit' | 'help';

type PromptContext = {
  autoplay: boolean;
  state: GameState;
};

export type PromptHandler = (context: PromptContext) => Promise<PromptAction>;

export type RoundCompleteHandler = (result: { state: GameState; events: RoundEvent[] }) => void;

export type PlayOptions = {
  seed?: string;
  rules?: WarRulesInput;
  prompt?: PromptHandler;
  output?: (line: string) => void;
  autoplayBurst?: number;
  playerNames?: string[];
  startAutoplay?: boolean;
  onGameStart?: (state: GameState) => void;
  onRoundComplete?: RoundCompleteHandler;
  verbosity?: RendererVerbosity;
};

const parseAction = (value: string): PromptAction => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') return 'next';
  if (trimmed === 'a') return 'autoplay';
  if (trimmed === 's') return 'stats';
  if (trimmed === 'q') return 'quit';
  if (trimmed === '?') return 'help';
  return 'help';
};

const defaultPrompt: PromptHandler = async (context) => {
  const value = await input({
    message: `Press Enter for next round | a: toggle autoplay (${context.autoplay ? 'on' : 'off'}) | s: stats | q: quit | ?: help`,
  });
  return parseAction(value ?? '');
};

const playRoundAndRender = (
  state: GameState,
  rng: ReturnType<typeof createGame>['rng'],
  output: (line: string) => void,
  onRoundComplete?: RoundCompleteHandler,
  verbosity: RendererVerbosity = 'normal',
): { state: GameState; events: RoundEvent[] } => {
  const result = playRound(state, rng);
  renderRoundEvents(result.events, result.state, output, verbosity);
  onRoundComplete?.(result);
  return result;
};

export const playInteractiveGame = async (options: PlayOptions = {}) => {
  const seed = options.seed ?? 'interactive';
  const output = options.output ?? console.log;
  const prompt = options.prompt ?? defaultPrompt;
  const autoplayBurst = options.autoplayBurst ?? 5;

  const { state: initialState, rng } = createGame({
    seed,
    rules: options.rules,
    playerNames: options.playerNames,
  });
  const verbosity = options.verbosity ?? 'normal';

  options.onGameStart?.(initialState);

  let state = initialState;
  let autoplay = options.startAutoplay ?? false;

  renderIntro(seed, state, output, autoplay);
  if (autoplay) {
    output('Autoplay enabled.');
  }

  while (state.active) {
    if (autoplay && state.active) {
      let roundsPlayed = 0;
      while (state.active && roundsPlayed < autoplayBurst) {
        const result = playRoundAndRender(state, rng, output, options.onRoundComplete, verbosity);
        state = result.state;
        roundsPlayed += 1;
      }
      if (!state.active) {
        break;
      }
    }

    const action = await prompt({ autoplay, state });
    if (action === 'quit') {
      output('Quitting game. Thanks for playing!');
      return state;
    }
    if (action === 'help') {
      renderHelp(autoplay, output);
      continue;
    }
    if (action === 'stats') {
      renderStats(state, output);
      continue;
    }
    if (action === 'autoplay') {
      autoplay = !autoplay;
      output(`Autoplay ${autoplay ? 'enabled' : 'disabled'}.`);
      continue;
    }

    const result = playRoundAndRender(state, rng, output, options.onRoundComplete, verbosity);
    state = result.state;
  }

  if (!state.active) {
    renderStats(state, output);
  }

  return state;
};
