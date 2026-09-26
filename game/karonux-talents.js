// Karonux is the pilot for the six-rank transformation system.
export const KARONUX_BRANCHES = [
  ['Pilote de Golf IV blanche', [
    ['Golf IV', 'Spécial : Golf IV blanche pendant 5 s. Directions : conduire et projeter les ennemis.'],
    ['Marche arrière', 'Main : violent coup de marche arrière. Les deux pare-chocs percutent.'],
    ['Frein à main', 'Pied : dérapage qui balaie les ennemis autour du véhicule.'],
    ['Moteur préparé', 'Durée 7 s. Accélération et projections renforcées, traverse les petits groupes.'],
    ['Délit de fuite', 'Les collisions successives augmentent temporairement la vitesse.'],
    ['GOLF IV GTI DE SARANFOU', 'Durée 9 s. Golf préparée, accélération maximale, dérapages élargis et frein à main circulaire final.'],
  ]],
  ['Reine des Neiges', [
    ['Reine des Neiges', 'Spécial : forme glacée pendant 5 s. Main et pied accumulent du froid : ralentissement puis gel.'],
    ['Brise-glace', 'Pied sur une cible congelée : explosion de glace qui touche les ennemis proches.'],
    ['Patinoire', 'Esquive : laisse une traînée de glace qui fait glisser les ennemis.'],
    ['Blizzard', 'Durée 7 s. La tempête autour de Karonux accumule du gel sur les ennemis proches.'],
    ['Contagion glaciale', 'Les explosions transmettent une forte quantité de gel et peuvent provoquer des réactions en chaîne.'],
    ['REINE DE SARANFOU', 'Durée 9 s. Vague de froid initiale sur tout l’écran. Toutes les cibles congelées explosent à la fin.'],
  ]],
  ['Handikaron', [
    ['Handikaron', 'Spécial : deux béquilles et un pied plâtré pendant 5 s. Main : béquille. Pied : coup de plâtre.'],
    ['Béquilles de combat', 'Main enchaîne béquille gauche, droite puis coup de plâtre.'],
    ['Coup de plâtre', 'Maintenir Pied puis relâcher : coup chargé, projection et renversement des ennemis voisins.'],
    ['Saut à la béquille', 'Durée 7 s. Saut : perche à la béquille et retombée pied plâtré avec onde de choc.'],
    ['Toupie médicale', 'Esquive : tourne avec les béquilles tendues et frappe les ennemis autour.'],
    ['Handikaron Ultime', 'Durée 9 s. Béquilles renforcées, plâtre signé, capacités améliorées et chute avec onde de choc finale.'],
  ]],
].map(([branch, entries], branchIndex) => ({ branch, nodes: entries.map(([name, description], tier) => ({
  id: `karonux_v3_${branchIndex}_${tier}`, name, description, tier, branch, branchIndex, ultimate: tier === 5, effects: {},
})) }));

export function karonuxSelection(p) {
  const ids = p.progression?.talents || [];
  const branch = KARONUX_BRANCHES.findIndex(b => b.nodes.some(n => ids.includes(n.id)));
  return { branch, rank: branch < 0 ? 0 : KARONUX_BRANCHES[branch].nodes.filter(n => ids.includes(n.id)).length };
}

export const KARONUX_MILESTONES = ['start', 'boss:1', 'boss:2', 'boss:3', 'boss:4', 'boss:5'];
