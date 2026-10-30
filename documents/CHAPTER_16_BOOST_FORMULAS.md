# Formules des boosts Cave Dwellers

Preparees localement le 30 octobre 2026 pour Sunflower Manager actuel (`frontend` + `sflman`). Aucun restart, scanner, publication ou deploiement dans ce lot.

Source de depart : commit `407a8707a244f48f58c2057ab2cd58ad3d705860`. Revue du code officiel et des changements jusqu'au commit `c572922d6c7b1bdb699617b83eadd2df5d7e2456`, dont les nouvelles valeurs XP des plats Truffle. Les donnees importees initiales restent datees ; les corrections revues sont explicites dans `assets/var/chapterBoostRules.json` et ne remplacent pas silencieusement les donnees d'un futur import d'une autre revision.

## Formules et raccordements

| Boost | Formule | Chemin concerne |
|---|---|---|
| Duende Shoes / Pants / Shirt | +1 ticket par wearable actif | orderTable et projection Chapter ; jamais additionnes aux anciens Swamp retires |
| Duende Hat | Temps crop plot ×0,9 ; fruit patch ×0,9 | SetYield ; greenhouse exclue |
| Ladybug Cow | Oil +1 par recolte | SetYield |
| Mushroom Chicken | Crimstone +0,5 a la cinquieme mine ; moyenne supplementaire 0,1 par mine | Bonus de cycle Crimstone existant |
| Beetle Sheep | Sommeil Sheep ×0,925 | Estimation Wool / Merino Wool ; les timers captures ne sont pas remultiplies |
| Cyclops Bloom | Temps de traitement Fish Market ×0,8 | SetFood sur les processed foods ; aucun effet sur l'Aging Shed |
| Giant Truffle | XP des plats cuisines ×1,3 ; Smoothie Shack et Deli ×1,6 a la place | SetFood ; les plats cuisines avec poisson sont inclus, les poissons bruts/vieillis restent exclus |
| Pig Onesie | XP d'alimentation ×1,05 | SetYield et plans alimentaires ; aucun bonus sur l'alimentation directe par Beetle |
| Firefly Aura | Temps normal Lava Pit ×0,8 ; probabilite instantanee 0,05 | SetYield ; duree moyenne theorique = temps normal reduit ×0,95, exposee separement, jamais un timer observe |
| Straw House | Temps prochain compost ×0,9 ; fertilisant de base ×3 puis ajouts ; vers de base ×3 puis ajouts | Formules de composteurs Active/Try dans les metadonnees Inv ; quantite de vers sur le chemin existant ; sortie et readyAt des productions deja lancees conserves |
| Duende Monument | Ressources d'expansion ×0,9 et temps ×0,9 | Calculateur Expand ; Active requiert placement et 1000 cheers, Try simule le choix de l'utilisateur |
| Stick House | Oil d'expansion ×0,75 ; temps ×0,9 | Calculateur Expand |
| Brick House | Crimstone d'expansion ×0,75 ; Coins ×0,95 | Calculateur Expand |
| Hercules Beetle Hat | Obsidian d'expansion ×0,75 | Calculateur Expand |
| Mining Drill | Probabilite declaree 1/3 d'un tresor supplementaire ; esperance = nombre de trouvailles eligibles /3 | Modele de probabilite expose dans les metadonnees Bounty ; compteur eligible et procs reels restent inconnus |
| Miner's Bed | Capacite indiquee : 14 farmhands | Donnee statique ; aucune autorisation d'achat/placement ou de recrutement n'est deduite |
| Antique Dress | Temps Grape x0,7 ; 10% de chance de +10 Grapes, moyenne +1 | SetYield Active/Try ; rendement et couts estimes utilisent la moyenne, proc observe inconnu |
| Harpoon | +2 poissons par prise ordinaire ; 20% de chance de ne pas consommer une tentative quotidienne | SetYield Active/Try ; Marvels/Chapter restent a un, quota reel inchange, esperance de reels pour le quota = quota /0,8 |
| Ascension Staff | Cooldown Power Skills x0,9, cumulable avec Luna's Crescent x0,5 | SetYield, a partir du cooldown de base au rang choisi ; pas de reduction repetitive au recalcul |
| Fish Trap | Temps Aging Shed x0,8 | Cumul avec Speedy Aging au rang choisi et Salt Sculpture niveau 5 ; page Fish utilise le multiplicateur Active/Try correspondant |

Les formules de bonus s'appliquent aux valeurs du mode choisi (`isactive` ou `tryit`). Le frontend transmet uniquement les selections des nouveaux boosts d'expansion ; leurs coefficients et cumuls restent calcules dans le backend.

## Cumuls importants

