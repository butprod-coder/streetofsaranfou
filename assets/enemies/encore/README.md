# Élites supplémentaires

Sept atlas RGBA de 2048 × 1536, chacun composé de douze cellules de 512 × 512.
Générés avec ImageGen intégré à partir des héros existants, puis détourés et découpés localement. Les prompts exacts sont dans `PROMPTS.md`, les sources et les masques dans `packing.json`.

- `elephant.png` : Jualos, balayage de trompe et piétinement.
- `transpalette.png` : Jo, charge verrouillée et dérapage.
- `poids.png` : Lorenzo, projectile balistique et direct au contact.
- `marathon.png` : Karonux, sprint et genou volant.
- `rappeur.png` : Kikor, windmill de proximité et salve sonore.
- `carnivore.png` : Yanu, graines et plantes à morsures intermittentes.
- `tracteur.png` : Gustave, charge de tracteur et frappe au sol.

Ordre : repos, mouvement 1/2, préparation/frappe principale, blessure, KO, préparation/frappe secondaire, projectile, impact, récupération. Exception Yanu : cellules 10/11 = plante fermée/ouverte.

Réglages : `game/elite-encore-data.js` centralise PV, vitesse, dégâts, portée, préparation, durée active, récupération et limites des plantes/projectiles. Les charges sont réglées dans `game/elite-encore.js`.

Le tirage existant est conservé : tous les ennemis peuvent apparaître dès le premier chapitre, au maximum un élite par vague. Le budget commun d'attaquants reste actif. Attaques annoncées par les poses et les textes, récupération vulnérable, annulation des dangers à la mort du propriétaire. Aucun nouveau disque rouge au sol.

Reconstruction depuis les originaux : `./scripts/pack-heroes.ps1 -PackingFile assets/enemies/encore/packing.json -OutputDirectory assets/enemies/encore`. Adapter `-SourceDirectory` au dossier contenant les fichiers sources mentionnés dans le manifeste.

Interface : `styles/hud.css` pour contraste et dimensions ; `game/talent-icons.js` pour les 14 icônes de voies ; `Renderer.enemyBar` pour les prénoms et barres ennemies.

Vérifications : `npm test`, `npm run test:hud`, `npm run test:controller`, `npm run test:talents`, `npm run build`.
