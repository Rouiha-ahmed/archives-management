# Base de démonstration `DEMO_2026`

## Objectif

Ce jeu synthétique permet de tester la recherche, les demandes, les validations, les consultations sur place, les remises signées, les retours, les retards, les QR et l'audit. Il ne contient aucune identité réelle. Les références, adresses `example.test`, motifs, preuves et métadonnées portent le namespace `DEMO_2026`.

La génération est déterministe (graine `20261028`, date d'ancrage UTC `2026-10-28T12:00:00Z`) et les UUID sont dérivés du namespace. Une seconde exécution n'ajoute aucune ligne.

## Protections obligatoires

Le seed refuse de s'exécuter sauf si toutes les conditions suivantes sont réunies :

- `DATABASE_URL` est une URL PostgreSQL complète ;
- l'hôte et l'adresse effective du serveur sont loopback (`localhost`, `127.0.0.1` ou `::1`) ;
- le nom de base est explicite et n'évoque ni production ni staging ;
- `NODE_ENV=development` ;
- `ALLOW_DEMO_SEED=true` est fourni explicitement ;
- les rôles système existent déjà ;
- toute ligne existante avec une clé naturelle de démonstration appartient bien à `DEMO_2026`.

Le script ne lance jamais `migrate reset`, `TRUNCATE`, `DROP` ou `DELETE`. Il ne modifie pas les dossiers métier existants et ne fournit aucune commande de nettoyage destructive. Les journaux et signatures existants restent intacts.

## Prérequis

```bash
npm install
npm run db:status
npm run db:deploy
npm run db:seed
npm run db:check
```

Vérifier avant l'écriture que la sortie Prisma désigne bien la base locale attendue. La base utilisée lors de la validation du 28 octobre 2026 était `127.0.0.1:5432/archives_db`, schéma `public`.

## Commandes

Créer ou compléter les données sans activer les connexions des comptes de démo :

```bash
NODE_ENV=development ALLOW_DEMO_SEED=true \
  DEMO_LOGIN_ENABLED=false npm run db:seed:demo
```

Activer les connexions exige un second opt-in et un mot de passe local. Le mot de passe doit faire 12 à 128 caractères et contenir minuscule, majuscule, chiffre et caractère spécial. Il n'est ni affiché, ni journalisé, ni versionné.

```bash
read -rs "DEMO_USER_PASSWORD?Mot de passe de démonstration : "; echo
export DEMO_USER_PASSWORD
NODE_ENV=development ALLOW_DEMO_SEED=true \
  DEMO_LOGIN_ENABLED=true npm run db:seed:demo
unset DEMO_USER_PASSWORD
```

Cette commande ne remplace pas un hash déjà présent. Elle renseigne uniquement les comptes `DEMO_2026` dont le hash est encore nul.

Vérification JSON exploitable par une machine et rapport lisible :

```bash
npm run db:verify:demo
npm run db:demo:report
```

## Distribution

| Entité | Nombre |
|---|---:|
| Emplacements | 30 |
| Boîtes | 100 |
| Documents | 1 000 |
| Utilisateurs | 20 |
| Demandes | 150 |
| Validations | 125 |
| Mouvements | 80 |
| Preuves de remise PNG | 80 |
| Événements d'audit | 1 391 |

Rôles : 2 `ADMIN`, 4 `ARCHIVISTE`, 4 `VALIDATEUR`, 10 `DEMANDEUR`.

Demandes : 25 `EN_ATTENTE`, 20 `APPROUVEE`, 15 `REFUSEE`, 50 `EN_COURS`, 40 `RETOURNEE`. Les consultations sur place n'ont aucun mouvement physique ; leurs dates opérateur/début/fin suivent le workflow applicatif.

Mouvements : 30 prêts actifs non échus à la date d'ancrage, 35 retours terminés et 15 prêts en retard. Les cinq retours en exception produisent des documents `INDISPONIBLE`; les retours en bon état sont `DISPONIBLE`; les 45 mouvements encore ouverts correspondent à 45 documents `SORTI`.

Les preuves sont des PNG portant visiblement le mot « DEMO », et non des imitations de signatures manuscrites. Elles sont stockées dans le répertoire privé configuré par `SIGNATURE_STORAGE_DIR` et contrôlées par SHA-256 via la même résolution sécurisée que l'application.

## Comptes

Exemples :

- `admin.demo01@example.test`, `admin.demo02@example.test` ;
- `archiviste.demo01@example.test` à `archiviste.demo04@example.test` ;
- `validateur.demo01@example.test` à `validateur.demo04@example.test` ;
- `demandeur.demo01@example.test` à `demandeur.demo10@example.test`.

Tous partagent le mot de passe fourni localement au moment de l'activation. Aucun mot de passe n'est inclus ici. Tant que `DEMO_LOGIN_ENABLED=true` n'a pas été exécuté avec `DEMO_USER_PASSWORD`, les comptes existent pour les relations métier mais ne peuvent pas s'authentifier.

## Scénarios manuels

### A — Recherche documentaire

Avec un archiviste, rechercher `DEMO-DOC-0001`. Le document se trouve dans `DEMO-B-001`, elle-même dans `DEMO_2026 / Zone A / Rack 01 / Niveau 01`.

### B — Approbation en attente

Se connecter comme validateur, ouvrir `/validations`, puis approuver l'une des 25 demandes `EN_ATTENTE`. Choisir de préférence une demande de sortie portant le marqueur `DEMO_2026`.

### C — Refus et historique

Dans les demandes, filtrer `REFUSEE`. Chaque ligne possède une validation `REFUSEE`, un validateur et un commentaire de rejet obligatoire.

### D — Remise signée manuelle

Se connecter comme archiviste et ouvrir `/mouvements/sorties`. Quinze demandes `SORTIE` sont `APPROUVEE` sans mouvement. Capturer une vraie interaction de test dans le pavé, puis confirmer la remise.

### E — Retards

Ouvrir `/mouvements?state=overdue`. Les 15 mouvements de retard doivent apparaître, sans date de retour, avec leur document `SORTI`.

### F — Retour

Ouvrir `/mouvements/retours`, choisir un mouvement actif, confirmer exactement sa référence puis enregistrer un retour. Un retour `BON` replace le document en `DISPONIBLE`; les états d'exception le rendent `INDISPONIBLE`.

### G — QR

Ouvrir `DEMO-B-001`, générer son QR, puis le scanner. Le QR ne contient que l'URL authentifiée `/boites/{uuid}` et aucune métadonnée sensible.

### H — Audit

Ouvrir `/administration/audit` avec un administrateur. Rechercher `document.created`, `access_request.approved`, `access_request.rejected`, `movement.handover_confirmed` ou `movement.return_confirmed`.

## Résultats vérifiés le 28 octobre 2026

- connexion locale et 14 tables applicatives : succès ;
- 5 migrations Prisma appliquées, aucune migration en attente ;
- première exécution : tous les nombres du tableau insérés ;
- seconde exécution : 0 insertion, toutes les lignes reconnues et ignorées ;
- 26 contrôles JSON : succès, aucune incohérence ;
- doublons de remise active, mouvement sur demande en attente/refusée : 0 ;
- fichiers de preuve absents ou checksum invalide : 0 ;
- TypeScript et ESLint : succès ; Vitest : 6 fichiers et 51 tests réussis ; Playwright/Chrome : 3 scénarios réussis.
- build Next.js 16.4.3 : succès sur 21 routes ; lecture des métriques via le service de dashboard : succès.

## Limites connues

- La date d'ancrage fixe garantit la reproductibilité. Au fil du temps, certains prêts initialement futurs deviendront naturellement en retard dans les écrans qui comparent à l'heure courante ; le vérificateur conserve la distribution voulue relativement à l'ancrage.
- Les comptes ont été créés sans hash lors de l'exécution initiale, faute d'opt-in et de mot de passe fournis. Exécuter la commande d'activation ci-dessus avant les scénarios de connexion.
- Les preuves automatiques sont explicitement des tampons « DEMO ». Le scénario D reste destiné à tester manuellement la capture interactive.
- Le stockage fichier privé est adapté au développement mono-instance, pas à une exploitation distribuée.
