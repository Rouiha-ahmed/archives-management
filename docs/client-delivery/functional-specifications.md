# Spécifications fonctionnelles

## 1. Cadre de lecture

Le cahier des charges original n'étant pas disponible, ces spécifications consolident les exigences reconstruites dans les étapes antérieures et le comportement réel du code. Elles ne remplacent pas une validation contractuelle.

| Marqueur | Signification |
| --- | --- |
| Besoin reconstruit | Besoin décrit dans les documents Step 2–7, à rapprocher du cahier original |
| Implémentation actuelle | Comportement confirmé par le code, le schéma ou les routes |
| Proposition | Choix de conception à faire confirmer par le client |

## 2. Rôles utilisateurs

| Rôle | Responsabilité principale | Limite structurante |
| --- | --- | --- |
| `DEMANDEUR` | Rechercher, créer et suivre ses demandes | Ne décide pas et ne remet pas |
| `VALIDATEUR` | Consulter toutes les demandes et approuver/refuser | Une approbation ne crée pas de sortie |
| `ARCHIVISTE` | Gérer stockage, documents, consultations, remises et retours | N'administre pas implicitement les identités |
| `ADMIN` | Gérer utilisateurs, rôles, permissions et audit | N'obtient aucun droit métier d'archiviste par défaut |

Un utilisateur peut cumuler plusieurs rôles. Les rôles et permissions sont relus depuis PostgreSQL à chaque opération protégée.

## 3. Matrice de permissions actuelle

| Capacité | ADMIN | ARCHIVISTE | VALIDATEUR | DEMANDEUR |
| --- | :---: | :---: | :---: | :---: |
| Utilisateurs : lire/créer/modifier/activer/rôles | ✓ |  |  |  |
| Rôles : lire/modifier | ✓ |  |  |  |
| Audit : lire | ✓ |  |  |  |
| Archives : lire |  | ✓ |  | ✓ |
| Archives : créer/modifier |  | ✓ |  |  |
| Boîtes et emplacements : gérer |  | ✓ |  |  |
| Demandes : créer/lire les siennes |  |  |  | ✓ |
| Demandes : lire toutes |  | ✓ | ✓ |  |
| Demandes : approuver/refuser |  |  | ✓ |  |
| Mouvements : remettre/retourner/lire |  | ✓ |  |  |
| Signatures : lire |  | ✓ |  |  |

Des codes de permission de préparation, confirmation de retour, consultation de validation et configuration existent aussi dans le référentiel. Les opérations exécutables utilisent actuellement `mouvements.handover`, `mouvements.return`, `mouvements.read` et les permissions spécialisées des services. La simplification éventuelle des codes doit être traitée comme une évolution RBAC, pas comme une suppression documentaire.

## 4. Exigences fonctionnelles consolidées

### Stockage et documents

- Créer et modifier des emplacements uniques `zone / rack / niveau`.
- Créer et modifier des boîtes à code unique, affectées à un emplacement.
- Créer et modifier des documents physiques à référence unique, affectés à une boîte.
- Rechercher et filtrer les documents côté serveur par métadonnées, statut et localisation.
- Masquer les documents confidentiels aux utilisateurs sans habilitation objet.
- Conserver l'historique par relations restrictives ; aucune suppression métier n'est exposée.

### Demandes et décisions

- Créer une demande sur un document précis et disponible.
- Exiger un motif de dix à mille caractères.
- Exiger une échéance future pour une sortie physique.
- Empêcher une seconde demande active du même demandeur sur le même document.
- Limiter un demandeur à ses propres demandes, sauf permission globale.
- Permettre une décision unique ; exiger un commentaire de refus.
- Ne jamais confondre approbation et remise physique.

### Remise, suivi et retour

- Limiter la remise aux demandes `SORTIE` approuvées et encore valides.
- Exiger une preuve manuscrite capturée avant la confirmation.
- Garantir un mouvement actif maximum par document.
- Afficher détention, dates, opérateurs, état et nombre de jours de retard.
- Refuser un retour sans mouvement actif ou avec référence incorrecte.
- Exiger une boîte pour un retour conforme et une observation pour toute exception.
- Préserver décision, mouvement, preuve et audit après clôture.

