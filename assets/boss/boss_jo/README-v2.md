# Jo la Mouk — MMA et livraison brutale

Sprites refaits avec l’outil intégré `image_gen.imagegen`, le 21 septembre 2026. PNG générés conservés avec leur transparence. Prompts exacts : `generation-prompt.json`.

- `jo-boss-v2.png` : 16 poses, hauteur debout de référence 222 px. Cheveux et barbe roux, sweat anthracite, jean bleu et baskets. Garde MMA, course, jab, genou, high kick, préparation et frappe extensible, canalisation, fatigue, blessure et KO.
- `jo-props-v2.png` : transpalette jaune en mouvement (deux poses), épave, manche extensible, poing séparé et effet d’invocation. Le bras est assemblé avec ces nouveaux éléments pour s’étendre continûment jusqu’à 930 px, sans agrandir le corps.

## Combat

720 PV solo. Jo alterne bras long, combo jab/genou/high kick, charge au genou et canalisation. Il se déplace rapidement pour venir au contact. Les préparations sont visibles et la ligne du bras est verrouillée ; changement de ligne, saut ou esquive permettent de l’éviter.

À 50 % PV, il passe définitivement en seconde phase et prépare sa canalisation suivante. Ses déplacements deviennent plus rapides et il double ses coups à longue portée, espacés de 0,55 s.

La canalisation est invincible dès sa préparation et dure 6,65 s en difficulté normale. Les prises et la rupture de garde ne peuvent pas l’interrompre. Dix vagues de deux transpalettes (20 au total), ou de trois en seconde phase (30 au total), arrivent alternativement des deux côtés. Chaque arrivée est annoncée pendant 0,7 s ; les machines suivent des trajectoires fixes sur quatre couloirs, dont un reste libre durant toute la canalisation.

Les transpalettes ont 26 PV solo, 36 en duo. Ils peuvent être évités, sautés ou détruits avec les attaques habituelles. Les coups les arrêtent brièvement. Chaque machine ne touche un joueur qu’une fois, sort de l’écran sans rester coincée au bord et ne donne ni nourriture ni score exploitable. La canalisation terminée, les derniers transpalettes disparaissent et Jo est vulnérable pendant 2,2 s. Le KO et le changement de rue nettoient les invocations.

## Essais

Menu → Tester les boss → Jo. Combat complet avec introduction pour son entrée cinématique ; phase 2 pour lancer directement les 30 transpalettes. Désactiver l’invulnérabilité pour éprouver les esquives et dégâts.

Tests : `tests/boss-jo.test.js` (portée, invincibilité, comptage des invocations, couloir libre, destruction, vrai coup de pied, sortie d’écran, coopération et pause) ; `tests/jo-browser.mjs` (vrai menu, alpha, douze scènes rendues). Les campagnes solo et coopératives font partie de la suite globale.
