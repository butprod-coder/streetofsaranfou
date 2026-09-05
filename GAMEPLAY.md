# Gameplay — Évolution arcade (v3)

Cette version enrichit le moteur Reborn existant. Le client solo et le serveur coopératif exécutent les mêmes règles à 60 Hz ; ni le rendu ni la fréquence d’affichage ne déterminent les dégâts. Les personnages, 36 décors, animations normales, ennemis, caisses, barils, menus et reprise réseau existants sont conservés.

## Rythme et difficulté

Chaque rue possède 2 à 4 vagues différentes. Les deux premières rues commencent avec 2 vagues ; la majorité en comporte 3, les dernières rues des chapitres 5/6 en comportent 4. Les rues de boss comportent 2 vagues d’approche puis le boss.

Les renforts apparaissent progressivement à l’intérieur de la zone navigable, du côté le plus éloigné des joueurs. L’apparition initiale offre un court répit. Le moteur attend également la fin de la file de renforts : tuer les premiers ennemis ne débloque pas prématurément la sortie.

Entre les vagues : 2,5 ou 4 secondes, +7 PV et +12 énergie aux personnages debout ; les longues pauses déposent un soin. Les dernières vagues de certaines rues combinent un ennemi lourd et des soutiens. À la fin de la rue, un partenaire à terre est relevé et les joueurs doivent tous rejoindre la droite.

- **Balade** : dégâts ennemis ×0,72, vitesse ×0,9, préparations plus longues, récupération plus longue, 4 vies de réserve initiales, XP ×0,85.
- **Arcade** : valeurs de référence, 2 vies de réserve initiales.
- **Sans quartier** : dégâts ×1,2, vitesse ×1,12, préparations légèrement plus courtes, récupération plus courte, un renfort supplémentaire par vague, XP ×1,2.

La difficulté ne change pas les PV ennemis. Entre les chapitres, les PV ordinaires augmentent seulement de 3,5 % par chapitre, la vitesse de 4,5 %, et la récupération diminue progressivement. En duo : PV ordinaires ×1,18, PV boss ×1,6, compositions renforcées.

Au maximum 5 ennemis ordinaires actifs en solo / 7 en duo dans la file de vagues. Au maximum 2 préparations d’attaque simultanées en solo / 3 en duo, boss inclus. Les zones de danger persistantes sont limitées en durée et leurs dégâts respectent l’invulnérabilité après impact. Les invocations de boss sont plafonnées séparément.

Rémy reste facile à lire. Orelsan cherche les flancs dans les chapitres suivants. Charlingals alterne coups lourds et poussée. Guylux conserve la distance et jette des cartes. Papy Jala pose des fumées qui obligent à se déplacer. Les ennemis n’ont pas de collision bloquante : on peut sortir d’une mêlée.

## Boss

Toutes les transitions de phase sont annoncées. Une phase ne régresse jamais, même après un soin. Les boss ne peuvent pas être bloqués indéfiniment par les petits coups, mais ont des fenêtres de récupération signalées « VULNÉRABLE ».

- **Karonux** : commencer par détruire sa Golf blanche (180 PV solo), puis combattre Karonux (350 PV). Charges et rafales de poings ; récupération après l’effort. Sous 55 % de sa vie à pied, les rafales s’allongent. Il peut fumer 3 fois au maximum pour récupérer 18 PV par utilisation : toucher pendant la préparation interrompt le soin.
- **Kikor** : 410 PV. Les tableaux font sortir ses petits bonshommes verts. Chaque tableau se détruit en 4 poings ou 2 pieds, produit au maximum 2 créations puis disparaît ; au maximum 3 créations présentes et 4 tableaux créés pendant le combat. Sous 55 %, il alterne tableaux/pinceaux et charges à vélo, avec une récupération exploitable.
- **Yanu** : 470 PV. Circuit de sprints et burpees avec impacts au sol annoncés. Sous 55 %, doubles impacts et rythme plus soutenu. Les pauses whisky rendent 24 PV, 3 utilisations au maximum, interruptibles.
- **Lorenzo** : 490 PV. Boules de pétanque roulantes et mégots qui enflamment des emplacements annoncés. Sous 55 %, les salves et les zones de feu se multiplient. Changer de ligne ou sauter évite les projectiles ; les flammes disparaissent après 3,5 secondes.
- **Jo La Mouk** : 520 PV. Poings très longs et balayages plus courts mais plus larges. La trajectoire est verrouillée avant l’impact. Sous 55 %, un deuxième poing différé oblige à ne pas revenir immédiatement dans la même ligne. Il se replace entre ses séquences.
- **Gustavax** : 680 PV. Phase 1 : rafales et ondes de choc. Sous 65 % : tirs croisés, impacts et garde limitée à deux invocations de deux ennemis. Sous 30 % : feu, tirs croisés et impacts enchaînés. Il conserve une fenêtre de contre-attaque après chaque séquence.

