export type TieResolution = 'standard-war' | 'sudden-death';
export type CollectMode = 'bottom-of-draw' | 'won-pile';

export type WarRules = {
  numDecks: number;
  warFaceDownCount: number;
  collectMode: CollectMode;
  shuffleWonPileOnRecycle: boolean;
  maxRounds?: number;
  tieResolution: TieResolution;
  aceHigh: boolean;
};

export const defaultWarRules: WarRules = {
  numDecks: 1,
  warFaceDownCount: 1,
  collectMode: 'won-pile',
  shuffleWonPileOnRecycle: true,
  maxRounds: 10000,
  tieResolution: 'standard-war',
  aceHigh: true,
};

export type WarRulesInput = Partial<WarRules>;

const isValidCollectMode = (value: string): value is CollectMode =>
  value === 'bottom-of-draw' || value === 'won-pile';

const isValidTieResolution = (value: string): value is TieResolution =>
  value === 'standard-war' || value === 'sudden-death';

export const validateWarRules = (input: WarRulesInput = {}): WarRules => {
  const merged: WarRules = { ...defaultWarRules, ...input };

  if (!Number.isInteger(merged.numDecks) || merged.numDecks < 1) {
    throw new Error('numDecks must be an integer >= 1');
  }

  if (!Number.isInteger(merged.warFaceDownCount) || merged.warFaceDownCount < 0) {
    throw new Error('warFaceDownCount must be a non-negative integer');
  }

  if (merged.maxRounds !== undefined) {
    if (!Number.isInteger(merged.maxRounds) || merged.maxRounds < 1) {
      throw new Error('maxRounds must be an integer >= 1 when provided');
    }
  }

  if (!isValidCollectMode(merged.collectMode)) {
    throw new Error('collectMode must be "bottom-of-draw" or "won-pile"');
  }

  if (!isValidTieResolution(merged.tieResolution)) {
    throw new Error('tieResolution must be "standard-war" or "sudden-death"');
  }

  return merged;
};
