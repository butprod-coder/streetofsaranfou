import Phaser from 'phaser';

let prototypePatched = false;

/**
 * Phaser 3.80 — GamepadPlugin.stopListeners() crash si gamepads[i] est undefined
 * (table sparse quand les manettes ont des index navigateur 1, 3, etc.).
 * Correctif sur le prototype : toutes les scènes en bénéficient automatiquement.
 */
function patchGamepadPrototype(gp) {
  if (prototypePatched || !gp) return;
  prototypePatched = true;

  const proto = Object.getPrototypeOf(gp);

  proto.stopListeners = function stopListenersSafe() {
    if (this.target && this.onGamepadHandler) {
      this.target.removeEventListener('gamepadconnected', this.onGamepadHandler);
      this.target.removeEventListener('gamepaddisconnected', this.onGamepadHandler);
    }
    const ev = this.sceneInputPlugin && this.sceneInputPlugin.pluginEvents;
    if (ev) {
      ev.off(Phaser.Input.Events.UPDATE, this.update, this);
    }
    const pads = this.gamepads;
    if (pads) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]) pads[i].removeAllListeners();
      }
    }
  };

  proto.shutdown = function shutdownSafe() {
    this.stopListeners();
    this.removeAllListeners();
  };
}

/** Applique le correctif dès qu'une instance GamepadPlugin est disponible. */
export function ensureGamepadPatch(game) {
  if (prototypePatched) return true;
  if (!game) return false;
  for (const scene of game.scene.scenes) {
    const gp = scene.input && scene.input.gamepad;
    if (gp) {
      patchGamepadPrototype(gp);
      return true;
    }
  }
  return false;
}
