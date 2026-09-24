> Archive de l’arbre antérieur à la refonte. Pour les règles en vigueur, voir [refonte-talents.md](refonte-talents.md).

# Talents actuels — Streets of SaranFou

Inventaire extrait de `game/rogue-talents.js`. Les descriptions ci-dessous sont celles définies dans le jeu ; ce document ne constitue pas un audit de leur fonctionnement en combat.

## Règles actuelles

- 7 personnages, 3 branches par personnage, 6 paliers par branche et 2 talents par palier : 252 talents.
- Chaque talent coûte 1 point. Un talent du palier précédent dans la même branche ouvre le suivant.
- Les talents ordinaires d’un même palier peuvent être cumulés. Les deux ultimes d’une branche sont exclusifs.
- Les ultimes nécessitent également trois quartiers terminés.
- Jusqu’à 14 points de talents par partie : 9 par montée de niveau et 5 grâce aux cinq premiers quartiers.
- Les caractéristiques constituent un système distinct : 2 points par niveau, avec 10 rangs maximum par caractéristique.

## Premier constat pour une refonte

Sur 21 branches, 20 répètent exactement les mêmes 7 bonus passifs, soit 140 talents sur 252. Seule la branche Sheitan de Gustavax remplace toute cette série par des effets spécifiques.

| Emplacement | Bonus répété |
|---|---|
| Palier 2 — second talent | Régénération d’énergie +15 % |
| Palier 3 — premier talent | Puissance spéciale +15 % |
| Palier 3 — second talent | Rayon des effets +12 % |
| Palier 4 — premier talent | Réduction des dégâts +6 % |
| Palier 4 — second talent | Recharge d’esquive −8 % |
| Palier 5 — premier talent | Durée spéciale +0,4 s |
| Palier 5 — second talent | Recharge spéciale −6 % |

Les noms ne décrivent donc pas toujours l’effet : « Double rebond » réduit les dégâts, « Sommeil réparateur » augmente le rayon des effets et « Créations robustes » prolonge le spécial.

Pistes proposées, sans modification du jeu : remplacer progressivement les bonus identiques par des mécaniques propres aux branches ; réserver les statistiques générales aux caractéristiques ; préciser les valeurs et conditions des descriptions vagues ; réexaminer les talents liés aux objets destructibles désormais rares.

## Karonux

### Garage clandestin

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Pare-chocs aimanté** | La Golf pousse les ennemis légers devant elle avant de les éjecter au retour. |
| 1 | **Marche arrière sauvage** | Rappuyer sur spécial permet de déclencher le retour de la Golf plus tôt. |
| 2 | **Carambolage** | Les projections provoquent un choc supplémentaire sur les ennemis proches. |
| 2 | **Moteur préparé** | Régénération d’énergie : +15 %. |
| 3 | **Châssis renforcé** | Puissance spéciale : +15 %. |
| 3 | **Plein gratuit** | Rayon des effets : +12 %. |
| 4 | **Pneus tendres** | Réduction des dégâts : +6 %. |
| 4 | **Turbo** | Recharge d’esquive : -8 %. |
| 5 | **Pilote endurant** | Durée spéciale : +0.4 s. |
| 5 | **Révision express** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Convoi exceptionnel** | Le spécial fait traverser la rue à deux Golf supplémentaires. Recharge : 18 s. |
| 6 — Ultime | **Golf blindée** | Le spécial permet de conduire librement la Golf avec les directions pendant 4 s. Recharge : 18 s. |

### Roi de la sieste

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Sommeil léger** | Une direction + esquive permet de sortir de la sieste. |
| 1 | **Oreiller de secours** | La sieste absorbe le premier coup reçu. |
| 2 | **Réveil difficile** | Se relever de la sieste repousse les ennemis proches. |
| 2 | **Matelas humain** | Régénération d’énergie : +15 %. |
| 3 | **Siège massant** | Puissance spéciale : +15 %. |
| 3 | **Sommeil réparateur** | Rayon des effets : +12 %. |
| 4 | **Récupération profonde** | Réduction des dégâts : +6 %. |
| 4 | **Couverture épaisse** | Recharge d’esquive : -8 %. |
| 5 | **Café serré** | Durée spéciale : +0.4 s. |
| 5 | **Réveil explosif** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Grasse matinée** | Après le spécial, le réveil déclenche une onde de choc de 250 pixels infligeant 250 % de puissance. Recharge : 18 s. |
| 6 — Ultime | **Encore cinq minutes** | Un coup fatal est annulé une fois par quartier : 20 % de vie, un bouclier de 25 % et 1,5 s de sieste protégée. |

