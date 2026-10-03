import { writeFile } from 'node:fs/promises';
import { TALENTS } from '../game/progression.js';
import { upgradeDescription, maxStarDescription } from '../game/talent-upgrades.js';
let text='# Talents — gameplay actuel\n\nUn point par boss ou mini-boss vaincu. Le premier achat verrouille la branche. Chaque niveau possède trois étoiles, à un point par étoile. Une étoile au niveau précédent suffit pour débloquer le suivant.\n\nLes améliorations ci-dessous concernent directement les capacités de la branche. Les pourcentages additionnels sont cumulés sur leur valeur de base : +20 % à deux étoiles devient +40 % à trois étoiles.\n';
for(const [kind,nodes] of Object.entries(TALENTS)) {
 text+=`\n## ${kind}\n`;
 for(let branch=0;branch<3;branch++) {
  text+=`\n### Branche ${branch+1}\n`;
  for(const node of nodes.filter(n=>n.branchIndex===branch)) {
   text+=`\n#### Niveau ${node.tier+1} — ${node.name}\n\n- ★☆☆ : ${node.description||node.desc}\n- ★★☆ : ${upgradeDescription(node,kind)}\n- ★★★ : double le bonus additionnel de ★★☆.${maxStarDescription(node,kind)?' '+maxStarDescription(node,kind):''}\n`;
  }
 }
}
await writeFile('output/talents-gameplay-actuel.md',text);
