export const GUSTAVAX_BRANCHES=[
  ['Sheitan démon',[
    ['Sheitan','Spécial 5 s. Véritable forme démoniaque. Main : griffes. Pied : griffes lourdes.'],
    ['Flammes infernales','Les attaques lourdes laissent des flammes infernales au sol.'],
    ['Téléportation','Esquive : disparaît dans les flammes et réapparaît dans la direction choisie.'],
    ['Démon supérieur','Durée 7 s. Démon plus grand ; de petits démons apparaissent ponctuellement.'],
    ['Possession','Certains ennemis ordinaires touchés par les flammes attaquent brièvement leurs alliés.'],
    ['GRAND SHEITAN','Durée 9 s. Démon massif. Les téléportations explosent ; des petits démons l’accompagnent pendant tout le Spécial.'],
  ]],
  ['Le Patron',[
    ['Patron','Spécial 5 s. Un sbire apparaît. Main : désigne un ennemi et ordonne son attaque.'],
    ['Délégation','Deux sbires peuvent être présents simultanément.'],
    ['Réunion d’équipe','Pied : rappelle les sbires. Main : les envoie ensemble sur une cible.'],
    ['Heures supplémentaires','Durée 7 s. Les sbires restent 4 secondes après le Spécial.'],
    ['Middle Management','Un manager plus puissant commande et accélère les petits sbires.'],
    ['COMITÉ DE DIRECTION','Durée 9 s. Grand patron et équipe complète. Main : assaut ciblé ; Pied : rassemblement ; Saut : attaque collective de zone. Les sbires restent jusqu’à leur mort.'],
  ]],
  ['Catcheur',[
    ['Catcheur','Spécial 5 s. Tenue de catch. Pied : attrape un ennemi proche puis effectue un Suplex. Main : frappe.'],
    ['Body Slam','Maintenir Pied pendant la prise : écrase la victime et touche les ennemis proches.'],
    ['Projectile humain','Esquive : frappe violemment le sol et fait tomber les ennemis alentours.'],
    ['Main Event','Durée 7 s. Les projections produisent une onde de choc.'],
    ['Prises aériennes','Saut : bondit sur un ennemi au sol pour une attaque de catch aérienne.'],
    ['WRESTLEMANIA SARANFOU','Durée 9 s. Champion de catch. Les cordes du ring permettent de rebondir en accélérant. La dernière projection déclenche une énorme onde de choc.'],
  ]],
].map(([branch,entries],branchIndex)=>({branch,nodes:entries.map(([name,description],tier)=>({id:`gustavax_v3_${branchIndex}_${tier}`,name,description,tier,branch,branchIndex,ultimate:tier===5,effects:{}}))}));
export function gustavaxSelection(p){const ids=p.progression?.talents||[],branch=GUSTAVAX_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));return{branch,rank:branch<0?0:GUSTAVAX_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};}
