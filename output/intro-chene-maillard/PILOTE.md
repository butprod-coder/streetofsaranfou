# Pilote — Le Chêne Maillard
État : image de départ préparée ; vidéo et voix non générées. Aucun changement au jeu.

## Fichier à importer
01-image-depart.png est la scène réunissant les références. Utiliser comme image de départ dans un mode Image to Video.
Le dossier references contient les copies des assets originaux. Ne pas utiliser une planche de sprites comme image de départ.
L'image préparée est une interprétation cinématique des assets, pas un montage pixel pour pixel.
Création : outil intégré imagegen.

## Réglages proposés
16:9 ; 10 secondes ; 1080p si disponible ; plan unique ; audio désactivé pour le premier essai.
Un mode comme Kling 3.0 Image to Video accepte une image de départ. Les options dépendent du modèle et du compte.
Référence officielle : https://open.higgsfield.ai/models/kling-video/v3.0/std/image-to-video/playground

## Prompt vidéo à copier
Animate the supplied image as a single continuous 10-second cinematic shot. Preserve the exact pixel-art style, Karonux's face, rectangular glasses, black jacket, dark shirt and blue jeans, the white Golf hatchback and the neighborhood architecture. 0–4 seconds: Karonux takes two slow confident steps toward screen right; the camera tracks very gently with him. 4–7 seconds: he stops and turns his head slightly toward the camera, with a tired but defiant expression. 7–10 seconds: the parked white Golf's headlights switch on behind him; he gives a very subtle smirk. Restrained natural movement, subtle breathing and slight jacket motion. Stable face, stable anatomy, coherent feet contacting the pavement. Keep the car stationary and empty. One character only. No dialogue, no lip sync, no generated voice, no music, no captions or title overlays. No cuts, no camera orbit, no sudden zoom, no style change, no morphing, no extra limbs, no new people. Maintain the nighttime lighting and crisp pixel texture.

## Montage final visé : 13 secondes
0–4 s : deux pas lents, caméra très légèrement mobile.
4–7 s : arrêt, regard vers la caméra.
7–10 s : allumage des phares, sourire discret.
10–13 s : tenir la dernière image et afficher « LE CHÊNE MAILLARD », puis fondu vers le jeu.
Ajouter le titre au montage ou dans le jeu, pas dans la génération vidéo.

## Voix off française
« Au Chêne Maillard, Karonux se croit le maître des rues. Mais les temps sont durs… et ici, la loi est impitoyable. »
Direction : voix posée, grave, narration de polar ; légère ironie ; environ 12 secondes, à ajuster après enregistrement.
Pas de synchronisation labiale : c'est un narrateur extérieur.
Ambiance : ville nocturne discrète, pas sur le bitume, bruit électrique bref à l'allumage des phares.

## Vérification du premier résultat
Identité et lunettes stables ; Golf blanche immobile ; pas de personnage ajouté ; pas crédibles ; décor stable ; texture pixel-art préservée.
Si la marche déforme le personnage, remplacer les deux pas par une respiration discrète et un lent mouvement de tête, caméra en léger rapprochement.
Exporter la meilleure prise en MP4 si proposé et la déposer ici sous pilote-video-brute.mp4.
La voix et le montage restent à produire avant l'intégration.

## Prompt exact de l'image de départ
Use case: compositing. Create a single cinematic starting frame for a 16:9 intro video to the French beat-em-up Streets of SaranFou. Reference 1 is the exact nighttime Chene Maillard neighborhood: preserve recognizable pharmacy green cross, shuttered shops, apartment towers, street lamps and dark blue night. Reference 2 is Karonux's face identity: short brown hair, rectangular glasses, stern tired expression. Reference 3 is his full body clothing: black jacket, dark shirt, blue jeans, dark shoes. Reference 4 is his white compact Volkswagen Golf hatchback, NOT a golf cart; use the car design but show it parked with nobody inside and headlights OFF. Compose one coherent cinematic pixel-art illustration faithful to the reference game's detailed pixel-art style, not photorealistic, not 3D. Karonux stands full-body in foreground slightly left of center, facing toward screen right in a relaxed confident pose ready to walk, face readable in three-quarter view. The white Golf is parked behind him to the right, entirely visible and proportionate. Frame sufficiently close that Karonux occupies about half the image height. Street at night, warm streetlamp on his face, blue shadows, cinematic depth without losing crisp pixel texture. Maintain the established neighborhood architecture. One character only. No sprite sheet, no panels, no titles, no captions, no watermarks, no added people. This is the initial frame before he takes two steps and turns his head; keep posture natural and both feet visible.

