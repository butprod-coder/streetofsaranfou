# Yanu — la marée sauvage

Sprites intégralement redessinés via `image_gen.imagegen`, le 21 septembre 2026. PNG originaux conservés avec leur transparence, sans retouche destructive. Prompts exacts dans `generation-prompt.json`.

- `yanu-boss-v2.png` : 16 poses, grille 4 × 4 : garde, course, poings, pied, inspiration, cri, transformation, loup-garou, bond, blessure, KO. Hauteur debout : 222 px, comme Karonux et Kikor. Les marges de découpe sont déclarées dans `game/visuals.js`.
- `yanu-water-v2.png` : 3 poses de kayak et 3 vagues animées. Tous les éléments sont nouveaux et propres au boss.

Entrée cinématique sur un tsunami. Cycle : tsunami, combo, cri/loup-garou, pied. À 50 % PV : cri immédiat dès la prochaine ouverture, marche et vague accélérées. Les phases ne reculent pas.

Le cri avertit pendant 1,25 s (difficulté normale). Un joueur proche, au sol et sans esquive est figé 0,65 s. Le bond vise la position verrouillée avant le cri et commence 1,05 s après celui-ci : il reste 0,4 s pour esquiver après la paralysie. Les vagues annoncent leur couloir et se passent par saut ou changement de ligne. Après une spéciale, 1,9 s de récupération avec bonus de dégâts reçu. Une garde brisée ou le KO libère immédiatement les joueurs.

Accès : menu → Tester les boss → Yanu. Cocher « Voir l’introduction » pour son arrivée, désactiver « Invulnérable » pour tester les dégâts.

Vérifications : `tests/boss-yanu.test.js` (combat), `tests/yanu-browser.mjs` (menu réel, alpha des deux atlas, dix scènes rendues), suite globale incluant campagnes solo et duo.
