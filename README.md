# Streets of SaranFou — Reborn

Refonte du beat’em up dans les rues de Saran : **solo et coopération à deux en ligne**, sept combattants, six quartiers et 36 rues. Les décors d’origine sont complétés par six planches thématiques de 12 objets, éditables rue par rue.

**Mise à jour v4 — Rogue Like** : vagues espacées et bestiaire équitable, ennemis adaptatifs, six boss à phases, sept spéciaux distincts, 15 talents par héros, huit points par partie et un ultime exclusif, XP niveau 1–20 et checkpoints locaux exportables. Gustavax est devenu **Gustavax le Sheitan**. Voir [GAMEPLAY.md](GAMEPLAY.md) pour les règles et les valeurs d’équilibrage.

## Jouer

Sous Windows, double-cliquer sur **play.bat**. Le lanceur utilise Node.js 22+ (ou le runtime fourni avec Codex), démarre le jeu, puis ouvre le navigateur. Garder sa fenêtre ouverte pendant la partie.

Depuis un terminal, avec Node.js 22+ et pnpm :

```sh
pnpm install --frozen-lockfile
pnpm start
```

Ouvrir **http://localhost:3000**. `npm install` puis `npm start` fonctionnent également, mais le verrou de dépendances de référence est `pnpm-lock.yaml`.

Le jeu n’utilise aucun CDN : moteur, décors, animations, musique et sons fonctionnent sans Internet une fois les dépendances installées. Ne pas ouvrir `index.html` en `file://` : utiliser le serveur fourni.

## Jouer à deux

1. Les deux joueurs ouvrent **la même adresse du serveur**.
2. Le premier choisit **Ramener un pote → Créer un salon**, puis partage le lien ou le code à six caractères.
3. Le second rejoint le salon. Chacun choisit son personnage ; l’hôte choisit le chapitre.
4. Cliquer tous les deux sur **Je suis prêt**. Le serveur attend que les deux jeux soient chargés.

Sur le même réseau Wi-Fi, le second appareil ouvre `http://ADRESSE_IP_DU_PC:3000`, puis saisit le code. `localhost` désigne toujours l’appareil sur lequel on se trouve : un lien localhost envoyé à un ami ne pointe pas vers votre PC. Si Windows le demande, autoriser Node sur le réseau privé utilisé pour jouer.

Pour des joueurs sur des réseaux différents, déployer le serveur sur un hébergement Node/Docker avec WebSocket, puis partager son adresse HTTPS. **Le projet n’est pas publié sur Internet automatiquement.** Le client et le serveur doivent être servis sous la même origine ; un simple hébergement de fichiers statiques ne suffit pas pour la coop.

Les deux joueurs partagent la pause. Une coupure réseau met le combat en pause ; la reconnexion automatique ou le rechargement de la page permettent de retrouver le même joueur pendant environ 45 secondes. La sortie est checkpointée dans le navigateur entre les vagues. **Exporter** et **Importer** permettent de conserver le JSON ; l’hôte peut restaurer un checkpoint coopératif dans un nouveau salon après un redémarrage Render. Quitter explicitement libère la place ou ferme le salon ; un tiers ne peut pas reprendre une partie en cours.

## Commandes et combat

**Tester les boss** dans le menu principal ouvre l’entraînement solo : choix des six boss,
du combattant, de la difficulté et de la phase de départ (Karonux peut commencer directement
à pied). Invulnérabilité et spéciaux illimités sont activés par défaut et désactivables.
L’introduction est optionnelle. Pendant le test, **Échap / Start → Relancer ce boss**
ou **Choisir un autre boss** permet d’enchaîner les essais. Aucun record ni sauvegarde
de campagne n’est modifié par ces combats.

- **ZQSD, WASD ou flèches** : déplacement dans la rue.
- **J** : poings ; maintenir pour enchaîner un combo de trois coups.
- **K** : coup de pied, plus puissant et plus long, avec recul.
- **L** : technique propre au personnage ; coûte 50 points d’énergie. Les coups et le temps rechargent la jauge.
- **Espace** : saut ; J/K en l’air donnent une attaque aérienne.
- **Maj** : esquive invulnérable, avec une courte recharge.
- **E maintenu** près du partenaire à terre : le relever sans consommer de vie de réserve.
- **Saisie automatique au contact** : poing + direction opposée au regard pour projeter loin l’ennemi. Les adversaires lourds retombent sur place et écrasent le joueur resté à proximité.
- **F** : ramasser/échanger une arme ; à vide, déposer l’arme tenue. Les armes ont un nombre d’usages limité.
- **J avec une arme** : utiliser le couteau, la batte, le pistolet, le fusil à pompe ou le pistolet-mitrailleur ramassé.
- **Échap** : pause. Le bouton ♪ active/coupe le son et ⛶ demande le plein écran.

Manette standard : stick/croix pour bouger, X = poing, Y = pied, B = spécial, A = saut, RB = esquive, LB = relever, Start / Options = pause et reprise. Dans les menus, stick ou croix pour naviguer (maintenir pour défiler), A / ✕ pour valider, B / ○ pour revenir ; gauche/droite changent les listes sélectionnées. Sur le choix du personnage, gauche/droite sélectionnent le combattant et Start / Options lance directement la partie, même sans rejoindre le bouton « C’est parti ». Le retour d’un sous-menu retrouve le focus précédent ; le choix du personnage retrouve le combattant sélectionné. L’affectation dépend du mapping standard du navigateur. Les commandes tactiles s’affichent sur écran tactile ; le paysage est recommandé.

