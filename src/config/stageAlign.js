/** Réglages X / Y / zoom par segment de fond plein écran (localStorage). */

import { W } from './gameConfig.js';

export const STAGE_ALIGN_STORAGE_KEY = 'saranfou_stage_align_v1';

export const DEFAULT_STAGE_ALIGN = { x: 0, y: 0, scale: 1 };

export function loadAllStageAligns() {
  try {
    const raw = localStorage.getItem(STAGE_ALIGN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAllStageAligns(data) {
  localStorage.setItem(STAGE_ALIGN_STORAGE_KEY, JSON.stringify(data));
}

export function getStageAlign(levelIdx, stageIdx) {
  const all = loadAllStageAligns();
  const lv = all[String(levelIdx)];
  const st = lv?.[String(stageIdx)];
  if (!st) return { ...DEFAULT_STAGE_ALIGN };
  return {
    x: Number(st.x) || 0,
    y: Number(st.y) || 0,
    scale: Number(st.scale) || 1,
  };
}

export function setStageAlign(levelIdx, stageIdx, align) {
  const all = loadAllStageAligns();
  if (!all[String(levelIdx)]) all[String(levelIdx)] = {};
  all[String(levelIdx)][String(stageIdx)] = {
    x: Math.round(align.x ?? 0),
    y: Math.round(align.y ?? 0),
    scale: Math.round((align.scale ?? 1) * 1000) / 1000,
  };
  saveAllStageAligns(all);
}

export function exportStageAlignBlob() {
  return new Blob([JSON.stringify(loadAllStageAligns(), null, 2)], { type: 'application/json' });
}

export function importStageAlignFromObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  saveAllStageAligns(obj);
  return true;
}

/** Position X panorama d'un segment (identique à l'éditeur ALIGN). */
export function fullStageSegmentCenterX(stageIdx, levelIdx) {
  const align = getStageAlign(levelIdx, stageIdx);
  return W / 2 + stageIdx * W + align.x;
}

/** Position X à l'écran pendant le jeu (centre + offset alignement). */
export function fullStagePlayCenterX(stageIdx, levelIdx) {
  const align = getStageAlign(levelIdx, stageIdx);
  return W / 2 + align.x;
}

/** Distance de scroll entre deux segments pour raccord éditeur. */
export function fullStageScrollBetween(fromIdx, toIdx, levelIdx) {
  const raw =
    fullStageSegmentCenterX(toIdx, levelIdx) - fullStageSegmentCenterX(fromIdx, levelIdx);
  return Math.max(W * 0.85, raw);
}

/** Applique offset + zoom aux métriques plein écran. */
export function applyStageAlignToMetrics(metrics, levelIdx, stageIdx) {
  const align = getStageAlign(levelIdx, stageIdx);
  const mul = align.scale ?? 1;
  return {
    ...metrics,
    scaleX: metrics.scaleX * mul,
    scaleY: metrics.scaleY * mul,
    alignX: align.x ?? 0,
    alignY: align.y ?? 0,
  };
}
