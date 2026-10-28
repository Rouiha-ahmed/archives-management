# Backlog Version 2 et obligations V1 restantes

## Principes de priorisation

- **V1 essentiel** : nécessaire pour accepter le besoin métier ou préparer une décision de production ; ne doit pas être dissimulé dans un backlog optionnel.
- **V2 prioritaire** : forte valeur métier, conformité ou réduction de risque après validation V1.
- **V2 optionnel** : amélioration dont la valeur dépend du volume, des usages ou d'une intégration future.

La priorité finale appartient au client. Les estimations nécessitent des règles métier, volumes, interfaces et critères d'acceptation validés.

## 1. Obligations et décisions V1 non closes

| ID | Sujet | Pourquoi essentiel | Décision / sortie attendue |
| --- | --- | --- | --- |
| V1-01 | Rapprochement du cahier des charges original | Empêche l'acceptation contractuelle complète | Version source, références et matrice signée |
| V1-02 | Recette matérielle QR, impression et tactile | Fonction présente mais matériel réel non validé | Procès-verbal sur appareils cibles |
| V1-03 | Consultation sur site | Cycle implémenté sans test E2E complet ni règles de preuve | Décision preuve/témoin/durée + UAT signée |
| V1-04 | Dommage, perte et rétablissement | Un document devient indisponible sans processus de résolution | Procédure, responsabilités et états de clôture |
| V1-05 | Confidentialité et périmètre de validation | Modèle binaire potentiellement trop large | Règles par service/fonds/dossier/personne |
| V1-06 | Valeur juridique de la signature | Accusé interne non qualifié | Acceptation explicite ou exigence de prestataire |
| V1-07 | Conservation et purge gouvernée | Audits, signatures et données personnelles sans calendrier validé | Tableau de conservation, gel légal et procédure DBA |
| V1-08 | Accessibilité manuelle | Axe automatisé insuffisant | Clavier, lecteur d'écran, zoom 200/400 % et contraste |
| V1-09 | Chantier de production reporté | Le MVP local n'est pas exploitable en production en l'état | Architecture, HTTPS, secrets, sauvegarde, supervision, PRA, sécurité |

## 2. V2 prioritaire

### V2-P1 — Calendriers de conservation et sort final

**Valeur :** gouverner conservation, transfert, destruction et gel légal par catégorie.

**Portée possible :** règles versionnées, calcul d'échéance, validation à plusieurs niveaux, suspension, procès-verbal de disposition et audit. Aucune destruction automatique sans gouvernance formelle.

### V2-P2 — Classification documentaire renforcée

**Valeur :** remplacer le champ libre par un plan de classement contrôlé.

**Portée possible :** hiérarchie, codes, versions, responsables, métadonnées obligatoires, import contrôlé et historique des reclassements.

### V2-P3 — Récolement physique par QR

**Valeur :** comparer le stock attendu au stock observé.

**Portée possible :** campagne, zones assignées, scan hors-ligne/online, anomalies, doublons, documents manquants, validation et rapport final.

### V2-P4 — Politiques d'accès avancées

**Valeur :** réduire le risque de confidentialité au-delà du booléen actuel.

**Portée possible :** service, fonds, dossier, niveau, habilitation nominative, délégation temporaire, séparation des tâches et justification d'accès.

### V2-P5 — Notifications et escalades

**Valeur :** réduire retards et demandes oubliées.

**Portée possible :** événements, modèles, canaux, délais, calendrier ouvré, relances, escalade hiérarchique, consentement et journal de livraison idempotent.

### V2-P6 — Stockage de preuves de production

**Valeur :** confidentialité, disponibilité et durabilité des signatures.

**Portée possible :** stockage objet privé, chiffrement, versioning, sauvegardes, restauration testée, région de données, rotation et politique de rétention.

## 3. V2 optionnel ou dépendant d'une étude

| ID | Évolution | Dépendances |
| --- | --- | --- |
| V2-O1 | Capacité des boîtes et alertes de saturation | Méthode de calcul, unités et règles de dépassement |
| V2-O2 | Exports CSV/PDF et rapports périodiques | Destinataires, colonnes, confidentialité, fréquence |
| V2-O3 | SSO, MFA et cycle de vie des identités | Fournisseur d'identité et politique sécurité |
| V2-O4 | API et intégrations métier/messagerie/ticketing | Systèmes cibles, contrats API et responsabilités |
| V2-O5 | Photographies d'état départ/retour | Base légale, stockage, rétention et volume |
| V2-O6 | Signature électronique avancée/qualifiée | Valeur juridique, pays, prestataire et budget |
| V2-O7 | Mode mobile/offline pour inventaire | Matériel, synchronisation et résolution de conflits |
| V2-O8 | Analytique et indicateurs SLA | Volumes, objectifs et gouvernance des métriques |

## 4. Préservation numérique à long terme

Le système actuel gère la circulation d'archives physiques et une preuve PNG. Une évolution vers la préservation numérique doit faire l'objet d'un cadrage distinct.

### Métadonnées de préservation

- provenance et chaîne de garde numérique ;
- événements de préservation ;
- environnement technique et informations de représentation ;
- droits, restrictions et durées ;
- identifiants pérennes et relations avec l'archive physique.

### Intégrité des documents numériques

- checksums à l'ingestion et contrôles périodiques ;
- version et algorithme de fixité ;
- stockage redondant et détection de corruption ;
- journalisation des réparations et migrations de format.

### Principes inspirés d'OAIS

- définir producteurs, consommateurs et communauté désignée ;
- distinguer paquets de soumission, d'archivage et de diffusion ;
- organiser ingestion, stockage, gestion des données, accès et planification de préservation.

Ces pistes sont inspirées d'ISO 14721/OAIS. Elles ne constituent ni une mise en œuvre OAIS actuelle, ni une revendication de conformité.

## 5. Critères de passage en planification

Une fiche V2 ne doit être estimée qu'après validation de : propriétaire métier, utilisateurs concernés, règle de gestion, données, sécurité, conservation, volumétrie, interfaces, critères UAT et dépendances d'exploitation.