Les animations et projectiles annoncent les attaques ennemies ; seuls les bidons inflammables détruits conservent une zone rouge d’alerte. Les caisses et poubelles libèrent soins ou énergie. Une fois tous les ennemis battus, avancer à droite ; en duo, les deux joueurs doivent rejoindre la sortie. Chaque quartier se termine par un boss. Les vies de réserve permettent de revenir après un KO ; à deux, le partenaire peut relever le joueur avant ce retour automatique. Le score record, le personnage et le dernier chapitre sont conservés uniquement sur l’appareil.

Le bouton **Éditeur de niveaux** ouvre une planche de 12 décors adaptés au quartier courant : résidentiel, domaine, stade, bourg, nuit et collège. Clique un objet puis dans la rue pour le poser, glisse-le pour le déplacer, puis règle sa position, sa hauteur et son orientation. Annulation/rétablissement, duplication, suppression, remise à zéro, export/import JSON et bouton **Jouer cette rue** sont inclus. Les placements sont locaux ; en coop, ceux de l’hôte sont envoyés aux deux joueurs. Les sandwichs, boissons et objets destructibles ordinaires sont volontairement rares : quatre placements interactifs au maximum par chapitre.

## Hébergement Internet

Un **Dockerfile** et un **render.yaml** sont fournis. La configuration Render prévoit une instance payante `starter` pour éviter la mise en veille pendant une session ; elle n’a pas été déployée et ne crée aucune ressource tant que vous ne l’importez pas. Vérifier le tarif proposé par l’hébergeur avant de valider.

```sh
docker build -t saranfou .
docker run --rm -p 3000:3000 saranfou
```

Utiliser **une seule instance/processus** pour cette version : les salons vivent en mémoire. Plusieurs instances indépendantes ne partageraient pas les codes. Un redémarrage ou un déploiement ferme les parties en cours ; les scores locaux restent conservés. Le reverse proxy doit transmettre les upgrades WebSocket de `/ws` et préserver le nom d’hôte. Le port est configurable avec `PORT` et l’adresse d’écoute avec `HOST`. `/health` sert de contrôle de disponibilité.

Références de déploiement : [WebSocket sur Render](https://render.com/docs/websocket) et [format des Blueprints](https://render.com/docs/blueprint-spec).

## Vérification

```sh
pnpm test
pnpm run check
pnpm run build
# Dans un autre terminal, avec le serveur démarré :
pnpm exec playwright install chromium
pnpm run test:browser
```

`BROWSER_PATH` peut indiquer un Chrome/Edge déjà installé ; `TEST_URL` permet de tester une autre adresse du serveur. Les captures des tests navigateur sont écrites dans `test-results/` (non versionné).

Les tests couvrent dégâts/portée, protection, déplacements, soins, KO, coopération, pause, progression, vagues, 252 talents, sauvegardes et victoire ; un parcours navigateur vérifie solo, coop, pause, rechargement, retour solo et écrans tactiles. Ils ne remplacent pas un essai depuis deux connexions Internet distinctes ni avec une manette physique.

`pnpm run test:controller` ajoute les parcours manette et RPG sur un serveur de test isolé (aucun serveur à démarrer au préalable). Le Gamepad API standard est simulé : cela ne remplace pas un essai avec du matériel physique.

`pnpm run build` produit `dist/` avec le client, le serveur et les 140 images référencées. Ce dossier est une distribution **Node**, pas un export statique : y installer les dépendances de production avant lancement. Docker peut aussi être construit directement depuis ce dossier. La construction Docker nécessite Docker et n’est pas exécutée par les tests Node.

`pnpm run test:heroes` vérifie les 127 poses des sept héros, de la création/du chevalet de Kikor et de la Golf blanche : transparence, découpage et scènes réelles de combat. Les planches sont dans `assets/heroes/`, leurs prompts et leur préparation technique dans `PROMPTS.md` et `packing.json` de ce dossier. Les anciens sprites restent disponibles mais ne sont plus chargés pour les animations normales des héros.

## Organisation

- `game/simulation.js` : simulation indépendante du rendu, à 60 pas/seconde, identique en solo et sur le serveur.
- `game/renderer.js` : rendu Canvas 2D, animation, effets, interpolation réseau et anticipation du déplacement local.
- `game/app.js` : menus, chargements, campagne et état de l’interface.
- `game/network.js` et `server/index.js` : WebSocket, salons à deux, validation des entrées, instantanés à 20 Hz, pause et reconnexion.
- `game/assets.js`, `input.js`, `audio.js`, `data.js` : ressources, commandes, synthèse sonore et contenu.
- `tests/` : tests du moteur, de campagne, du serveur et du navigateur.

Les anciennes implémentations ont été gardées dans `src/`, `src3d/`, `classic.html` et `legacy3d.html` pour référence. Le serveur Reborn n’expose que ses fichiers publics. La copie `legacy3d.html` préserve la page d’accueil modifiée qui était présente avant cette refonte ; les changements préexistants de `scripts/serve.ps1` n’ont pas été écrasés.
