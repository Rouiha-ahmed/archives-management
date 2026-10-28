# Dossier de livraison client — Step 8

## Objet

Ce dossier présente le MVP local de gestion des archives physiques à Proorga Consulting. Il relie les processus métier, les fonctions réellement implémentées, l'architecture, les preuves de test et les décisions encore attendues du client.

Il ne constitue ni une déclaration de mise en production, ni une certification ISO 15489, ISO 14721/OAIS, BPMN ou sécurité.

## Limite documentaire majeure

Le cahier des charges original n'est pas présent dans le dépôt au 28 octobre 2026. Les exigences de ce dossier sont donc reconstruites à partir de la matrice `docs/requirements-traceability.md`, des documents Step 2 à Step 7, du code, du schéma Prisma et des tests. Elles doivent être rapprochées du document contractuel original avant validation définitive par le client.

Les mentions suivantes sont utilisées :

- **Implémenté et vérifié** : code inspecté et preuve automatisée exécutée avec succès ;
- **Implémenté, validation manuelle requise** : fonction présente, mais matériel, usage métier ou contrôle humain non testé ;
- **Partiel** : une décision ou une partie significative manque ;
- **Non implémenté** : absence confirmée dans le périmètre audité ;
- **Bloqué par décision client/exploitation** : dépendance externe au MVP local.

## Navigation

| Document | Utilisation recommandée |
| --- | --- |
| [Processus métier](business-process.md) | Présenter les six étapes, les acteurs, décisions et exceptions |
| [Spécifications fonctionnelles](functional-specifications.md) | Faire valider rôles, règles, cycles de vie et critères d'acceptation |
| [Architecture et diagrammes](architecture-and-uml.md) | Expliquer cas d'usage, états, séquence, données et architecture technique |
| [Traçabilité des exigences](requirements-traceability.md) | Relier exigence, processus, module, route, test, statut et écart |
| [Plan de recette utilisateur](uat-plan.md) | Organiser et signer la recette métier sur l'environnement client |
| [Trame de présentation](presentation-outline.md) | Préparer le comité de restitution et la démonstration |
| [Backlog Version 2](v2-backlog.md) | Arbitrer les obligations V1 restantes et les évolutions optionnelles |
| [Revue qualité finale](quality-review.md) | Lire les résultats exécutés, limites, défauts et réserves de production |

## Ordre conseillé pour la présentation client

1. Présenter le contexte et les limites documentaires avec cette page.
2. Faire valider le processus cible dans `business-process.md`.
3. Parcourir les responsabilités et règles dans `functional-specifications.md`.
4. Exécuter les scénarios prioritaires de `uat-plan.md`.
5. Examiner les écarts de `requirements-traceability.md` et `quality-review.md`.
6. Faire arbitrer les décisions V1 avant de prioriser `v2-backlog.md`.

## Sources auditées

- application Next.js et routes App Router ;
- services métier, Auth.js, RBAC, audit et stockage privé des signatures ;
- schéma Prisma et cinq migrations PostgreSQL ;
- tests Vitest, PostgreSQL et Playwright ;
- documentation Step 2 à Step 7 et dossier de démonstration client ;
- résultats de contrôle exécutés pendant Step 8.

L'environnement reste un environnement local de démonstration et de recette. Le déploiement, les sauvegardes, la supervision, la reprise après sinistre, le stockage objet de production et l'homologation de sécurité ont été volontairement différés.