### Sale conducteur

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Vidange** | Les esquives laissent une flaque d’huile qui ralentit les ennemis. |
| 1 | **Créneau serré** | Une esquive crée un leurre temporaire. |
| 2 | **Priorité à droite** | Le premier coup après une esquive inflige 40 % de dégâts supplémentaires. |
| 2 | **Dérapage contrôlé** | Régénération d’énergie : +15 %. |
| 3 | **Pare-brise blindé** | Puissance spéciale : +15 %. |
| 3 | **Pied au plancher** | Rayon des effets : +12 %. |
| 4 | **Contre-braquage** | Réduction des dégâts : +6 %. |
| 4 | **Réservoir percé** | Recharge d’esquive : -8 %. |
| 5 | **Couloir de fuite** | Durée spéciale : +0.4 s. |
| 5 | **Impact latéral** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Rond-point de l’enfer** | Le spécial crée un vortex de 200 pixels pendant 5 s, attirant et frappant les ennemis légers. Recharge : 18 s. |
| 6 — Ultime | **Sortie de route** | Une projection appelle une Golf sur la zone de chute. Recharge : 9 s. |

## Jualos

### Le rempart

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Couenne épaisse** | La durée d’étourdissement est réduite de 35 %. |
| 1 | **Derrière moi !** | Les alliés proches derrière Jualos reçoivent 20 % de dégâts en moins. |
| 2 | **Dette de douleur** | Encaisser charge le prochain coup lourd, jusqu’à +60 %. |
| 2 | **Épaules larges** | Régénération d’énergie : +15 %. |
| 3 | **Garde haute** | Puissance spéciale : +15 %. |
| 3 | **Souffle profond** | Rayon des effets : +12 %. |
| 4 | **Carapace** | Réduction des dégâts : +6 %. |
| 4 | **Pieds plantés** | Recharge d’esquive : -8 %. |
| 5 | **Cœur solide** | Durée spéciale : +0.4 s. |
| 5 | **Riposte massive** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Forteresse vivante** | Le spécial immobilise Jualos 5 s et réduit de 70 % les dégâts reçus. Les dégâts absorbés alimentent une explosion finale. Recharge : 18 s. |
| 6 — Ultime | **Pas touche au pote** | Le spécial rejoint et relève un allié à terre à 35 % de vie avec un bouclier de 25 %. En solo, donne le bouclier. Recharge : 18 s. |

### Le sanglier

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Labourage** | La charge se dirige plus facilement sur les côtés. |
| 1 | **Défenses croisées** | Un rebond contre le bord déclenche une onde de choc. |
| 2 | **Piétinement** | La charge crée des impacts au sol espacés. |
| 2 | **Sabots rapides** | Régénération d’énergie : +15 %. |
| 3 | **Charge prolongée** | Puissance spéciale : +15 %. |
| 3 | **Peau de bête** | Rayon des effets : +12 %. |
| 4 | **Défenses aiguisées** | Réduction des dégâts : +6 %. |
| 4 | **Souffle sauvage** | Recharge d’esquive : -8 %. |
| 5 | **Ruée large** | Durée spéciale : +0.4 s. |
| 5 | **Sang chaud** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Sanglier colossal** | Le spécial transforme Jualos en sanglier géant pendant 6 s avec des ondes de choc périodiques. Recharge : 18 s. |
| 6 — Ultime | **La harde** | Le spécial invoque trois sangliers pendant 5 s, à 70 % de puissance chacun. Recharge : 18 s. |

### Faim de bagarre

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **À emporter** | Les directions permettent de déplacer un ennemi saisi. |
| 1 | **Double ration** | La saisie frappe aussi un deuxième ennemi léger proche. |
| 2 | **Digestion musclée** | Un sandwich à pleine vie donne une protection temporaire. |
| 2 | **Bon appétit** | Régénération d’énergie : +15 %. |
| 3 | **Poigne solide** | Puissance spéciale : +15 %. |
| 3 | **Gros bras** | Rayon des effets : +12 %. |
| 4 | **Casse-croûte** | Réduction des dégâts : +6 %. |
| 4 | **Étreinte** | Recharge d’esquive : -8 %. |
| 5 | **Deuxième service** | Durée spéciale : +0.4 s. |
| 5 | **Reprise d’élan** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Banquet de baffes** | Après le spécial, les coups rendent de la vie pendant 8 s, au maximum 15 % de vie par activation. Recharge : 18 s. |
| 6 — Ultime | **Service familial** | Une saisie accroche un deuxième ennemi léger proche ; la projection lance les deux. Recharge : 9 s. |

