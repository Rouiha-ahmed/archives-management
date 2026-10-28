# Matrice de traçabilité des exigences

## Objet et règles de lecture

Cette matrice relie les exigences métier exprimées dans les étapes 2 à 5 et dans le scénario de recette Step 7 aux fonctions réellement présentes. Elle distingue le socle demandé des améliorations optionnelles. Elle ne constitue ni une certification ISO 15489, ni une homologation de sécurité.

Statuts utilisés :

- `IMPLEMENTED_AND_VERIFIED` : implémentation inspectée et contrôle automatisé ou recette locale exécuté avec succès.
- `IMPLEMENTED_NOT_VERIFIED` : fonction présente, mais vérification matérielle ou métier non réalisée.
- `PARTIALLY_IMPLEMENTED` : une partie significative reste à décider ou réaliser.
- `NOT_IMPLEMENTED` : exigence absente.
- `BLOCKED` : dépendance externe ou décision client indispensable.

## Exigences métier principales

| ID | Exigence originale | Processus | Fonction implémentée | Page | Vérification | Résultat | Écart restant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| STO-01 | Créer, lister, modifier et rechercher un emplacement unique zone/rack/niveau | 1. Enregistrement | Services transactionnels, contrainte unique et formulaires | `/emplacements` | Vitest workflow 2–3; Playwright recette client | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| STO-02 | Créer une boîte, l'affecter à un emplacement et modifier ses métadonnées | 1. Enregistrement | CRUD contrôlé et navigation emplacement → boîte | `/boites`, `/boites/[id]` | Vitest workflow 2; Playwright B-024 | `IMPLEMENTED_AND_VERIFIED` | Pas de gestion de capacité maximale |
| DOC-01 | Enregistrer un document physique dans une boîte avec référence unique | 1. Enregistrement | Création, modification autorisée et contrainte unique | `/documents`, `/documents/[id]` | Vitest workflow 1; Playwright DOC-001/002/003 | `IMPLEMENTED_AND_VERIFIED` | Taxonomie de classification à valider |
| DOC-02 | Rechercher par référence, titre, description, statut et localisation | 2. Recherche | Recherche serveur combinable, tri, URL et pagination | `/documents` | Vitest recherche/filtres/pagination; Playwright DOC-002 | `IMPLEMENTED_AND_VERIFIED` | Benchmark à refaire sur volume client |
| DOC-03 | Protéger les documents confidentiels au niveau objet | 2. Recherche | Filtrage avant requête et détail non révélateur | `/documents`, `/documents/[id]` | Vitest confidentialité recherche/détail | `IMPLEMENTED_AND_VERIFIED` | Habilitation actuelle fondée sur `archives.update`, à affiner si nécessaire |
| QR-01 | Générer une étiquette QR stable, imprimable, sans contenu confidentiel | 1. Enregistrement | QR serveur vers `/boites/{uuid}`, code et emplacement imprimables | `/boites/[id]` | Playwright rendu QR et média impression | `IMPLEMENTED_AND_VERIFIED` | Impression physique sur l'imprimante client non testée |
| QR-02 | Scanner par caméra avec saisie manuelle de secours | 2. Recherche | Scanner chargé dynamiquement, permission à l'action, résolution serveur du code | `/qr-scanner` | Page et contrôles chargés par Playwright | `IMPLEMENTED_NOT_VERIFIED` | Caméra mobile réelle et HTTPS non testés localement |
| QR-03 | Un QR identifie une boîte sans accorder un retrait | 2. Recherche | Page cible authentifiée et RBAC serveur indépendant | `/boites/[id]` | Vitest accès QR refusé; Playwright validateur redirigé | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| REQ-01 | Créer une demande pour un document précis avec motif et date de retour | 2. Demande | Validation Zod, disponibilité, propriété et audit | `/demandes`, `/documents/[id]` | Vitest demandes valides/invalides; Playwright recette | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| REQ-02 | Voir ses demandes, leurs statuts et décisions | 2. Demande | Vue personnelle ou globale selon permission | `/demandes` | Vitest propriété; Playwright attente/décision | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| REQ-03 | Empêcher les demandes actives dupliquées, y compris en concurrence | 2. Demande | Transaction sérialisable et contrôle de demande active | `/demandes` | Vitest workflow 21, concurrence exécutée | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| VAL-01 | Autoriser uniquement le validateur à approuver ou refuser | 3. Décision | Permissions séparées et contrôlées dans le service | `/validations` | Vitest sécurité; Playwright refus demandeur | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| VAL-02 | Exiger un motif de refus et conserver l'identité/date/commentaire | 3. Décision | Schéma Zod, contrainte SQL et entité `Validation` | `/validations` | Vitest motif; Playwright refus DOC-003 | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| VAL-03 | Empêcher une décision répétée ou concurrente | 3. Décision | Mise à jour conditionnelle, transaction sérialisable, validation unique | `/validations` | Vitest décisions dupliquées/concurrentes | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| VAL-04 | Une approbation ne doit pas créer automatiquement de mouvement | 3. Décision | États `APPROUVEE` et `EN_COURS` séparés | `/validations`, `/mouvements/sorties` | Vitest et requête DB Playwright avant remise | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| HAN-01 | Remettre uniquement une demande approuvée pour un document disponible | 4. Remise | Vérifications transactionnelles demande/document/opérateur/date | `/mouvements/sorties` | Vitest workflow 8, 9, 20, 22 | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| HAN-02 | Capturer un accusé manuscrit à la souris, au stylet ou au tactile | 4. Remise | Canvas PNG avec effacement et confirmation | `/mouvements/sorties` | Deux scénarios Playwright avec dessin de signature | `IMPLEMENTED_AND_VERIFIED` | Valeur juridique à confirmer; non qualifiée |
| HAN-03 | Associer la preuve au mouvement, au signataire et à l'horodatage | 4. Remise | `Signature`, checksum, taille, MIME et contrainte d'immutabilité | Route `/api/signatures/[id]` | Vitest historique/rollback; Playwright DB et lecture autorisée | `IMPLEMENTED_AND_VERIFIED` | Stockage objet de production hors périmètre |
| HAN-04 | Interdire deux remises actives pour un document | 4. Remise | Index partiel unique, statut et transaction sérialisable | `/mouvements/sorties` | Vitest double remise concurrente | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| TRK-01 | Afficher détenteur, sortie, retour prévu, statut et retard | 5. Suivi | Historique filtrable et calcul UTC des jours de retard | `/mouvements` | Vitest retard/dashboard; Playwright suivi DOC-002 | `IMPLEMENTED_AND_VERIFIED` | Notifications automatiques non demandées dans le MVP |
| TRK-02 | Filtrer actifs, retards, retournés, référence, détenteur et dates | 5. Suivi | Filtres serveur et pagination | `/mouvements` | Inspection, Vitest services et Playwright état actif/retourné | `IMPLEMENTED_AND_VERIFIED` | Pas d'export de rapport |
| RET-01 | Confirmer le retour d'un mouvement actif avec référence et état physique | 6. Retour | Vérification de référence, état, observations et boîte | `/mouvements/retours` | Vitest retour atomique; Playwright DOC-002 | `IMPLEMENTED_AND_VERIFIED` | Règle de traitement des documents endommagés à confirmer |
| RET-02 | Refuser retour sans mouvement et double retour | 6. Retour | Contrôle du mouvement ouvert et mise à jour conditionnelle | `/mouvements/retours` | Vitest workflow 15 et 23 | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| RET-03 | Rendre le document disponible seulement après confirmation conforme | 6. Retour | Transition atomique document/demande/mouvement | `/mouvements/retours` | Vitest et Playwright état final | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| HIS-01 | Conserver mouvements, décisions, preuve et historique après retour | 5–6. Suivi/retour | Relations `RESTRICT`, absence de suppression UI, tables historiques | Détails document, `/mouvements`, `/validations` | Vitest workflow 16–17; Playwright historique final | `IMPLEMENTED_AND_VERIFIED` | Politique de conservation formelle à décider |
| AUD-01 | Auditer créations, décisions, remises, retours et administration | Tous | Journal structuré append-only avec acteur et valeurs | `/administration/audit` | Vitest atomicité/immutabilité; Playwright 2 audits mouvement | `IMPLEMENTED_AND_VERIFIED` | Corrélation métier globale et export non implémentés |

