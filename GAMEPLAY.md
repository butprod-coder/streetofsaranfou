# Gameplay — Talents & castagne

Cette version enrichit le moteur Reborn existant. Le client solo et le serveur coopératif exécutent les mêmes règles à 60 Hz ; ni le rendu ni la fréquence d’affichage ne déterminent les dégâts. Les personnages, 36 fonds de niveaux, animations normales (sauf Gustavax redessiné), ennemis, menus et reprise réseau sont conservés. Les anciens objets de premier plan et ramassables sont remplacés par les sprites du pack `assets/shared/arcade/`.

## Décors thématiques, édition et rues interactives

- **Décors** : chaque quartier possède une planche générée de 12 objets décoratifs, sans collision, dégâts ni loot. Le jeu en place automatiquement quelques-uns dans chaque rue ; ils restent visuels et sont indépendants des objets destructibles.
- **Éditeur de niveaux** : le bouton présent dans le menu et l’écran de sélection ouvre une bibliothèque de 12 objets du quartier, avec une vue de la rue. Cliquer un objet puis la rue le place librement ; glisser, hauteur, miroir, duplication, suppression, annulation/rétablissement, remise à zéro et export/import JSON sont disponibles. Jusqu’à 40 placements par rue sont conservés sous `saranfou_reborn_layouts_v1`. En coopération, l’hôte partage le résultat validé par le serveur.
- **Planches jouables** : `assets/shared/scenery/residential.png`, `estate.png`, `stadium.png`, `village.png`, `night.png` et `school.png` contiennent chacune 12 cases transparentes. La planche `weapons.png` fournit les icônes de couteau, batte et armes à feu.

## Esquive et rues interactives

- **Esquive** : Maj gauche/droite au clavier, RB/R1 sur une manette standard, bouton ⇧ tactile. Direction du déplacement ou direction du regard à l'arrêt. Départ dès la première frame, durée 0,26 s, protection 0,22 s, recharge 0,95 s, sans coût en énergie. Une pression doit être relâchée avant la suivante : maintenir ne permet plus d'esquiver en boucle. Une pression dans les dernières 0,14 s de récupération est mémorisée. Une attaque normale peut être annulée, mais pas une transformation spéciale en cours, sauf le catcheur de Gustavax qui conserve ses commandes. Indicateur de recharge sous les barres, silhouettes de traînée et poussière animée.
- **Caisses** : 3 unités de résistance, sandwich (+35 PV). **Poubelles** : 4 unités, nourriture (+35 PV ; les canettes rendent 25 énergie). **Barils rouges** : 3 unités, sans loot. Il ne reste que quatre objets destructibles ordinaires par chapitre, avec des rues d’événement dégagées ; chaque ennemi vaincu a 10 % de chance de laisser un sandwich (+35 PV) et 10 % une canette (+25 énergie), sans double drop. Un poing enlève 1 unité, un pied ou dernier poing de combo 2. Les spéciaux endommagent aussi les objets. Trois états graphiques : intact, endommagé, débris. Chaque objet ne donne son ramassable et ses 50 points qu'une fois.
- **Barils rouges** : 3 unités. Après destruction, cercle d’alerte pendant 0,8 s, explosion de rayon 170 et 45 dégâts de base. Elle touche les deux camps ; reculer, sauter ou esquiver permet de l’éviter. Réactions en chaîne possibles, chaque baril conservant son propre avertissement. Les débris disparaissent après 7 s. Les objets n’agissent pas comme des murs : ils ne peuvent coincer un joueur ni bloquer une sortie.

### Prise et armes

- **Prise** : automatique au contact d’un ennemi au sol. Poing + direction arrière pendant la prise le projette à 420 pixels ; il retombe après 0,72 s et peut toucher un second adversaire. Les boss ne sont saisissables que pendant leur récupération, les élites lorsqu’ils sont étourdis. Une prise est annulée par un dégât, un KO ou un changement de rue.
- **Armes** : F (RT/R2) près d’une arme pour la ramasser ou l’échanger ; sans nouvelle arme à portée, F dépose celle tenue. J (X) utilise une charge : couteau (10), batte (8), pistolet (8), fusil à pompe (5) ou pistolet-mitrailleur (18). Les armes à feu respectent la direction, la ligne et la portée ; une arme épuisée disparaît. Une arme portée est déposée au KO. Le fusil à pompe repousse physiquement le tireur. Les ennemis lourds retombent sur place et infligent 25 dégâts de base d’écrasement au joueur resté à proximité.

## Séquences surprises

Deux événements par chapitre, après toutes les vagues des rues 2 et 4. Aucun dans la première rue d'apprentissage ni dans les arènes de boss. Ils restent intégrés au même état de partie, donc synchronisés en coopération et gelés par la pause partagée.

- **La casse du siècle** : rue 2 des chapitres 1, 3, 5 ; voiture blanche à détruire en 25 s, résistance 24 en solo, multiplicateur 1,55 en duo. Les attaques normales et spéciales fonctionnent. Trois états de carrosserie dessinés pour l'événement.
- **Livraison express** : rue 2 des chapitres 2, 4, 6 ; deux caisses cerclées de vert à briser en 22 s. La première seulement dépose un soin ou une boisson.
- **Embuscade** : rue 4 ; gang aléatoire de 5 ennemis (+2 en duo, +1 en difficile), pioché dans tout le bestiaire avec au maximum une élite. Éliminer le gang avant son repli à 30 s. Les limites habituelles d'ennemis et d'attaquants simultanés restent appliquées.

Chaque événement est annoncé 2,2 s avant le départ du chrono. Réussite : +650 score partagé. Échec : pas de prime, mais la sortie se débloque quand même et les ennemis/dangers de l'événement sont nettoyés. Une mort collective suit les règles habituelles de vies/Game Over ; le chronomètre ne ressuscite pas une équipe éliminée.

### Réglages centralisés

