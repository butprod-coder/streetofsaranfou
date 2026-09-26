export const LORENZO_BRANCHES = [
  ['Fumeur de Chmères', [
    ['Chimère', 'Spécial 5 s : Lorenzo fume dans une fumée colorée. Main et Pied créent des nuages persistants qui désorientent les ennemis.'],
    ['Hallucinations', 'Des faux Lorenzo apparaissent dans les nuages et attirent les attaques ennemies.'],
    ['Mauvais voyage', 'Les ennemis désorientés peuvent attaquer leurs alliés.'],
    ['Brouillard total', 'Durée 7 s. Un grand nuage suit Lorenzo pendant la transformation.'],
    ['Des cigarettes brûlantes', 'Pied : lance trois cigarettes au sol qui créent des foyers brûlants.'],
    ['CHIMÈRE TOTALE', 'Durée 9 s. Des dizaines de cigarettes envahissent l’écran et couvrent le sol de feu.'],
  ]],
  ['Pigeon', [
    ['Transformation Pigeon', 'Spécial 5 s : véritable pigeon. Directions : voler au-dessus des ennemis. Pied : piqué.'],
    ['Fiente tactique', 'Main : largue une fiente verticalement depuis le vol.'],
    ['Piqué', 'Maintenir Main : violent piqué qui projette les ennemis.'],
    ['Pigeon Alpha', 'Durée 7 s. Pigeon plus gros. Saut : saisit un petit ennemi proche, l’emporte puis le lâche.'],
    ['Appel de la nuée', 'Chaque piqué réussi invoque quelques pigeons qui harcèlent la cible.'],
    ['ROI DES PIGEONS', 'Durée 9 s. Énorme pigeon et nuée permanente. Les piqués déclenchent l’assaut de la nuée.'],
  ]],
  ['Crâne chauve', [
    ['Crâne d’acier', 'Spécial 5 s : crâne renforcé et brillant. Main : coup de tête.'],
    ['Bélier', 'Pied : charge tête baissée.'],
    ['Ricochet', 'Saut : plonge tête la première, rebondit à l’impact et permet de viser une autre cible.'],
    ['Crâne blindé', 'Durée 7 s. Coups de tête brise-garde et renvoi des petits projectiles frontaux.'],
    ['Bowling humain', 'La charge entraîne plusieurs ennemis légers et les projette à son terme.'],
    ['CRÂNE TITANE', 'Durée 9 s. Crâne disproportionné. Maintenir Pied : se met en boule et roule librement en renversant les ennemis.'],
  ]],
].map(([branch, entries], branchIndex) => ({ branch, nodes: entries.map(([name, description], tier) => ({
  id: `lorenzo_v3_${branchIndex}_${tier}`, name, description, tier, branch, branchIndex, ultimate: tier === 5, effects: {},
})) }));
export function lorenzoSelection(p) {
  const ids=p.progression?.talents || [];
  const branch=LORENZO_BRANCHES.findIndex(b=>b.nodes.some(n=>ids.includes(n.id)));
  return {branch,rank:branch<0?0:LORENZO_BRANCHES[branch].nodes.filter(n=>ids.includes(n.id)).length};
}
