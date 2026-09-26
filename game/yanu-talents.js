export const YANU_BRANCHES=[
  ['Bête sauvage',[
    ['Bête sauvage','Spécial 5 s. Forme bestiale. Pied ou Saut : bond ciblé. Main : frappe animale.'],
    ['Griffes','Main : série de trois griffures rapides. Chaque bond prépare aussi une série de griffures.'],
    ['Prédateur','Mettre un ennemi au sol réarme immédiatement le bond vers une autre cible.'],
    ['Frénésie','Durée 7 s. Chaque ennemi vaincu augmente temporairement la vitesse des attaques.'],
    ['Chasse','Les bonds enchaînent automatiquement les ennemis proches tant qu’une nouvelle cible est disponible.'],
    ['BÊTE DE SARANFOU','Durée 9 s. Bête à quatre pattes, course rapide et bonds lointains presque sans toucher le sol.'],
  ]],
  ['Soirée fluo',[
    ['Fluo','Spécial 5 s. Tenue fluorescente. Main et Pied : frappes lumineuses qui étourdissent.'],
    ['Stroboscope','Tous les trois coups réussis, une impulsion lumineuse frappe autour de Yanu.'],
    ['Dancefloor','Le déplacement laisse des cases lumineuses temporaires qui explosent au rythme des pulsations.'],
    ['Rave','Durée 7 s. Un petit dancefloor mobile accompagne Yanu.'],
    ['BPM maximum','Enchaîner les coups accélère les pulsations. Le rythme retombe après une interruption.'],
    ['RAVE PARTY SARANFOU','Durée 9 s. Tenue fluo extrême, décor assombri, lasers et dancefloor géant. Les frappes et la musique suivent les mêmes pulsations.'],
  ]],
  ['Plantes carnivores',[
    ['Jardinier carnivore','Spécial 5 s. Apparence végétale. Main : plante une carnivore devant Yanu. Pied : frappe de liane.'],
    ['Racines','Les morsures immobilisent brièvement les ennemis ordinaires.'],
    ['Multiplication','Deux plantes peuvent être plantées simultanément.'],
    ['Croissance accélérée','Durée 7 s. Après quatre morsures, une plante devient géante.'],
    ['Reproduction','Une plante qui élimine un ennemi fait pousser une petite plante proche.'],
    ['SERRE DE L’ENFER','Durée 9 s. Yanu fusionne avec une carnivore. Des plantes poussent automatiquement et envahissent progressivement l’arène de racines et de mâchoires.'],
  ]],
].map(([branch,entries],branchIndex)=>({branch,nodes:entries.map(([name,description],tier)=>({id:`yanu_v3_${branchIndex}_${tier}`,name,description,tier,branch,branchIndex,ultimate:tier===5,effects:{}}))}));
export function yanuSelection(p){const ids=p.progression?.talents||[],branch=YANU_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));return{branch,rank:branch<0?0:YANU_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};}