- Grinx's Hammer remplace les reductions de ressources de Duende Monument, Stick House, Brick House et Hercules Beetle Hat. Il ne supprime pas les reductions de temps ni celle des Coins dans le handler officiel `expandLand.ts` examine. Coins, Block Buck/Gem ne subissent pas le multiplicateur global des ressources.
- Exemple de l'expansion 31 Swamp : base `10 Crimstone / 50 Oil / 2 Obsidian / 5000 Coins`, duree 7h. Duende + Stick + Brick + Hercules donnent `6,75 / 33,75 / 1,35 / 4750`. Avec Ascension Monument, temps ×`0,8 × 0,9 × 0,9 = 0,648`. Avec Grinx : ressources `5 / 25 / 1`, Coins toujours 4750. Les lignes et le total d'Expand utilisent la meme duree effective.
- Straw House multiplie la base, pas les ajouts des competences. Exemple Compost Bin + Efficient Bin rang 2 : `10 ×3 +7 =37`, pas `(10+7) ×3`. Les modificateurs de vers utilisent les rangs exacts et le mode choisi, sans melanger Active et Try.
- Truffle Yield est multiplicatif avant le bonus plat des Buds : `((base + ajouts ordinaires) ×(1 + rang) + bonus Bud) × Salt Lick`. Les vues inventaire, tous niveaux et cochons reels partagent cet ordre. Les trois rangs ajoutent 10/20/30%.
- Swill Savvy : alimentation Pig ×0,75/0,65/0,5 ; autres animaux ×1,5/1,55/1,65. Mud multiplie l'XP finale par 1,25. La revision officielle du 30 octobre utilise 25 Mud pour une couche d'une recolte (deux avec Vibraphone) ; cela n'est pas une preuve qu'une couche a ete appliquee.
- Les Bristles restent une recompense d'echange, pas une production reguliere. Bareme de base et multiplicateur Bristle Payout sont exposes separement ; aucun prix ou rendement periodique n'est deduit.

## Corrections de donnees du 30 octobre

| Plat | XP de base revue | Ingredients / duree |
|---|---:|---|
| Ember-Roasted Truffle Potatoes | 1000 | Inchangés |
| Truffle Cake | 30000 | Inchangés |
| Creamy Truffle Risotto | 32000 | Inchangés |

## Verification et limites

- 212 tests backend de regression ciblant setfarm, modules, projections, catalogues et calculateurs PASS ; 8 tests frontend cibles PASS ; lint et build production PASS.
- Calculateur HTTP isole lance sur un port local ephemere puis ferme : reductions, Coins et coherence duree ligne/total verifies. Aucun remplacement du backend deja lance sur 2003.
- Tests des cumuls avec Grinx, rangs de competences, isolation Active/Try, conservation des productions en cours, completion du monument, XP seafood, Fish Market/Aging Shed et ordre Truffle Yield/Bud.
- Pour Mining Drill, les sources inspectees donnent la description du bonus mais pas de regle executable identifiee. Le modele garde `executableRuleEstablished:false`, `predictedProcs:null` et un nombre d'occasions inconnu. Il ne modifie ni les gains effectivement observes ni les valorisations de tresors.
- Les metadonnees de formules de prochain cycle ne constituent pas un simulateur complet de Cave. Les parcours sur ferme reelle, l'endurance et l'activation restent a verifier separement. La suite globale historique n'est pas annoncee verte.

Complement du 30 octobre : quatre wearables aux IDs anciens avaient ete oublies par la selection initiale. Catalogue porte a 11 wearables fonctionnels ; Antique Dress, Harpoon, Ascension Staff et Fish Trap ajoutes en fin de liste, avec icones officielles transparentes. Importeur mis a jour. Verification de leurs formules et cumuls : 221 tests backend, 10 tests frontend cibles, lint et build PASS. Harpoon +2 est une regle declaree dans le libelle officiel : le handler client examine etablit l'economie de tentative mais ne calcule pas ce rendement. La simulation conserve cette provenance dans Fish.harpoonExpectation ; elle ne modifie pas les captures observees. Antique Dress utilise une moyenne de rendement, jamais une prediction de proc.

Sources du complement, revision `c572922d6c7b1bdb699617b83eadd2df5d7e2456` : `types/collections.ts`, `types/caveDwellers.test.ts`, `events/landExpansion/harvestGreenHouse.ts`, `events/landExpansion/plantGreenhouse.ts`, `events/landExpansion/castRod.ts`, `types/agingFormulas.ts`, `events/landExpansion/skillUsed.ts` et `src/lib/i18n/dictionaries/en.json` dans le depot officiel.

Sources officielles principales : [expansions](https://github.com/sunflower-land/sunflower-land/blob/c572922d6c7b1bdb699617b83eadd2df5d7e2456/src/features/game/events/landExpansion/expandLand.ts), [compost](https://github.com/sunflower-land/sunflower-land/blob/c572922d6c7b1bdb699617b83eadd2df5d7e2456/src/features/game/events/landExpansion/startComposter.ts), [vers](https://github.com/sunflower-land/sunflower-land/blob/c572922d6c7b1bdb699617b83eadd2df5d7e2456/src/features/game/events/landExpansion/composterBait.ts), [XP des recettes](https://github.com/sunflower-land/sunflower-land/blob/c572922d6c7b1bdb699617b83eadd2df5d7e2456/src/features/game/types/consumables.ts).

Correction Expand Active/Try du 30 octobre : la projection dediee transporte maintenant les six selections d expansion (deux etats par boost), sans dependance a une visite prealable de TryNFT. Le frontend lit les projections Expand/Quick Tryset courantes avant les anciennes tables racines, et ignore les projections marquees obsoletes. Tests de bascule Active-Try-Active : couts recalcules et affiches ; 70 tests backend, 26 frontend, lint/build PASS. Verification read-only du calculateur deja lance sur 2003 : ressources reduites correctement. Aucune activation du changement de projection par restart dans ce lot.
