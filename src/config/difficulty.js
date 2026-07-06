export const PROGRESS = { gustavaxUnlocked: false };

export const DIFFS = {
  facile: { label: 'FACILE', lives: 5, dmgMul: 0.7, hpMul: 1.25 },
  normal: { label: 'NORMAL', lives: 3, dmgMul: 1.0, hpMul: 1.0 },
  difficile: { label: 'DIFFICILE', lives: 2, dmgMul: 1.4, hpMul: 0.85 },
};

export const CONFIG = {
  shake: true,
  sound: true,
  musicVol: 0.35,
  sfxVol: 0.45,
  diff: 'normal',
  god: false,
  policeCharges: 1,
  maxPoliceCharges: 2,
};

export function DIFF() {
  return DIFFS[CONFIG.diff];
}
