# Lorenzo — les braises et le canapé

Deux planches intégralement générées avec l’outil intégré `image_gen.imagegen`, le 21 septembre 2026. PNG originaux conservés avec leur alpha. Prompts exacts : `generation-prompt.json`.

- `lorenzo-boss-v2.png` : 16 poses (garde, course, poings, pied, allumage, lancer de cigarette, appel des sbires, rage, canapé, éjection, blessure et KO). Identité : crâne rasé, barbe courte, veste noire et chemise rouge. Hauteur debout de référence : 222 px, comme les autres boss.
- `lorenzo-props-v2.png` : canapé bordeaux intact, endommagé, détruit ; cigarette embrasée et deux images de flammes pour le pourtour animé des anneaux.

## Combat

700 PV solo. Première phase à pied : combos, pied et cigarette lancée vers une position annoncée. À 60 % PV, arrivée du canapé depuis le haut de l’écran. Un coup très puissant ne permet pas de sauter cette phase.

Chaque cigarette vole pendant 0,65 s, puis un anneau creux grandit de 185 px/s. Seule la bordure blesse ; le centre reste sûr. Sauter quand elle arrive permet de la franchir. Une vague touche chaque joueur au maximum une fois et expire. La pause fige son expansion.

Le canapé protège Lorenzo et possède 180 PV (270 en duo). Les coups ordinaires lui infligent 30 % des dégâts, les coups lourds 160 %. Les coups le font trembler, puis déchirent le cuir. À sa destruction, Lorenzo est éjecté et passe définitivement en phase 3. La livraison du canapé est protégée jusqu’à son atterrissage.

Deux sbires arrivent en solo, trois en duo. Un seul renfort supplémentaire peut arriver après 10 secondes si les premiers sont vaincus : budget fini de trois ou quatre sbires. Lorenzo continue à lancer des cigarettes assis. Son KO supprime les dangers et les sbires liés.

Enragé, il court plus vite, enchaîne plus rapidement et lance deux anneaux espacés. Les anneaux grandissent à 240 px/s. Les attaques spéciales gardent une récupération exploitable de 1,9 s en difficulté normale.

## Essais

Menu → Tester les boss → Lorenzo. Phase 1, livraison du canapé ou phase 3 enragée accessibles directement. Cocher l’introduction pour voir l’entrée cinématique ; décocher l’invulnérabilité pour éprouver les dégâts.

`tests/boss-lorenzo.test.js` couvre anneau creux, saut à temps, transitions, protection et destruction du canapé, renforts limités, coopération et pause. `tests/lorenzo-browser.mjs` couvre le vrai menu, l’alpha des planches et douze scènes rendues. Suite globale : campagnes solo et coop comprises.