## Exigences de sécurité et d'usage

| ID | Exigence | Fonction/page | Vérification | Résultat | Écart restant |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Authentification, déconnexion, session sécurisée, aucune inscription publique | Auth.js, `/login` | Vitest authentification; Playwright redirection anonyme | `IMPLEMENTED_AND_VERIFIED` | MFA non prévu dans ce MVP |
| SEC-02 | RBAC serveur pour pages, actions et fichiers | DAL, services, actions et route signature | Vitest permissions; Playwright demandeur/validateur | `IMPLEMENTED_AND_VERIFIED` | Revue de pénétration externe non réalisée |
| SEC-03 | Révocation immédiate d'un utilisateur inactif | Session version et `actif` dans les contrôles | Vitest sécurité et workflow 24 | `IMPLEMENTED_AND_VERIFIED` | Aucun écart MVP identifié |
| SEC-04 | Preuves de signature non publiques | Stockage hors `public`, route privée, checksum | Playwright 200/401/404 et URL publique 404 | `IMPLEMENTED_AND_VERIFIED` | Chiffrement et sauvegarde de production hors périmètre |
| UI-01 | Interface française, responsive, accessible et avec retours d'erreur | Layout, composants partagés, pages métier | Playwright mobile + axe; revue des pages principales | `PARTIALLY_IMPLEMENTED` | Audit manuel lecteur d'écran, zoom 400 % et matériel client restant |
| UI-02 | Chargements, erreurs, confirmations et actions désactivées | Boundaries App Router, dialogues et `useActionState` | Vitest états UI; Playwright décisions/remise/retour | `IMPLEMENTED_AND_VERIFIED` | Les formulaires d'édition secondaires utilisent encore l'erreur de route en cas d'échec inattendu |
| DEMO-01 | Jeu de démonstration synthétique, idempotent, sans mot de passe versionné | `prisma/demo-seed.ts`, `db:seed:demo` | Deux exécutions sur `archives_test`, comptes/objets sans doublon | `IMPLEMENTED_AND_VERIFIED` | Le script refuse les collisions avec des références non marquées démo |

