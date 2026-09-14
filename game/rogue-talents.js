// Approved rogue trees: three branches, six tiers, two alternatives per tier.
export const TALENT_BRANCHES = {
  "karonux": [
    {
      "branch": "Garage clandestin",
      "nodes": [
        {
          "id": "karonux_0_0",
          "name": "Pare-chocs aimanté",
          "tier": 0,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "La Golf pousse les ennemis légers devant elle avant de les éjecter au retour."
        },
        {
          "id": "karonux_0_1",
          "name": "Marche arrière sauvage",
          "tier": 0,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Rappuyer sur spécial permet de déclencher le retour de la Golf plus tôt."
        },
        {
          "id": "karonux_0_2",
          "name": "Carambolage",
          "tier": 1,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Les projections provoquent un choc supplémentaire sur les ennemis proches."
        },
        {
          "id": "karonux_0_3",
          "name": "Moteur préparé",
          "tier": 1,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "karonux_0_4",
          "name": "Châssis renforcé",
          "tier": 2,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "karonux_0_5",
          "name": "Plein gratuit",
          "tier": 2,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "karonux_0_6",
          "name": "Pneus tendres",
          "tier": 3,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "karonux_0_7",
          "name": "Turbo",
          "tier": 3,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "karonux_0_8",
          "name": "Pilote endurant",
          "tier": 4,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "karonux_0_9",
          "name": "Révision express",
          "tier": 4,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "karonux_0_10",
          "name": "Convoi exceptionnel",
          "tier": 5,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial fait traverser la rue à deux Golf supplémentaires. Recharge : 18 s."
        },
        {
          "id": "karonux_0_11",
          "name": "Golf blindée",
          "tier": 5,
          "branch": "Garage clandestin",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial permet de conduire librement la Golf avec les directions pendant 4 s. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Roi de la sieste",
      "nodes": [
        {
          "id": "karonux_1_0",
          "name": "Sommeil léger",
          "tier": 0,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Une direction + esquive permet de sortir de la sieste."
        },
        {
          "id": "karonux_1_1",
          "name": "Oreiller de secours",
          "tier": 0,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La sieste absorbe le premier coup reçu."
        },
        {
          "id": "karonux_1_2",
          "name": "Réveil difficile",
          "tier": 1,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Se relever de la sieste repousse les ennemis proches."
        },
        {
          "id": "karonux_1_3",
          "name": "Matelas humain",
          "tier": 1,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "karonux_1_4",
          "name": "Siège massant",
          "tier": 2,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "karonux_1_5",
          "name": "Sommeil réparateur",
          "tier": 2,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "karonux_1_6",
          "name": "Récupération profonde",
          "tier": 3,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "karonux_1_7",
          "name": "Couverture épaisse",
          "tier": 3,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "karonux_1_8",
          "name": "Café serré",
          "tier": 4,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "karonux_1_9",
          "name": "Réveil explosif",
          "tier": 4,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "karonux_1_10",
          "name": "Grasse matinée",
          "tier": 5,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Après le spécial, le réveil déclenche une onde de choc de 250 pixels infligeant 250 % de puissance. Recharge : 18 s."
        },
        {
          "id": "karonux_1_11",
          "name": "Encore cinq minutes",
          "tier": 5,
          "branch": "Roi de la sieste",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Un coup fatal est annulé une fois par quartier : 20 % de vie, un bouclier de 25 % et 1,5 s de sieste protégée."
        }
      ]
    },
    {
      "branch": "Sale conducteur",
      "nodes": [
        {
          "id": "karonux_2_0",
          "name": "Vidange",
          "tier": 0,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les esquives laissent une flaque d’huile qui ralentit les ennemis."
        },
        {
          "id": "karonux_2_1",
          "name": "Créneau serré",
          "tier": 0,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Une esquive crée un leurre temporaire."
        },
        {
          "id": "karonux_2_2",
          "name": "Priorité à droite",
          "tier": 1,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Le premier coup après une esquive inflige 40 % de dégâts supplémentaires."
        },
        {
          "id": "karonux_2_3",
          "name": "Dérapage contrôlé",
          "tier": 1,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "karonux_2_4",
          "name": "Pare-brise blindé",
          "tier": 2,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "karonux_2_5",
          "name": "Pied au plancher",
          "tier": 2,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "karonux_2_6",
          "name": "Contre-braquage",
          "tier": 3,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "karonux_2_7",
          "name": "Réservoir percé",
          "tier": 3,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "karonux_2_8",
          "name": "Couloir de fuite",
          "tier": 4,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "karonux_2_9",
          "name": "Impact latéral",
          "tier": 4,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "karonux_2_10",
          "name": "Rond-point de l’enfer",
          "tier": 5,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial crée un vortex de 200 pixels pendant 5 s, attirant et frappant les ennemis légers. Recharge : 18 s."
        },
        {
          "id": "karonux_2_11",
          "name": "Sortie de route",
          "tier": 5,
          "branch": "Sale conducteur",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Une projection appelle une Golf sur la zone de chute. Recharge : 9 s."
        }
      ]
    }
  ],
  "jualos": [
    {
      "branch": "Le rempart",
      "nodes": [
        {
          "id": "jualos_0_0",
          "name": "Couenne épaisse",
          "tier": 0,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "La durée d’étourdissement est réduite de 35 %."
        },
        {
          "id": "jualos_0_1",
          "name": "Derrière moi !",
          "tier": 0,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Les alliés proches derrière Jualos reçoivent 20 % de dégâts en moins."
        },
        {
          "id": "jualos_0_2",
          "name": "Dette de douleur",
          "tier": 1,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Encaisser charge le prochain coup lourd, jusqu’à +60 %."
        },
        {
          "id": "jualos_0_3",
          "name": "Épaules larges",
          "tier": 1,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jualos_0_4",
          "name": "Garde haute",
          "tier": 2,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jualos_0_5",
          "name": "Souffle profond",
          "tier": 2,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jualos_0_6",
          "name": "Carapace",
          "tier": 3,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jualos_0_7",
          "name": "Pieds plantés",
          "tier": 3,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jualos_0_8",
          "name": "Cœur solide",
          "tier": 4,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jualos_0_9",
          "name": "Riposte massive",
          "tier": 4,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jualos_0_10",
          "name": "Forteresse vivante",
          "tier": 5,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial immobilise Jualos 5 s et réduit de 70 % les dégâts reçus. Les dégâts absorbés alimentent une explosion finale. Recharge : 18 s."
        },
        {
          "id": "jualos_0_11",
          "name": "Pas touche au pote",
          "tier": 5,
          "branch": "Le rempart",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial rejoint et relève un allié à terre à 35 % de vie avec un bouclier de 25 %. En solo, donne le bouclier. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Le sanglier",
      "nodes": [
        {
          "id": "jualos_1_0",
          "name": "Labourage",
          "tier": 0,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La charge se dirige plus facilement sur les côtés."
        },
        {
          "id": "jualos_1_1",
          "name": "Défenses croisées",
          "tier": 0,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Un rebond contre le bord déclenche une onde de choc."
        },
        {
          "id": "jualos_1_2",
          "name": "Piétinement",
          "tier": 1,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La charge crée des impacts au sol espacés."
        },
        {
          "id": "jualos_1_3",
          "name": "Sabots rapides",
          "tier": 1,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jualos_1_4",
          "name": "Charge prolongée",
          "tier": 2,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jualos_1_5",
          "name": "Peau de bête",
          "tier": 2,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jualos_1_6",
          "name": "Défenses aiguisées",
          "tier": 3,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jualos_1_7",
          "name": "Souffle sauvage",
          "tier": 3,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jualos_1_8",
          "name": "Ruée large",
          "tier": 4,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jualos_1_9",
          "name": "Sang chaud",
          "tier": 4,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jualos_1_10",
          "name": "Sanglier colossal",
          "tier": 5,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial transforme Jualos en sanglier géant pendant 6 s avec des ondes de choc périodiques. Recharge : 18 s."
        },
        {
          "id": "jualos_1_11",
          "name": "La harde",
          "tier": 5,
          "branch": "Le sanglier",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial invoque trois sangliers pendant 5 s, à 70 % de puissance chacun. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Faim de bagarre",
      "nodes": [
        {
          "id": "jualos_2_0",
          "name": "À emporter",
          "tier": 0,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les directions permettent de déplacer un ennemi saisi."
        },
        {
          "id": "jualos_2_1",
          "name": "Double ration",
          "tier": 0,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "La saisie frappe aussi un deuxième ennemi léger proche."
        },
        {
          "id": "jualos_2_2",
          "name": "Digestion musclée",
          "tier": 1,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Un sandwich à pleine vie donne une protection temporaire."
        },
        {
          "id": "jualos_2_3",
          "name": "Bon appétit",
          "tier": 1,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jualos_2_4",
          "name": "Poigne solide",
          "tier": 2,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jualos_2_5",
          "name": "Gros bras",
          "tier": 2,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jualos_2_6",
          "name": "Casse-croûte",
          "tier": 3,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jualos_2_7",
          "name": "Étreinte",
          "tier": 3,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jualos_2_8",
          "name": "Deuxième service",
          "tier": 4,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jualos_2_9",
          "name": "Reprise d’élan",
          "tier": 4,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jualos_2_10",
          "name": "Banquet de baffes",
          "tier": 5,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Après le spécial, les coups rendent de la vie pendant 8 s, au maximum 15 % de vie par activation. Recharge : 18 s."
        },
        {
          "id": "jualos_2_11",
          "name": "Service familial",
          "tier": 5,
          "branch": "Faim de bagarre",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Une saisie accroche un deuxième ennemi léger proche ; la projection lance les deux. Recharge : 9 s."
        }
      ]
    }
  ],
  "yanu": [
    {
      "branch": "Le chasseur",
      "nodes": [
        {
          "id": "yanu_0_0",
          "name": "Flair",
          "tier": 0,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Se rapprocher d’un ennemi blessé accélère Yanu."
        },
        {
          "id": "yanu_0_1",
          "name": "Bond de chasse",
          "tier": 0,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Le poing après une esquive devient un bond d’attaque."
        },
        {
          "id": "yanu_0_2",
          "name": "Tendon tranché",
          "tier": 1,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Une attaque dans le dos ralentit la cible."
        },
        {
          "id": "yanu_0_3",
          "name": "Foulée",
          "tier": 1,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "yanu_0_4",
          "name": "Instinct meurtrier",
          "tier": 2,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "yanu_0_5",
          "name": "Griffes tendues",
          "tier": 2,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "yanu_0_6",
          "name": "Traqueur",
          "tier": 3,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "yanu_0_7",
          "name": "Souffle du chasseur",
          "tier": 3,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "yanu_0_8",
          "name": "Angle mort",
          "tier": 4,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "yanu_0_9",
          "name": "Morsure",
          "tier": 4,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "yanu_0_10",
          "name": "Chasse sauvage",
          "tier": 5,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial enchaîne quatre bonds sur des cibles distinctes, à 125 % de puissance. Recharge : 18 s."
        },
        {
          "id": "yanu_0_11",
          "name": "L’alpha choisit",
          "tier": 5,
          "branch": "Le chasseur",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial marque l’ennemi le plus blessé : +50 % de dégâts directs contre lui jusqu’à sa mort ou la fin de rue. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Pleine lune",
      "nodes": [
        {
          "id": "yanu_1_0",
          "name": "Griffes profondes",
          "tier": 0,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Les attaques de loup infligent un saignement."
        },
        {
          "id": "yanu_1_1",
          "name": "Hurlement",
          "tier": 0,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La transformation repousse les ennemis proches."
        },
        {
          "id": "yanu_1_2",
          "name": "Mue brutale",
          "tier": 1,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La transformation retire ralentissement et étourdissement."
        },
        {
          "id": "yanu_1_3",
          "name": "Fourrure",
          "tier": 1,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "yanu_1_4",
          "name": "Griffes ouvertes",
          "tier": 2,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "yanu_1_5",
          "name": "Lune montante",
          "tier": 2,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "yanu_1_6",
          "name": "Prédateur",
          "tier": 3,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "yanu_1_7",
          "name": "Sang du loup",
          "tier": 3,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "yanu_1_8",
          "name": "Crocs longs",
          "tier": 4,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "yanu_1_9",
          "name": "Appel nocturne",
          "tier": 4,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "yanu_1_10",
          "name": "Loup de pleine lune",
          "tier": 5,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial devient un loup géant pendant 6 s, avec des chocs périodiques autour de lui. Recharge : 18 s."
        },
        {
          "id": "yanu_1_11",
          "name": "La meute fantôme",
          "tier": 5,
          "branch": "Pleine lune",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial invoque deux loups pendant 6 s, à 80 % de puissance chacun. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "L’intouchable",
      "nodes": [
        {
          "id": "yanu_2_0",
          "name": "Pas de côté",
          "tier": 0,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Recharge d’esquive réduite de 20 %."
        },
        {
          "id": "yanu_2_1",
          "name": "Contre-griffe",
          "tier": 0,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Après une esquive réussie, le prochain poing inflige un impact supplémentaire."
        },
        {
          "id": "yanu_2_2",
          "name": "Après-image",
          "tier": 1,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "L’esquive laisse un double qui attire les attaques."
        },
        {
          "id": "yanu_2_3",
          "name": "Souplesse",
          "tier": 1,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "yanu_2_4",
          "name": "Nerfs vifs",
          "tier": 2,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "yanu_2_5",
          "name": "Pas léger",
          "tier": 2,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "yanu_2_6",
          "name": "Réflexes",
          "tier": 3,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "yanu_2_7",
          "name": "Endurance féline",
          "tier": 3,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "yanu_2_8",
          "name": "Frôlement",
          "tier": 4,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "yanu_2_9",
          "name": "Précision",
          "tier": 4,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "yanu_2_10",
          "name": "Instinct absolu",
          "tier": 5,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial réduit la recharge des esquives à 0,15 s pendant 5 s. Recharge : 18 s."
        },
        {
          "id": "yanu_2_11",
          "name": "Éclair blanc",
          "tier": 5,
          "branch": "L’intouchable",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial enchaîne cinq frappes éclair sur des ennemis distincts, à 80 % de puissance. Recharge : 18 s."
        }
      ]
    }
  ],
  "lorenzo": [
    {
      "branch": "Crâne de béton",
      "nodes": [
        {
          "id": "lorenzo_0_0",
          "name": "Front prioritaire",
          "tier": 0,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Le dernier poing du combo frappe plus fort et repousse davantage."
        },
        {
          "id": "lorenzo_0_1",
          "name": "Mauvaise réception",
          "tier": 0,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Une projection près d’un objet destructible inflige un impact supplémentaire."
        },
        {
          "id": "lorenzo_0_2",
          "name": "Tu bouges pas",
          "tier": 1,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Les coups lourds empêchent brièvement les manœuvres ennemies."
        },
        {
          "id": "lorenzo_0_3",
          "name": "Crâne renforcé",
          "tier": 1,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "lorenzo_0_4",
          "name": "Bras de bouliste",
          "tier": 2,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "lorenzo_0_5",
          "name": "Appuis solides",
          "tier": 2,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "lorenzo_0_6",
          "name": "Nuque de fer",
          "tier": 3,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "lorenzo_0_7",
          "name": "Coups courts",
          "tier": 3,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "lorenzo_0_8",
          "name": "Élan brutal",
          "tier": 4,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "lorenzo_0_9",
          "name": "Coriace",
          "tier": 4,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "lorenzo_0_10",
          "name": "Tête de démolition",
          "tier": 5,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le troisième poing du combo déclenche une ruée et un choc de 160 % de puissance. Recharge : 6 s."
        },
        {
          "id": "lorenzo_0_11",
          "name": "Dernier avertissement",
          "tier": 5,
          "branch": "Crâne de béton",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Toucher avec trois attaques différentes déclenche un impact de 250 % de puissance. Recharge : 8 s."
        }
      ]
    },
    {
      "branch": "Le pyromane",
      "nodes": [
        {
          "id": "lorenzo_1_0",
          "name": "Braises collantes",
          "tier": 0,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Les ennemis frappés transportent une brûlure."
        },
        {
          "id": "lorenzo_1_1",
          "name": "Appel d’air",
          "tier": 0,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Le pied projette une vague de feu."
        },
        {
          "id": "lorenzo_1_2",
          "name": "Mégot de trop",
          "tier": 1,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Frapper une cible brûlante provoque une explosion, recharge par cible."
        },
        {
          "id": "lorenzo_1_3",
          "name": "Braises tenaces",
          "tier": 1,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "lorenzo_1_4",
          "name": "Cendrier large",
          "tier": 2,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "lorenzo_1_5",
          "name": "Tabac fort",
          "tier": 2,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "lorenzo_1_6",
          "name": "Combustion lente",
          "tier": 3,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "lorenzo_1_7",
          "name": "Souffle brûlant",
          "tier": 3,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "lorenzo_1_8",
          "name": "Feu nourri",
          "tier": 4,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "lorenzo_1_9",
          "name": "Réserve de mégots",
          "tier": 4,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "lorenzo_1_10",
          "name": "Fournaise",
          "tier": 5,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial laisse une zone de feu de 220 pixels pendant 6 s. Recharge : 18 s."
        },
        {
          "id": "lorenzo_1_11",
          "name": "Pluie de cendres",
          "tier": 5,
          "branch": "Le pyromane",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial embrase cinq zones successives dans la rue. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Pétanque sauvage",
      "nodes": [
        {
          "id": "lorenzo_2_0",
          "name": "Carreau",
          "tier": 0,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Le pied lance une boule qui interrompt une attaque."
        },
        {
          "id": "lorenzo_2_1",
          "name": "Bande de billard",
          "tier": 0,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les boules rebondissent une fois sur les bords."
        },
        {
          "id": "lorenzo_2_2",
          "name": "Cochonnet",
          "tier": 1,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "La première cible touchée attire les boules suivantes."
        },
        {
          "id": "lorenzo_2_3",
          "name": "Poignet lourd",
          "tier": 1,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "lorenzo_2_4",
          "name": "Lancer tendu",
          "tier": 2,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "lorenzo_2_5",
          "name": "Boule renforcée",
          "tier": 2,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "lorenzo_2_6",
          "name": "Double rebond",
          "tier": 3,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "lorenzo_2_7",
          "name": "Mise à feu",
          "tier": 3,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "lorenzo_2_8",
          "name": "Pointage",
          "tier": 4,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "lorenzo_2_9",
          "name": "Élan du tireur",
          "tier": 4,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "lorenzo_2_10",
          "name": "Concours municipal",
          "tier": 5,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial lance trois boules simultanément. Recharge : 18 s."
        },
        {
          "id": "lorenzo_2_11",
          "name": "Boule de braise",
          "tier": 5,
          "branch": "Pétanque sauvage",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial lance une boule enflammée qui explose et laisse du feu pendant 3 s. Recharge : 18 s."
        }
      ]
    }
  ],
  "jo": [
    {
      "branch": "Le danseur",
      "nodes": [
        {
          "id": "jo_0_0",
          "name": "Changement de rythme",
          "tier": 0,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Alterner poing et pied renforce le combo."
        },
        {
          "id": "jo_0_1",
          "name": "Passe derrière",
          "tier": 0,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Une esquive proche permet de passer derrière un ennemi."
        },
        {
          "id": "jo_0_2",
          "name": "Encore un tour",
          "tier": 1,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Une projection déclenche un balayage circulaire."
        },
        {
          "id": "jo_0_3",
          "name": "Jambes légères",
          "tier": 1,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jo_0_4",
          "name": "Frappe rythmée",
          "tier": 2,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jo_0_5",
          "name": "Souffle du danseur",
          "tier": 2,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jo_0_6",
          "name": "Pas croisés",
          "tier": 3,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jo_0_7",
          "name": "Reprise",
          "tier": 3,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jo_0_8",
          "name": "Tempo rapide",
          "tier": 4,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jo_0_9",
          "name": "Mouvement perpétuel",
          "tier": 4,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jo_0_10",
          "name": "Danse de la Mouk",
          "tier": 5,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial enchaîne cinq déplacements frappants entre des cibles distinctes. Recharge : 18 s."
        },
        {
          "id": "jo_0_11",
          "name": "Rappel",
          "tier": 5,
          "branch": "Le danseur",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le troisième poing du combo est suivi d’une frappe fantôme à 70 % de puissance. Recharge : 4 s."
        }
      ]
    },
    {
      "branch": "Le cyclone",
      "nodes": [
        {
          "id": "jo_1_0",
          "name": "Courant d’air",
          "tier": 0,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Le tourbillon attire les ennemis proches."
        },
        {
          "id": "jo_1_1",
          "name": "Débris volants",
          "tier": 0,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Le spécial projette des débris lorsqu’un objet est brisé."
        },
        {
          "id": "jo_1_2",
          "name": "Œil du cyclone",
          "tier": 1,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Le centre du tourbillon ralentit les ennemis."
        },
        {
          "id": "jo_1_3",
          "name": "Rafale",
          "tier": 1,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jo_1_4",
          "name": "Toupie folle",
          "tier": 2,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jo_1_5",
          "name": "Vent porteur",
          "tier": 2,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jo_1_6",
          "name": "Souffle continu",
          "tier": 3,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jo_1_7",
          "name": "Pression",
          "tier": 3,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jo_1_8",
          "name": "Vents violents",
          "tier": 4,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jo_1_9",
          "name": "Cœur de tempête",
          "tier": 4,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jo_1_10",
          "name": "Ouragan",
          "tier": 5,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial crée un vortex de 230 pixels pendant 4 s, qui attire les ennemis légers. Recharge : 18 s."
        },
        {
          "id": "jo_1_11",
          "name": "Double tornade",
          "tier": 5,
          "branch": "Le cyclone",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial laisse un second tourbillon autonome de 150 pixels pendant 6 s. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Les longs bras",
      "nodes": [
        {
          "id": "jo_2_0",
          "name": "Main baladeuse",
          "tier": 0,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Portée des poings augmentée de 40 pixels."
        },
        {
          "id": "jo_2_1",
          "name": "Ramène-toi",
          "tier": 0,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Saisie automatique à distance accrue pour les ennemis légers."
        },
        {
          "id": "jo_2_2",
          "name": "Retour à l’envoyeur",
          "tier": 1,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Le pied renvoie les projectiles physiques proches."
        },
        {
          "id": "jo_2_3",
          "name": "Allonge",
          "tier": 1,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "jo_2_4",
          "name": "Poigne élastique",
          "tier": 2,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "jo_2_5",
          "name": "Fouet du bras",
          "tier": 2,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "jo_2_6",
          "name": "Prise rapide",
          "tier": 3,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "jo_2_7",
          "name": "Balayage ample",
          "tier": 3,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "jo_2_8",
          "name": "Tension",
          "tier": 4,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "jo_2_9",
          "name": "Rebond du poing",
          "tier": 4,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "jo_2_10",
          "name": "Élastique humain",
          "tier": 5,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial ramène deux ennemis légers à portée et les percute à 200 % de puissance. Recharge : 18 s."
        },
        {
          "id": "jo_2_11",
          "name": "Grande lessive",
          "tier": 5,
          "branch": "Les longs bras",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial frappe tout autour à 360 pixels, à 220 % de puissance. Recharge : 18 s."
        }
      ]
    }
  ],
  "kikor": [
    {
      "branch": "L’atelier vivant",
      "nodes": [
        {
          "id": "kikor_0_0",
          "name": "Croquis rapide",
          "tier": 0,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "La création apparaît plus vite."
        },
        {
          "id": "kikor_0_1",
          "name": "Deuxième pinceau",
          "tier": 0,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Le chevalet invoque deux créations moins puissantes."
        },
        {
          "id": "kikor_0_2",
          "name": "Portrait de famille",
          "tier": 1,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Le choix de soutien après une rue spécialise les créations : dégâts, garde ou soin."
        },
        {
          "id": "kikor_0_3",
          "name": "Esquisse vivante",
          "tier": 1,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "kikor_0_4",
          "name": "Pigments solides",
          "tier": 2,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "kikor_0_5",
          "name": "Pinceau précis",
          "tier": 2,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "kikor_0_6",
          "name": "Travail d’équipe",
          "tier": 3,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "kikor_0_7",
          "name": "Retouches rapides",
          "tier": 3,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "kikor_0_8",
          "name": "Créations robustes",
          "tier": 4,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "kikor_0_9",
          "name": "Inspiration",
          "tier": 4,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "kikor_0_10",
          "name": "Chef-d’œuvre",
          "tier": 5,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le prochain spécial invoque une création géante, 2,5 fois plus puissante, pendant 12 s. Recharge : 18 s."
        },
        {
          "id": "kikor_0_11",
          "name": "Vernissage",
          "tier": 5,
          "branch": "L’atelier vivant",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial invoque une galerie de six créations maximum pendant 10 s. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Couleurs dangereuses",
      "nodes": [
        {
          "id": "kikor_1_0",
          "name": "Bleu froid",
          "tier": 0,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Les coups appliquent de la peinture ralentissante."
        },
        {
          "id": "kikor_1_1",
          "name": "Rouge colère",
          "tier": 0,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Les ennemis peints subissent davantage de dégâts des créations."
        },
        {
          "id": "kikor_1_2",
          "name": "Jaune glissant",
          "tier": 1,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Les projections laissent de la peinture glissante."
        },
        {
          "id": "kikor_1_3",
          "name": "Pigments",
          "tier": 1,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "kikor_1_4",
          "name": "Tache large",
          "tier": 2,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "kikor_1_5",
          "name": "Couleurs tenaces",
          "tier": 2,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "kikor_1_6",
          "name": "Projection de peinture",
          "tier": 3,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "kikor_1_7",
          "name": "Encre vive",
          "tier": 3,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "kikor_1_8",
          "name": "Mélange concentré",
          "tier": 4,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "kikor_1_9",
          "name": "Réserve de couleurs",
          "tier": 4,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "kikor_1_10",
          "name": "Palette explosive",
          "tier": 5,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Trois touches de peinture provoquent une explosion de 160 pixels, à 120 % de puissance. Recharge : 3 s."
        },
        {
          "id": "kikor_1_11",
          "name": "La rue est une toile",
          "tier": 5,
          "branch": "Couleurs dangereuses",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial peint une zone de 230 pixels qui ralentit et blesse pendant 7 s. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Trompe-l’œil",
      "nodes": [
        {
          "id": "kikor_2_0",
          "name": "Faux Kikor",
          "tier": 0,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "L’esquive peint un double qui attire les ennemis."
        },
        {
          "id": "kikor_2_1",
          "name": "Cadre protecteur",
          "tier": 0,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Le chevalet intercepte les projectiles ennemis proches."
        },
        {
          "id": "kikor_2_2",
          "name": "Retouche",
          "tier": 1,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Appuyer sur pied + spécial consomme une création pour se protéger."
        },
        {
          "id": "kikor_2_3",
          "name": "Vernis protecteur",
          "tier": 1,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "kikor_2_4",
          "name": "Toile résistante",
          "tier": 2,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "kikor_2_5",
          "name": "Illusion durable",
          "tier": 2,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "kikor_2_6",
          "name": "Pinceau agile",
          "tier": 3,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "kikor_2_7",
          "name": "Perspective",
          "tier": 3,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "kikor_2_8",
          "name": "Fausse piste",
          "tier": 4,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "kikor_2_9",
          "name": "Atelier express",
          "tier": 4,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "kikor_2_10",
          "name": "Porte peinte",
          "tier": 5,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial ouvre deux portails pendant 12 s. F près d’un portail téléporte un joueur vers l’autre. Recharge : 18 s."
        },
        {
          "id": "kikor_2_11",
          "name": "Copie imparfaite",
          "tier": 5,
          "branch": "Trompe-l’œil",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial ajoute une copie alliée d’un ennemi léger pendant 10 s, à 110 % de puissance. Recharge : 18 s."
        }
      ]
    }
  ],
  "gustavax": [
    {
      "branch": "Le Technicien",
      "nodes": [
        {
          "id": "gustavax_0_0",
          "name": "Prise ferme",
          "tier": 0,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "La saisie dure plus longtemps."
        },
        {
          "id": "gustavax_0_1",
          "name": "Souplesse arrière",
          "tier": 0,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Les projections frappent une zone d’atterrissage élargie."
        },
        {
          "id": "gustavax_0_2",
          "name": "Changement de programme",
          "tier": 1,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {},
          "description": "Poing + bas pendant une saisie déclenche un plaquage sur place."
        },
        {
          "id": "gustavax_0_3",
          "name": "Poigne de fer",
          "tier": 1,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "gustavax_0_4",
          "name": "Plaquage précis",
          "tier": 2,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "gustavax_0_5",
          "name": "Verrouillage",
          "tier": 2,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "gustavax_0_6",
          "name": "Prise rapide",
          "tier": 3,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "gustavax_0_7",
          "name": "Projection ample",
          "tier": 3,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "gustavax_0_8",
          "name": "Appuis du ring",
          "tier": 4,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "gustavax_0_9",
          "name": "Expert du sol",
          "tier": 4,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "gustavax_0_10",
          "name": "Personne n’est trop lourd",
          "tier": 5,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Les ennemis lourds ordinaires peuvent être projetés sans écraser Gustavax. Les boss restent soumis aux règles de poids."
        },
        {
          "id": "gustavax_0_11",
          "name": "Tour de ring",
          "tier": 5,
          "branch": "Le Technicien",
          "branchIndex": 0,
          "ultimate": true,
          "effects": {},
          "description": "Les projections déclenchent une frappe circulaire de 190 pixels, à 120 % de puissance. Recharge : 8 s."
        }
      ]
    },
    {
      "branch": "Le Champion",
      "nodes": [
        {
          "id": "gustavax_1_0",
          "name": "Entrée fracassante",
          "tier": 0,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "La transformation provoque une onde de choc."
        },
        {
          "id": "gustavax_1_1",
          "name": "Descente du coude",
          "tier": 0,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Le pied aérien de catcheur provoque un impact au sol."
        },
        {
          "id": "gustavax_1_2",
          "name": "Montée d’adrénaline",
          "tier": 1,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {},
          "description": "Une projection prolonge le catcheur, au maximum de trois secondes."
        },
        {
          "id": "gustavax_1_3",
          "name": "Échauffement",
          "tier": 1,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "energyRegen": 0.15
          },
          "description": "Régénération d’énergie : +15 %."
        },
        {
          "id": "gustavax_1_4",
          "name": "Marteau-pilon",
          "tier": 2,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "special": 0.15
          },
          "description": "Puissance spéciale : +15 %."
        },
        {
          "id": "gustavax_1_5",
          "name": "Ceinture solide",
          "tier": 2,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "radius": 0.12
          },
          "description": "Rayon des effets : +12 %."
        },
        {
          "id": "gustavax_1_6",
          "name": "Muscles du ring",
          "tier": 3,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "defense": 0.06
          },
          "description": "Réduction des dégâts : +6 %."
        },
        {
          "id": "gustavax_1_7",
          "name": "Endurance du champion",
          "tier": 3,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "dodge": -0.08
          },
          "description": "Recharge d’esquive : -8 %."
        },
        {
          "id": "gustavax_1_8",
          "name": "Frappe du titre",
          "tier": 4,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "duration": 0.4
          },
          "description": "Durée spéciale : +0.4 s."
        },
        {
          "id": "gustavax_1_9",
          "name": "Public en feu",
          "tier": 4,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": false,
          "effects": {
            "cooldown": -0.06
          },
          "description": "Recharge spéciale : -6 %."
        },
        {
          "id": "gustavax_1_10",
          "name": "Champion du monde",
          "tier": 5,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "La transformation de catcheur devient géante pendant 6 s et émet des ondes de choc périodiques. Recharge : 18 s."
        },
        {
          "id": "gustavax_1_11",
          "name": "Le ring est partout",
          "tier": 5,
          "branch": "Le Champion",
          "branchIndex": 1,
          "ultimate": true,
          "effects": {},
          "description": "Pendant 7 s après le spécial, toucher un bord déclenche un rebond offensif. Recharge : 18 s."
        }
      ]
    },
    {
      "branch": "Sheitan",
      "nodes": [
        {
          "id": "gustavax_2_0",
          "name": "Mauvais présage",
          "tier": 0,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Le dernier poing d’un combo maudit la cible."
        },
        {
          "id": "gustavax_2_1",
          "name": "Poigne infernale",
          "tier": 0,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "La saisie maudit sa victime ; la projection propage la marque."
        },
        {
          "id": "gustavax_2_2",
          "name": "Feu noir",
          "tier": 1,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les coups sur une cible maudite infligent une brûlure noire."
        },
        {
          "id": "gustavax_2_3",
          "name": "Sol profané",
          "tier": 1,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les projections laissent des braises sous la victime."
        },
        {
          "id": "gustavax_2_4",
          "name": "Pacte de sang",
          "tier": 2,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Maintenir spécial pendant le catcheur sacrifie 8 % de vie pour +35 % de puissance, une fois par transformation, jamais mortel."
        },
        {
          "id": "gustavax_2_5",
          "name": "Dette infernale",
          "tier": 2,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Les dégâts reçus chargent le prochain coup lourd, jusqu’à +60 %."
        },
        {
          "id": "gustavax_2_6",
          "name": "Regard du Sheitan",
          "tier": 3,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "La transformation repousse les ennemis ; les boss sont ralentis."
        },
        {
          "id": "gustavax_2_7",
          "name": "Chaînes du dessous",
          "tier": 3,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "La chute d’une cible maudite ralentit les ennemis proches."
        },
        {
          "id": "gustavax_2_8",
          "name": "Dévoreur de braises",
          "tier": 4,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Tuer une cible brûlante rend 6 énergie, recharge de deux secondes."
        },
        {
          "id": "gustavax_2_9",
          "name": "Malédiction contagieuse",
          "tier": 4,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": false,
          "effects": {},
          "description": "Une victime maudite transmet sa marque à un ennemi proche à sa mort, une transmission maximum."
        },
        {
          "id": "gustavax_2_10",
          "name": "Sheitan incarné",
          "tier": 5,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Le spécial transforme Gustavax en Sheitan géant pendant 6 s fixes. Des ondes de choc laissent du feu noir sous ses pas. Recharge : 18 s."
        },
        {
          "id": "gustavax_2_11",
          "name": "La Porte des Enfers",
          "tier": 5,
          "branch": "Sheitan",
          "branchIndex": 2,
          "ultimate": true,
          "effects": {},
          "description": "Projeter une cible maudite ouvre une porte qui attire les ennemis légers, ralentit et brûle pendant 3 s. Recharge : 18 s."
        }
      ]
    }
  ]
};
export const TALENTS = Object.fromEntries(Object.entries(TALENT_BRANCHES).map(([kind,branches])=>[kind,branches.flatMap(b=>b.nodes)]));
export const hasTalent = (p, name) => TALENTS[p.kind]?.some(n=>n.name === name && p.progression?.talents.includes(n.id)) || false;
