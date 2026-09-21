# Karonux — boss de fin de quartier

Le boss est grand et maigre : cheveux bruns, lunettes noires, blouson noir,
sweat gris, jean et chaussures marron. Sa taille (222 px debout), son allonge
et ses accélérations lui donnent sa présence. Le héros jouable reste distinct.

Assets générés avec l’outil intégré imagegen, alpha original conservé :
- `karonux-boss-v2.png` : 16 poses, 4 × 4. Garde, course, trois coups,
  bâillement, chute, sommeil, relevé, cigarette, douleur et KO.
- `golf-boss-v2.png` : 4 poses, 2 × 2. Arrêt, course, dégâts, épave ouverte.

Prompts finaux : voir `generation-prompts.json`. Les découpes de l’atlas sont
déclarées dans `game/visuals.js` et vérifiées par `tests/boss-browser.mjs`.

## Combat

L’entrée cinématographique commune aux boss suspend le combat 3,2 secondes.
Karonux commence en Golf (240 PV solo, ×1,6 en duo). Les charges verrouillent
la direction pendant la préparation, touchent une fois par joueur et laissent
1,65 seconde de récupération. Détruire la voiture déclenche une sortie de
2,6 secondes protégée, puis le combat à pied (640 PV solo).

À pied : charge, combo de trois coups, chute de sommeil, combo, cigarette,
nouvelle chute. Il rejoint la portée du combo en courant, sans téléportation.
À 40 % de PV, la phase devient définitive et la charge accélère. La chute
signature inaugure cette phase. La chute annonce sa zone pendant 1,05 seconde,
puis inflige 30 dégâts de base. Esquive, saut ou sortie de zone l’évitent.
Il dort 2,4 secondes sans se soigner ; le sommeil et les récupérations
augmentent les dégâts reçus de 25 %.

La cigarette rend 36 PV en six bouffées, après 1,1 seconde d’allumage.
Un coup l’interrompt. Trois cigarettes maximum, aucune à plus de 92 % de PV.

Socle commun : cinq points de pression rapprochés brisent la garde des boss
(poing : 1 ; coup lourd : 2 ; intervalle maximal : 1,15 s), créant une ouverture
de 1,6 seconde. Frapper pendant cette ouverture ne prolonge pas sa durée.
Les autres boss conservent leurs sprites et leurs attaques propres.

Toute la logique est sérialisable dans la simulation partagée solo/serveur.
Les paramètres de difficulté continuent de régler annonces, dégâts et reprises.
