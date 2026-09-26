export const KIKOR_BRANCHES=[
  ['Peintre',[
    ['Peintre','Spécial 5 s. Main : grandes éclaboussures. La peinture au sol ralentit les ennemis.'],
    ['Bombe de peinture','Pied : lance un pot de peinture qui explose à l’impact.'],
    ['Graffiti vivant','Maintenir Pied : dessine une créature sur le décor. Elle prend vie et attaque une fois.'],
    ['Street Artist','Durée 7 s. Les zones peintes sont plus grandes et persistent plus longtemps.'],
    ['Fresques vivantes','Les dessins alternent entre bête bondissante, oiseau à distance et poing de zone.'],
    ['MAÎTRE DE SARANFOU','Durée 9 s. Kikor couvert de peinture. Les graffitis animés envahissent les murs, puis en sortent pour combattre jusqu’à la fin du Spécial.'],
  ]],
  ['Invocateur',[
    ['Bonhomme vert','Spécial 5 s. Dessine immédiatement un petit Kikor vert. Main : invoque. Pied : coup de pinceau.'],
    ['La bande','Deux bonhommes verts peuvent être présents simultanément.'],
    ['Spécialisation','Pied : change le rôle des invocations entre bagarreur, lanceur et protecteur.'],
    ['Armée verte','Durée 7 s. Une invocation supplémentaire apparaît automatiquement toutes les 2 secondes.'],
    ['Reproduction','Une invocation ayant participé à une élimination peut créer un petit clone.'],
    ['INVASION KIKOR','Durée 9 s. Invocateur ultime. Les bonhommes arrivent constamment depuis les murs, le sol et les côtés, et accompagnent Kikor jusqu’à la fin du Spécial.'],
  ]],
  ['Cycliste',[
    ['Cycliste','Spécial 5 s. Sprite complet Kikor et vélo. Directions : rouler et percuter.'],
    ['Wheeling','Main : roue arrière qui frappe devant Kikor.'],
    ['Bunny Hop','Saut : bond avec le vélo puis écrasement sur les ennemis.'],
    ['Descente','Durée 7 s. La vitesse augmente tant que Kikor reste en mouvement.'],
    ['Freeride','Pied : dérapage. Wheelings, dérapages et sauts conservent la vitesse accumulée.'],
    ['TOUR DE SARANFOU','Durée 9 s. Cycliste extrême, vitesse maximale élevée et figures enchaînées presque continuellement.'],
  ]],
].map(([branch,entries],branchIndex)=>({branch,nodes:entries.map(([name,description],tier)=>({id:`kikor_v3_${branchIndex}_${tier}`,name,description,tier,branch,branchIndex,ultimate:tier===5,effects:{}}))}));
export function kikorSelection(p){const ids=p.progression?.talents||[],branch=KIKOR_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));return{branch,rank:branch<0?0:KIKOR_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};}