## Yanu

### Le chasseur

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Flair** | Se rapprocher d’un ennemi blessé accélère Yanu. |
| 1 | **Bond de chasse** | Le poing après une esquive devient un bond d’attaque. |
| 2 | **Tendon tranché** | Une attaque dans le dos ralentit la cible. |
| 2 | **Foulée** | Régénération d’énergie : +15 %. |
| 3 | **Instinct meurtrier** | Puissance spéciale : +15 %. |
| 3 | **Griffes tendues** | Rayon des effets : +12 %. |
| 4 | **Traqueur** | Réduction des dégâts : +6 %. |
| 4 | **Souffle du chasseur** | Recharge d’esquive : -8 %. |
| 5 | **Angle mort** | Durée spéciale : +0.4 s. |
| 5 | **Morsure** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Chasse sauvage** | Le spécial enchaîne quatre bonds sur des cibles distinctes, à 125 % de puissance. Recharge : 18 s. |
| 6 — Ultime | **L’alpha choisit** | Le spécial marque l’ennemi le plus blessé : +50 % de dégâts directs contre lui jusqu’à sa mort ou la fin de rue. Recharge : 18 s. |

### Pleine lune

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Griffes profondes** | Les attaques de loup infligent un saignement. |
| 1 | **Hurlement** | La transformation repousse les ennemis proches. |
| 2 | **Mue brutale** | La transformation retire ralentissement et étourdissement. |
| 2 | **Fourrure** | Régénération d’énergie : +15 %. |
| 3 | **Griffes ouvertes** | Puissance spéciale : +15 %. |
| 3 | **Lune montante** | Rayon des effets : +12 %. |
| 4 | **Prédateur** | Réduction des dégâts : +6 %. |
| 4 | **Sang du loup** | Recharge d’esquive : -8 %. |
| 5 | **Crocs longs** | Durée spéciale : +0.4 s. |
| 5 | **Appel nocturne** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Loup de pleine lune** | Le spécial devient un loup géant pendant 6 s, avec des chocs périodiques autour de lui. Recharge : 18 s. |
| 6 — Ultime | **La meute fantôme** | Le spécial invoque deux loups pendant 6 s, à 80 % de puissance chacun. Recharge : 18 s. |

### L’intouchable

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Pas de côté** | Recharge d’esquive réduite de 20 %. |
| 1 | **Contre-griffe** | Après une esquive réussie, le prochain poing inflige un impact supplémentaire. |
| 2 | **Après-image** | L’esquive laisse un double qui attire les attaques. |
| 2 | **Souplesse** | Régénération d’énergie : +15 %. |
| 3 | **Nerfs vifs** | Puissance spéciale : +15 %. |
| 3 | **Pas léger** | Rayon des effets : +12 %. |
| 4 | **Réflexes** | Réduction des dégâts : +6 %. |
| 4 | **Endurance féline** | Recharge d’esquive : -8 %. |
| 5 | **Frôlement** | Durée spéciale : +0.4 s. |
| 5 | **Précision** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Instinct absolu** | Le spécial réduit la recharge des esquives à 0,15 s pendant 5 s. Recharge : 18 s. |
| 6 — Ultime | **Éclair blanc** | Le spécial enchaîne cinq frappes éclair sur des ennemis distincts, à 80 % de puissance. Recharge : 18 s. |

## Lorenzo

### Crâne de béton

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Front prioritaire** | Le dernier poing du combo frappe plus fort et repousse davantage. |
| 1 | **Mauvaise réception** | Une projection près d’un objet destructible inflige un impact supplémentaire. |
| 2 | **Tu bouges pas** | Les coups lourds empêchent brièvement les manœuvres ennemies. |
| 2 | **Crâne renforcé** | Régénération d’énergie : +15 %. |
| 3 | **Bras de bouliste** | Puissance spéciale : +15 %. |
| 3 | **Appuis solides** | Rayon des effets : +12 %. |
| 4 | **Nuque de fer** | Réduction des dégâts : +6 %. |
| 4 | **Coups courts** | Recharge d’esquive : -8 %. |
| 5 | **Élan brutal** | Durée spéciale : +0.4 s. |
| 5 | **Coriace** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Tête de démolition** | Le troisième poing du combo déclenche une ruée et un choc de 160 % de puissance. Recharge : 6 s. |
| 6 — Ultime | **Dernier avertissement** | Toucher avec trois attaques différentes déclenche un impact de 250 % de puissance. Recharge : 8 s. |

