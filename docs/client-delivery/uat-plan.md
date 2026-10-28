# Plan de recette utilisateur (UAT)

## 1. Objet et gouvernance

Ce plan permet au client de valider le comportement métier sur un environnement de recette isolé. Les résultats automatisés indiqués proviennent des suites locales ; ils ne remplacent pas la signature d'une recette par des utilisateurs représentatifs.

Rôles de recette : demandeur, validateur, archiviste, administrateur et responsable métier signataire du procès-verbal.

## 2. Préconditions communes

- Environnement local ou de recette distinct de toute production.
- Migrations appliquées et base dédiée sauvegardée avant la session.
- Comptes de recette actifs pour les quatre rôles, avec mots de passe transmis hors documentation.
- Données synthétiques identifiables ; aucune donnée client réelle dans la démonstration.
- Navigateur Chrome supporté ; caméra et imprimante disponibles pour les cas matériels.
- Horloge et fuseau `Africa/Casablanca` vérifiés.
- Aucun reset ou `TRUNCATE` sur une base contenant des données à préserver.

## 3. Résumé des scénarios

| ID | Scénario | Type de preuve disponible | Résultat actuel |
| --- | --- | --- | --- |
| UAT-01 | Enregistrement emplacement, boîte, document | E2E + intégration | Réussi localement |
| UAT-02 | Affectation et contenu d'une boîte | E2E + intégration | Réussi localement |
| UAT-03 | Étiquette et scan QR | E2E partiel | Étiquette/page réussies ; caméra manuelle requise |
| UAT-04 | Recherche documentaire | Intégration + E2E | Réussi localement |
| UAT-05 | Demande d'accès | Intégration + E2E | Réussi localement |
| UAT-06 | Approbation et refus | Intégration + E2E | Réussi localement |
| UAT-07 | Remise physique signée | Intégration + E2E | Réussi localement |
| UAT-08 | Suivi d'un prêt actif | Intégration + E2E | Réussi localement |
| UAT-09 | Détection d'un retard | Unit/intégration | Réussi techniquement ; métier à valider |
| UAT-10 | Confirmation du retour | Intégration + E2E | Réussi localement |
| UAT-11 | Traçabilité historique | Intégration + E2E | Réussi localement |
| UAT-12 | Tentatives non autorisées | Sécurité + E2E | Réussi localement |
| UAT-13 | Consultation sur site | Inspection uniquement | À exécuter manuellement |

## 4. Scénarios détaillés

### UAT-01 — Enregistrement d'une archive

**Préconditions :** archiviste connecté ; emplacement et références de recette inexistants.

**Étapes :**

1. Créer un emplacement avec zone, rack et niveau.
2. Créer une boîte et l'affecter à cet emplacement.
3. Créer un document avec référence, titre, classification et boîte.
4. Rechercher puis ouvrir le document.

**Résultats attendus :** unicités contrôlées, document `DISPONIBLE`, localisation visible, créations auditées.

**Résultat exécuté :** réussi dans le scénario Playwright client et les contrôles d'unicité Vitest.

### UAT-02 — Affectation et contenu d'une boîte

**Préconditions :** au moins deux emplacements et une boîte de recette.

**Étapes :** modifier l'affectation autorisée, ouvrir `/boites/[id]`, vérifier l'emplacement et la liste des documents.

**Résultats attendus :** affectation persistée, code unique, contenu cohérent, historique sensible audité.

**Résultat exécuté :** création/lecture vérifiées ; la validation métier d'un déplacement physique réel reste manuelle.

### UAT-03 — QR code

**Préconditions :** boîte existante ; archiviste et demandeur avec `archives.read` ; utilisateur sans ce droit.

**Étapes :** imprimer/visualiser l'étiquette, scanner avec la caméra, tester la saisie manuelle, ouvrir le lien avec les deux profils.

**Résultats attendus :** QR limité à l'UUID de boîte ; fiche authentifiée ; aucune demande ou remise automatique ; accès refusé sans permission.

**Résultat exécuté :** génération, page cible, impression CSS, saisie/contrôles et refus RBAC réussis. Caméra et impression physique non exécutées.

### UAT-04 — Recherche documentaire

**Préconditions :** plusieurs documents, statuts et localisations ; au moins un document confidentiel.

**Étapes :** combiner texte, référence, statut, boîte, zone/rack/niveau, dates, tri et pagination ; répéter avec un demandeur.

**Résultats attendus :** résultats exacts et URL persistante ; aucune fuite du document confidentiel non autorisé.

**Résultat exécuté :** réussi dans sept tests search/dashboard et le scénario E2E.

### UAT-05 — Demande d'accès

**Préconditions :** demandeur connecté ; document disponible.

**Étapes :** créer une consultation puis une sortie avec motif et échéance ; tester motif court, date passée et demande active dupliquée.

**Résultats attendus :** demande valide `EN_ATTENTE` ; entrées invalides ou doublons refusés ; propriété respectée.

