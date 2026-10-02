Sprites générés avec l’outil imagegen intégré : atlas RGBA 1536 × 1024.

Prompt : atlas arcade peint à contours foncés, trois colonnes ; poubelle verte intacte, abîmée, renversée ; voiture compacte rouge de profil vers la droite, trois phases de roues. Sprites entiers, fond transparent, sans texte. Seconde passe : retirer le fond et les halos sans modifier les silhouettes.

Le découpage conservé dans game/visuals.js utilise une séparation verticale à 58 % pour garder les couvercles et débris complets. Le fond possède un alpha nul ; les données RGB sous les pixels transparents ne doivent pas être interprétées comme un fond visible.
