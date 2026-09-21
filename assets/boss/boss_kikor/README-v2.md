# Kikor — le peintre et son précieux

`kikor-boss-v2.png` : nouvelle planche imagegen intégrée, 16 poses sur 4 × 4,
transparence conservée. Kikor debout mesure 222 px, comme Karonux. La forme
Gollum est accroupie, avec la même échelle corporelle. Les 16 poses couvrent
garde, marche, pinceau, peinture, transformation, poursuite, saisie, douleur et KO.
Le prompt final est conservé dans `generation-prompt.json`.

Le bonhomme vert utilise l’atlas existant `assets/heroes/creation.png` :
la génération d’une nouvelle planche pour lui a été bloquée par la limite imagegen.
Le héros Kikor jouable conserve ses propres sprites et son pouvoir allié.

## Règles du combat

- 620 PV solo, multiplicateur coop habituel. Seconde phase à 50 % des PV.
- Kikor peint durant 1,3 seconde, puis donne vie à un seul bonhomme vert
  (70 PV solo, 105 en duo). Sa présence rend Kikor totalement invulnérable,
  y compris aux projectiles, zones, brûlures et spéciaux. Un lien vert les relie.
- Détruire la création annule la protection et l’attaque de Kikor, libère toute
  victime et donne 2,1 secondes pour contre-attaquer. Il ne repeint pas pendant
  au moins 12 secondes. Il ne peut jamais cumuler plusieurs protecteurs.
- Il alterne pinceau et transformation en Gollum. La transformation dure
  1,2 seconde, puis la chasse 4,2 secondes. Chaque bond verrouille sa direction
  après une préparation visible ; saut, esquive et décalage évitent la prise.
- Une prise immobilise la victime au maximum 2 secondes, avec 6 dégâts de base
  toutes les 0,2 seconde, modulés par difficulté et défense. Six pressions de
  poing/pied/esquive libèrent le joueur ; maintenir un bouton ne suffit pas.
- Un coup lourd du partenaire interrompt la prise même si Kikor est protégé,
  sans infliger de dégâts au boss protégé. La victime reçoit ensuite une seconde
  d’invulnérabilité pour s’éloigner. Le KO et le changement de rue nettoient la prise.
- Après la chasse, 1,8 seconde de récupération. Les fenêtres vulnérables bénéficient
  du bonus de dégâts commun aux boss. La pause fige tous les compteurs.

## Essais

Menu → Tester les boss → Kikor. Combat complet pour voir peinture et protection ;
phase 2 pour commencer directement par la transformation. Désactiver l’invulnérabilité
pour mesurer le drain de vie. Tests : `tests/boss-kikor.test.js` et
`tests/kikor-browser.mjs` (sept scènes, alpha, entrée depuis le vrai menu).
