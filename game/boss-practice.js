import { Simulation } from './simulation.js';
import { CHAPTERS, FIGHTERS, fighter, clamp } from './data.js';
import { BALANCE } from './balance.js';

export function createBossPractice({ chapter = 0, character = 'jo', phase = 0, invulnerable = true, freeSpecial = true, cinema = false, difficulty = 'normal' } = {}) {
  chapter = clamp(Math.trunc(Number(chapter)) || 0, 0, CHAPTERS.length - 1);
  const sim = new Simulation([character], chapter, Date.now(), { difficulty });
  const s = sim.state; s.stage = 5; sim.enterStreet();
  s.practice = { chapter, character: s.players[0].kind, phase, invulnerable, freeSpecial, cinema, difficulty };
  s.props = []; s.pickups = []; s.surpriseDone = true;
  s.waves = [{ boss: true, kinds: [], label: 'TEST BOSS' }]; s.wave = -1; sim.spawnWave();
  const boss = s.enemies[0], config = BALANCE.bosses[boss.kind];
  phase = clamp(Math.trunc(Number(phase)) || 0, 0, boss.kind === 'lorenzo' ? 3 : config.phases.length + 1);
  s.practice.phase = phase;
  if (phase > 0) {
    boss.vehicle = false; boss.hp = boss.maxHp = config.hp;
    if (phase > 1) boss.hp = Math.floor(config.hp * (config.phases[phase - 2] ?? config.phases[0]));
    boss.bossPhase = phase; boss.enraged = phase > 1; boss.signatureReady = phase > 1;
  }
  if (!cinema || phase > 0) s.bossCinema = null;
  if (boss.kind === 'lorenzo' && phase === 2) sim.beginLorenzoSofa(boss);
  if (boss.kind === 'lorenzo' && phase === 3) { boss.sofaBroken = true; boss.bossPhase = 3; boss.enraged = true; }
  boss.cooldown = .8; s.players[0].lives = 0;
  return sim;
}

export function installBossPracticeUI() {
  document.querySelector('.home-buttons').insertAdjacentHTML('afterend', '<button class="text-button" data-action="boss-lab">Tester les boss <span>↗</span></button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', `<section id="boss-lab" class="screen modal-screen" aria-labelledby="boss-lab-title"><div class="modal boss-lab-modal"><p class="eyebrow">ENTRAÎNEMENT · ACCÈS DIRECT</p><h2 id="boss-lab-title">FACE AUX <em>PATRONS.</em></h2><p class="muted">Choisis ton adversaire et entre directement dans l’arène. Aucun effet sur ta sauvegarde ou tes records.</p><div class="boss-lab-fields"><label>Boss<select id="test-boss">${CHAPTERS.map((c, i) => `<option value="${i}">${fighter(c.boss).name} — ${c.name}</option>`).join('')}</select></label><label>Combattant<select id="test-fighter">${FIGHTERS.map(c => `<option value="${c.id}" ${c.id === 'jo' ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><label>Départ<select id="test-phase"></select></label><label>Difficulté<select id="test-difficulty"><option value="easy">Facile</option><option value="normal" selected>Normale</option><option value="hard">Difficile</option></select></label></div><label class="boss-lab-option"><input id="test-invulnerable" type="checkbox" checked> Invulnérable · observer sans mourir</label><label class="boss-lab-option"><input id="test-special" type="checkbox" checked> Spécial sans limite</label><label class="boss-lab-option"><input id="test-cinema" type="checkbox"> Voir l’introduction (combat complet)</label><button class="button primary" data-action="test-boss-play">Lancer le combat →</button><button class="text-button" data-action="home">← Menu</button></div></section>`);
  const phases = () => {
    const kind = CHAPTERS[Number(document.querySelector('#test-boss').value)].boss;
    document.querySelector('#test-phase').innerHTML = `<option value="0">Combat complet${kind === 'karonux' ? ' · Golf blanche' : ''}</option><option value="1">${kind === 'karonux' ? 'À pied · pleine santé' : 'Phase 1 · pleine santé'}</option>` + BALANCE.bosses[kind].phases.map((hp, i) => `<option value="${i + 2}">Phase ${i + 2} · ${Math.round(hp * 100)} % PV</option>`).join('');
    if (kind === 'lorenzo') {
      document.querySelector('#test-phase option[value="2"]').textContent = 'Phase 2 · Livraison du canapé et sbires';
      document.querySelector('#test-phase').insertAdjacentHTML('beforeend', '<option value="3">Phase 3 · Canapé détruit, Lorenzo enragé</option>');
    }
    if (kind === 'jo') document.querySelector('#test-phase option[value="2"]').textContent = 'Phase 2 · Canalisation, 30 transpalettes';
    if (kind === 'jualos') document.querySelector('#test-phase option[value="2"]').textContent = 'Phase 2 · Le Commercial';
  };
  document.querySelector('#test-boss').addEventListener('change', phases); phases();
  document.querySelector('#resume-button').insertAdjacentHTML('afterend', '<button class="button secondary practice-only hidden" data-action="test-boss-retry">Relancer ce boss</button><button class="button secondary practice-only hidden" data-action="boss-lab">Choisir un autre boss</button>');
  document.querySelector('#retry-button').insertAdjacentHTML('afterend', '<button class="button secondary practice-only hidden" data-action="boss-lab">Choisir un autre boss</button>');
}
