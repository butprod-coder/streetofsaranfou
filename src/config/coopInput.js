/** Assignation coop — 2 manettes uniquement. */
export const PAD_COOP_BINDINGS = {
  slots: [{ type: 'pad' }, { type: 'pad' }],
};

export function slotBinding(scene, slot) {
  return scene.coopInputBindings?.slots?.[slot];
}

export function slotUsesPad() {
  return true;
}
