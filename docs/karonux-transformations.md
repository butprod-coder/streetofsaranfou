# Karonux — test des transformations

Implémentation pilote limitée à Karonux. Les autres personnages conservent leurs arbres actuels.

Un point est disponible dès le départ. Le premier achat engage définitivement une seule branche pour la partie ; les deux autres sont désactivées. Six rangs successifs à un point chacun. Aucun point au premier stage ni au premier boss : les cinq suivants sont attribués aux boss des quartiers 2 à 6 dans l’ordre de parcours. Les sauvegardes conservent le choix ; une nouvelle partie remet les talents à zéro et redonne le point initial. Les anciens identifiants de talents Karonux v2 sont incompatibles et ignorés.

Barre pleine (100 énergie) + Spécial : transformation de 5 s, 7 s au rang 4, 9 s au rang 6. Retour automatique à la forme normale. Sans branche choisie, le Spécial ne consomme rien et le HUD invite à ouvrir les talents depuis la pause.

| Branche | Main | Pied | Esquive | Saut |
|---|---|---|---|---|
| Golf IV | Marche arrière dès N2 | Frein à main dès N3 | — | — |
| Reine des Neiges | Frappe froide | Frappe lourde, brise-glace dès N2 | Glissade, traînée dès N3 | — |
| Handikaron | Béquille ; combo gauche/droite/plâtre dès N2 | Plâtre ; maintenir puis relâcher pour charger dès N3 | Toupie dès N5 | Perche et onde de choc dès N4 |

N6 : Golf GTI et frein circulaire final ; reine couronnée avec vague initiale et explosion des congelés en fin de Spécial ; béquilles renforcées et plâtre signé avec chute finale. Une interruption ou un KO ne déclenche pas le final. Les explosions en chaîne utilisent une file bornée à une explosion par cible pour éviter les boucles.

## Sprites

Générés avec l’outil imagegen intégré, à partir du sprite existant de Karonux. PNG avec canal alpha conservé ; quatre atlas actifs, 64 cellules au total :

- `assets/heroes/talents/golf.png` : 16 poses, base puis GTI.
- `assets/heroes/talents/ice.png` : 16 poses, base puis reine ultime.
- `assets/heroes/talents/handi-combat.png` : 16 poses, base puis ultime.
- `assets/heroes/talents/fx.png` : 16 effets de gel, prison glacée, patinoire et onde de choc.

Les lignes 1–2 des personnages représentent la forme de base ; les lignes 3–4 l’ultime. Les découpes sont déclarées dans `game/visuals.js`. La planche `handi.png` est la première version conservée, remplacée dans le jeu par `handi-combat.png` après correction des coups de béquilles. Les prompts exacts sont dans `karonux-image-prompts.json`.

## Vérification

`node --test --test-isolation=none tests/*.test.js`

`node tests/karonux-visuals-browser.mjs` (Edge installé ou variable BROWSER_PATH).

Le test navigateur contrôle les six formes via le moteur de rendu, la transparence des quatre atlas, les 48 cellules de personnages, les 18 talents, le verrouillage de branche et l’absence de débordement mobile. Captures dans `test-results/karonux-transformations.png` et `test-results/karonux-talents-lock.png`.
