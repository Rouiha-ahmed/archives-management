# Rapport de tests et de recette locale

## Environnement

- Date : 27 octobre 2026
- macOS, navigateur Google Chrome système
- Node.js 24.13.0, npm 11.6.2
- PostgreSQL 18.3 local
- Next.js 16.4.3, React 19.3.0, Prisma 7.10.1
- Base applicative préservée; tests exécutés sur la base dédiée `archives_test`

## État initial Step 7

Avant modification :

- PostgreSQL joignable ;
- schéma Prisma valide, cinq migrations appliquées ;
- TypeScript et ESLint sans erreur ;
- 5 fichiers Vitest, 45 tests réussis ;
- scénario Playwright existant réussi ;
- build Next.js réussi sur 21 routes.

Un avertissement non bloquant de `pg` 8.23 signalait l'appel de `client.query()` pendant une requête en cours. Aucune erreur transactionnelle ni perte de données n'a été observée.

## Tests ajoutés ou renforcés

### Vitest / PostgreSQL

- deux demandes actives concurrentes ne produisent qu'une ligne ;
- une demande refusée ne peut pas être remise ;
- un retour sans mouvement actif est refusé ;
- la désactivation bloque immédiatement une opération protégée ;
- chargement, erreur, état vide et badge restent annoncés textuellement.

### Playwright

Scénario de recette client :

1. création de `Zone A / 03 / 02` ;
2. création de `B-024` ;
3. enregistrement de `DOC-001`, `DOC-002`, `DOC-003` ;
4. rendu QR et mode impression ;
5. demandes DOC-002/DOC-003 par un demandeur ;
6. refus DOC-003 avec motif ;
7. approbation DOC-002 sans mouvement automatique ;
8. localisation par boîte, signature et remise DOC-002 ;
9. contrôle détenteur, dates et statut ;
10. retour conforme, historique et deux événements d'audit.

Contrôles négatifs navigateur :

- redirection d'un utilisateur anonyme ;
- refus des pages validation/remise selon le rôle ;
- QR sans contournement RBAC ;
- preuve signature : `200` autorisé, `401` anonyme, `404` non autorisé ;
- clé de stockage inaccessible sous `/storage/...` ;
- navigation mobile et visibilité par permission ;
- pages administration et scanner sans erreur console.

## Résultats finaux

| Contrôle | Résultat |
| --- | --- |
| PostgreSQL / 14 tables applicatives | Réussi |
| Prisma validate / generate / migrations / dérive | Réussi |
| TypeScript | Réussi |
| ESLint | Réussi |
| Vitest | 5 fichiers, 49 tests réussis |
| Playwright | 3 scénarios Chrome réussis, exécution séquentielle sur `archives_test` |
| Axe WCAG A/AA automatisé | Aucune violation sur le tableau de bord au dernier passage |
| Audit dépendances de production | 0 vulnérabilité signalée |
| Build Next.js | Réussi, 21 routes |
| Smoke test serveur de production local | Réussi |
| Seed démo | Deux exécutions successives sans doublon |

## Défauts trouvés et corrigés

| ID | Sévérité | Défaut | Correction |
| --- | --- | --- | --- |
| QA-01 | Haute pour la fiabilité QA | Les fichiers Playwright pouvaient partager `archives_test` sur plusieurs workers et réinitialiser leurs fixtures mutuellement | `workers: 1` imposé dans la configuration |
| QA-02 | Sérieuse accessibilité | `aria-label` était interdit sur le conteneur neutre du skeleton | `role="status"`, texte masqué et décorations `aria-hidden` |
| QA-03 | Sérieuse accessibilité | Contraste des titres de section de navigation mesuré à 4,23:1 | Passage de `text-slate-500` à `text-slate-400` |
| QA-04 | Moyenne | Absence de jeu de démonstration complet, sûr et reproductible | Seed opt-in local, synthétique, idempotent et anti-collision |
| QA-05 | Faible / tests | Sélecteurs ambigus et navigation asynchrone rendaient la recette navigateur instable | Sélecteurs par identifiant/structure, accès déterministe aux objets créés et délais explicites |

## Limitations et tests manuels restants

- scanner avec caméra réelle, permission navigateur et HTTPS sur téléphone ;
- impression sur l'imprimante et le format d'étiquette du client ;
- lecteur d'écran, clavier seul complet, zoom 200/400 % et contraste sur le matériel cible ;
- charge, concurrence et temps de réponse avec un volume anonymisé représentatif ;
- test de pénétration externe ;
- sauvegarde/restauration, supervision et reprise après sinistre, hors Step 7.

## Conclusion

Aucun défaut critique connu ne bloque une démonstration locale. Les six étapes métier et les contrôles de sécurité principaux ont été exercés. Ce résultat ne vaut pas autorisation de mise en production.
