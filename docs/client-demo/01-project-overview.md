# Présentation du projet

## Problème métier

Les archives physiques circulent entre le stockage et les collaborateurs. Sans chaîne de garde explicite, il devient difficile de savoir où se trouve un dossier, qui l'a demandé, qui a autorisé sa sortie, qui l'a reçu et dans quel état il est revenu.

## Objectifs du MVP local

- identifier chaque emplacement, boîte et document de manière stable ;
- retrouver rapidement un document autorisé ;
- séparer demande, décision et remise physique ;
- conserver un accusé de remise associé au bon mouvement ;
- suivre les détenteurs, échéances et retards ;
- confirmer les retours sans effacer l'historique ;
- démontrer les contrôles d'accès et la traçabilité au client.

## Périmètre

Le MVP gère les archives physiques, les demandes d'accès, les validations, les remises signées, les retours, le QR des boîtes, les utilisateurs, les rôles et le journal d'audit. Il fonctionne localement avec Next.js et PostgreSQL.

Le déploiement, les sauvegardes opérationnelles, la supervision, le plan de reprise, le stockage objet de production et les notifications automatiques ne font pas partie de cette étape.

## Rôles

| Rôle | Responsabilité principale |
| --- | --- |
| `ADMIN` | Administrer les utilisateurs, rôles, permissions et consulter l'audit |
| `ARCHIVISTE` | Gérer le stockage, enregistrer les documents, remettre et réintégrer les dossiers |
| `VALIDATEUR` | Approuver ou refuser les demandes, sans effectuer la remise |
| `DEMANDEUR` | Rechercher les documents autorisés, demander un accès et suivre ses demandes |

L'administrateur n'obtient pas implicitement les droits métier de l'archiviste.

## Fonctions majeures

- tableau de bord alimenté par PostgreSQL ;
- recherche avancée et pagination serveur ;
- emplacements, boîtes et étiquettes QR imprimables ;
- demandes de consultation ou de sortie ;
- décisions avec motif de refus obligatoire ;
- remise transactionnelle avec accusé manuscrit PNG ;
- suivi des sorties actives, retards et retours ;
- preuves privées avec contrôle d'intégrité SHA-256 ;
- RBAC et journal append-only.

Le système applique des principes inspirés d'ISO 15489 — identification, contexte, responsabilité, contrôle d'accès et conservation de l'historique — sans revendiquer de certification.
