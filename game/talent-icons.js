// Small inline vectors stay crisp on every HUD size and need no external font.
const art = {
  sleep: '<path d="M5 17h22M7 17v-6h6v6m0-3h12v3M7 17v5m18-5v5M17 5h6l-6 5h6"/>',
  car: '<path d="m5 15 3-7h16l3 7v8H5ZM5 15h22M9 23v3m14-3v3M9 19h2m10 0h2"/>',
  rock: '<path d="m5 24 3-14 8-6 9 7 3 13ZM8 10l8 6 9-5m-9 5v8"/>',
  boar: '<path d="m7 12-2-6 8 4m12 2 2-6-8 4M7 12c-6 13 24 13 18 0-4-5-14-5-18 0ZM11 20h10v5H11ZM10 16h1m10 0h1m-9 6h1m4 0h1"/>',
  shoe: '<path d="m8 6 7 2-2 7 6 5 8 2v5H5V14Zm5 9 5-3m-2 6 5-3M5 23h22"/>',
  wolf: '<path d="m6 5 8 6h4l8-6-2 17-8 6-8-6ZM9 15l4 2m10-2-4 2m-6 4 3 3 3-3"/>',
  shield: '<path d="M16 4 27 8v8c0 6-11 12-11 12S5 22 5 16V8ZM16 9v13m-6-7h12"/>',
  fire: '<path d="M18 3c2 9-7 9-2 15 3-1 4-4 5-6 12 16-16 22-15 7 0-5 5-10 6-13-1 8 4 9 6-3Z"/>',
  dodge: '<path d="M4 10h8M2 16h7m-4 6h7m8-17-6 9 5 4-6 9m1-13 10-3m-5 7 8 4"/><circle cx="24" cy="5" r="2"/>',
  storm: '<path d="M5 7c20-7 31 7 0 6m4 5c18-5 24 4 1 4m4 5h5M9 4h14"/>',
  brush: '<path d="m12 18 12-14 4 4-14 12ZM12 18c-8-1-4 8-9 9 12 3 15-4 9-9Z"/>',
  palette: '<path d="M27 19C34 4 7-2 4 15c-2 9 11 16 14 9 2-5 7 1 9-5Z"/><circle cx="10" cy="12" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="23" cy="12" r="1"/><circle cx="10" cy="20" r="1"/>',
  book: '<path d="M16 8C10 4 5 5 3 6v19c4-2 9-1 13 2 4-3 9-4 13-2V6c-2-1-7-2-13 2ZM16 8v19M7 11l5 1m8 0 5-1"/>',
  belt: '<path d="M3 11h7l3-4h6l3 4h7v12h-7l-3 4h-6l-3-4H3Z"/><path d="m16 11 2 4 4 1-3 3v4l-3-2-3 2v-4l-3-3 4-1Z"/>',
};
export const BRANCH_ICONS = { karonux: ['car', 'sleep', 'dodge'], jualos: ['shield', 'boar', 'rock'], yanu: ['shoe', 'wolf', 'dodge'], lorenzo: ['rock', 'fire', 'shield'], jo: ['dodge', 'storm', 'belt'], kikor: ['brush', 'palette', 'book'], gustavax: ['rock', 'belt', 'fire'] };
export const branchIcon = (kind, branch = 0) => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${art[BRANCH_ICONS[kind]?.[branch] || 'shield']}</svg>`;

export function talentIcon(kind, node) {
  const index = Number(node.id.split('_').at(-1));
  const symbols = [BRANCH_ICONS[kind]?.[node.branchIndex] || 'shield', 'dodge', 'storm', 'fire', 'shield', 'shoe', 'rock', 'wolf', 'belt', 'book', 'fire', 'belt'];
  return '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + art[symbols[index % symbols.length]] + '</svg>';
}
