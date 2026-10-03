// Values are local to the ability, never passive bonuses to the whole character.
// A number is the percentage added per extra star; $ keys add a fixed value.
export const ABILITY_UPGRADES = {
  karonux: [
    [{impact:.2,push:.25},{reverseSpeed:.15,reverseDelay:-.18},{driftRange:.18,driftDelay:-.18},{acceleration:.3,$duration:.7},{chainLife:.4,chainSpeed:.3},{ultimateRange:.15,ultimatePower:.2}],
    [{frost:.25},{shatterRange:.2,shatterPower:.2},{trailLife:.3,trailRange:.2},{blizzardRange:.2,blizzardRate:-.15,$duration:.7},{contagion:.25},{ultimateRange:.15,ultimatePower:.2}],
    [{strikeRange:.15},{comboRate:-.15,comboPower:.2},{chargeRate:.3,launch:.25},{landingRange:.2,jumpRate:-.18,$duration:.7},{spinRange:.2,spinRate:-.18},{ultimateRange:.15,ultimatePower:.2}],
  ],
  lorenzo: [
    [{cloudLife:.35,cloudRange:.15},{decoyLife:.5},{confusionLife:.4},{cloudRange:.2,$duration:.7},{fireLife:.3,fireRange:.2},{ultimateRange:.15,ultimatePower:.2}],
    [{flightSpeed:.12},{droppingRange:.2,droppingRate:-.18},{divePower:.2,diveRate:-.18},{carryLife:.35,carryRange:.2,$duration:.7},{swarmLife:.4,swarmRate:-.15},{ultimateRange:.15,ultimatePower:.2}],
    [{headRange:.15,headPush:.25},{chargeSpeed:.15,chargeRate:-.18},{diveRange:.2,diveRate:-.18},{reflectRange:.2,$duration:.7},{carryPower:.25},{ultimateRange:.15,ultimatePower:.2}],
  ],
  jualos: [
    [{recruitRange:.2},{allyRate:-.18,allySpeed:.15},{'$capacity':1},{'$contract':2,$duration:.7},{allyHealth:.25},{ultimateRange:.15,ultimatePower:.2}],
    [{snoutRange:.15},{snoutPower:.2,snoutPush:.25},{rollSpeed:.15},{chargeSpeed:.15,$duration:.7},{slamRange:.2,slamRate:-.18},{ultimateRange:.15,ultimatePower:.2}],
    [{waveRange:.2},{wavePower:.2},{feedbackRange:.2,feedbackCharge:-.18},{waveRange:.15,$duration:.7},{rearPower:.25},{ultimateRange:.15,ultimatePower:.2}],
  ],
  yanu: [
    [{leapRange:.2},{clawRate:-.18,clawPower:.15},{leapRate:-.2},{frenzyLife:.4,$duration:.7},{'$chain':1},{ultimateRange:.15,ultimatePower:.2}],
    [{stun:.25},{pulseRange:.2},{tileLife:.3,tileRange:.2},{pulseRange:.15,$duration:.7},{tempo:.15},{ultimateRange:.15,ultimatePower:.2}],
    [{biteRate:-.18},{rootLife:.3},{'$capacity':1},{'$growth':-1,$duration:.7},{plantHealth:.2},{ultimateRange:.15,ultimatePower:.2}],
  ],
  jo: [
    [{acceleration:.25},{collisionRange:.15},{throwRange:.25},{boostLife:.25,boostRate:-.15,$duration:.7},{'$capacity':1},{ultimateRange:.15,ultimatePower:.2}],
    [{fireLife:.3},{blastRange:.2,blastCharge:-.18},{fireLife:.25},{heatGain:.25,heatLoss:-.2,$duration:.7},{blastRange:.15},{ultimateRange:.15,ultimatePower:.2}],
    [{dashSpeed:.12},{backstabPower:.2},{'$stealEnergy':4},{'$hidden':.1,$duration:.7},{ambushRange:.2},{ultimateRange:.15,ultimatePower:.2}],
  ],
  kikor: [
    [{paintLife:.3},{potRange:.2},{drawRate:-.2},{paintRange:.2,$duration:.7},{drawingPower:.2},{ultimateRange:.15,ultimatePower:.2}],
    [{allyHealth:.25},{'$capacity':1},{rolePower:.2},{summonRate:-.2,$duration:.7},{clonePower:.25},{ultimateRange:.15,ultimatePower:.2}],
    [{bikeSpeed:.15},{wheelingRange:.2},{hopRange:.2,hopRate:-.18},{acceleration:.35,$duration:.7},{trickLife:.3},{ultimateRange:.15,ultimatePower:.2}],
  ],
  gustavax: [
    [{clawRange:.15},{fireLife:.3},{teleportRange:.2},{summonRate:-.2,$duration:.7},{possessionLife:.4},{ultimateRange:.15,ultimatePower:.2}],
    [{allyHealth:.25},{'$capacity':1},{assaultLife:.3},{'$contract':2,$duration:.7},{managerRate:-.2},{ultimateRange:.15,ultimatePower:.2}],
    [{gripRange:.2},{slamRange:.2},{downRange:.2},{projectionPower:.2,$duration:.7},{airRange:.2,airRate:-.18},{ultimateRange:.15,ultimatePower:.2}],
  ],
};
const labels={impact:'dégâts des percussions',push:'projection',reverseSpeed:'vitesse de marche arrière',reverseDelay:'recharge de marche arrière',driftRange:'rayon du dérapage',driftDelay:'recharge du dérapage',acceleration:'accélération',chainLife:'durée des chaînes',chainSpeed:'bonus de vitesse par collision',frost:'froid appliqué',shatterRange:'rayon des explosions de glace',shatterPower:'dégâts des explosions de glace',trailLife:'durée des traînées',trailRange:'largeur des traînées',blizzardRange:'rayon du blizzard',blizzardRate:'intervalle du blizzard',contagion:'froid transmis',strikeRange:'portée des béquilles',comboRate:'intervalle du combo',comboPower:'dégâts du dernier coup',chargeRate:'vitesse de charge',launch:'force du coup chargé',landingRange:'rayon de retombée',jumpRate:'recharge du saut',spinRange:'rayon de la toupie',spinRate:'recharge de la toupie',cloudLife:'durée des nuages',cloudRange:'rayon des nuages',decoyLife:'résistance des leurres',confusionLife:'durée de confusion',fireLife:'durée des flammes',fireRange:'rayon des foyers',flightSpeed:'vitesse de vol',droppingRange:'rayon des fientes',droppingRate:'intervalle de largage',divePower:'dégâts du piqué',diveRate:'recharge du piqué',carryLife:'durée de portage',carryRange:'portée du portage',swarmLife:'durée de la nuée',swarmRate:'intervalle des attaques de la nuée',headRange:'portée du coup de tête',headPush:'projection du coup de tête',chargeSpeed:'vitesse de charge',diveRange:'portée du ricochet',reflectRange:'portée du renvoi',carryPower:'dégâts des victimes relâchées',recruitRange:'portée du recrutement',allyRate:'intervalle des attaques alliées',allySpeed:'vitesse des recrues',allyHealth:'vie des alliés',snoutRange:'portée du groin',snoutPower:'dégâts du groin',snoutPush:'projection du groin',rollSpeed:'vitesse du roulé-boulé',slamRange:'rayon du slam',slamRate:'recharge du slam',waveRange:'taille des ondes',wavePower:'dégâts des ondes',feedbackRange:'rayon du larsen',feedbackCharge:'temps de charge du larsen',rearPower:'puissance des accords bidirectionnels',leapRange:'portée du bond',clawRate:'intervalle des griffures',clawPower:'dégâts des griffures',leapRate:'recharge du bond',frenzyLife:'durée de la frénésie',stun:'étourdissement lumineux',pulseRange:'rayon des pulsations',tileLife:'durée des cases',tileRange:'rayon des cases',tempo:'accélération du BPM',biteRate:'intervalle des morsures',rootLife:'durée des racines',plantHealth:'puissance des jeunes plantes',collisionRange:'largeur de collision',throwRange:'portée de décharge',boostLife:'durée du turbo',boostRate:'recharge du turbo',blastRange:'rayon des explosions',blastCharge:'temps de charge des explosions',heatGain:'gain de chaleur',heatLoss:'perte de chaleur',dashSpeed:'vitesse de traversée',backstabPower:'dégâts dans le dos',ambushRange:'portée de l’embuscade',paintLife:'durée de peinture',potRange:'rayon des pots',drawRate:'temps de dessin',paintRange:'taille des zones peintes',drawingPower:'dégâts des créations',rolePower:'efficacité des rôles',summonRate:'intervalle des invocations',clonePower:'puissance des clones',bikeSpeed:'vitesse du vélo',wheelingRange:'portée du wheeling',hopRange:'rayon du bunny hop',hopRate:'recharge du bunny hop',trickLife:'conservation de vitesse pendant les figures',clawRange:'portée des griffes',teleportRange:'portée de téléportation',possessionLife:'durée de possession',assaultLife:'durée de l’assaut commandé',managerRate:'intervalle des attaques avec manager',gripRange:'portée de prise',downRange:'rayon de renversement',projectionPower:'dégâts des projections',airRange:'portée de prise aérienne',airRate:'recharge de prise aérienne',ultimateRange:'portée de l’ultime',ultimatePower:'puissance de l’ultime'};
const additions={capacity:['alliés/plantes maximum', ''],duration:['durée du Spécial',' s'],contract:['survie des alliés après le Spécial',' s'],chain:['cibles par chaîne',''],growth:['morsures nécessaires à la croissance',''],stealEnergy:['énergie par vol',''],hidden:['invisibilité après esquive',' s']};
export function stars(p,tier){
  const a=p.specialState,branch=a?.transformation?a.branch:Number(p.progression?.talents?.[0]?.split('_').at(-2));
  const id=`${p.kind}_v3_${branch}_${tier}`;
  return Math.max(0,Math.min(3,p.progression?.talentRanks?.[id]??(p.progression?.talents?.includes(id)?1:0)));
}
export function tune(p,tier,key,base){
  const branch=p.specialState?.branch??Number(p.progression?.talents?.[0]?.split('_').at(-2));
  const config=ABILITY_UPGRADES[p.kind]?.[branch]?.[tier]||{},extra=Math.max(0,stars(p,tier)-1);
  return base*(1+(config[key]||0)*extra)+(config['$'+key]||0)*extra;
}
export function upgradeDescription(node,kind){
  return Object.entries(ABILITY_UPGRADES[kind]?.[node.branchIndex]?.[node.tier]||{}).map(([key,value])=>{
    if(key[0]==='$'){const [name,unit]=additions[key.slice(1)];return `${name} ${value>0?'+':''}${value}${unit}`;}
    const label=key==='chargeRate'&&kind==='lorenzo'?'recharge de la charge':labels[key];
    return `${label} ${value>0?'+':''}${Math.round(value*100)} %`;
  }).join(' ; ')+' par étoile supplémentaire.';
}
export const MAX_STAR_INTERACTIONS={
  'karonux:0:4':'Trois collisions déclenchent un turbo court.',
  'karonux:1:2':'La traînée brise une cible déjà gelée.',
  'karonux:2:1':'Le dernier coup renverse les ennemis voisins.',
  'lorenzo:0:1':'Un leurre détruit déclenche une explosion de fumée.',
  'lorenzo:0:2':'Tous les ennemis désorientés peuvent frapper leurs alliés.',
  'lorenzo:1:1':'Les fientes interrompent les attaques ordinaires.',
  'lorenzo:2:3':'Les projectiles renvoyés infligent davantage de dégâts.',
  'jualos:0:1':'Le coup de mallette ordonne un assaut coordonné.',
  'jualos:1:1':'Les victimes projetées percutent leurs voisins.',
  'jualos:2:4':'Un troisième accord émet une onde supplémentaire.',
  'yanu:0:1':'Chaque série comporte une quatrième griffure.',
  'yanu:1:1':'Une pulsation tous les deux coups réussis.',
  'yanu:2:4':'Une plante peut se reproduire après deux morsures réussies, même sans élimination.',
  'jo:0:3':'Le freinage émet une onde de choc.',
  'jo:1:4':'À chaleur maximale, explosion tous les deux coups.',
  'jo:2:2':'Sur un ennemi sans arme, vole de l’énergie une seule fois.',
  'kikor:0:2':'Une création ordinaire peut frapper deux fois.',
  'kikor:0:4':'Haut / bas / neutre choisissent la création et son effet.',
  'kikor:1:2':'Le changement de rôle ordonne immédiatement un assaut.',
  'kikor:2:4':'Trois figures différentes déclenchent un turbo.',
  'gustavax:0:2':'L’arrivée de téléportation explose.',
  'gustavax:1:2':'Un assaut coordonné renverse les ennemis ordinaires.',
  'gustavax:2:0':'Un suplex renverse aussi les ennemis proches.',
};
export function maxStarDescription(node,kind){return MAX_STAR_INTERACTIONS[`${kind}:${node.branchIndex}:${node.tier}`]||'';}
export function feedback(sim,p,cell,x=p.x,y=p.y){sim.event('spectacle',{atlas:'talentUpgradeFX',cell,x,y:y-25});}
