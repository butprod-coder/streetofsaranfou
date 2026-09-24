# Sprites des événements du Château de l’Étang

Outil : imagegen intégré (pas de CLI ni API externe). Asset final : `assets/shared/scenery/estate-events.png`.

Référence d’identité : `assets/lorenzo/lorenzo_p.png`. Planche 3 colonnes × 2 lignes : vanne, pigeon Lorenzo au repos, pigeon Lorenzo ailes déployées, cage contenant un pigeon Lorenzo, panier de pique-nique, boules de pétanque. Le moteur utilise le magenta comme couleur de transparence à l’affichage ; la source générée est conservée sans retouche logicielle.

## Prompt final

Edit Image 1, the six-cell 3x2 pixel-art game sprite atlas. Image 2 is the identity reference for Lorenzo: bald rounded head, dark eyebrows, brown eyes, short brown beard and moustache, smiling face. REPLACE the mallard in top middle cell with a funny grey city PIGEON BODY WITH LORENZO'S HUMAN HEAD, recognizably matching image 2, full body standing facing right. Replace top right running mallard with the SAME grey pigeon with Lorenzo's bald bearded human head, wings spread running right. Replace the mallard inside bottom left cage with the SAME pigeon with Lorenzo's human head. Human heads slightly oversized to stay recognizable in game at 60px. No green duck heads or duck beaks: grey pigeon bodies, pink pigeon feet, full bald human face with beard. Preserve exactly the valve (top left), picnic basket (bottom middle), petanque balls (bottom right), cage structure and 3-column 2-row cell layout. Maintain sharp pixel-art arcade style and wide gutters. Background must remain uniformly pure chroma-key magenta #ff00ff including empty cage spaces, no gradients, glows or shadows. Do not change canvas dimensions. No labels or text.

## Passe finale de détourage

Replace the entire dark gradient background with a perfectly flat solid bright magenta (#ff00ff) chroma-key background. No glow, no gradient, no vignette. Magenta must fill all blank space right up to the hard pixel-art sprite outlines, including spaces between cage bars. Keep exactly the six objects, especially the grey pigeons with the bald bearded human head, 3 columns 2 rows layout, colors and generous cell margins. Do not paint magenta on the objects. This is a videogame sprite sheet prepared for engine chroma-key rendering, so perfectly uniform bright pink background is REQUIRED. No transparency needed for this version.