**Résultat exécuté :** sortie et contrôles négatifs réussis ; consultation créée dans les tests de données mais cycle complet à exécuter manuellement.

### UAT-06 — Approbation et refus

**Préconditions :** deux demandes en attente ; validateur connecté.

**Étapes :** approuver la première ; vérifier l'absence de mouvement ; refuser la seconde avec puis sans motif ; tenter une seconde décision.

**Résultats attendus :** états `APPROUVEE`/`REFUSEE`, motif obligatoire, décision unique, aucun mouvement à l'approbation.

**Résultat exécuté :** réussi dans les suites sécurité, workflow et E2E.

### UAT-07 — Remise signée

**Préconditions :** sortie approuvée, document disponible, échéance future, archiviste connecté.

**Étapes :** contrôler le dossier, dessiner/effacer/refaire la signature, confirmer, puis tenter une seconde remise.

**Résultats attendus :** mouvement unique, document `SORTI`, demande `EN_COURS`, preuve privée liée au signataire, doublon refusé.

**Résultat exécuté :** réussi dans deux scénarios E2E et les tests de concurrence/rollback.

### UAT-08 — Suivi du prêt actif

**Préconditions :** au moins un mouvement actif et un mouvement retourné.

**Étapes :** filtrer actifs/retournés, rechercher référence/détenteur, vérifier sortie, échéance, opérateur et preuve.

**Résultats attendus :** informations cohérentes, pagination et filtres serveur, preuve seulement pour rôle autorisé.

**Résultat exécuté :** réussi localement.

### UAT-09 — Retard

**Préconditions :** mouvement actif avec retour prévu antérieur à l'instant courant.

**Étapes :** ouvrir tableau de bord et mouvements, filtrer les retards, comparer les jours affichés au calendrier métier.

**Résultats attendus :** retard positif seulement pour mouvement actif en dépassement.

**Résultat exécuté :** calcul UTC et agrégats réussis automatiquement. Les jours ouvrés, tolérances et escalades doivent être décidés par le client.

### UAT-10 — Retour

**Préconditions :** mouvement actif ; archiviste connecté.

**Étapes :** tester une mauvaise référence ; confirmer un retour `BON` avec boîte ; tenter un double retour ; répéter un cas endommagé avec observation.

**Résultats attendus :** erreurs sans mutation ; retour conforme → `DISPONIBLE` ; exception → `INDISPONIBLE` ; historique conservé.

**Résultat exécuté :** chemin conforme et contrôles négatifs réussis. Procédure métier post-dommage à valider.

### UAT-11 — Historique et audit

**Préconditions :** cycle complet clôturé ; administrateur connecté.

**Étapes :** retrouver décision, mouvement, signataire, dates, retour et audits ; tenter une modification/suppression par le rôle applicatif.

**Résultats attendus :** historique complet et audit append-only ; aucune suppression UI.

**Résultat exécuté :** réussi dans Vitest/PostgreSQL et E2E.

### UAT-12 — Opérations non autorisées

**Préconditions :** profils demandeur, validateur, archiviste, administrateur et session anonyme.

**Étapes :** tenter validation/remise/audit/signature sans droit, accéder à un document confidentiel, désactiver un compte puis réutiliser sa session.

**Résultats attendus :** redirection ou refus non révélateur ; session révoquée ; aucune mutation.

**Résultat exécuté :** réussi dans les suites sécurité, workflow, recherche et E2E.

### UAT-13 — Consultation sur site

**Préconditions :** demande `CONSULTATION` approuvée ; archiviste connecté.

**Étapes :** démarrer la consultation, vérifier `EN_COURS` et l'opérateur, clôturer, vérifier `RETOURNEE` et les deux audits.

**Résultats attendus :** aucune sortie physique ni signature créée ; document toujours disponible ; double démarrage/clôture refusé.

**Résultat exécuté :** non exécuté de bout en bout pendant Step 8 ; à inscrire au procès-verbal.

## 5. Critères de clôture UAT

- Tous les scénarios V1 obligatoires sont signés `Accepté`, `Accepté avec réserve` ou `Rejeté` par le client.
- Les scénarios matériels UAT-03 et les contrôles d'accessibilité manuels sont exécutés sur le matériel cible.
- UAT-13 et le traitement des retours non conformes reçoivent une décision métier.
- Aucun défaut critique ou élevé sans contournement accepté ne reste ouvert.
- Les décisions de production ne sont pas confondues avec la recette fonctionnelle locale.

## 6. Modèle de procès-verbal

| Champ | Valeur à compléter |
| --- | --- |
| Version / commit |  |
| Environnement et base |  |
| Date et participants |  |
| Scénarios acceptés |  |
| Réserves et défauts |  |
| Décisions métier |  |
| Décision finale | Démonstration acceptée / recette acceptée avec réserves / recette refusée |
| Signatures client et équipe |  |