## Améliorations optionnelles et production

| ID | Amélioration | Statut | Motif / prochaine décision |
| --- | --- | --- | --- |
| OPT-01 | Notifications courriel et escalades de retard | `NOT_IMPLEMENTED` | Canaux, délais, destinataires et modèles à définir avec le client |
| OPT-02 | Signature électronique avancée ou qualifiée | `PARTIALLY_IMPLEMENTED` | L'accusé manuscrit interne est tracé; la valeur juridique et le prestataire restent à décider |
| OPT-03 | Habilitations fines par service, fonds ou dossier | `PARTIALLY_IMPLEMENTED` | Le niveau objet actuel distingue confidentiel/non confidentiel |
| OPT-04 | Récolement, capacité des boîtes et transfert/destruction | `NOT_IMPLEMENTED` | Règles de gestion et durées de conservation manquantes |
| OPS-01 | Déploiement, sauvegardes, supervision et reprise après sinistre | `BLOCKED` | Volontairement hors Step 7; à traiter après décisions d'infrastructure |
| OPS-02 | Stockage objet privé versionné des signatures | `BLOCKED` | Le stockage fichier local convient uniquement à la démonstration mono-instance |

## Conclusion de couverture

Les six processus métier principaux sont `IMPLEMENTED_AND_VERIFIED` dans l'environnement local. La caméra réelle, l'impression physique et les contrôles d'accessibilité manuels restent à exécuter sur le matériel du client. Les éléments de production et les améliorations optionnelles ne sont pas comptés comme couverture complète du MVP local.
