# Transformations jouables

Karonux, Lorenzo, Jualos, Yanu, Jo, Kikor et Gustavax disposent chacun de trois branches de six rangs. Le premier achat verrouille les deux autres branches pour la partie. Chaque nouvelle partie commence avec un point de talent, pour tous les personnages. Les personnages refondus gagnent ensuite un point aux boss des quartiers 2 à 6 ; le premier boss ne double pas le point initial.

Le spécial demande une jauge pleine. Durée : 5 secondes, 7 à partir du rang 4, 9 au rang 6. Les commandes et capacités disponibles sont indiquées dans les descriptions des talents. Les achats et la branche choisie sont conservés dans les sauvegardes.

## Kikor

- Peintre : Main projette la peinture ; Pied lance un pot dès N2 ; maintenir Pied dessine une créature dès N3. N6 fait apparaître les créations des murs automatiquement.
- Invocateur : une création apparaît immédiatement ; Main invoque dans la limite du rang ; Pied change le rôle de la troupe dès N3 (bagarreur, lanceur, protecteur). Les compagnons disparaissent à la fin du spécial. Les protecteurs absorbent une partie des dégâts ; les participations aux éliminations permettent la reproduction dès N5.
- Cycliste : déplacement pour les collisions ; Main pour le wheeling dès N2 ; Saut pour le bunny hop dès N3 ; Pied ou Esquive pour le dérapage. N5 conserve la vitesse pendant les figures.

## Ressources et vérification

Les atlas transparents sont dans assets/heroes/talents, avec les sous-dossiers lorenzo, jualos, yanu, jo et kikor. Chaque personnage possède des formes normales et ultimes ainsi que des effets dédiés. Les sources restent intactes ; les découpes sont configurées dans game/visuals.js.

Les tests couvrent progression, verrouillage, durées, attaques, coopération, sauvegardes et déterminisme. Les scripts tests/*-transformations-browser.mjs vérifient le rendu des six formes, les atlas transparents et l'arbre sur écran mobile.

Commandes : node --test --test-isolation=none tests/*.test.js ; npm run check ; npm run build.

## Gustavax

- Sheitan : Main pour les griffes, Pied pour les griffes lourdes et les flammes dès N2, Esquive pour la téléportation dès N3. N4 invoque ponctuellement des démons ; N6 en maintient jusqu’à trois et fait exploser les téléportations. La possession N5 affecte certains ennemis ordinaires.
- Patron : Main désigne une cible et lance les sbires ; Pied les rappelle dès N3 ; Saut au N6 commande une attaque collective de zone. N4 conserve les sbires quatre secondes après le Spécial. Le manager N5 renforce la coordination. L’équipe N6, limitée à six membres, reste jusqu’à sa mort et est sauvegardée entre les rues.
- Catcheur : Pied attrape puis effectue le Suplex ; maintenir Pied pendant la prise déclenche le Body Slam dès N2. Esquive au N3 frappe le sol ; Saut au N5 cible un ennemi renversé. N6 ajoute les cordes, les rebonds et la projection finale avec onde de choc.

Les cinq planches Gustavax (80 cellules) ont été générées avec l’outil Imagegen intégré, sans sprites de remplacement dessinés en code. Elles sont dans assets/heroes/talents/gustavax. Les prompts sont archivés dans gustavax-image-prompts.json.