La destruction de la Golf ne donne pas prématurément la récompense du boss. La mort d’un boss annule ses dangers et retire ses créations liées, empêchant les invocations orphelines de bloquer la rue.

## Spéciaux

Les commandes restent **L / B Xbox / ○ PlayStation**. Coût : 50 énergie, plus un cooldown individuel. L’énergie remonte avec le temps, les coups normaux, les objets et les pauses entre vagues. Un bouton maintenu ne contourne jamais le cooldown.

- **Karonux — Sieste explosive** : explosion de rayon 260, dégâts ×3,8 de sa puissance de base, puis sommeil. Séquence totale 2,6 secondes, dont environ 2,1 secondes endormi ; protection initiale de 1,2 seconde. Recharge 12 secondes. À utiliser pour vider un groupe avant de s’exposer.
- **Jualos — Charge Poporc** : transformation en porc, charge pendant 1,45 seconde ; ajustement vertical possible au stick/clavier, rebond aux limites de la rue. Impacts espacés, rayon 115. Recharge 9 secondes.
- **Yanu — Instinct du loup** : loup-garou pendant 2,1 secondes, quatre balayages de griffes espacés, rayon 180 ; déplacements conservés mais ralentis. Recharge 10 secondes.
- **Lorenzo — Clope infernale** : trois mégots en éventail, zones alliées de feu pendant 4 secondes. Pas de dégâts aux coéquipiers. Recharge 10 secondes.
- **Jo — Tourbillon Mouk** : tourbillon pendant 3 secondes, directions choisies par le générateur déterministe partagé, changement toutes les 0,5 seconde ; impacts espacés et rebonds aux bords. Recharge 12 secondes.
- **Kikor — Toile vivante** : peint un tableau et invoque un petit bonhomme vert allié pendant 10 secondes. Il poursuit et frappe les ennemis automatiquement. Une seule création par propriétaire. Recharge 13 secondes.
- **Gustavax** conserve son attaque à distance actuelle ; sa refonte spécifique est reportée comme demandé. Recharge 9 secondes.

Les transformations porc/loup/tourbillon utilisent une nouvelle planche transparente. Elle remplace uniquement, dans le moteur Reborn, les anciens extraits de storyboard qui comportaient un fond et des flèches. Les autres ressources d’origine ne sont pas écrasées.

## XP et évolution

Chaque combattant a une progression indépendante, sauvegardée dans `localStorage`, clé `saranfou-progression-v1`. La préférence de personnage, le record et le chapitre restent dans la clé existante `saranfou-v2`. Fermer/recharger le navigateur conserve la progression ; effacer les données du site la supprime. Changer d’adresse (par exemple localhost → hébergement public) crée un espace de sauvegarde distinct. Il n’y a pas de compte ni de sauvegarde cloud.

En coopération, chaque joueur reçoit la même récompense d’équipe, sans compétition pour le dernier coup. Chaque navigateur sauvegarde seulement son propre personnage. La reconnexion et Continue conservent XP et investissements. Les profils importés sont bornés et normalisés ; le serveur valide les dépenses en partie et l’identité du joueur. Cette sauvegarde locale n’est pas un système anti-triche compétitif.

Récompenses de base : Rémy 18 XP, Orelsan 23, Charlingals 32, Guylux 29, Papy Jala 38, création 8. Vague 30, rue 45, chapitre 180. Boss : 300 + 45 par indice de chapitre. Les multiplicateurs de difficulté s’appliquent ensuite.

Niveau maximum **20**, **2 points** par niveau gagné. XP pour passer du niveau N au suivant : `120 + 45 × (N−1) + 8 × (N−1)²`. Une notification LEVEL UP et un jingle annoncent le gain ; la barre discrète sous l’énergie indique niveau, XP et points disponibles.

