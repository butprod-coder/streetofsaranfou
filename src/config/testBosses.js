import { CAMPAIGN_LEVELS } from './levels.js';

/** Entrées du menu Test Boss — un boss par niveau campagne. */
export const TEST_BOSSES = CAMPAIGN_LEVELS.map((lv, levelIdx) => ({
  levelIdx,
  levelName: lv.name,
  bossName: lv.boss?.name ?? 'Boss',
  label: `${levelIdx + 1}. ${lv.boss?.name ?? lv.name}`,
})).filter((_, i) => !!CAMPAIGN_LEVELS[i].boss);