### Le pyromane

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Braises collantes** | Les ennemis frappés transportent une brûlure. |
| 1 | **Appel d’air** | Le pied projette une vague de feu. |
| 2 | **Mégot de trop** | Frapper une cible brûlante provoque une explosion, recharge par cible. |
| 2 | **Braises tenaces** | Régénération d’énergie : +15 %. |
| 3 | **Cendrier large** | Puissance spéciale : +15 %. |
| 3 | **Tabac fort** | Rayon des effets : +12 %. |
| 4 | **Combustion lente** | Réduction des dégâts : +6 %. |
| 4 | **Souffle brûlant** | Recharge d’esquive : -8 %. |
| 5 | **Feu nourri** | Durée spéciale : +0.4 s. |
| 5 | **Réserve de mégots** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Fournaise** | Le spécial laisse une zone de feu de 220 pixels pendant 6 s. Recharge : 18 s. |
| 6 — Ultime | **Pluie de cendres** | Le spécial embrase cinq zones successives dans la rue. Recharge : 18 s. |

### Pétanque sauvage

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Carreau** | Le pied lance une boule qui interrompt une attaque. |
| 1 | **Bande de billard** | Les boules rebondissent une fois sur les bords. |
| 2 | **Cochonnet** | La première cible touchée attire les boules suivantes. |
| 2 | **Poignet lourd** | Régénération d’énergie : +15 %. |
| 3 | **Lancer tendu** | Puissance spéciale : +15 %. |
| 3 | **Boule renforcée** | Rayon des effets : +12 %. |
| 4 | **Double rebond** | Réduction des dégâts : +6 %. |
| 4 | **Mise à feu** | Recharge d’esquive : -8 %. |
| 5 | **Pointage** | Durée spéciale : +0.4 s. |
| 5 | **Élan du tireur** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Concours municipal** | Le spécial lance trois boules simultanément. Recharge : 18 s. |
| 6 — Ultime | **Boule de braise** | Le spécial lance une boule enflammée qui explose et laisse du feu pendant 3 s. Recharge : 18 s. |

## Jo

### Le danseur

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Changement de rythme** | Alterner poing et pied renforce le combo. |
| 1 | **Passe derrière** | Une esquive proche permet de passer derrière un ennemi. |
| 2 | **Encore un tour** | Une projection déclenche un balayage circulaire. |
| 2 | **Jambes légères** | Régénération d’énergie : +15 %. |
| 3 | **Frappe rythmée** | Puissance spéciale : +15 %. |
| 3 | **Souffle du danseur** | Rayon des effets : +12 %. |
| 4 | **Pas croisés** | Réduction des dégâts : +6 %. |
| 4 | **Reprise** | Recharge d’esquive : -8 %. |
| 5 | **Tempo rapide** | Durée spéciale : +0.4 s. |
| 5 | **Mouvement perpétuel** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Danse de la Mouk** | Le spécial enchaîne cinq déplacements frappants entre des cibles distinctes. Recharge : 18 s. |
| 6 — Ultime | **Rappel** | Le troisième poing du combo est suivi d’une frappe fantôme à 70 % de puissance. Recharge : 4 s. |

### Le cyclone

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Courant d’air** | Le tourbillon attire les ennemis proches. |
| 1 | **Débris volants** | Le spécial projette des débris lorsqu’un objet est brisé. |
| 2 | **Œil du cyclone** | Le centre du tourbillon ralentit les ennemis. |
| 2 | **Rafale** | Régénération d’énergie : +15 %. |
| 3 | **Toupie folle** | Puissance spéciale : +15 %. |
| 3 | **Vent porteur** | Rayon des effets : +12 %. |
| 4 | **Souffle continu** | Réduction des dégâts : +6 %. |
| 4 | **Pression** | Recharge d’esquive : -8 %. |
| 5 | **Vents violents** | Durée spéciale : +0.4 s. |
| 5 | **Cœur de tempête** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Ouragan** | Le spécial crée un vortex de 230 pixels pendant 4 s, qui attire les ennemis légers. Recharge : 18 s. |
| 6 — Ultime | **Double tornade** | Le spécial laisse un second tourbillon autonome de 150 pixels pendant 6 s. Recharge : 18 s. |

