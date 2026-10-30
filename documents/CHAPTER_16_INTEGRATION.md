# Cave Dwellers — Sunflower Manager actuel

Etat local du 30 octobre 2026. Frontend `frontend`, backend `sflman` ; ce lot ne concerne pas Sunflower Manager 2.

Complement wearable : le catalogue contient desormais 11 wearables fonctionnels, apres ajout d'Antique Dress, Harpoon, Ascension Staff et Fish Trap (leurs IDs anciens les avaient exclus de la selection initiale). Icones transparentes, fin de liste TryNFT, formules Active/Try et importeur mis a jour. Voir `CHAPTER_16_BOOST_FORMULAS.md` pour les cumuls et la provenance des effets aleatoires ; 221 tests backend, 10 frontend cibles, lint/build PASS. Les comptages et validations plus anciens ci-dessous restent historiques.

Reference officielle : `sunflower-land/sunflower-land`, commit `407a8707a244f48f58c2057ab2cd58ad3d705860`, verifie sur GitHub pendant l'audit. Import hors ligne reproductible depuis `sflman` : `node scripts/sync-cave-dwellers.js`. Le script lit le clone de reference et copie uniquement les images et le catalogue statique ; il ne lance aucun service et n'accede a aucune base.

## Integre

- Snapshot source `assets/var/caveDwellers.json` : 32 IDs d'inventaire, 7 IDs de vetements, 32 images d'objets plus les images des competences, 14 competences classees/rangables, recettes Cave, alternatives des Slops, niveaux/XP/rendements Pig, bareme de base des Bristles, trois recettes cuisine, couts des tiers Cave.
- `var.js` : calendrier Cave Dwellers du 2 novembre 2026 au 1er fevrier 2027, taches le 9 novembre, ticket Duende Cap, artefact Clover Coin ; fin explicite conservee dans les plages de chapters. Le montant hebdomadaire de tickets n'est pas deduit de celui d'Ascension Age : `null` tant que non etabli.
- Catalogues existants branches sur des fabriques detachees dans `varcave.js` : ressources, nourritures, poissons, mutants, collectibles, vetements et competences. Truffle utilise desormais l'ID officiel 3090 et son image ; les valeurs Pig provisoires ont ete remplacees.
- Cuisine : trois recettes Truffle et categorie cake pour Truffle Cake ; Truffle Seasoning au Spice Rack, recette normalisee par unite pour une production de cinq.
- Calculs Active/Try : Duende Hat, Mushroom Chicken, Ladybug Cow, Beetle Sheep, Giant Truffle, Pig Onesie, Truffle Yield, Swill Savvy, temps Fish Market de Cyclops Bloom, temps Lava Pit de Firefly Aura. La probabilite de completion instantanee est conservee separement, sans pretendre qu'une completion a eu lieu. Truffle Seasoning est selectionnable dans Try et reduit le sommeil estime de moitie.
- Cochons : projection du groupe `pigpen`, Truffle comme seule production reguliere ; bareme de base et multiplicateur de competence des Bristles exposes separement, sans les ajouter aux recoltes. Les Slops consomment une seule alternative. L'estimation choisit l'ingredient vegetal connu le moins cher du Slop favori, separement pour Active et Try ; elle n'est pas une optimisation de tous les aliments possibles et n'utilise pas Omnifeed. Les prix absents restent inconnus.
- Frontend : groupe des ressources de chapter possedees dans Inv, avec quantites/images et sans valorisation inventee ; icone Pig et categorie de competences Cave.

## Limites precises

- Le catalogue et les donnees de recettes/tiers Cave ne constituent pas encore un simulateur Cave : pas de projection de fouilles, de rendement quotidien ou de repartition du cout commun entre Mud, Mushrooms et Beetles. Leurs couts unitaires de production restent inconnus.
- Formules et raccordements completes dans le lot suivant : voir `CHAPTER_16_BOOST_FORMULAS.md`. Les expansions sont raccordees au calculateur ; Straw House dispose de formules de prochain cycle et du calcul des vers. Mining Drill reste un modele declare sans prediction de proc reel.
- Decorations exclues a la demande utilisateur : Piggy Bank, Big Bad Wolf, Cave Dwellers Banner, Pig Plush, Pig Doll et les cinq decorations du parcours. Leurs images et entrees ont ete retirees ; l'importeur les filtre. Les vetements purement cosmetiques Traveling Merchant Suit/Bag et Beetle Goggles sont egalement exclus. Miner's Bed reste present pour sa capacite fonctionnelle de 14 farmhands.
- La projection de tickets de la page Chapter reste un chantier distinct, notamment ses vetements specifiques. Les ajouts de ce lot ne prouvent pas sa compatibilite complete avec les nouvelles regles du chapter.
- Vetements : icones WebP officielles transparentes du jeu copiees dans `public/icon/nftw/<id>.webp`. Leurs chemins locaux sont conserves dans `wearableImages` du snapshot et reutilises par l'importeur. Les portraits NFT PNG avec fond ne sont plus references pour ces sept ajouts.

