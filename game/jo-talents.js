export const JO_BRANCHES=[
  ['Pilote de transpalette électrique',[
    ['Transpalette','Spécial 5 s. Directions : conduire le transpalette électrique et pousser les ennemis.'],
    ['Palette','Une palette apparaît sur les fourches et élargit les collisions.'],
    ['Chargement','Les ennemis légers percutés restent coincés sur la palette. Pied : décharge.'],
    ['Livraison express','Durée 7 s. Main : accélération brutale. Pied : freinage et projection de la cargaison.'],
    ['Charge maximale','Jusqu’à trois ennemis légers sont empilés et projetés ensemble.'],
    ['LOGISTIQUE DE L’ENFER','Durée 9 s. Transpalette industriel géant, jusqu’à six ennemis chargés et livraisons à travers tout l’écran.'],
  ]],
  ['Le Roux',[
    ['Roux incandescent','Spécial 5 s. Cheveux enflammés. Main et Pied : frappes de feu.'],
    ['Tignasse explosive','Maintenir Pied : charge puis déclenche une explosion autour de Jo.'],
    ['Traînée de feu','L’esquive rapide laisse des flammes temporaires au sol.'],
    ['Surchauffe','Durée 7 s. Les frappes augmentent la chaleur, la chevelure et la taille des flammes.'],
    ['Incendiaire','À chaleur maximale, chaque combo de trois coups réussis déclenche une explosion.'],
    ['SUPER ROUX','Durée 9 s. Chevelure de flammes gigantesque. Les trois dernières secondes imposent la chaleur maximale et chaque attaque lourde explose.'],
  ]],
  ['La Fouine',[
    ['Fouine','Spécial 5 s. Fouine humanoïde. Esquive : déplacement fulgurant à travers les ennemis.'],
    ['Attaque sournoise','La première frappe après une traversée vise automatiquement le dos de l’ennemi traversé.'],
    ['Chapardeur','Les attaques dans le dos font tomber l’arme portée, une seule fois par ennemi.'],
    ['Disparition','Durée 7 s. Jo devient invisible pendant ses esquives.'],
    ['Embuscade','Attaquer juste après une esquive téléporte Jo derrière l’ennemi le plus proche.'],
    ['MAÎTRE FOUINE','Durée 9 s. Fouine très marquée. Chaque esquive peut lancer une série automatique d’attaques dans le dos de plusieurs ennemis.'],
  ]],
].map(([branch,entries],branchIndex)=>({branch,nodes:entries.map(([name,description],tier)=>({id:`jo_v3_${branchIndex}_${tier}`,name,description,tier,branch,branchIndex,ultimate:tier===5,effects:{}}))}));
export function joSelection(p){const ids=p.progression?.talents||[],branch=JO_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));return{branch,rank:branch<0?0:JO_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};}