Menu **Évolution** disponible à la sélection du personnage, dans le salon, en pause et au résultat. Il affiche portrait, XP, points, rang et effet avant/après. Chaque achat coûte un point. En partie, il faut être en pause ou dans une phase sûre ; la pause est partagée en ligne.

Chaque statistique est plafonnée à 12 rangs :

- **Vie** : +3 % des PV de base par rang, jusqu’à +36 %. L’achat ajoute seulement le gain de PV maximum à la vie actuelle, sans soin complet ni résurrection.
- **Attaque** : +2,5 % aux coups normaux, pieds et combos par rang, jusqu’à +30 %.
- **Défense** : −2 % de dégâts reçus par rang, réduction maximale 24 %.
- **Coup spécial** : +3 % de puissance par rang, +1,2 % de rayon lorsque pertinent, −1,2 % de cooldown ; au maximum +36 % de puissance / +14,4 % de rayon / −14,4 % de cooldown. Pour Kikor, la puissance renforce l’allié.

## Paramètres à ajuster

**`game/balance.js`** est le point d’entrée principal :

- `DIFFICULTIES` : dégâts, vitesse, récupération, préparation, renforts, vies, XP par mode.
- `BALANCE.waves` : nombres de vagues, repos, délai des renforts, plafonds d’ennemis/attaquants.
- `BALANCE.enemy` : progression par chapitre et multiplication des PV en duo.
- `BALANCE.bosses` : PV, dégâts de base, seuils de phases, récupération et soins de chacun.
- `BALANCE.bossCombat` : PV duo, durée de préparation, durée et vitesse des charges.
- `BALANCE.specials` : coût, cooldown, durée, multiplicateur de dégâts et rayon par personnage.
- `BALANCE.rpg` et `BALANCE.xp` : courbe, plafonds, points, bonus et récompenses.

**`game/encounters.js`** : compositions des vagues et progression des types d’ennemis. Les tableaux de compositions sont écrits à la main ; l’index de rue et de vague les font varier. Modifier ici pour ajouter un type précis à une séquence.

**`game/data.js`** : PV, puissance et vitesse de base des personnages/ennemis, listes de décors, animations normales.

**`game/combat.js`** : enchaînement des patterns, forme des zones, salves, durée du feu, nombre d’invocations, timings des effets des spéciaux. Les coordonnées et variantes propres à chaque pattern sont ici ; les principaux paramètres numériques partagés viennent de `balance.js`.

**`game/visuals.js`** : sprites supplémentaires et libellés des attaques. **`game/renderer.js`** : télégraphes, atmosphère, éclairages doux, reflets et particules. Aucun décor n’est remplacé.

## Validation et limites

`pnpm test` : tests du moteur, de la campagne, des 36 portes de vagues, des modes de difficulté, de chaque spécial/boss, des soins, de la progression, de l’allocation de points, du serveur et de la reconnexion. Les bots de campagne n’altèrent pas les PV et ne sautent pas les rencontres. Sur la graine de test, une campagne Arcade prend environ 19 minutes, avec plus de 340 KO solo / 440 KO duo ; ce n’est pas une durée garantie pour un joueur humain.

`pnpm run test:browser` : clavier, solo, duo, pause, ressources, reprise réseau, passage en solo, affichage mobile.

`pnpm run test:controller` : Gamepad API standard simulée dans Chrome, stick analogique, croix, poing/pied/saut/spécial/esquive, navigation, listes, maintien sans répétition des achats, code de salon sans clavier, salon, préparation, pause, évolution, persistance, Game Over/Continue et retour. Un serveur éphémère de test permet de vérifier les écrans de fin sans ajouter de triche au jeu livré. Des scènes de test passent par le vrai moteur et le vrai rendu pour inspecter Golf, vélo, pétanque et transformations. L’alpha de la nouvelle planche est vérifié.

Les captures sont dans `test-results/`, non versionné. Les commandes navigateur acceptent `BROWSER_PATH` vers Chrome/Edge. **Aucune manette physique ni liaison entre deux connexions Internet distinctes n’a été utilisée** : le mapping standard est testé, pas les pilotes Bluetooth/USB d’un appareil réel. Une manette non standard peut nécessiter un mapping fourni par le navigateur.

Nouvelle planche : `assets/shared/specials/transformations-v3.png`, créée avec le skill **imagegen** et l’outil intégré. Le prompt complet est conservé dans `assets/shared/specials/transformations-v3.prompt.md`. Aucun appel d’API payante externe ou déploiement public n’a été effectué par cette mise à jour.