## Validation

- 108 tests backend cibles PASS : setfarm, modules, catalogues, projection animaux, adaptation des identites statiques ; tests nouveaux des alternatives Slop, rendements Pig, quantites de cuisine et separation Active/Try.
- Frontend : lint PASS, build production PASS, 3 tests cibles PASS. Bloc ChapterResources rendu en Chrome headless a 390 px avec donnees synthetiques : images chargees, aucun debordement horizontal. Ce controle isole ne prouve pas un parcours ferme reel via API.
- `npm test` backend global n'est pas vert : decouverte involontaire de tests d'extensions Chrome dans `artifacts`, un test worker Flowers et six anciennes empreintes de snapshots de reorganisation divergent. Deux autres attentes de comptages de catalogue ont ete mises a jour apres inspection et passent. Les anciennes empreintes n'ont pas ete remplacees automatiquement. Les autres changements locaux preexistants rendent une attribution globale impossible sans baseline isolee.
- Aucun restart du backend, scanner, acces production, commit, push ou deploiement. Le service deja lance n'a pas ete suppose charger ces modifications. Build web local produit, non publie.

Correction du perimetre : decorations retirees le 30 octobre 2026 ; 11 tests cibles catalogue/calculs PASS apres retrait.

Ordre demande : nouveaux boosts/competences en fin de liste ; nouveaux items en fin de leur categorie (batiment pour la cuisine, categorie pour les poissons/ressources), mutants a la fin du groupe saisonnier. Ordre existant preserve. 8 tests cibles et verification directe des positions PASS.

Classement corrige : tickets, Clover Coin et Slops ne figurent pas dans `varit.js`/`getItem()`. Le snapshot conserve leurs metadonnees ; les calculs Pig lisent les alternatives Slop directement dans les donnees dediees.

Icone Pig : fichier initialement absent, corrige par ajout de `public/icon/res/pig.webp`, image officielle `https://sunflower-land.com/testnet-assets/animals/pigs/idle.webp` referencee par SUNNYSIDE.pigIdle (base URL documentee dans `.env.sample` du jeu). Controle visuel du fichier effectue. References frontend/backend corrigees. 8 tests cibles Pig/readiness PASS.

Correction du rendu compact Pig : AnimalsReadable ne listait que Chicken/Cow/Sheep et affichait deux produits systematiquement. Produits desormais derives du catalogue animal/matcat ; Pig affiche Truffle sans second produit artificiel, y compris details et couts. Icones Pig ajoutees dans Inv et tooltips ; projection Inv expose le nombre de spots Pig. 14 tests frontend et 9 backend cibles, lint/build PASS. Rendu isole en Chrome avec fixture Pig : icones Pig/Truffle chargees. Les deux services locaux servent bien pig.webp en HTTP 200. Aucun restart ni parcours complet sur ferme reelle.

Wearables : Swamp Lily Hat/Swamp Armor/Swamp Pants retires du catalogue des boosts a la demande utilisateur. References des bonus tickets dans orderTable/Chapter remplacees par Duende Shoes/Pants/Shirt ; anciennes identites historiques non effacees des registres generaux. Sept icones WebP copiees sans retouche depuis les assets officiels ; transparence alpha et contenu visible verifies en Chrome sur les sept fichiers. 13 tests backend cibles PASS, lint PASS.

Formules completees et rectifications du 30 octobre : voir `CHAPTER_16_BOOST_FORMULAS.md`, qui remplace les anciens etats de raccordement ci-dessus. Regression ciblee : 212 tests backend, 8 frontend, lint/build et calculateur HTTP isole PASS. Pas de restart ou deploiement.
