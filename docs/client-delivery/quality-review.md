# Revue qualité finale — Step 8

## 1. Conclusion exécutive

Le MVP local couvre et exerce le cycle principal d'une archive physique : stockage, recherche, demande, décision, remise signée, suivi et retour. Aucun défaut critique connu ne bloque une démonstration ou une recette locale.

Cette conclusion ne vaut pas autorisation de mise en production. Le chantier Step 6 relatif à l'exploitation, l'infrastructure, les sauvegardes, la supervision, le stockage objet et la reprise après sinistre a été reporté. Le cahier des charges original est par ailleurs absent du dépôt, ce qui empêche une confirmation contractuelle exhaustive.

## 2. Environnement contrôlé

- Date : 28 octobre 2026
- Next.js 16.4.3, React 19.3.0, Prisma 7.10.1
- PostgreSQL local `archives_db` pour les contrôles en lecture
- PostgreSQL isolé `archives_test` pour Vitest/Playwright destructifs
- Chrome système pour Playwright
- Cinq migrations présentes et schéma déclaré à jour par Prisma

## 3. Résultats exécutés pendant Step 8

| Contrôle | Commande | Résultat |
| --- | --- | --- |
| Schéma Prisma | `npx prisma validate` | Réussi |
| Génération Prisma | `npm run db:generate` | Réussi, client 7.10.1 |
| Types Next.js + TypeScript | `npm run typecheck` | Réussi après génération des types de routes |
| ESLint | `npm run lint -- --max-warnings=0` | Réussi, zéro avertissement ESLint |
| Vitest/PostgreSQL | `npm run test:run` | 6 fichiers, 51 tests réussis |
| Build Next.js | `npm run build` | Réussi, 21 routes |
| Connexion base applicative | `npm run db:check` | Réussi, 14 tables vérifiées |
| Migrations | `npx prisma migrate status` | 5 migrations, schéma à jour |
| Playwright/Chrome | `npm run test:e2e` | 3 scénarios réussis en 4,1 minutes |
| Audit dépendances de production | `npm audit --omit=dev --audit-level=high` | 3 vulnérabilités faibles dans la chaîne d'outillage shadcn |
| Vérification démo | `npm run db:verify:demo` | Intégrité principale réussie ; 3 écarts au snapshot initial |

Le type-check a d'abord révélé que `LayoutProps` dépend des types générés dans `.next`. Conformément à la documentation Next.js 16 installée, un script `typecheck` exécute maintenant `next typegen && tsc --noEmit`. Le contrôle réussit depuis un cache propre.

## 4. Fonctions implémentées

- Authentification locale, déconnexion, session versionnée et limitation d'échecs.
- Utilisateurs, rôles, permissions, activation et remplacement administrateur du mot de passe.
- Emplacements, boîtes, documents, classification, confidentialité et recherche avancée.
- QR de boîte imprimable, résolution et scanner avec saisie de secours.
- Demandes de consultation et de sortie, propriété et prévention des doublons.
- Approbation/refus unique avec motif de refus.
- Consultation sur site démarrée/clôturée et auditée.
- Remise physique avec preuve manuscrite privée.
- Mouvements, détenteurs, échéances, retards et filtres.
- Retour conforme ou exceptionnel avec réintégration/indisponibilité.
- Audit append-only, historique restrictif et API privée des signatures.
- Tableau de bord, états de chargement/erreur/vide, responsive et contrôle axe automatisé.
- Seed de démonstration sûr, synthétique et idempotent.

## 5. Exigences vérifiées

Les preuves automatisées couvrent notamment :

- unicité et cohérence des emplacements, boîtes, documents et mouvements ;
- confidentialité objet et absence de contournement par URL/QR ;
- demande valide/invalide et concurrence ;
- approbation/refus, décision unique et séparation approbation/remise ;
- signature obligatoire, rollback, lecture 200/401/404 et stockage non public ;
- remise unique, suivi, calcul de retard, retour et double retour ;
- préservation de l'historique et immutabilité de l'audit ;
- révocation d'un utilisateur inactif et refus par rôle ;
- recherche, pagination, agrégats et visibilité du tableau de bord ;
- parcours navigateur complet et pages administration/QR sans erreur navigateur.

