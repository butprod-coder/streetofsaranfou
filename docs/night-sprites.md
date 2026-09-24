# Sprites de Saran by Night — niveau 5

Générés avec imagegen intégré. Quatre planches de deux états, enregistrées dans `assets/shared/scenery/`. Les quatre événements sont intégrés dans game/late-events.js et game/late-renderer.js.

| Fichier | Clé moteur | État 0 | État 1 |
|---|---|---|---|
| night-bus.png | nightBus | Portes fermées | Porte ouverte |
| night-cart.png | nightCart | Intact | Accidenté |
| night-electric.png | nightElectric | Courant coupé | Courant rétabli |
| night-vending.png | nightVending | Canette coincée | Canette libérée et alarme |

Bus : 1 colonne × 2 lignes, fond magenta masqué par Assets.load. Autres : 2 colonnes × 1 ligne, alpha généré conservé. Le moteur découpe les cellules et détoure leur emprise automatiquement. Référence de style : assets/shared/scenery/night.png. Originaux conservés dans le répertoire generated_images de Codex.

## Prompts

### night-bus

Use case: stylized-concept. Asset type: transparent raster game sprite sheet for Streets of Saranfou, a side-scrolling arcade beat-em-up. Input image is STYLE REFERENCE ONLY, do not reproduce the reference sheet. Match its detailed hand-painted pixel-edged arcade sprites, strong dark outlines, blue nocturnal rim lighting, warm highlights, readable silhouettes. Genuine transparent alpha background, no floor, no baked shadows outside silhouette, no labels or watermark, no additional objects. Every sprite entirely within its equal-sized cell with wide clear margins; consistent camera, scale and ground baseline between states. One sheet, ONE COLUMN TWO ROWS, landscape buses stacked vertically. Same modest French city bus facing RIGHT, near side view with a little front visible, blue and cream body, warm interior windows, no brand or readable text. Top cell: doors closed, headlights on. Bottom cell: exact same bus, passenger door open with illuminated steps visible for boarding. Full vehicle and both wheels in each cell, 10% transparent margins.

### night-cart

Use case: stylized-concept. Asset type: transparent raster game sprite sheet for Streets of Saranfou, a side-scrolling arcade beat-em-up. Input image is STYLE REFERENCE ONLY, do not reproduce the reference sheet. Match its detailed hand-painted pixel-edged arcade sprites, strong dark outlines, blue nocturnal rim lighting, warm highlights, readable silhouettes. Genuine transparent alpha background, no floor, no baked shadows outside silhouette, no labels or watermark, no additional objects. Every sprite entirely within its equal-sized cell with wide clear margins; consistent camera, scale and ground baseline between states. One sheet TWO COLUMNS ONE ROW. A SINGLE supermarket shopping cart facing RIGHT, three-quarter side view, metallic wire basket and red handle at left. Left cell intact cart ready to push; right cell same cart after collision: bent basket and collapsed wheel, all wreckage compact within same footprint. No groceries, no rider. Preserve open transparent holes through basket wires.

### night-electric

Use case: stylized-concept. Asset type: transparent raster game sprite sheet for Streets of Saranfou, a side-scrolling arcade beat-em-up. Input image is STYLE REFERENCE ONLY, do not reproduce the reference sheet. Match its detailed hand-painted pixel-edged arcade sprites, strong dark outlines, blue nocturnal rim lighting, warm highlights, readable silhouettes. Genuine transparent alpha background, no floor, no baked shadows outside silhouette, no labels or watermark, no additional objects. Every sprite entirely within its equal-sized cell with wide clear margins; consistent camera, scale and ground baseline between states. One sheet TWO COLUMNS ONE ROW. Same freestanding electrical fuse cabinet, front three-quarter view, dark blue steel cabinet on short plinth. Both states have door open to show large accessible lever. Left: power off, lever down, small amber warning light. Right: power restored, lever up, small green indicator. Simple yellow lightning warning symbol, no text. Clear difference in lever pose.

### night-vending

Use case: stylized-concept. Asset type: transparent raster game sprite sheet for Streets of Saranfou, a side-scrolling arcade beat-em-up. Input image is STYLE REFERENCE ONLY, do not reproduce the reference sheet. Match its detailed hand-painted pixel-edged arcade sprites, strong dark outlines, blue nocturnal rim lighting, warm highlights, readable silhouettes. Genuine transparent alpha background, no floor, no baked shadows outside silhouette, no labels or watermark, no additional objects. Every sprite entirely within its equal-sized cell with wide clear margins; consistent camera, scale and ground baseline between states. One sheet TWO COLUMNS ONE ROW. Same snack/drink vending machine in reference style, front three-quarter view, deep blue body, bright colored drink cans behind glass, controls on right and retrieval hatch bottom. Left: normal but one can visibly wedged diagonally above retrieval hatch. Right: same machine jolted, can now in retrieval opening, red alarm beacon illuminated on top. No brands, no text, compact light no background glow.

### Corrections du bus

Edit only the background of this two-row bus sprite sheet. Remove ALL blue gradients, halos, haze, ground shadows and headlight glows outside the solid bus silhouettes. Fully transparent alpha, alpha zero in all empty space, no residual semitransparent background. Preserve both buses exactly, colors, outlines, dimensions, closed and open door states and equal two-row layout. Maintain bright headlights INSIDE their housings only. The result must be clean cutout sprites ready to place over arbitrary game backgrounds.

Replace the entire background surrounding both buses with PERFECTLY FLAT PURE MAGENTA #ff00ff. This is a chroma-key sprite sheet. Paint flat bright pink right up to the hard dark outline of each bus, including gaps beneath chassis and behind mirrors. ABSOLUTELY NO blue glow, no light bloom outside headlights, no gradient, no ground shadow, no vignette, no transparency in this version. Preserve the two buses, all body colors, wheels, windows, doors and two-row layout exactly. Uniform pink everywhere except the actual vehicle silhouettes.

