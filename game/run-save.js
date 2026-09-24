import { cleanRoute } from './campaign-route.js';
import { Simulation } from './simulation.js';
import { FIGHTERS, clamp } from './data.js';
import { normalizeProfile, refreshPlayerStats } from './progression.js';
import { ENCOUNTER_ROSTER, STARTING_ENEMIES } from './encounters.js';
import { WEAPONS } from './weapons.js';
import { cleanNeighborhood } from './neighborhood-events.js';

export const RUN_SAVE_KEY = 'saranfou-run-v2';
export const RECORDS_KEY = 'saranfou-records-v2';
const number = (v, max, min = 0) => Number.isFinite(v) ? clamp(v, min, max) : min;
const integer = (v, max, min = 0) => Math.floor(number(v, max, min));
const bag = value => Array.isArray(value) ? [...new Set(value.filter(k => ENCOUNTER_ROSTER.includes(k)))].slice(0, ENCOUNTER_ROSTER.length) : [];
export function checkpoint(state) {
  if (state?.practice || state?.sandbox) return null;
  if (!state || !['intro', 'rest', 'clear', 'badges'].includes(state.phase) || state.enemies.some(e => e.hp > 0) || !state.players.some(p => p.hp > 0)) return null;
  return validateCheckpoint({ version: 4, runId: state.runId, chapter: state.chapter, stage: state.stage, wave: state.wave, phase: state.phase, route: state.route, finale:state.finale,
    time: state.time, seed: state.rngSeed, streetSeed: state.streetSeed, streetBag: state.streetBag, enemyOrder: state.enemyOrder, nextId: state.nextEntityId,
    difficulty: state.difficulty, score: state.score, kills: state.kills, bestCombo: state.bestCombo, neighborhood: state.neighborhood, estate: state.estate, stadium: state.stadium, bourg: state.bourg, night: state.night, school: state.school,
    players: state.players.map(p => ({ kind: p.kind, profile: p.progression, health: p.hp / p.maxHp, energy: p.energy, lives: p.lives,
      weapon: p.weapon, gymBalls: p.gymBalls, rewards: {}, choices: [], supportRole: p.supportRole, sleepSaveChapter: p.sleepSaveChapter })),
    props: state.props.filter(p => p.kind !== 'easel').map(p => [p.id, p.hp]),
    pickups: state.pickups.map(p => ({ kind: p.kind, amount: p.amount, weapon: p.weapon, uses: p.uses, x: p.x, y: p.y })),
  });
}
// Imported files are data, never simulation objects. Rebuild actors, waves and bonuses from a small whitelist.
export function validateCheckpoint(raw) {
  if (!raw || raw.version !== 4 || !Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > 2 || !['intro','rest','clear','badges'].includes(raw.phase) || !Number.isInteger(raw.chapter) || raw.chapter < 0 || raw.chapter > 6 || !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > (raw.chapter===6?6:5)) throw new Error('Sauvegarde incompatible ou invalide.');
  if (typeof raw.runId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.runId)) throw new Error('Identifiant de sortie invalide.');
  if(raw.chapter===6&&(!raw.finale||!Array.isArray(raw.finale.order)||raw.finale.order.length!==6||new Set(raw.finale.order).size!==6||raw.finale.order.some(n=>!Number.isInteger(n)||n<0||n>5)||raw.phase==='badges'||raw.phase==='clear'))throw new Error('Revanche finale invalide.');
  const players = raw.players.map(p => {
    if (!p || !FIGHTERS.some(f => f.id === p.kind)) throw new Error('Personnage invalide.');
    const rewards = {};
    const choices = [];
    return { kind: p.kind, profile: normalizeProfile(p.profile, p.kind), health: number(p.health, 1), energy: number(p.energy,100), lives: integer(p.lives,5),
      weapon: p.weapon && Object.hasOwn(WEAPONS,p.weapon.kind) ? { kind: p.weapon.kind, uses: integer(p.weapon.uses,24) } : null,
      gymBalls: integer(p.gymBalls,1), rewards, choices, supportRole: ['heal','guard','attack'].includes(p.supportRole) ? p.supportRole : 'attack', sleepSaveChapter: integer(p.sleepSaveChapter,5,-1) };
  });
  if (!players.some(p => p.health > 0)) throw new Error('Cette sortie est terminée.');
  return { version:4, runId:raw.runId, chapter:raw.chapter, stage:raw.stage, phase:raw.phase, route:cleanRoute(raw.route,raw.chapter,raw.phase), finale:raw.chapter===6?{order:[...raw.finale.order]}:null, wave:integer(raw.wave,4,-1), time:number(raw.time,86400),
    seed:integer(raw.seed,0xffffffff), streetSeed:integer(raw.streetSeed,0xffffffff), streetBag:bag(raw.streetBag), neighborhood:cleanNeighborhood(raw.neighborhood, raw.streetSeed), estate:cleanNeighborhood(raw.estate, raw.streetSeed, 1), stadium:cleanNeighborhood(raw.stadium, raw.streetSeed, 2), bourg:cleanNeighborhood(raw.bourg, raw.streetSeed, 3), night:cleanNeighborhood(raw.night, raw.streetSeed, 4), school:cleanNeighborhood(raw.school, raw.streetSeed, 5),
    enemyOrder: [...new Set([...bag(raw.enemyOrder), ...ENCOUNTER_ROSTER])].filter(k => !STARTING_ENEMIES.includes(k)), nextId:integer(raw.nextId,1000000,10),
    difficulty:['easy','normal','hard'].includes(raw.difficulty)?raw.difficulty:'normal', score:integer(raw.score,10000000), kills:integer(raw.kills,10000),bestCombo:integer(raw.bestCombo,10000), players,
    props:(Array.isArray(raw.props)?raw.props:[]).slice(0,30).filter(p=>Array.isArray(p)).map(p=>[integer(p[0],1000000),number(p[1],10)]),
    pickups:(Array.isArray(raw.pickups)?raw.pickups:[]).slice(0,30).filter(p=>p&&['food','energy','weapon'].includes(p.kind)&& (p.kind!=='weapon'||Object.hasOwn(WEAPONS,p.weapon))).map(p=>({kind:p.kind,amount:p.amount == null ? undefined : number(p.amount,35),weapon:p.kind==='weapon'?p.weapon:undefined,uses:integer(p.uses,24),x:number(p.x,1230,50),y:number(p.y,660,450)})),
  };
}
export function restoreCheckpoint(raw) {
  const save = validateCheckpoint(raw), sim = new Simulation(save.players.map(p=>p.kind),save.chapter,save.streetSeed,{difficulty:save.difficulty,profiles:save.players.map(p=>p.profile)});
  const s=sim.state;
  s.neighborhood=save.neighborhood; s.estate=save.estate; s.stadium=save.stadium; s.bourg=save.bourg; s.night=save.night; s.school=save.school;
  s.route=save.route; s.routeReady={};s.finale=save.finale;
  s.stage=save.stage; s.enemyBag=[...save.streetBag]; s.enemyOrder=[...save.enemyOrder]; sim.seed=save.streetSeed; sim.nextId=10; sim.enterStreet();
  s.runId=save.runId; s.time=save.time; s.tick=Math.floor(save.time*60); s.phase=save.phase;
  s.wave=save.phase==='intro'?-1:['clear','badges'].includes(save.phase)?s.waves.length-1:Math.min(s.waves.length-2,Math.max(0,save.wave));
  s.chapterStory=false;
  s.phaseTime=save.phase==='intro'?1.5:5; s.score=save.score;s.kills=save.kills;s.bestCombo=save.bestCombo;
  if(['clear','badges'].includes(save.phase))s.rewardedStreet=save.chapter+':'+save.stage;
  // Do not resurrect consumed pickups or breakables when resuming a completed wave.
  s.props.forEach((p,i)=>{p.hp=Math.min(p.hp,save.props[i]?.[1]??0);});
  sim.nextId=Math.max(sim.nextId,save.nextId);s.pickups=save.pickups.map(p=>({...p,id:sim.nextId++}));
  save.players.forEach((p,i)=>{
    const actor=s.players[i];actor.rogueRewards={};refreshPlayerStats(actor);actor.hp=actor.maxHp*p.health;actor.energy=p.energy;actor.lives=p.lives;actor.weapon=p.weapon; actor.gymBalls=p.gymBalls;
    actor.rewardOptions=[];actor.rewardStreet=save.chapter+':'+save.stage;actor.supportRole=p.supportRole;actor.sleepSaveChapter=p.sleepSaveChapter;
  });
  sim.seed=save.seed;s.events=[];s.eventSeq=0;return sim;
}
export function readCheckpoint(storage = localStorage) { try { const raw=storage.getItem(RUN_SAVE_KEY);return raw?validateCheckpoint(JSON.parse(raw)):null; } catch { return null; } }

