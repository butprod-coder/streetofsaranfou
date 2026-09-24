# Rencontres aléatoires et costumes

Une nouvelle partie mélange tous les adversaires et débloque trois identités distinctes dès la première rue. Chaque rue suivante ajoute une identité. Le tirage est déterministe à partir de la graine, partagé en coopération et conservé dans les sauvegardes. Les anciennes sauvegardes conservent leur trio historique.

Huit variantes rejoignent le tirage, sans remplacer les personnages jouables ni les boss :

- Pigeons de Lorenzo : attendent au sol, s'envolent à proximité puis plongent vers la position annoncée.
- Titou au bowling : place des quilles derrière le joueur et lance une boule vers elles.
- Yann fluo : annonce une ligne puis l'allume avec un laser brûlant.
- Kikor à vélo : se met sur la roue avant et charge.
- Jo rose : son contact retient le joueur pendant 1,25 seconde ; son KO libère immédiatement la prise.
- Karonux plongeur : frappe avec ses palmes devant lui.
- Gustavax diable : annonce puis embrase deux lignes sur toute la largeur du terrain.
- Jualos guitariste : annonce un cercle de karaoké ; les joueurs touchés sont paralysés pendant 1,15 seconde.

Les huit costumes utilisent des planches PNG transparentes générées avec imagegen, avec 12 cases chacune : déplacements, attaques, blessure, KO et effets. Les prompts sont conservés dans assets/enemies/street/COSTUME-PROMPTS.md. Les attaques respectent le nombre maximal d'assaillants simultanés ; un coup lourd interrompt leur préparation et leur KO supprime leurs dangers.

Validation : `node --test --test-isolation=none tests/*.test.js` ; `node scripts/check.mjs` ; `node tests/costume-enemies-browser.mjs` (variable `BROWSER_PATH` pour utiliser un navigateur installé).
