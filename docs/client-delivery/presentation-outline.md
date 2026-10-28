# Trame de présentation client

Format conseillé : 30 minutes de présentation, 20 minutes de démonstration, 20 minutes d'arbitrage et questions.

## 1. Contexte du projet

- Gestion locale d'archives physiques pour Proorga Consulting.
- Objectif : rendre chaque document retrouvable et chaque circulation explicable.
- Périmètre : MVP local de démonstration et recette, pas production.
- Transparence : cahier des charges original absent du dépôt ; validation contractuelle à compléter.

## 2. Problème métier

- Où se trouve le document ?
- Qui l'a demandé, autorisé, reçu et rendu ?
- Quelle preuve relie la remise au bon mouvement ?
- Comment distinguer autorisation, sortie réelle, retard et retour ?
- Comment protéger les documents confidentiels et l'historique ?

## 3. Analyse des exigences

- Six étapes métier consolidées.
- Quatre rôles et séparation des responsabilités.
- Identification unique, recherche, contrôle d'accès, preuve et audit.
- Exigences reconstruites à rapprocher du cahier contractuel.
- Montrer la matrice de traçabilité et ses statuts prudents.

## 4. Processus cible

- Enregistrement et rangement.
- Recherche et demande motivée.
- Approbation ou refus distinct de la remise.
- Remise physique signée et atomique.
- Suivi du détenteur, de l'échéance et du retard.
- Retour contrôlé, réintégration ou exception.
- Présenter les branches refus, conflit, signature invalide et retour non conforme.

## 5. Fonctionnalités principales

- Emplacements, boîtes, documents et recherche multicritère.
- Étiquette et scanner QR sans autorisation implicite.
- Demandes de consultation ou de sortie.
- Validations uniques et refus motivés.
- Remises, signatures privées, mouvements et retours.
- Administration utilisateurs/RBAC et audit append-only.

## 6. Démonstration en direct

Ordre recommandé :

1. Archiviste : créer ou montrer emplacement, boîte, document et QR.
2. Demandeur : rechercher et soumettre une sortie.
3. Validateur : refuser une demande et en approuver une autre.
4. Archiviste : confirmer une remise signée.
5. Archiviste : suivre le détenteur et le retard.
6. Archiviste : confirmer le retour.
7. Administrateur : retrouver les audits et montrer les permissions.
8. Montrer un refus d'accès avec un profil non autorisé.

Utiliser uniquement des références synthétiques. Ne jamais réinitialiser la base client pour répéter la démonstration.

## 7. Sécurité et traçabilité

- Auth.js, Argon2id, sessions versionnées et blocage d'échecs.
- RBAC vérifié côté serveur sur pages, actions, services et fichiers.
- Filtrage objet des documents confidentiels.
- Transactions sérialisables et contraintes PostgreSQL.
- Signatures hors `public`, checksum et contrôle de lecture.
- Audit append-only et relations de suppression restrictives.
- Limites : pas de MFA/SSO, test de pénétration ni infrastructure de production.

## 8. Architecture technique

- Next.js 16 App Router, React 19 et TypeScript strict.
- Server Components, Server Actions minces et services métier.
- Prisma 7 et PostgreSQL 17/18.
- Stockage fichier privé adapté uniquement à la démonstration locale.
- Vitest/PostgreSQL et Playwright/Chrome sur base dédiée.

## 9. Pratiques inspirées d'ISO 15489

- Identification stable et métadonnées de contexte.
- Responsabilités et contrôles d'accès explicites.
- Chaîne de garde, preuve, historique et audit.
- Références et états cohérents.

Formulation obligatoire : le design est **inspiré de principes utiles** d'ISO 15489. Aucune conformité, certification ou audit normatif n'est revendiqué.

## 10. Évolution vers des principes ISO 14721/OAIS

- OAIS vise la préservation à long terme d'objets numériques, au-delà du workflow physique actuel.
- Évolutions possibles : paquets d'information, métadonnées de préservation, fixité, provenance, représentation, stockage redondant et planification de préservation.
- Ne pas présenter ces éléments comme déjà implémentés ni nécessaires à toute archive physique.
- Lancer une étude séparée si le client souhaite ingérer et préserver des documents numériques.

## 11. Limites et décisions client

- Cahier original à rattacher à la matrice.
- Règles de classification, confidentialité fine et périmètre des validateurs.
- Consultation sur site, valeur juridique de l'accusé et gestion dommage/perte.
- Durées de conservation, transfert, destruction, récolement et capacité.
- Matériel QR/signature/impression et contrôles d'accessibilité.
- Notifications, rapports et intégrations.
- Hébergement, sauvegarde, supervision, stockage objet, PRA et homologation sécurité.

## 12. Conclusion et prochaines étapes

1. Faire signer les résultats UAT et les réserves.
2. Rapprocher le dossier du cahier des charges original.
3. Résoudre les décisions V1 essentielles.
4. Planifier le chantier de production Step 6 reporté.
5. Prioriser ensuite les évolutions V2 selon valeur, risque et conformité.

Message final proposé :

> Le MVP démontre localement une chaîne de garde cohérente et testée. La prochaine décision n'est pas de le déclarer prêt pour la production, mais de valider le métier, fermer les réserves V1 et cadrer l'exploitation sécurisée.