### Les longs bras

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Main baladeuse** | Portée des poings augmentée de 40 pixels. |
| 1 | **Ramène-toi** | Saisie automatique à distance accrue pour les ennemis légers. |
| 2 | **Retour à l’envoyeur** | Le pied renvoie les projectiles physiques proches. |
| 2 | **Allonge** | Régénération d’énergie : +15 %. |
| 3 | **Poigne élastique** | Puissance spéciale : +15 %. |
| 3 | **Fouet du bras** | Rayon des effets : +12 %. |
| 4 | **Prise rapide** | Réduction des dégâts : +6 %. |
| 4 | **Balayage ample** | Recharge d’esquive : -8 %. |
| 5 | **Tension** | Durée spéciale : +0.4 s. |
| 5 | **Rebond du poing** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Élastique humain** | Le spécial ramène deux ennemis légers à portée et les percute à 200 % de puissance. Recharge : 18 s. |
| 6 — Ultime | **Grande lessive** | Le spécial frappe tout autour à 360 pixels, à 220 % de puissance. Recharge : 18 s. |

## Kikor

### L’atelier vivant

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Croquis rapide** | La création apparaît plus vite. |
| 1 | **Deuxième pinceau** | Le chevalet invoque deux créations moins puissantes. |
| 2 | **Portrait de famille** | Le choix de soutien après une rue spécialise les créations : dégâts, garde ou soin. |
| 2 | **Esquisse vivante** | Régénération d’énergie : +15 %. |
| 3 | **Pigments solides** | Puissance spéciale : +15 %. |
| 3 | **Pinceau précis** | Rayon des effets : +12 %. |
| 4 | **Travail d’équipe** | Réduction des dégâts : +6 %. |
| 4 | **Retouches rapides** | Recharge d’esquive : -8 %. |
| 5 | **Créations robustes** | Durée spéciale : +0.4 s. |
| 5 | **Inspiration** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Chef-d’œuvre** | Le prochain spécial invoque une création géante, 2,5 fois plus puissante, pendant 12 s. Recharge : 18 s. |
| 6 — Ultime | **Vernissage** | Le spécial invoque une galerie de six créations maximum pendant 10 s. Recharge : 18 s. |

### Couleurs dangereuses

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Bleu froid** | Les coups appliquent de la peinture ralentissante. |
| 1 | **Rouge colère** | Les ennemis peints subissent davantage de dégâts des créations. |
| 2 | **Jaune glissant** | Les projections laissent de la peinture glissante. |
| 2 | **Pigments** | Régénération d’énergie : +15 %. |
| 3 | **Tache large** | Puissance spéciale : +15 %. |
| 3 | **Couleurs tenaces** | Rayon des effets : +12 %. |
| 4 | **Projection de peinture** | Réduction des dégâts : +6 %. |
| 4 | **Encre vive** | Recharge d’esquive : -8 %. |
| 5 | **Mélange concentré** | Durée spéciale : +0.4 s. |
| 5 | **Réserve de couleurs** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Palette explosive** | Trois touches de peinture provoquent une explosion de 160 pixels, à 120 % de puissance. Recharge : 3 s. |
| 6 — Ultime | **La rue est une toile** | Le spécial peint une zone de 230 pixels qui ralentit et blesse pendant 7 s. Recharge : 18 s. |

### Trompe-l’œil

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Faux Kikor** | L’esquive peint un double qui attire les ennemis. |
| 1 | **Cadre protecteur** | Le chevalet intercepte les projectiles ennemis proches. |
| 2 | **Retouche** | Appuyer sur pied + spécial consomme une création pour se protéger. |
| 2 | **Vernis protecteur** | Régénération d’énergie : +15 %. |
| 3 | **Toile résistante** | Puissance spéciale : +15 %. |
| 3 | **Illusion durable** | Rayon des effets : +12 %. |
| 4 | **Pinceau agile** | Réduction des dégâts : +6 %. |
| 4 | **Perspective** | Recharge d’esquive : -8 %. |
| 5 | **Fausse piste** | Durée spéciale : +0.4 s. |
| 5 | **Atelier express** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Porte peinte** | Le spécial ouvre deux portails pendant 12 s. F près d’un portail téléporte un joueur vers l’autre. Recharge : 18 s. |
| 6 — Ultime | **Copie imparfaite** | Le spécial ajoute une copie alliée d’un ennemi léger pendant 10 s, à 110 % de puissance. Recharge : 18 s. |

