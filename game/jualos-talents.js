export const JUALOS_BRANCHES = [
  ['Commercial', [
    ['Commercial', 'Spécial 5 s. Main : recrute temporairement un ennemi faible devant Jualos. Pied : coup de mallette.'],
    ['Argumentaire commercial', 'La recrue se déplace et attaque plus vite.'],
    ['Vente additionnelle', 'Deux ennemis peuvent être recrutés simultanément.'],
    ['Contrat longue durée', 'Durée 7 s. Les recrues restent alliées 4 secondes après la transformation.'],
    ['Responsable commercial', 'Les recrues restent alliées après le Spécial et suivent Jualos dans les rues suivantes, tant qu’elles survivent.'],
    ['OPA HOSTILE', 'Durée 9 s. Grand patron : tous les ennemis ordinaires proches sont recrutés au déclenchement.'],
  ]],
  ['Gros Porc', [
    ['Gros Porc', 'Spécial 5 s. Véritable cochon. Main : coup de groin. Pied : charge.'],
    ['Coup de groin', 'Le groin frappe plus fort et projette les ennemis.'],
    ['Roulé-boulé', 'Maintenir Esquive : roule en boule à travers les groupes.'],
    ['Cochon sauvage', 'Durée 7 s. Charges plus rapides qui traversent plusieurs ennemis.'],
    ['Gros lard', 'Saut : bond suivi d’un écrasement avec onde de choc.'],
    ['MÉGA PORC', 'Durée 9 s. Énorme cochon, attaques renforcées et charge finale automatique à travers l’écran.'],
  ]],
  ['Guitariste', [
    ['Guitariste', 'Spécial 5 s. Main : accord et onde sonore à distance.'],
    ['Distorsion', 'Les ondes traversent plusieurs ennemis.'],
    ['Larsen', 'Maintenir Pied : charge un larsen prolongé qui étourdit les ennemis proches.'],
    ['Ampli à 11', 'Durée 7 s. Un ampli accompagne Jualos. Ondes plus grandes et puissantes.'],
    ['Mur du son', 'Chaque accord produit des ondes dans les deux directions.'],
    ['CONCERT DE SARANFOU', 'Durée 9 s. Guitar Hero, amplis et projecteurs. Ondes géantes et accord final couvrant l’écran pendant la dernière seconde.'],
  ]],
].map(([branch, entries], branchIndex) => ({branch, nodes: entries.map(([name, description], tier) => ({
  id:`jualos_v3_${branchIndex}_${tier}`,name,description,tier,branch,branchIndex,ultimate:tier===5,effects:{},
}))}));
export function jualosSelection(p){
  const ids=p.progression?.talents||[],branch=JUALOS_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));
  return {branch,rank:branch<0?0:JUALOS_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};
}