## 5. Cycles de vie

### Document

| État | Signification | Transitions actuelles |
| --- | --- | --- |
| `DISPONIBLE` | Physiquement rangé et éligible | vers `SORTI` lors d'une remise |
| `SORTI` | Mouvement actif | vers `DISPONIBLE` si retour conforme, sinon `INDISPONIBLE` |
| `INDISPONIBLE` | Perdu, endommagé ou non réintégré | aucun processus de rétablissement exposé |

### Demande

`EN_ATTENTE → APPROUVEE → EN_COURS → RETOURNEE`, avec une branche terminale `EN_ATTENTE → REFUSEE`.

L'approbation ne modifie pas le document. Pour une sortie, `EN_COURS` commence à la remise signée. Pour une consultation, il commence au démarrage sur site.

## 6. QR code

- Une étiquette identifie une boîte par URL interne `/boites/{uuid}`.
- Le QR n'encode ni titre, ni utilisateur, ni autorisation, ni contenu confidentiel.
- La page cible exige authentification et `archives.read`.
- Scanner un QR ne crée aucune demande, décision ou sortie.
- Le scanner propose la caméra après action explicite et une saisie manuelle de secours.
- La caméra réelle, HTTPS mobile et l'impression sur le matériel client restent à valider.

## 7. Signature et éléments de preuve

- Capture PNG par souris, tactile ou stylet, taille maximale 512 Ko.
- Une preuve est liée à un mouvement et un signataire uniques.
- PostgreSQL conserve clé opaque, MIME, taille, checksum SHA-256 et horodatage UTC.
- Le fichier est hors de `public` et lu via `/api/signatures/[id]` avec permission.
- Le checksum est vérifié à la lecture ; la ligne est immuable en base.
- Il s'agit d'un accusé manuscrit interne, sans revendication de signature avancée ou qualifiée.

## 8. Traçabilité et audit

- Les créations et mutations sensibles écrivent un `AuditLog` dans la même transaction.
- L'audit conserve acteur, action, cible, valeurs utiles et métadonnées nettoyées.
- Un déclencheur interdit modification et suppression des audits par le rôle applicatif.
- Les décisions et signatures sont également protégées contre la réécriture.
- Durées de conservation, gel légal, export et purge gouvernée restent à définir.

## 9. Gestion des exceptions

| Cas | Résultat attendu actuel |
| --- | --- |
| Utilisateur inactif ou session périmée | Accès refusé immédiatement |
| Document confidentiel non autorisé | Absence des résultats et détail non révélé |
| Demande/validation/remise concurrente | Une seule opération aboutit |
| Demande refusée | Remise impossible |
| Signature invalide | Aucune transition persistée et fichier préparé supprimé |
| Retour répété | Conflit sans modification d'historique |
| Retour non conforme | Document `INDISPONIBLE`, observation obligatoire |
| Erreur inattendue | Message générique, sans fuite du détail interne |

## 10. Critères de validation fonctionnelle

Le MVP local est acceptable pour démonstration lorsque :

1. les quatre rôles ne voient et n'exécutent que leurs opérations autorisées ;
2. un document suit le cycle complet création → demande → décision → remise signée → retour ;
3. un refus ne produit jamais de mouvement ;
4. une approbation seule laisse le document disponible ;
5. une signature privée et son intégrité peuvent être vérifiées par un acteur autorisé ;
6. le détenteur et le retard sont visibles pendant la sortie ;
7. le retour conforme restaure la disponibilité et conserve l'historique ;
8. les opérations non autorisées, doublons et conflits sont rejetés ;
9. les scénarios manuels matériels sont exécutés sur le poste client ;
10. le client signe les décisions ouvertes de gouvernance et d'exploitation.

Ces critères n'autorisent pas la production. Sauvegarde/restauration, supervision, stockage objet, reprise après sinistre, test de pénétration et infrastructure HTTPS restent hors du MVP local.
