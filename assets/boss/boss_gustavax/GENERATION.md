# Gustavax final

Génération : outil image_gen intégré. Référence d’identité : assets/gustavax/gustavax_p.png. Sprite livré : gustavax-final.png ; transparence alpha conservée. Six poses, plus deux régions de débris prélevées par les coordonnées d’atlas dans game/visuals.js.

Prompt initial :
Create a production game sprite atlas on transparent background, 3 columns x 2 rows equal cells, no text no grid lines. Reference image is identity reference: preserve Gustavax's black pompadour, sunglasses, gold chain, muscular body. Detailed pixel-art arcade beat-em-up style. All six sprites isolated with generous padding, frontal three-quarter camera. Cell row1 col1: Gustavax wearing open black suit seated in luxurious black chair BEHIND a wide dark wood gold-trim executive desk smoking cigar; entire desk and chair visible. row1 col2: same character standing smashing that desk in two, wood fragments airborne. row1 col3: intact empty executive rolling chair. row2 col1: full-body Gustavax black open suit pants shoes cigar fighting idle facing right. row2 col2: full-body same character without jacket muscular bare torso chain black pants winding up a charging punch facing right. row2 col3: same shirtless character holding a broken wooden desk leg overhead for a huge slam facing right. Real transparent alpha background. Consistent scale within bottom row. No scenery.

Retouche 1 :
Edit this sprite sheet: remove ALL black/brown gradient backdrop and replace with actual transparent alpha. Keep the six illustrated sprites unchanged in identity/style/details. Re-layout precisely into 3 EQUAL columns and 2 EQUAL rows (six equal rectangular cells). Each entire sprite fully within its cell, no overlaps, generous transparent padding. Top row: seated boss behind desk; boss smashing desk; chair. Bottom row: three standing combat poses. Shrink desk sprites to fit equal cell width. No text no grid no background shadows. Actual transparent PNG required.

Retouche finale :
Precise game sprite sheet extraction edit. Replace every brown/black backdrop pixel outside the six objects with one solid perfectly flat bright pure magenta #FF00FF, no gradient, no glow, no shadow in backdrop. Preserve all six objects exactly. This is a chroma-key sprite sheet for a game, magenta must touch object outlines everywhere, also between legs and inside open gaps of broken desk. Keep original image dimensions/composition and identities, NO need to change grid. Remove smoke glow, use discrete gray smoke curls. Background MUST be bright pink magenta flat uniform, NOT dark. No captions.

Le résultat possède finalement un vrai canal alpha (924072 pixels complètement transparents), conservé sans détourage supplémentaire. Les colonnes irrégulières sont décrites explicitement dans l’atlas. La planche supplémentaire de débris n’a pas été produite : quota imagegen atteint.

## Animations de combat v2

Trois planches de seize poses générées avec image_gen intégré, sans conversion ni remplacement des sources. Référence : gustavax-final.png, puis les nouvelles planches pour conserver l’identité.

- patron-v2.png : garde, deux marches, préparation, deux poings, préparation et frappe du pied, lancer de cigare, poussée du fauteuil, colère, blessure, fatigue, genou et défaite.
- fumee-v2.png : garde, marches, préparation de charge, course, impact, collision, allumage/inhalation/exhalation du cigare, braises, veste retirée, blessure et défaite.
- dernier-mot-v2.png : garde et marches avec pied de bureau, prise de l’arme, deux balayages, levée de l’arme, écrasement, frappe finale et défaite.

Prompts de production : planches 4 × 4 sur alpha transparent ; Gustavax conserve cheveux noirs relevés, lunettes de soleil, chaîne dorée, pantalon et chaussures noirs ; vues vers la droite, corps entiers et échelle constante. Phase 1 : veste noire ouverte, combo revers/poing/coup de pied, lancer du cigare et poussée. Phase 2 : torse nu, course et charge, énorme cigare, braises et transition de veste. Phase 3 : torse nu sans cigare, pied de bureau en bois sombre cerclé de laiton, balayages et coups de masse. Les cellules sont isolées au chargement pour exclure les fragments de sprites voisins.

À la demande du joueur, les poses de fatigue et de récupération à genoux ne sont plus jouées ; les avertissements géométriques au sol sont supprimés. Retour en garde après chaque attaque, 0,18 s de délai, 0,45 s après collision. Les indices visuels sont les mouvements du boss, les projectiles et les effets réels.
