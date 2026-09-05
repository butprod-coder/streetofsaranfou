export const CHARACTERS = [
  { key:'karonux', name:'KARONUX', title:'Le Fatigué', folder:'karonux', portrait:'karonux_p.png', hp:130, speed:5.1, damage:15, special:'Sieste explosive', specialType:'blast', color:0xff6a19, bio:'Équilibré · Explosion et récupération', power:4 },
  { key:'jualos', name:'JUALOS', title:'Le Poporc', folder:'jualos', portrait:'jualos_p.png', hp:185, speed:3.9, damage:20, special:'Charge Poporc', specialType:'charge', color:0xffb02e, bio:'Tank · Encaisse et traverse la mêlée', power:5 },
  { key:'yanu', name:'YANU', title:'La Bête', folder:'yanu', portrait:'yanu_p.png', hp:95, speed:6.6, damage:11, special:'Instinct du loup', specialType:'frenzy', color:0x6ad9ff, bio:'Vif · Combos et vitesse bestiale', power:3 },
  { key:'lorenzo', name:'LORENZO', title:'Crâne de Chmère', folder:'lorenzo', portrait:'lorenzo_p.png', hp:165, speed:4.3, damage:18, special:'Clope infernale', specialType:'fire', color:0xff493d, bio:'Brute · Solide et incendiaire', power:5 },
  { key:'jo', name:'JO', title:'La Mouk', folder:'jo', portrait:'jo_p.png', hp:110, speed:5.9, damage:13, special:'Tourbillon Mouk', specialType:'spin', color:0xa078ff, bio:'Berserk · Rapide et imprévisible', power:3 },
  { key:'kikor', name:'KIKOR', title:'Présent !', folder:'kikor', portrait:'kikor_p.png', hp:138, speed:5.0, damage:15, special:'Boule du lapin', specialType:'roll', color:0x72e69c, bio:'Bagarreur · Le bon choix en toute situation', power:4 },
  { key:'gustavax', name:'GUSTAVAX', title:'Le Philosophe', folder:'gustavax', portrait:'gustavax_p.png', hp:210, speed:4.5, damage:22, special:'Argument définitif', specialType:'gun', color:0xf0d66a, bio:'Parrain · Répond avec du plomb', power:5 },
];

export const LOCATIONS = [
  { name:'LE CHÊNE MAILLARD', memory:'« On rentre à pied. »', bg:'assets/shared/levels/level1/chene_maillard1.png', sky:0x07132a, fog:0x091225, neon:0x4f8fff, boss:'karonux' },
  { name:"CHÂTEAU DE L'ÉTANG", memory:'« Le raccourci qui rallonge tout. »', bg:'assets/shared/levels/level2/chateau_etang_01.png', sky:0x2a071a, fog:0x240a18, neon:0xff4d81, boss:'kikor' },
  { name:'STADE COLETTE BESSON', memory:'« Le dernier but comptait double. »', bg:'assets/shared/levels/level3/stade1.png', sky:0x130a2f, fog:0x170b2a, neon:0xbc62ff, boss:'yanu' },
  { name:'BOURG DE SARAN', memory:'« Rendez-vous devant la boulangerie. »', bg:'assets/shared/levels/level4/bourg1.png', sky:0x20092a, fog:0x1c0c28, neon:0xff5a9d, boss:'lorenzo' },
  { name:'SARAN BY NIGHT', memory:'« Le dernier bus était déjà passé. »', bg:'assets/shared/levels/level5/capsaran1.png', sky:0x02091c, fog:0x040b1d, neon:0x4786ff, boss:'jo' },
  { name:'COLLÈGE MONTJOIE', memory:'« Présent, mais pas vraiment. »', bg:'assets/shared/levels/level6/college_montjoie1.png', sky:0x1d1204, fog:0x1d1309, neon:0xffb33d, boss:'gustavax' },
];

export const ENEMY_ARCHETYPES = [
  { kind:'rôdeur', char:'jo', hp:42, speed:3.5, damage:7, tint:0xffc37a, score:100 },
  { kind:'sbire', char:'kikor', hp:58, speed:3.0, damage:9, tint:0xa9c7ff, score:150 },
  { kind:'brute', char:'lorenzo', hp:105, speed:2.15, damage:14, tint:0xd3a6ff, score:260 },
  { kind:'charlingals', folder:'enemies/charlingals', frame:'charlingals_marche1.png', hp:64, speed:2.7, damage:10, tint:0xffffff, score:210 },
  { kind:'guylux', folder:'enemies/guylux', frame:'guylux_marche1.png', hp:72, speed:2.55, damage:11, tint:0xffffff, score:240 },
  { kind:'papy jala', folder:'enemies/papy_jala', frame:'marche1.png', hp:80, speed:2.15, damage:12, tint:0xffffff, score:250 },
];

export function character(key) { return CHARACTERS.find(c => c.key === key) || CHARACTERS[0]; }
export function asset(path) { return encodeURI(path); }
export function charFrame(c, action='idle', frame=1) {
  if (c.key === 'gustavax') return asset(`assets/${c.folder}/${c.portrait}`);
  const names = { idle:'idle', walk:'marche', run:'court', punch:'poing', kick:'pied', jump:c.key === 'jo' ? 'saute' : 'saute', hurt:'tombe' };
  const stem = names[action] || names.idle;
  if (c.key === 'jo' && action === 'jump') return asset(`assets/jo/jo_saute${frame}.png`);
  const jumpStem = c.key === 'jualos' && action === 'jump' ? 'saut' : stem;
  return asset(`assets/${c.folder}/${c.key}_${jumpStem} (${frame}).png`);
}