La matrice détaillée se trouve dans `requirements-traceability.md`.

## 6. Exigences non vérifiées ou partielles

- Le cahier des charges original n'a pas pu être comparé au résultat.
- Le cycle complet de consultation sur site n'a pas de test E2E direct.
- La caméra QR réelle, HTTPS mobile et l'impression physique n'ont pas été testés sur le matériel client.
- La signature tactile réelle et sa valeur juridique ne sont pas validées.
- L'accessibilité manuelle lecteur d'écran, clavier complet et zoom 200/400 % reste à exécuter.
- Les règles de dommage, perte, rétablissement, conservation et destruction sont incomplètes.
- Les habilitations fines et le périmètre organisationnel des validateurs restent à décider.
- Les performances n'ont pas été validées sur un volume client représentatif ni contre des SLA.

## 7. Défauts et observations ouverts

| ID | Sévérité | Observation | Impact / action |
| --- | --- | --- | --- |
| OPEN-01 | Faible aujourd'hui, compatibilité future | `pg` avertit qu'un `client.query()` est appelé pendant une requête en cours | Identifier le flux avant passage à pg 9 ; aucun échec ou perte observé |
| OPEN-02 | Faible / exploitation démo | Le vérificateur de démo attend un snapshot immuable alors que le jeu a évolué | Décider si le contrôle doit accepter les transitions ou comparer un nouveau batch |
| OPEN-03 | Faible / dépendances | Trois avis `deepmerge` via `shadcn`/`@shadcn/registry` | Surveiller une correction non cassante ; `npm audit fix --force` rétrograderait vers `shadcn@1.0.0` |
| OPEN-04 | Moyenne / couverture | Consultation sur site sans scénario automatisé complet | Ajouter tests service et E2E après validation des règles client |

Le contrôle démo confirme toujours 30 emplacements, 100 boîtes, 1 000 documents, 20 utilisateurs, 150 demandes, 125 validations, 80 mouvements, 80 signatures et 1 391 audits. Les 80 fichiers de signature sont valides et les 100 cibles QR se résolvent. Les écarts sont deux associations validation/état et une distribution devenue 36 retournés/14 retards au lieu du snapshot 35/15. Aucune donnée n'a été réinitialisée ou modifiée pour masquer ces écarts.

## 8. Limites de sécurité

- Aucun test de pénétration externe ni homologation formelle.
- Pas de MFA, SSO, récupération autonome ou contrôle de mots de passe compromis.
- Limiteur de connexion local non conçu pour un déploiement multi-région.
- Stockage des signatures sur système de fichiers local, sans stockage objet, chiffrement géré, versioning ni restauration testée.
- Politiques de rétention, purge, gel légal et opérations DBA privilégiées non définies.
- Secrets, en-têtes proxy, TLS, moindre privilège réseau/base et rotation doivent être gérés par la future infrastructure.

## 9. Limites opérationnelles

- Application locale mono-instance ; aucune architecture de haute disponibilité.
- Pas de sauvegarde/restauration automatisée, supervision, alerting, journalisation centralisée ou PRA.
- Pas de notifications de demande/retard ni d'escalade.
- Pas d'export métier, campagne de récolement ou calendrier de conservation.
- Comptes de démonstration désactivés pour la connexion dans l'état contrôlé (`loginEnabledUsers = 0`).
- Les données de démo évoluent avec les interactions ; le seed est idempotent mais ne remet pas l'historique à zéro.

## 10. Décision de qualité

| Usage | Décision |
| --- | --- |
| Démonstration locale | Acceptable |
| UAT métier locale | Acceptable avec scénarios manuels et décisions ouvertes |
| Production | Non autorisée / non évaluée |

Étapes minimales avant toute décision de production : rapprocher le cahier original, signer l'UAT, fermer les décisions V1, réaliser le chantier Step 6, tester sauvegarde/restauration et PRA, migrer les preuves vers un stockage adapté, exécuter tests de sécurité/performance/accessibilité et obtenir l'approbation formelle du client.
