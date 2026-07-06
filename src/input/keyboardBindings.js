/** Schémas clavier — AZERTY par défaut pour le joueur 2 / solo. */
export const KEYBOARD_LAYOUTS = {
  arrows: {
    label: 'Flèches/ZQSD + K/L/Espace',
    move: { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' },
    act: { attack: 'K', special: 'L', jump: 'SPACE' },
  },
  zqsd: {
    label: 'ZQSD + F/G/H (J2 coop)',
    move: { up: 'Z', down: 'S', left: 'Q', right: 'D' },
    act: { attack: 'F', special: 'G', jump: 'H' },
  },
};

export function layoutForSlot(slot, layoutKey) {
  if (layoutKey && KEYBOARD_LAYOUTS[layoutKey]) return KEYBOARD_LAYOUTS[layoutKey];
  return slot === 0 ? KEYBOARD_LAYOUTS.arrows : KEYBOARD_LAYOUTS.zqsd;
}

export function layoutFromBinding(slot, binding) {
  return layoutForSlot(slot, binding?.layout);
}

export function addMoveKeys(keyboard, codes) {
  return {
    up: keyboard.addKey(codes.up),
    down: keyboard.addKey(codes.down),
    left: keyboard.addKey(codes.left),
    right: keyboard.addKey(codes.right),
  };
}

export function addActKeys(keyboard, codes) {
  return {
    attack: keyboard.addKey(codes.attack),
    special: keyboard.addKey(codes.special),
    jump: keyboard.addKey(codes.jump),
  };
}

export function readMove(moveKeys, p, speed) {
  let vx = 0;
  let vy = 0;
  if (!moveKeys) return { vx, vy };
  if (moveKeys.left?.isDown) {
    vx = -speed;
    p.facing = -1;
  }
  if (moveKeys.right?.isDown) {
    vx = speed;
    p.facing = 1;
  }
  if (moveKeys.up?.isDown) vy = -speed;
  if (moveKeys.down?.isDown) vy = speed;
  return { vx, vy };
}

export function bindKeyNav(keyboard, layout, handlers) {
  const codes = layout.move;
  const wrap = (fn) => () => fn();
  keyboard.on(`keydown-${codes.up}`, wrap(handlers.up));
  keyboard.on(`keydown-${codes.down}`, wrap(handlers.down));
  keyboard.on(`keydown-${codes.left}`, wrap(handlers.left));
  keyboard.on(`keydown-${codes.right}`, wrap(handlers.right));
  if (layout.act?.attack) {
    keyboard.on(`keydown-${layout.act.attack}`, wrap(handlers.confirm ?? (() => {})));
  }
}
