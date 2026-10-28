# Étape 5 — Interface, recherche, pilotage et assurance qualité

## Résumé

L'étape 5 conserve le workflow métier et ajoute une couche d'exploitation quotidienne : navigation adaptative, fil d'Ariane, composants d'état cohérents, recherche documentaire combinable, indicateurs réels, graphiques accessibles, écrans de chargement et d'erreur, confirmations de décision et contrôles automatisés navigateur.

Le contrôle initial a trouvé un TypeScript valide, mais ESLint était bloqué par 62 erreurs React 19 concentrées dans les pages de détail et le composant de notification. Les deux causes ont été corrigées avant les travaux fonctionnels. Les données et migrations antérieures ont été préservées.

## Système visuel

- Thème clair, fond neutre et bleu professionnel comme accent principal.
- Espacements, champs, boutons, focus visibles et tableaux compacts harmonisés dans `app/globals.css`.
- Composants réutilisables : `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `BarChart`, `Breadcrumbs`, `LoadingSkeleton` et `ActionToast`.
- Les badges associent libellé, point, texte et couleur : l'information n'est pas transmise par la couleur seule.
- Le menu mobile expose son état avec `aria-expanded`; l'élément actif utilise `aria-current="page"`.
- Les dialogues natifs gèrent le focus et imposent un motif de refus côté interface et côté Zod.

## Recherche documentaire

`/documents` exécute tous les filtres côté serveur et les conserve dans l'URL :

- recherche globale dans référence, titre, description et code boîte ;
- filtres dédiés référence, titre et description ;
- statut, boîte, zone, rack, niveau et dates de création ;
- tri par référence, titre, statut, boîte, création ou modification ;
- ordre croissant/décroissant et pagination ;
- total exact et réinitialisation des critères.

Les valeurs de tri sont traduites par une liste blanche. Prisma paramètre les valeurs. Les dates invalides sont ignorées au lieu d'être transmises au pilote. Le filtre `confidentiel = false` est appliqué avant lecture pour les utilisateurs sans `archives.update`; la page de détail utilise le même contrôle objet.

## Index PostgreSQL

La migration additive `20261026170000_step5_search_indexes` active `pg_trgm` et ajoute :

- GIN trigramme sur référence, titre, description et code boîte, adaptés aux recherches `ILIKE '%terme%'` ;
- B-tree sur la date de création du document ;
- index fonctionnels `LOWER` pour zone, rack et niveau.

Les index de statut, confidentialité, boîte, demandes et mouvements des étapes précédentes restent actifs. Les index GIN et B-tree représentables sont déclarés dans le schéma Prisma afin que le contrôle de dérive reste vide; les trois index fonctionnels `LOWER(...)`, non représentables par le DSL, restent gérés par la migration SQL.

## Tableau de bord

Les stocks sont des instantanés, tandis que la plage de dates s'applique aux graphiques et aux mouvements récents.

- Total documents : documents visibles dans le périmètre objet.
- Disponibles : documents visibles au statut `DISPONIBLE`.
- Sorties actives : mouvements sans date de retour; l'unicité active empêche le double comptage d'un document.
- Boîtes : boîtes physiques enregistrées.
- Demandes en attente : demandes `EN_ATTENTE`, distinctes des mouvements.
- Retards : mouvements actifs dont le retour prévu est antérieur à l'instant courant.
- Graphiques : demandes par statut, mouvements par mois, ancienneté des retards et documents distincts par zone.

Les requêtes indépendantes sont parallélisées. Les listes utilisent `select`, des limites et la pagination plutôt que de charger des graphes complets. Les agrégations mensuelles et par zone sont des requêtes SQL paramétrées.

## Mesures locales

Mesures réalisées sur PostgreSQL local, base de test, le 26 octobre 2026 :

- recherche réelle sur une base minimale : planification 26,120 ms, exécution 1,628 ms ;
- agrégation mensuelle de mouvements : planification 4,652 ms, exécution 0,350 ms ;
- quatre index documentaires Step 5 confirmés présents ;
- essai synthétique temporaire de 10 000 documents : 237,168 ms pour une recherche globale rare, avec choix d'un scan séquentiel par le planificateur ;
- le plan alternatif a confirmé que les trois index trigrammes sont éligibles via `BitmapOr`.

Le jeu réel est trop petit pour un benchmark représentatif. Le résultat synthétique indique qu'il faut refaire `EXPLAIN (ANALYZE, BUFFERS)` sur une copie statistiquement représentative avant production; un `tsvector` matérialisé pourra être évalué si les collections ou SLA le justifient. Aucun chiffre de production n'est déduit de ces mesures.

## Sécurité

Revue inspirée des principes OWASP ASVS, sans prétendre à une certification :

- authentification et vérification de session centralisées côté serveur ;
- RBAC vérifié dans les services, indépendamment du menu ;
- confidentialité appliquée aux recherches, détails, boîtes et métriques ;
- tris en liste blanche et requêtes Prisma/SQL paramétrées ;
- aucune redirection issue d'une entrée utilisateur ;
- QR limité à un identifiant opaque et page cible authentifiée ;
- signatures hors de `public`, lecture autorisée, checksum et immutabilité en base ;
- aucune donnée sensible placée dans un cache partagé ;
- erreurs utilisateur neutralisées, sans journalisation de mot de passe ou preuve binaire.

Correction importante : les métriques documentaires ne comptent plus les documents confidentiels pour un simple demandeur.

## Accessibilité

WCAG 2.2 AA est une cible, pas une déclaration de conformité. Les améliorations couvrent les libellés, légendes de tableaux, titres, annonces `status`/`alert`, focus visible, navigation clavier, dialogues natifs, état actif, menu mobile et indicateurs non exclusivement colorés. Le scénario Playwright exécute axe-core sur le tableau de bord authentifié et vérifie aussi le menu à 375 × 812.

Une analyse automatisée ne remplace pas un audit manuel avec lecteurs d'écran, zoom à 200/400 %, clavier seul et utilisateurs représentatifs.

## Assurance qualité

- Vitest : authentification, RBAC, workflow, concurrence, recherche, filtres combinés, pagination, confidentialité et agrégations.
- Playwright : compte non autorisé refusé, navigation mobile, scan axe, étiquette QR puis cycle document → demande → approbation → signature → retour.
- Les données de test utilisent exclusivement des identités et contenus synthétiques dans `archives_test`.
- Les chargements et erreurs disposent de fichiers App Router dédiés.

Résultats de la vérification finale locale :

- Prisma valide, cinq migrations appliquées et aucune dérive détectée ;
- contrôle de connexion : 14 tables applicatives vérifiées ;
- TypeScript et ESLint : succès sans erreur ;
- Vitest : 5 fichiers, 45 tests réussis ;
- Playwright/Chrome : 1 scénario complet réussi, incluant axe, navigation responsive, visibilité par permission, QR et refus d'accès ;
- audit des dépendances de production : 0 vulnérabilité signalée par `npm audit --omit=dev` ;
- build de production Next.js 16.4.3 : succès sur 21 routes ;
- smoke test du serveur de production : `/login` servi en 85,9 ms localement et la route protégée `/dashboard` a émis la redirection Auth.js attendue. Ces valeurs locales ne constituent pas un SLA.

## Limites et suites

- Le test navigateur local utilise Google Chrome système, car le binaire Chromium Playwright n'est pas proposé pour cette version de macOS.
- `pg` 8.23 émet pendant les tests un avertissement de dépréciation concernant un appel concurrent à `client.query`; aucune erreur ni perte de transaction n'a été observée, mais la compatibilité de l'adaptateur Prisma doit être surveillée avant `pg` 9.
- Les graphiques légers sont rendus en HTML/CSS pour éviter une bibliothèque et un bundle client supplémentaires; ils n'offrent pas encore d'export.
- L'analyse de contraste et axe doit être complétée manuellement.
- Les volumes réels, la concurrence et les SLA ne sont pas connus; le benchmark doit être rejoué sur une copie anonymisée représentative.
- Next.js 16 ne fournit pas les tailles de bundle par route dans cette sortie de build; aucun analyseur supplémentaire n'a été ajouté. Une analyse de bundle dédiée pourra valider les icônes clientes à grande échelle.
- Étape 6 recommandée : observabilité, budgets de performance, tests multi-navigateurs en CI, export de rapports, politiques de conservation et campagne de récolement.
