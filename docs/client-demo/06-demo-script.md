# Script de démonstration client — 15 à 20 minutes

## Préparation hors présentation

1. Démarrer PostgreSQL avec `npm run db:up`.
2. Appliquer les migrations et vérifier la connexion.
3. Fournir temporairement `DEMO_USER_PASSWORD` et exécuter `npm run db:seed:demo`.
4. Démarrer l'application avec `npm run dev`.
5. Ouvrir une fenêtre normale et, si utile, une fenêtre privée pour changer rapidement de rôle.
6. Vérifier que l'imprimante ou l'aperçu PDF est disponible si l'impression physique doit être montrée.

## 0:00–2:00 — Introduction

Message proposé :

> L'objectif est de rendre chaque document physique retrouvable et chaque sortie explicable : qui a demandé, qui a autorisé, qui a reçu, quand le retour est attendu et dans quel état le document est revenu.

Présenter le périmètre local du MVP et rappeler que la production, les sauvegardes et la supervision sont volontairement hors de cette étape.

## 2:00–4:00 — Acteurs et séparation des responsabilités

- `DEMANDEUR` : recherche et demande ;
- `VALIDATEUR` : décide ;
- `ARCHIVISTE` : gère la garde physique ;
- `ADMIN` : administre les accès et consulte l'audit.

Insister sur le point clé : une approbation n'est pas une remise.

## 4:00–7:00 — Enregistrement et rangement

Connexion : `demo.archiviste@example.test`.

1. Montrer **Emplacements** et `Zone A / 03 / 02`.
2. Montrer la boîte `B-024` et son contenu.
3. Ouvrir `DOC-001`, `DOC-002` et `DOC-003`.
4. Afficher l'étiquette QR, son identifiant d'application et l'aperçu d'impression.
5. Expliquer que le QR ne contient aucune donnée confidentielle.

## 7:00–10:00 — Recherche et demande

Connexion : `demo.demandeur@example.test`.

1. Rechercher `DOC-002`.
2. Montrer les filtres et la localisation.
3. Ouvrir le détail et créer une demande de sortie si le jeu de données a été préparé pour une recette interactive, ou présenter la demande déjà approuvée du seed.
4. Montrer les différents états dans **Demandes**.

## 10:00–12:00 — Approbation et refus

Connexion : `demo.validateur@example.test`.

1. Ouvrir **Validations**.
2. Montrer la demande en attente et le motif.
3. Présenter les boîtes de dialogue d'approbation/refus.
4. Montrer le refus synthétique avec commentaire obligatoire.
5. Souligner qu'aucun mouvement n'existe encore pour une demande seulement approuvée.

## 12:00–15:00 — Remise signée et suivi

Connexion : `demo.archiviste@example.test`.

1. Ouvrir **Remises** et vérifier bénéficiaire, boîte, emplacement et échéance.
2. Faire une signature de démonstration uniquement sur une demande préparée à cet effet.
3. Confirmer la remise.
4. Ouvrir **Historique** : détenteur, sortie, retour prévu et état.
5. Montrer `DOC-003` comme cas synthétique en retard.
6. Expliquer l'unicité du mouvement actif et le stockage privé de la preuve.

## 15:00–17:00 — Retour et traçabilité

1. Ouvrir **Retours**.
2. Confirmer référence, état et boîte.
3. Montrer le mouvement retourné `DEMO-RET-001` ou clôturer la remise réalisée pendant la démonstration.
4. Vérifier que l'historique, la décision et la preuve restent accessibles.

## 17:00–19:00 — Sécurité et audit

Connexion : `demo.admin@example.test`.

1. Montrer les rôles et permissions.
2. Montrer la désactivation d'un compte sans l'exécuter sur le compte utilisé pour la démo.
3. Filtrer le journal sur `movement.handover_confirmed` ou `movement.return_confirmed`.
4. Expliquer le contrôle objet, les transactions et l'immutabilité de l'audit.

## 19:00–20:00 — Conclusion et questions

Relier le résultat aux principes inspirés d'ISO 15489 : identification unique, métadonnées cohérentes, responsabilité, accès contrôlé et conservation du contexte.

Questions à poser :

- Quelle politique de confidentialité par service ou fonds ?
- Quelle valeur juridique est attendue de l'accusé ?
- Quels délais de retour et niveaux d'escalade ?
- Quelles durées de conservation et règles de destruction ?
- Quel matériel mobile et quelles imprimantes seront utilisés ?
- Quels rapports et exports sont prioritaires ?

## Précaution de répétition

Le seed est idempotent mais ne réinitialise pas les interactions déjà réalisées. Pour répéter le scénario sans supprimer l'historique, utiliser une nouvelle référence synthétique ou préparer une base de test dédiée. Ne jamais réinitialiser la base contenant des données client.
