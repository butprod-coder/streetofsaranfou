# Refonte des talents

La progression comprend 105 talents : sept personnages, trois branches de cinq rangs. Chaque achat coûte un point et exige le rang précédent. Les achats sont définitifs pendant la partie, sans remboursement. Un seul ultime peut être acheté ; les quatre premiers rangs des autres branches restent accessibles.

## Huit points par joueur

| Jalon | Total |
|---|---:|
| Fin de la première rue du quartier 1 | 1 |
| Troisième rue du quartier 1 | 2 |
| Boss du quartier 1 | 3 |
| Troisième rue du quartier 2 | 4 |
| Boss du quartier 2 | 5 |
| Boss du quartier 3 | 6 |
| Boss du quartier 4 | 7 |
| Boss du quartier 5 | 8 |

Le sixième quartier permet de profiter du dernier achat. Les joueurs KO reçoivent aussi les récompenses. Chaque profil conserve les identifiants de jalons pour empêcher les doublons, y compris après reconnexion ou reprise de checkpoint. L’XP ne donne que des caractéristiques : deux points par niveau, dix rangs maximum. Les points non dépensés restent disponibles jusqu’à la fin de la partie.

## Arbitrages retenus

- Le rang 2 de Dette de douleur permet déjà une riposte courte ; le rang 3 l’élargit.
- Les effets compatibles se cumulent sur une même attaque : tête et feu, botte et épaule, revers et renvoi. Le balayage circulaire de Jo prend la forme principale du pied lorsqu’il consomme le rythme.
- Les spéciaux conditionnels de Jo et Yanu restent normaux tant que leur jauge n’est pas pleine.
- Karonux pilote sa Golf pendant 3,15 s après une entrée de 0,25 s : directions, diagonales normalisées, arrêt au relâchement. Il sort après 0,2 s à la position choisie, sans sieste ni retour automatique. Marche arrière sauvage ajoute un demi-tour accéléré sur une nouvelle pression de spécial ; Demi-tour interdit ajoute un dérapage latéral. Deux impacts maximum par ennemi sur toute l’activation, y compris le convoi.
- Les dégâts et décisions sont calculés dans la simulation partagée. Marques de peinture, brûlures et malédictions sont attribuées à leur propriétaire, y compris avec deux héros identiques.
- Les noms et descriptions chiffrées sont définis dans `game/rogue-talents.js`. Les valeurs constituent un premier réglage, à affiner par des parties sur appareils réels.

## Limites

Tous les spéciaux et ultimes nécessitent et consomment 100 énergie. La jauge commence vide et chaque cible ennemie touchée par un coup direct donne 7 énergie. Il n’y a ni régénération passive, ni recharge entre vagues ou quartiers, ni délai supplémentaire après remplissage. Les invocations, dégâts périodiques et attaques du spécial ne rechargent pas la jauge. Chaque ennemi vaincu a 10 % de chance de laisser un sandwich (+35 PV), 10 % de laisser une canette (+25 énergie) et 80 % de ne rien laisser. Un seul de ces objets peut tomber par ennemi. Les ressources sont plafonnées et les objets restent au sol si la ressource est pleine. Les fenêtres durent généralement 5 à 6 secondes ; les charges ou salves immédiates sont plus courtes. Au maximum, trois alliés, huit zones et six boules appartiennent simultanément à un joueur. Les extensions de forme et d’invocations sont plafonnées à trois secondes. Banquet de baffes rend au plus 20 % de la vie maximale. Les soins laissés par Double ration valent 8 PV, toutes les cinq secondes au maximum.

Les boss ne subissent pas les déplacements forcés des talents ni les interruptions des leurres. Les chaînes de bonds et les collisions ont des limites par cible. La peinture propagée ne déclenche pas immédiatement de nouvelles explosions. Les nouveaux effets ne blessent pas le partenaire.

## Illustrations

Les 105 talents disposent d’une illustration vectorielle dédiée (sujet et effet), colorée par personnage et branche, dans `game/talent-icons.js`. Les icônes restent nettes à la taille du HUD sans chargement de sprites supplémentaire.

## Compatibilité et validation

Les identifiants des talents, le protocole réseau et la version des checkpoints ont changé. Les anciens checkpoints sont refusés afin de ne pas convertir silencieusement un ancien talent en un autre ; les records permanents restent conservés. Une nouvelle partie commence sans point ni talent acheté ; le premier point arrive après la première rue.

Les tests couvrent progression, prérequis, exclusivité, absence de remboursement, déduplication, checkpoints, réseau, interactions, plafonds, 21 activations d’ultimes et rendu navigateur. Les contrôles mobiles portent sur la disposition et les commandes dans un navigateur ; ils ne remplacent pas une mesure de performances sur téléphone réel.