export function recordRun(state, slot, storage = localStorage) {
  if (state?.practice || state?.sandbox) return;
  const p=state?.players[slot];if(!p||!state.runId)return;
  let records;try{records=JSON.parse(storage.getItem(RECORDS_KEY)||'{}');}catch{records={};}
  if(!records||typeof records!=='object'||Array.isArray(records))records={};
  const old=records[p.kind]||{}, runs={...old.runs}, previous=runs[state.runId]||{};
  const delta=Math.max(0,p.progression.xp-(previous.xp||0)), victory=state.phase==='won'&&!previous.won;
  runs[state.runId]={xp:Math.max(p.progression.xp,previous.xp||0),won:state.phase==='won'||previous.won===true};
  const wins=integer(old.wins,100000)+(victory?1:0);
  const unlocks=new Set(Array.isArray(old.unlocks)?old.unlocks:[]);
  if(victory||previous.won)unlocks.add('first-victory');
  if(p.progression.level>=10)unlocks.add('veteran');
  if(p.progression.completed.length>=5)unlocks.add('boss-slayer');
  if(wins>=3)unlocks.add('saran-legend');
  records[p.kind]={xp:integer(old.xp,1e9)+delta,wins,bestScore:Math.max(integer(old.bestScore,1e7),state.score),bestLevel:Math.max(integer(old.bestLevel,20),p.progression.level),
    title:wins>=3?'Légende de Saran':wins?'Maître de la nuit':p.progression.level>=10?'Habitué de la rue':'Nouvelle tête',unlocks:[...unlocks].slice(0,24),runs:Object.fromEntries(Object.entries(runs).slice(-80))};
  storage.setItem(RECORDS_KEY,JSON.stringify(records));
}

export function finalDuelCheckpoint(state){
 if(!state||state.practice||state.sandbox||state.chapter!==6||state.stage!==6||state.phase!=='over')return null;
 return checkpoint({...state,phase:'intro',wave:-1,enemies:[],hazards:[],pickups:[],props:[],players:state.players.map(p=>({...p,hp:p.maxHp,lives:Math.max(2,p.lives)}))});
}