- `game/balance.js` : `dodge` (durée, protection, recharge, vitesse, buffer), `scenery` (résistance, débris, explosion, soins), `surprises` (chronos, résistance voiture, nombre de caisses/assaillants).
- `game/street-events.js` : `surprisePlan` (rues et types), `streetProps` (placements/variantes), compositions de l'embuscade.
- `game/visuals.js` : `ARCADE_SPRITES` (fichiers, disposition des cases, taille à l'écran). Les rectangles utiles sont calculés une seule fois depuis l'alpha, sans réécrire les fichiers générés.
- `assets/shared/arcade/PROMPTS.md` : prompts de génération intégrés ; sept PNG originaux transparents, générés avec l'outil imagegen intégré. Personnages réutilisés pour l'esquive et ennemis existants pour l'embuscade.

### Vérification de cet ajout

`npm test` couvre les transitions, timers, dégâts, drops uniques, esquive, pause, morts, déterminisme, progression et campagnes complètes via commandes normales. `npm run test:arcade` lance un serveur isolé et deux vrais navigateurs : esquive clavier réseau, dégâts d'objets vus par les deux joueurs, trois événements, pause commune et contrôles d'alpha des neuf assets. `npm run test:controller` couvre les commandes avec une manette standard simulée (pas une manette physique). Les tests utilisent `BROWSER_PATH` si Chrome n'est pas installé par Playwright.

## Rythme et difficulté

### Rencontres d’élite

Six variantes reconnaissables utilisent les portraits d’origine comme références, avec costumes et palettes distincts. « Julio » est interprété comme Jualos, seul personnage correspondant dans le projet. Elles peuvent surgir dans n’importe quelle vague et dès le premier chapitre, avec une probabilité faible qui augmente légèrement au fil de la partie. Il n’y en a jamais plus d’une par vague. Le plafond d’attaquants est partagé avec les ennemis ordinaires et les boss.

- **Karonux · Princesse** (chapitre 1) : robe arc-en-ciel, baguette, salves de trois sorts. 125 PV de base.
- **Kikor · Le Précieux** (chapitre 2) : peau pâle, haillons turquoise, bond et griffes, « Mon précieux ! ». 115 PV.
- **Yanu · Kayak** (chapitre 3) : kayak cyan, gilet orange, charge et grands coups de rame. 155 PV.
- **Lorenzo · Le Canapé** (chapitre 4) : chute de 1,5 s sur son canapé moutarde, rire et feux à positions variables annoncés par les projectiles. 185 PV. Trois impacts lourds ou passage sous 65 % des PV le délogent. Près du canapé vide, rester immobile et maintenir **E / LB pendant 0,5 s** pour s’asseoir : Lorenzo devient enragé, accélère et augmente ses feux. Relâcher ou bouger permet de se lever immédiatement ; relever un partenaire reste prioritaire. Le canapé se casse et ne bloque pas le déplacement.
- **Jo · La Fouine** (chapitre 5) : survêtement violet, transformation en fouine avec sa chevelure et ses yeux, poursuite de 2,4 s puis récupération. 125 PV.
- **Le Bolorouet** (chapitre 6) : costume bordeaux, grosses lunettes et cigares-projectiles. 160 PV.

Les PV restent modérés ; la difficulté vient surtout des comportements. Les préparations durent 0,75 à 1,15 s hors modificateurs de difficulté. Les attaques lourdes interrompent les préparations des élites hors canapé. Les feux d’élite sont plafonnés à cinq, les cigares/sorts ordinaires à six ; ils expirent et disparaissent à la mort du propriétaire. Les paroles et rires disposent toujours d’un sous-titre ; une **voix française locale du navigateur**, si disponible, les prononce. Aucun service vocal distant n’est appelé.

Réglages : `game/elite-data.js` pour PV, vitesse, puissance, récupération, seuil d’éjection, durée de poursuite et plafonds. `game/elites.js` pour les comportements ; `game/encounters.js` pour leur répartition. Sprites et prompts : `assets/enemies/elites/` et `PROMPTS.md`, créés avec imagegen intégré. Les anciens sprites sont conservés.

Chaque rue possède 2 à 4 vagues différentes. Les deux premières rues commencent avec 2 vagues ; la majorité en comporte 3, les dernières rues des chapitres 5/6 en comportent 4. Les rues de boss comportent 2 vagues d’approche puis le boss.

Les renforts apparaissent progressivement à l’intérieur de la zone navigable, du côté le plus éloigné des joueurs. L’apparition initiale offre un court répit. Le moteur attend également la fin de la file de renforts : tuer les premiers ennemis ne débloque pas prématurément la sortie.

Entre les vagues : 2,5 ou 4 secondes, +7 PV et +12 énergie aux personnages debout, sans soin automatique supplémentaire. Les dernières vagues de certaines rues combinent un ennemi lourd et des soutiens. À la fin de la rue, un partenaire à terre est relevé et les joueurs doivent tous rejoindre la droite.

- **Balade** : dégâts ennemis ×0,72, vitesse ×0,9, préparations plus longues, récupération plus longue, 4 vies de réserve initiales.
- **Arcade** : dégâts ennemis ×0,85, vitesse ×1, préparations et récupérations de référence, 5 vies de réserve initiales.
- **Sans quartier** : dégâts ×1,2, vitesse ×1,12, préparations légèrement plus courtes, récupération plus courte, un renfort supplémentaire par vague.

La difficulté choisie ne change pas les PV ennemis, mais la progression de la campagne oui : par chapitre, les ennemis ordinaires gagnent 14 % de PV, 10 % de puissance et 2,5 % de vitesse, tandis que leur récupération diminue de 6,5 %. Au sixième chapitre, un même ennemi possède ainsi 70 % de PV et 50 % de puissance de plus qu’au début. En duo : PV ordinaires ×1,18, PV boss ×1,6, compositions renforcées.

Au maximum 5 ennemis ordinaires actifs en solo / 7 en duo dans la file de vagues. Au maximum 2 préparations d’attaque simultanées en solo / 3 en duo, boss inclus. Les zones de danger persistantes sont limitées en durée et leurs dégâts respectent l’invulnérabilité après impact. Les invocations de boss sont plafonnées séparément.

### Ennemis classiques rehaussés

Les anciens profils ont désormais une signature lisible, un temps de préparation et un effet propre. Rémy dérape sur son scooter puis fonce ; Makouille réalise une roue avant et charge plus lourdement. Papy Jala frappe à la canne et souffle un cône de poivre qui immobilise brièvement. Orelsan alterne raquette au contact et smash de tennis à distance. Kikor ennemi attaque sur son skate et lance trois crayons de couleur. Charlingals combine couteau de proximité et éventail de faux billets en zone. Guylux conserve la distance et lance trois cartes magiques en éventail. Les attaques respectent le budget collectif d’attaquants et leurs projectiles expirent ; aucune zone rouge permanente n’est ajoutée.

Les sept planches sont maintenant remplacées dans le moteur par `assets/enemies/classics/` : 84 cellules (poses et effets), générées avec ImageGen intégré à partir des anciennes identités et du style des élites. Détourage local, cases normalisées de 512 px et transparence réelle ; les anciens fichiers restent conservés. Préparation et frappe sont synchronisées avec l’attaque simulée, avec poses de déplacement, blessure et défaite. Tennis, cartes, crayons, billets et poivre utilisent les nouveaux sprites. Les ennemis n’ont pas de collision bloquante : on peut sortir d’une mêlée.

Réglages : tailles et poses dans `game/classic-sprites.js`, statistiques dans `game/data.js`, attaques dans `game/simulation.js`, distribution dans `game/encounters.js`. Makouille, comme tous les ennemis classiques, peut apparaître dès la première rue. `npm run test:classics` contrôle les 84 cellules, marges transparentes, sept rendus de combat et le son de dérapage. Prompts et rectangles sources : `assets/enemies/classics/PROMPTS.md` et `packing.json`.

## Boss

Toutes les transitions de phase sont annoncées. Une phase ne régresse jamais, même après un soin. Les boss ne peuvent pas être bloqués indéfiniment par les petits coups, mais ont des fenêtres de récupération signalées « VULNÉRABLE ».

- **Karonux** : commencer par détruire sa Golf blanche (180 PV solo), puis combattre Karonux (350 PV). Charges et rafales de poings ; récupération après l’effort. Sous 55 % de sa vie à pied, les rafales s’allongent. Il peut fumer 3 fois au maximum pour récupérer 18 PV par utilisation : toucher pendant la préparation interrompt le soin.
- **Kikor** : 410 PV. Les tableaux font sortir ses petits bonshommes verts. Chaque tableau se détruit en 4 poings ou 2 pieds, produit au maximum 2 créations puis disparaît ; au maximum 3 créations présentes et 4 tableaux créés pendant le combat. Sous 55 %, il alterne tableaux/pinceaux et charges à vélo, avec une récupération exploitable.
- **Yanu** : 650 PV, nouveaux sprites de 222 px et arrivée cinématique en kayak sur un tsunami. Vagues à éviter par saut ou changement de ligne, combos poing/poing/pied et coups de pied. Son cri **BUUUUUUUUU** fige 0,65 s les joueurs exposés, puis il se transforme en loup-garou et bondit vers la position annoncée : 0,4 s pour esquiver après le dégel. Sous 50 %, il accélère et prépare un nouveau cri. Les spéciales laissent 1,9 s pour contre-attaquer. La garde brisée et le KO libèrent les joueurs. Accès direct dans **Tester les boss → Yanu**.
- **Lorenzo** : 700 PV, nouveaux sprites de 222 px et entrée cinématique. Cigarettes embrasées qui produisent un anneau de feu croissant : sauter au passage de sa bordure, le centre est sûr. À 60 % PV, un canapé arrive et protège Lorenzo pendant que quelques sbires débarquent. Le canapé a 180 PV (270 en duo), les coups lourds sont nettement plus efficaces pour le détruire. Lorenzo est alors éjecté et devient enragé : déplacement plus rapide, combos accélérés et deux anneaux espacés. Trois phases accessibles directement dans le mode de test des boss.
- **Jo la Mouk** : 720 PV, sprites de 222 px et arrivée cinématique. Combat MMA très rapide : jab, genou, high kick et bras extensibles jusqu’à 930 px sur une ligne annoncée. Sa canalisation invincible invoque 20 transpalettes jaunes, puis 30 sous 50 % PV. Arrivées annoncées par couloir, un passage reste libre. Les machines peuvent être évitées ou détruites (26 PV solo, 36 en duo). Après la canalisation, Jo laisse 2,2 s pour contre-attaquer. En seconde phase, il double aussi les coups de bras. Accès direct à la canalisation dans le mode de test.
- **Jualos** : 800 PV, dernier boss. Sprites de 222 px, silhouette corpulente et arrivée cinématique. Phase 1 : le Bouffi Bouffon soulève son sweat et produit trois impacts ventraux successifs ; sauter, esquiver ou sortir de la zone. Combos et charge entre les danses. À 50 % de vie, transformation protégée en Commercial : costume, cravate et énorme pochon utilisé en balayage ou frappe au sol. Cinq tas de billets glissants par lancer ; sauter ou les contourner. Une chute le fait rire et ouvre une contre-attaque. Protection au relevé, dix tas maximum, disparition après 5,5 s. Deux phases accessibles dans Test des boss.

La destruction de la Golf ne donne pas prématurément la récompense du boss. La mort d’un boss annule ses dangers et retire ses créations liées, empêchant les invocations orphelines de bloquer la rue.

### Nouvelles surprises de boss

Chaque boss dispose de sprites, d'une arrivée cinématique et de séquences dédiées. Les préparations annoncent les attaques et les récupérations permettent les enchaînements. Les changements de forme et objets invoqués utilisent les mêmes règles en solo et en coopération.

## Spéciaux

Les commandes restent **L / B Xbox / ○ PlayStation**. La barre commence vide. Chaque ennemi touché par un coup direct donne 7 énergie, jusqu’à 100. Le spécial exige et consomme la barre pleine. Aucune recharge automatique, sur dégâts reçus, objets, vagues ou quartiers ; aucun délai supplémentaire lorsque la barre est pleine. Les attaques des spéciaux, invocations et dégâts périodiques ne rechargent pas la barre.

- **Karonux — Tour de Golf blanche** : entrée à 0,25 s, conduite libre avec les directions pendant 3,15 s, sortie de 0,2 s à la position choisie. Relâcher arrête la Golf ; changer de direction permet de tourner ou reculer. Collisions balayées sur les deux axes, deux impacts maximum par cible et par activation, puissance ×1,9. Protection pendant la conduite, sans sieste ni retour forcé. Les talents ajoutent demi-tour accéléré, dérapage latéral, ennemis rassemblés et convoi pilotable.
- **Jualos — Charge Poporc** : transformation en porc, charge pendant 1,45 seconde ; ajustement vertical possible au stick/clavier, rebond aux limites de la rue. Impacts espacés, rayon 115.
- **Yanu — Instinct du loup** : loup-garou pendant 2,1 secondes, quatre balayages de griffes espacés, rayon 180 ; déplacements conservés mais ralentis.
- **Lorenzo — Clope infernale** : cinq mégots en éventail, vols de 0,5 à 0,86 s, explosions distinctes (puissance ×1,05), puis feu pendant 3,6 s (×0,45 toutes les 0,8 s). Pas de dégâts aux coéquipiers. Mégots, explosions et flammes utilisent une planche de sprites transparente animée.
- **Jo — Tourbillon Mouk** : tourbillon pendant 3 secondes, entièrement dirigé au clavier ou au stick ; il s’arrête lorsque la direction est relâchée. Vitesse horizontale 350, verticale 225, diagonales normalisées et limites de rue respectées.
- **Kikor — Toile vivante** : place le chevalet devant son pinceau à 0,18 s, peint, puis invoque le petit bonhomme vert depuis la toile à 0,65 s. Émergence de 0,3 s, allié présent 10 s, animation de frappe maintenue 0,24 s. Une seule création par propriétaire. La toile alliée disparaît avec son propriétaire ou sa création et ne subit pas les coups amis. Geste de peinture : 1 s.
- **Gustavax — Le Catcheur** : transformation de 6 secondes en colosse torse nu, short bleu, lunettes et pieds nus. Déplacement, saut, esquive et attaques restent contrôlables. Les poings ont une portée de 145, les pieds deviennent un coup au sol radial de rayon 180. Vie maximale, attaque, vitesse et puissance spéciale gagnent 30 % ; les dégâts reçus diminuent de 30 %, en complément des talents. Le pourcentage de vie est conservé à l’entrée et à la sortie : aucun soin gratuit ni bonus permanent. Préparation initiale 0,3 s, coût 100 énergie, sans recharge chronométrée. Les talents peuvent prolonger la forme de 3 s et renforcer fortement ses coups. Gustavax reste jouable ; Jualos le remplace comme boss final.

Les transformations porc/loup/tourbillon utilisent une nouvelle planche transparente. Elle remplace uniquement, dans le moteur Reborn, les anciens extraits de storyboard qui comportaient un fond et des flèches. Les autres ressources d’origine ne sont pas écrasées.

## Arbres de talents et progression Rogue Like

Chaque héros dispose de **3 branches linéaires de 5 talents**, soit 15 talents. Le cinquième rang est l’ultime de sa branche. Un seul ultime peut être acheté par personnage et par partie ; les quatre premiers rangs des autres branches restent accessibles. Les achats sont définitifs, sans remboursement.

L’XP est gagnée principalement par les vagues (60 %), puis les éliminations (25 %) et les objectifs/boss (15 %). Elle est partagée équitablement en coopération et les invocations ne peuvent pas générer d’XP. Chaque personnage progresse séparément du niveau 1 au niveau 20 ; chaque niveau donne deux points de caractéristiques. Vitalité, Force, Mobilité, Endurance et Maîtrise des armes ont dix rangs maximum.

Les huit points de talent sont attribués à la fin de la première rue du premier quartier, à la fin de la troisième rue des quartiers 1 et 2, puis après chacun des cinq premiers boss. Le rang précédent et un point suffisent pour acheter un talent, sans condition de quartiers pour les ultimes. Les récompenses sont individuelles et attribuées aussi aux partenaires KO, une seule fois par jalon. Une nouvelle partie remet les talents à zéro ; les records permanents restent conservés. Voir [la refonte](docs/refonte-talents.md) pour les limites et la compatibilité.

Le menu **Progression** contient uniquement les caractéristiques et l’arbre complet des talents. Il est accessible à la souris, au clavier et à la manette, y compris en pause et en coopération. Les deux jalons de troisième rue donnent un point de talent ; l’XP provient des vagues, des éliminations et des objectifs.

## Vagues, bestiaire et intelligence ennemie

Une rue comporte 3 à 8 vagues selon le quartier, quatre vagues dans l’arène du boss. Le bestiaire est tiré avec un sac de mélange sérialisé : chaque identité non-boss a la même fréquence sur la durée, les apparitions restent espacées et le plafond d’ennemis actifs augmente de 3 à 5 en solo, avec deux places supplémentaires en duo. Les vagues tardives contiennent plus d’ennemis et les PV, la puissance et la vitesse augmentent progressivement jusqu’au sixième chapitre.

Les ennemis lisent les attaques proches : une esquive latérale, un sprint télégraphié, un recul ou un déplacement de flanc peut interrompre leur approche. Ces réactions restent limitées dans le temps et conservent une ouverture lisible afin de ne pas donner une difficulté imprévisible. Les boss et les élites gardent leurs séquences propres et leur budget d’attaquants partagé.

## Sauvegarde compatible avec Render

Un checkpoint local est écrit entre les vagues, dans les pauses de repos et à la fin d’une rue. Il contient uniquement une version bornée de l’état de progression : graine, rue, vague, profils, vie, arme, décor cassé et compteurs. **Exporter** produit un JSON de 64 Ko maximum ; **Importer** vérifie les personnages, les armes, les limites numériques et les talents avant de reconstruire la simulation.

La mémoire du WebService Render peut donc être perdue après un redémarrage sans rendre la sortie injouable : **Reprendre la sortie** restaure un run solo, et l’hôte peut restaurer un checkpoint coopératif quand les deux joueurs sont présents. Les états terminés ne sont pas restaurés. Les victoires, records, niveaux atteints et titres permanents restent dans le navigateur par personnage. Une sortie complète vise environ 75 à 100 minutes, avec une limite de difficulté qui reste jouable en moins de deux heures.

## Lecture des impacts et nouveaux sprites

Les rectangles, disques et trajectoires rouges d’attaques sont retirés, y compris pour les boss et projectiles. **Seuls les bidons inflammables frappés jusqu’à destruction conservent leur zone d’explosion.** Les animations de préparation, points d’exclamation au-dessus des ennemis, libellés de patterns, projectiles, flammes réelles et poussières d’impact restent visibles. Les collisions et temporisations ne changent pas.

Gustavax utilise les deux planches fournies par le joueur : `assets/gustavax/gustavax-user.png` (16 poses en costume) et `assets/gustavax/wrestler-user.png` (12 poses en short bleu). Les originaux sont conservés dans les fichiers `*-source.png`. Le damier a été retiré avec l’outil imagegen intégré ; prompts dans `assets/gustavax/USER-SPRITES.md`. L’alpha est conservé tel quel, les limites des cases sont adaptées aux poses et les rectangles utiles sont mis en cache par le moteur.

Le feu utilise `assets/shared/arcade/fire-effects.png` ; prompt intégré dans `fire-effects.prompt.md`. Triso réutilise ses sprites existants, y compris pour la bave. Il peut apparaître dès le premier chapitre, vise une position avant de cracher et laisse une flaque pendant 4,5 s. Trois flaques au maximum ; saut et esquive permettent d’éviter leurs dégâts.

## Bande-son originale instrumentale

**Réglages audio** dans le menu principal, la pause et les résultats : volume général, musique, bruitages/voix séparés, ajustables au clavier, à la souris, au tactile ou à la manette. Valeurs initiales réduites : général 65 %, musique 40 %, bruitages 65 %. Les niveaux se multiplient et s’appliquent immédiatement, sans remise à zéro en changeant de morceau. Enregistrement local sous `saranfou-audio-v1`. Le bouton ♪ conserve sa fonction couper/rétablir sans effacer les curseurs. La voix locale respecte général/bruitages et s’arrête en pause ou en coupant le son. `game/audio-settings.js` centralise les valeurs par défaut.

La musique est composée et synthétisée localement par `game/music.js`, sans voix, sample externe ni morceau repris. Direction arcade club des années 1990 : house, acid, breakbeat et électro-funk, synthèse FM à deux opérateurs, basse résonante, accords courts et batterie percutante. Référence de direction : [entretien de Yuzo Koshiro à la Red Bull Music Academy](https://daily.redbullmusicacademy.com/2014/09/yuzo-koshiro-interview/), qui décrit ses influences house/techno et ses techniques FM. Aucune mélodie de Streets of Rage n’est reprise.

Sept thèmes indépendants possèdent chacun deux mélodies, une ligne de basse, une progression harmonique et des motifs de percussion dédiés. Ce ne sont plus des transpositions du même morceau. Chaque boucle de 32 mesures comprend une réponse mélodique, un pont plus léger puis une reprise enrichie.

- Menu : **Saran après minuit**, 112 BPM, groove syncopé et mélodie FM cristalline ; reste identique quel que soit le chapitre sélectionné.
- Chêne Maillard : **Bitume électrique**, 124 BPM, house arcade.
- Château de l’Étang : **Chrome et néons**, 128 BPM, acid et filtres résonants.
- Stade Colette Besson : **Course nocturne**, 130 BPM, breakbeat.
- Bourg de Saran : **Braises sur béton**, 122 BPM, électro-funk syncopé.
- Saran by Night : **Cyclone urbain**, 134 BPM, house/rave.
- Collège Montjoie : **Dernier round**, 138 BPM, techno plus tendue.

Chaque thème de chapitre accompagne ses six rues. Les boss ajoutent 8 BPM, des contrechants et des percussions ; ils ne réutilisent pas le thème du menu. Les transitions libèrent les anciennes voix avec un fondu court, sans superposer longtemps deux harmonies. Le navigateur exige une première interaction pour activer l’audio. La pause atténue la musique, le bouton ♪ coupe musique et bruitages ; les impacts abaissent brièvement le fond musical, moins fortement qu’avant pour préserver son énergie. Les bruitages restent conservés. Aucun téléchargement audio ni service tiers requis, y compris en coopération.

Réglages centralisés dans `game/music-score.js` : `THEMES` contient les tempos, tonalités, swing, mélodies, réponses, basses, accords et rythmes de chaque thème. `MUSIC` règle volume, atténuation des impacts et accélération des boss. Les instruments et arrangements sont dans `game/music.js`. `npm run test:music` rend les 13 arrangements complets (menu + six rues + six boss) dans Web Audio, contrôle le signal, la pause, la coupure et l’atténuation des impacts, puis exporte `test-results/arcade-themes-preview.wav` : six secondes de chaque thème, menu puis chapitres 1 à 6. Le test technique ne remplace pas une écoute sur les enceintes du joueur.

## Réglages du combat

**`game/balance.js`** est le point d’entrée principal :

- `DIFFICULTIES` : dégâts, vitesse, récupération, préparation, renforts et vies par mode.
- `BALANCE.waves` : nombres de vagues, repos, délai des renforts, plafonds d’ennemis/attaquants.
- `BALANCE.enemy` : progression par chapitre et multiplication des PV en duo.
- `BALANCE.bosses` : PV, dégâts de base, seuils de phases, récupération et soins de chacun.
- `BALANCE.bossCombat` : PV duo, durée de préparation, durée et vitesse des charges.
- `BALANCE.specials` : coût, cooldown, durée, multiplicateur de dégâts et rayon par personnage.
- `BALANCE.wrestler` : `statBonus` (0,30) et rayon du coup au sol de Gustavax.
- `BALANCE.specials.karonux`, `specials.kikor`, `tornado`, `embers`, `triso` : trajet/demi-tour/sommeil de la Golf, peinture/invocation, vitesse du tourbillon, nombre/vol/durée des mégots et comportement/durée/plafond des flaques de bave.
- `game/progression.js`, objet `TALENTS` : noms, descriptions, branches, prérequis et effets numériques des 42 talents. `normalizeProfile` borne les chapitres et les dépenses ; `game/street-events.js` déclenche le point de fin de chapitre.

**`game/encounters.js`** : tirage pseudo-aléatoire des vagues sur l’intégralité du bestiaire dès le premier chapitre. Les élites sont plus rares et limitées à une par vague ; le nombre d’adversaires augmente doucement avec la progression.

**`game/data.js`** : PV, puissance et vitesse de base des personnages/ennemis, listes de décors, animations normales.

**`game/combat.js`** : enchaînement des patterns, forme des zones, salves, durée du feu, nombre d’invocations, timings des effets des spéciaux. Les coordonnées et variantes propres à chaque pattern sont ici ; les principaux paramètres numériques partagés viennent de `balance.js`.

**`game/visuals.js`** : sprites supplémentaires et libellés des attaques. **`game/renderer.js`** : indications de préparation sans zones rouges (sauf bidons), atmosphère, éclairages doux, reflets et particules. Aucun décor n’est remplacé.

## Validation et limites

`npm run test:elites` : menu audio clavier/manette simulée, maintien sans répétition, sauvegarde et mobile ; contrôle d’alpha des six planches, aperçu des 72 cases, des six variantes et des six signatures de boss. Les tests Node contrôlent également l’éjection du canapé, l’assise, la rage synchronisée entre deux clients réseau, les limites d’attaquants et le nettoyage des dangers.

`pnpm test` : tests du moteur, de la campagne, des 36 portes de vagues, des modes de difficulté, de chaque spécial/boss, des soins, de la progression, de l’allocation de points, du serveur et de la reconnexion. Les bots de campagne n’altèrent pas les PV et ne sautent pas les rencontres. Sur la graine de test, une campagne Arcade prend environ 20 à 22 minutes, avec plus de 370 KO solo / 490 KO duo ; ce n’est pas une durée garantie pour un joueur humain.

`pnpm run test:browser` : clavier, solo, duo, pause, ressources, reprise réseau, passage en solo, affichage mobile.

`pnpm run test:controller` : Gamepad API standard simulée dans Chrome, stick analogique, croix, poing/pied/saut/spécial/esquive, navigation, listes, maintien sans répétition des achats, code de salon sans clavier, salon, préparation, pause, évolution, remise à zéro, Game Over/Continue et retour. Un serveur éphémère de test permet de vérifier les écrans de fin sans ajouter de triche au jeu livré. Des scènes de test passent par le vrai moteur et le vrai rendu pour inspecter Golf, vélo, pétanque et transformations. L’alpha de la nouvelle planche est vérifié.

Les captures sont dans `test-results/`, non versionné. Les commandes navigateur acceptent `BROWSER_PATH` vers Chrome/Edge. **Aucune manette physique ni liaison entre deux connexions Internet distinctes n’a été utilisée** : le mapping standard est testé, pas les pilotes Bluetooth/USB d’un appareil réel. Une manette non standard peut nécessiter un mapping fourni par le navigateur.

`npm run test:talents` : deux clients, attribution des points de chapitre, allocation clavier, remise à zéro/reconnexion, mobile, catcheur pilotable et expiration, contrôle du rendu des avertissements et capture des 28 poses de Gustavax.

Autre planche conservée : `assets/shared/specials/transformations-v3.png`, créée avec le skill **imagegen** et l’outil intégré. Le prompt complet est conservé dans `assets/shared/specials/transformations-v3.prompt.md`. Aucun appel d’API payante externe ou déploiement public n’a été effectué par cette mise à jour.


Les gains d’XP de combat sont multipliés par 0,5 : première vague 60 XP, ennemi du premier chapitre 10 XP, boss 300 XP. Les seuils de niveau, les deux points par niveau et les acquis des sauvegardes restent identiques. La sélection compare la vie, la force et la vitesse de départ sur une échelle commune par caractéristique. L’endurance reste dans les améliorations à acheter en jeu.

### Rencontres variables du Chêne Maillard

Chaque sortie tire deux rencontres distinctes parmi quatre, dans les rues 2 et 4. Elles remplacent la deuxième vague et le défi chronométré de ces rues : ni la première rue, ni le boss, ni les autres quartiers ne sont affectés par ce tirage. Le tirage est déterministe pour une même sortie et conservé dans les sauvegardes et les instantanés réseau.

- **Livraison renversée** : trois caisses contiennent un repas, une boisson et une batte. Les ennemis éloignés des joueurs cherchent à voler les caisses ; quatre secondes sans intervention suffisent. S’approcher du voleur interrompt le vol. Les caisses intactes sont récupérées à la victoire. Même si tout est volé, la rue reste franchissable.
- **Vendeur du coffre** : chaque joueur choisit gratuitement entre +35 PV, +50 énergie et une batte de huit coups, ou passe son tour. Aucun achat, aucune monnaie. Un seul cadeau par joueur ; la batte remplace l’arme tenue, qui est déposée au sol.
- **Voisin encerclé** : choix facultatif avant le combat. Les agresseurs font perdre du courage au voisin s’ils restent près de lui sans joueur pour les détourner. Éliminer la bande avant sa fuite permet au voisin de revenir à la rue suivante : il distrait les premiers ennemis pendant quatre secondes et apporte un repas. Un échec ne bloque pas la progression.
- **Parking des immeubles** : détour facultatif dans une zone aménagée sur la rue actuelle, sans écran de chargement. Un gardien renforcé protège un fusil à pompe par joueur. Refuser fait simplement continuer le parcours.

Se déplacer vers le panneau souhaité puis **F / RT / R2** (bouton F tactile) pour choisir. En coopération, les deux joueurs actifs doivent confirmer un combat facultatif ; un refus suffit pour continuer. Le vendeur attend un choix individuel de chaque joueur actif. Les rencontres sans combat ne donnent pas d’XP de vague ; les combats gardent les gains réduits habituels. Une sauvegarde prise avant une rencontre la rejoue ; une sauvegarde après son résultat conserve les récompenses et l’aide du voisin sans les attribuer à nouveau.

Vérification : `node --test --test-isolation=none tests/*.test.js` et `node tests/neighborhood-browser.mjs` (Edge installé ou `BROWSER_PATH`). Le test navigateur utilise deux vrais clients coopératifs, les entrées clavier et des captures desktop/mobile.

### Rencontres variables du Château de l’Étang

Deux événements distincts sont tirés parmi quatre dans les zones 2 et 4, en remplacement de la deuxième vague et de l’ancien défi chronométré. Le premier quartier garde son propre tirage ; les autres niveaux disposent de leur propre tirage indépendant. Chaque événement peut être refusé. Les deux joueurs actifs doivent accepter en coopération ; un refus suffit pour continuer.

- **Les vannes de l’étang** : pendant le combat, F / RT / R2 près de chacune des deux vannes. Les deux vannes ouvertes déclenchent une chasse d’eau qui étourdit les ennemis présents pendant trois secondes et donne 30 énergie à chaque joueur vivant, une seule fois. On peut finir le combat sans ouvrir les vannes, mais sans le bonus.
- **Tu tires ou tu pointes ?** : trois boules par joueur, sans combat. Depuis le cercle, F / RT / R2 quand le curseur entre dans la zone verte. Chaque réussite donne 15 énergie et 100 points de score, sans XP. Les lancers ont une récupération individuelle de 0,55 seconde. Le panneau de droite permet de renoncer aux boules restantes. La pause arrête le curseur.
- **Le pique-nique des pigeons** : chaque joueur actif donne 25 énergie pour recevoir 35 PV. Si un joueur n’a pas assez d’énergie, personne ne paie et le groupe peut refuser. Dans la zone suivante, les pigeons apportent un soin de 25 PV par joueur, une seule fois.
- **Les braconniers du parc** : ouvrir les trois cages avec F / RT / R2 pendant le combat. Chaque pigeon libéré étourdit les ennemis proches pendant 2,5 secondes. À la victoire, chaque cage ouverte donne un soin de 15 PV. Les cages restantes ne bloquent pas la progression.

Les pigeons ont un corps gris et la tête chauve et barbue de Lorenzo. Sprites générés avec l’outil imagegen intégré : vanne, pigeon au repos, pigeon ailes déployées, pigeon en cage, panier et boules. La planche source `assets/shared/scenery/estate-events.png` utilise un fond magenta masqué au chargement par le moteur ; les cellules sont détourées et découpées automatiquement. Le prompt et la provenance sont dans `docs/estate-sprites.md`.

Le tirage, les résultats et le cadeau différé sont conservés dans les sauvegardes. Tests : `node --test --test-isolation=none tests/*.test.js` ; `node tests/estate-browser.mjs` pour deux clients réels, clavier, tactile et vérification des six sprites.

### Rencontres variables du Stade Colette Besson

Deux rencontres distinctes parmi quatre remplacent la deuxième vague et le défi chronométré des rues 2 et 4. Le tirage est conservé dans les sauvegardes. F / RT / R2 permet de choisir ; deux accords sont nécessaires en duo, un refus suffit pour passer. Tous les combats se terminent normalement même si l’objectif est raté, avec l’XP de vague habituelle et sans prime d’XP supplémentaire.

- **Le ballon de la discorde** : frapper le ballon (K au pied, J au poing ou avec une arme) pour percuter les ennemis. Marquer dans le but à droite apporte un soin de 20 PV et deux renforts, jusqu’à trois buts par rencontre. Un tir ne touche chaque adversaire qu’une fois.
- **Le relais des bras cassés** : prendre le témoin avec F puis rejoindre les trois balises dans l’ordre pendant le combat. F le passe à un partenaire proche ou le pose au sol. Un dégât réel ou une déconnexion le fait tomber ; une brève temporisation empêche de le reprendre immédiatement après un choc. Terminer le relais et le combat donne +15 % de vitesse de déplacement durant toute la rue suivante, sans modifier la puissance. La sauvegarde conserve ce bonus et son expiration.
- **Le coach a craqué** : la consigne apparaît avant le choix : pieds seulement (pas de poing, arme, projection ou spéciale) ou aucune spéciale. Une infraction annule uniquement la récompense. Respecter la règle jusqu’à la victoire donne une batte au sol et 30 énergie par joueur vivant. Une spéciale impossible faute d’énergie n’est pas une infraction.
- **L’arrosage automatique** : une bande orange annonce le passage d’un jet bleu qui pousse joueurs et ennemis sans infliger de dégâts. Sauter ou esquiver permet d’éviter la poussée. F près d’une vanne coupe sa bande ; fermer les deux arrête l’arrosage. Gagner sans fermer de vanne donne 40 énergie par joueur vivant.

Ballon, témoin, balises et arrosage sont dessinés dans le canvas ; le coach utilise un sprite sportif existant. Aucun nouvel asset externe nécessaire. Validation : tests de simulation et sauvegarde dans `tests/stadium.test.js` ; deux navigateurs coopératifs, commandes clavier et tactile dans `node tests/stadium-browser.mjs`.

### Rencontres variables du Bourg de Saran

Deux rencontres distinctes sont tirées parmi quatre dans les rues 2 et 4 du niveau 4. Elles remplacent la deuxième vague et le défi chronométré de ces rues. Première rue et boss inchangés. Chaque choix est facultatif : F / RT / R2 près du panneau, deux accords en coopération, un refus suffit pour poursuivre.

- **La dernière fournée** : le présentoir propose quatre pains partagés au maximum, un au début puis un toutes les quatre secondes. F prend un pain ; F à nouveau le mange pour +15 PV ; J le lance pour étourdir le premier ennemi touché pendant 2,5 secondes. Le lancer conserve l’arme équipée et ses munitions. Un pain porté par un joueur KO ou déconnecté retourne au présentoir. Les pains inutilisés disparaissent après le combat.
- **Le scooter mal garé** : le choix annonce l’alarme avant l’ouverture. Accepter ouvre le coffre, dépose une batte de huit coups par joueur et attire Makouille avec deux Rémy, plus Guylux en duo. Refuser ne donne ni arme ni combat.
- **La terrasse en vrac** : trois tables de six points de résistance peuvent intercepter les coups entre un attaquant et sa cible, dans les deux camps. Les frappes et projectiles ennemis peuvent aussi casser les tables. À la victoire, chaque table encore debout donne 10 énergie à chaque joueur vivant, jusqu’à 30. Tout casser ne bloque pas la progression. Les meubles de la rencontre sont retirés à la vague suivante.
- **Le bonneteau de Guylux** : trois manches gratuites sans combat. La bille est montrée pendant 1,5 seconde, puis quatre échanges visibles de gobelets durent 3,6 secondes. Le mélange animé et la réponse utilisent exactement les mêmes permutations. Chacun choisit un gobelet en s’en approchant puis F ; chaque bonne réponse rapporte 15 énergie, soit 45 au maximum par joueur. La révélation attend les deux réponses en duo, ou vingt secondes. Le panneau à droite permet à chacun d’arrêter ; les partenaires actifs peuvent continuer. La pause fige le mélange.

Les combats gardent leur XP habituelle, sans prime d’XP d’événement ; le bonneteau n’en donne pas. Le tirage et les résultats sont conservés dans les sauvegardes ; les anciens fichiers reçoivent un tirage valide du Bourg. Les sauvegardes se prennent entre les combats : quitter une rencontre en cours reprend au dernier point sûr.

Le présentoir, les tables, l’ardoise et Guylux réutilisent les sprites existants ; pain, scooter et gobelets sont dessinés dans le canvas. Vérification : `node --test --test-isolation=none tests/*.test.js` et `node tests/bourg-browser.mjs` (deux navigateurs coopératifs, clavier, tactile et captures desktop/mobile).

### Rencontres variables de Saran by Night et du Collège Montjoie

Les niveaux 5 et 6 tirent chacun deux rencontres distinctes dans les rues 2 et 4, à la place de la deuxième vague et du défi chronométré. Première rue et boss final inchangés. Les tirages et résultats sont conservés dans les sauvegardes ; les anciennes sauvegardes reçoivent des plans valides. Tous les événements sont facultatifs, avec deux accords initiaux en duo et un refus suffisant pour continuer. Les récompenses sont plafonnées, sans prime d’XP supplémentaire.

**Saran by Night :**

- **Le dernier bus** : pendant le combat, le bus ouvre ses portes entre la sixième et la quatorzième seconde. F / RT / R2 devant la porte confirme l’embarquement. Tous les joueurs connectés doivent être vivants, au sol et présents devant la porte ; quitter la zone annule son accord. Le bus fait passer à la vague suivante sans XP de vague et abandonne les objets au sol. Le rater laisse le combat continuer normalement.
- **Le caddie infernal** : F près du caddie arrêté le pousse dans la direction du personnage. Il inflige 22 dégâts et étourdit les ennemis touchés pendant 1,5 seconde ; un même ennemi ne peut être touché qu’une fois par poussée. Trois impacts sur des adversaires ou les limites de la rue cassent le caddie. Il n’est pas nécessaire de l’utiliser pour finir le combat.
- **La panne de courant** : le décor s’assombrit, mais personnages, annonces d’attaque et contrôles restent lisibles. F au coffret rétablit l’éclairage. Gagner sans rallumer donne 35 énergie par joueur vivant, une seule fois.
- **Le distributeur récalcitrant** : jusqu’à trois coups. Le premier donne 20 énergie sans risque ; les deux suivants ont respectivement 35 % et 70 % de risque de déclencher une alarme au lieu de donner une boisson. Le risque est affiché avant chaque décision, et chaque coup exige un nouvel accord des deux joueurs actifs. Le panneau de droite arrête l’événement en conservant les gains. Une alarme appelle une seule bande et lance un combat normal. Les boissons seules ne donnent pas d’XP.

Les sprites générés du bus, du caddie, du coffret et du distributeur sont employés dans les événements ; provenance et prompts dans `docs/night-sprites.md`.

**Collège Montjoie :**

- **La sonnerie a retenti** : une bande composée exclusivement de **six Jualos** traverse une ligne de la cour toutes les sept secondes, alternativement dans les deux sens. La sonnerie et la bande jaune préviennent 1,4 seconde avant le passage. Les Jualos renversent joueurs et ennemis : 8 dégâts de base aux joueurs, 20 aux ennemis, avec un impact maximum par personnage et par traversée. Sauter ou esquiver permet d’éviter le passage. Ces Jualos utilisent les sprites de marche du personnage ; ce ne sont pas des ennemis à vaincre et ils ne bloquent jamais une vague.
- **Le contrôle surprise** : trois fenêtres de dix secondes demandent une esquive précise face à une attaque imminente, une projection réellement relâchée, puis deux adversaires distincts touchés par une même spéciale. Une réussite donne 15 énergie par joueur vivant, une fois par consigne (45 maximum). Les actions hors de la consigne active ne comptent pas. Un échec ne bloque pas le combat.
- **La réserve du gymnase** : chaque joueur choisit librement un ballon, une batte de huit coups, un soin de 35 PV ou passe son tour. Un choix par joueur, sans combat ni XP. Le ballon est conservé dans la sauvegarde ; J / X le lance pendant un combat à la place du prochain coup de poing, sans consommer l’arme tenue. Il rebondit sur trois ennemis distincts au maximum (22 dégâts et étourdissement de 1,2 seconde), puis disparaît. Aucun empilement de ballons.
- **La photo de classe** : un cadre fixe accueille trois photos, à 6, 12 et 18 secondes. Chaque joueur vivant au sol dans le cadre reçoit 15 PV au flash ; les ennemis cadrés sont étourdis 2,5 secondes. Le compte à rebours est visible, avec un flash local et un son d’appareil photo. Les prises restantes sont annulées si le combat finit plus tôt.

La pause fige tous les temporisateurs. La sauvegarde reste prise aux points sûrs entre les combats. Coopération réseau, reprise solo et commandes tactiles utilisent les mêmes interactions F / RT / R2 que les premiers quartiers.

Validation : `node --test --test-isolation=none tests/*.test.js`, tests ciblés dans `tests/late-events.test.js`, et `node tests/late-browser.mjs` pour les huit rencontres dans deux navigateurs coopératifs (clavier, tactile et captures).

## Tournée des quartiers

Chaque nouvelle partie mélange les six quartiers, sans répétition. La difficulté, les vagues et les jalons de talents suivent la position dans la tournée ; les décors, boss et événements restent propres au quartier. L’ordre et les victoires sont conservés dans les sauvegardes. Les anciennes sauvegardes gardent leur parcours initial.

Après chaque boss, un tableau circulaire affiche les six portraits : gris avant la victoire, en couleur avec une coche dorée après. En coopération, les deux joueurs confirment le départ. Après les six victoires, le portrait central de Gustavax se révèle et le niveau 7 est débloqué.

## Niveau 7 — Le bureau de Gustavax

Le décor fourni dans `niveau7.png` est conservé dans `assets/shared/levels/level7/gustavax-office.png`. Toute la finale se déroule dans cette pièce : Gustavax fume derrière son bureau pendant six revanches dans un ordre tiré au début du niveau. Deux vagues de trois ennemis (cinq en duo) précèdent chaque boss ; les manches 3 et 5 comptent trois vagues. Les boss reviennent avec 60 % de leurs PV et de leur puissance ; Karonux revient à pied. Chaque revanche rend 30 % de vie. Les portraits se fissurent au fil des victoires.

Gustavax brise son bureau après la sixième revanche. Son duel comporte 1 800 PV (multiplicateur duo habituel), avec trois phases à 100 %, 65 % et 30 % : revers/cigare/fauteuil, fumée/charges/braises, puis balayages/onde à sauter/frappes successives. Les morceaux du bureau interrompent une charge et ouvrent une contre-attaque de trois secondes. Aucun renfort pendant le duel. Les limites de phase empêchent un gros coup de sauter une transformation. Une défaite contre Gustavax permet de reprendre son duel avec vie pleine et au moins deux vies, en solo comme en duo, sans refaire les revanches.

## Menu secret

Depuis l’accueil, taper **GUSTAVAX45** (insensible aux majuscules, moins de cinq secondes entre deux touches). Sur mobile : cinq pressions rapides sur le logo, puis saisir le même code. Le passage reste accessible pendant la session ; « Refermer le passage » ou recharger la page le masque de nouveau.

Choix des sept niveaux, de la rue de départ, du personnage, de la difficulté, de chaque boss et de sa phase. Accès au niveau 7 complet ou au duel seul. Options : invulnérabilité, spécial illimité, niveau 20 et huit points de talents à répartir. Les essais se terminent à la fin du quartier choisi et ne touchent ni sauvegarde de tournée ni records. Retour au menu secret disponible en pause et en fin d’essai.