## Gustavax le Sheitan

### Le Technicien

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Prise ferme** | La saisie dure plus longtemps. |
| 1 | **Souplesse arrière** | Les projections frappent une zone d’atterrissage élargie. |
| 2 | **Changement de programme** | Poing + bas pendant une saisie déclenche un plaquage sur place. |
| 2 | **Poigne de fer** | Régénération d’énergie : +15 %. |
| 3 | **Plaquage précis** | Puissance spéciale : +15 %. |
| 3 | **Verrouillage** | Rayon des effets : +12 %. |
| 4 | **Prise rapide** | Réduction des dégâts : +6 %. |
| 4 | **Projection ample** | Recharge d’esquive : -8 %. |
| 5 | **Appuis du ring** | Durée spéciale : +0.4 s. |
| 5 | **Expert du sol** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Personne n’est trop lourd** | Les ennemis lourds ordinaires peuvent être projetés sans écraser Gustavax. Les boss restent soumis aux règles de poids. |
| 6 — Ultime | **Tour de ring** | Les projections déclenchent une frappe circulaire de 190 pixels, à 120 % de puissance. Recharge : 8 s. |

### Le Champion

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Entrée fracassante** | La transformation provoque une onde de choc. |
| 1 | **Descente du coude** | Le pied aérien de catcheur provoque un impact au sol. |
| 2 | **Montée d’adrénaline** | Une projection prolonge le catcheur, au maximum de trois secondes. |
| 2 | **Échauffement** | Régénération d’énergie : +15 %. |
| 3 | **Marteau-pilon** | Puissance spéciale : +15 %. |
| 3 | **Ceinture solide** | Rayon des effets : +12 %. |
| 4 | **Muscles du ring** | Réduction des dégâts : +6 %. |
| 4 | **Endurance du champion** | Recharge d’esquive : -8 %. |
| 5 | **Frappe du titre** | Durée spéciale : +0.4 s. |
| 5 | **Public en feu** | Recharge spéciale : -6 %. |
| 6 — Ultime | **Champion du monde** | La transformation de catcheur devient géante pendant 6 s et émet des ondes de choc périodiques. Recharge : 18 s. |
| 6 — Ultime | **Le ring est partout** | Pendant 7 s après le spécial, toucher un bord déclenche un rebond offensif. Recharge : 18 s. |

### Sheitan

| Palier | Talent | Effet actuel |
|---|---|---|
| 1 | **Mauvais présage** | Le dernier poing d’un combo maudit la cible. |
| 1 | **Poigne infernale** | La saisie maudit sa victime ; la projection propage la marque. |
| 2 | **Feu noir** | Les coups sur une cible maudite infligent une brûlure noire. |
| 2 | **Sol profané** | Les projections laissent des braises sous la victime. |
| 3 | **Pacte de sang** | Maintenir spécial pendant le catcheur sacrifie 8 % de vie pour +35 % de puissance, une fois par transformation, jamais mortel. |
| 3 | **Dette infernale** | Les dégâts reçus chargent le prochain coup lourd, jusqu’à +60 %. |
| 4 | **Regard du Sheitan** | La transformation repousse les ennemis ; les boss sont ralentis. |
| 4 | **Chaînes du dessous** | La chute d’une cible maudite ralentit les ennemis proches. |
| 5 | **Dévoreur de braises** | Tuer une cible brûlante rend 6 énergie, recharge de deux secondes. |
| 5 | **Malédiction contagieuse** | Une victime maudite transmet sa marque à un ennemi proche à sa mort, une transmission maximum. |
| 6 — Ultime | **Sheitan incarné** | Le spécial transforme Gustavax en Sheitan géant pendant 6 s fixes. Des ondes de choc laissent du feu noir sous ses pas. Recharge : 18 s. |
| 6 — Ultime | **La Porte des Enfers** | Projeter une cible maudite ouvre une porte qui attire les ennemis légers, ralentit et brûle pendant 3 s. Recharge : 18 s. |
