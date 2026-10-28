# Matrice de traçabilité de livraison

## Règles de lecture

Le cahier des charges original n'est pas disponible dans le dépôt. Les identifiants et libellés ci-dessous reprennent la matrice existante et les documents Step 2–7 ; ils sont **reconstruits** et doivent être confrontés aux références contractuelles du client.

Statuts : `VERIFIED` = implémenté et preuve exécutée ; `MANUAL` = implémenté mais validation humaine/matérielle restante ; `PARTIAL` = besoin partiellement couvert ; `NOT_IMPLEMENTED` = absent ; `BLOCKED` = décision ou infrastructure externe requise.

Les preuves `workflow`, `security`, `search/dashboard`, `UI`, `seed` et `E2E` renvoient respectivement aux suites dans `tests/workflow.integration.test.ts`, `tests/security.*`, `tests/search-dashboard.integration.test.ts`, `tests/ui-states.test.tsx`, `tests/demo-seed.unit.test.ts` et `tests/e2e/*.spec.ts`.

## Exigences métier principales

| Réf. | Besoin reconstruit | Processus | Module / route | Preuve | Statut | Écart ou manque |
| --- | --- | --- | --- | --- | --- | --- |
| STO-01 | Emplacement unique zone/rack/niveau, création, modification, recherche | 1 | `modules/emplacements`, `/emplacements` | workflow 3, E2E client | `VERIFIED` | Aucun écart MVP identifié |
| STO-02 | Boîte unique affectée à un emplacement | 1 | `modules/boites`, `/boites`, `/boites/[id]` | workflow 2, E2E client | `VERIFIED` | Capacité maximale non gérée |
| DOC-01 | Document physique à référence unique dans une boîte | 1 | `modules/archives`, `/documents`, `/documents/[id]` | workflow 1, E2E client | `VERIFIED` | Nomenclature de classification à valider |
| DOC-02 | Recherche multicritère et localisation | 2 | `modules/archives`, `/documents` | search/dashboard 1–3, E2E | `VERIFIED` | Benchmark volume client restant |
| DOC-03 | Confidentialité au niveau objet | 2 | service archives, détail, boîte, dashboard | workflow 5, search/dashboard 4 et 7 | `VERIFIED` | Habilitation binaire fondée sur `archives.update` |
| QR-01 | QR stable et imprimable, sans donnée confidentielle | 1 | `modules/boites/qr`, `/boites/[id]` | E2E rendu et impression | `VERIFIED` | Impression physique client non testée |
| QR-02 | Scan caméra et saisie manuelle | 2 | `components/qr-scanner`, `/qr-scanner` | chargement E2E | `MANUAL` | Caméra, permission, HTTPS mobile à tester |
| QR-03 | QR d'identification sans autorisation de retrait | 2 | service boîte + RBAC | workflow 4, E2E refus | `VERIFIED` | Aucun écart MVP identifié |
| REQ-01 | Demande motivée sur document précis ; échéance pour sortie | 2 | `modules/demandes`, `/demandes`, détail document | workflow 6–7, E2E | `VERIFIED` | Aucun écart MVP identifié |
| REQ-02 | Suivi de ses demandes et décisions | 2 | service demandes, `/demandes` | security propriété, E2E | `VERIFIED` | Aucun écart MVP identifié |
| REQ-03 | Empêcher les demandes actives dupliquées | 2 | transaction demandes | workflow 21 | `VERIFIED` | Aucun écart MVP identifié |
| CON-01 | Consultation sur site démarrée/clôturée et auditée | 2–6 | service/actions demandes, `/demandes` | inspection + agrégation test | `MANUAL` | Pas de scénario direct complet ; preuve/témoin/durée à décider |
| VAL-01 | Seul un validateur autorisé décide | 3 | `modules/validations`, `/validations` | security + E2E refus demandeur | `VERIFIED` | Périmètre organisationnel du validateur non défini |
| VAL-02 | Motif de refus et identité/date/commentaire | 3 | schéma validation + modèle `Validation` | security unit, E2E refus | `VERIFIED` | Aucun écart MVP identifié |
| VAL-03 | Décision unique, y compris en concurrence | 3 | transaction validation + contrainte unique | security concurrence | `VERIFIED` | Aucun écart MVP identifié |
| VAL-04 | Approbation distincte de la remise | 3 | validation/mouvement, `/validations`, `/mouvements/sorties` | workflow + requête E2E avant remise | `VERIFIED` | Aucun écart MVP identifié |
| HAN-01 | Remise seulement si sortie approuvée et document disponible | 4 | `modules/mouvements`, `/mouvements/sorties` | workflow 8, 9, 20, 22 | `VERIFIED` | Aucun écart MVP identifié |
| HAN-02 | Accusé manuscrit souris/tactile/stylet | 4 | formulaire remise + `signature_pad` | deux scénarios E2E | `VERIFIED` | Matériel tactile client et valeur juridique à valider |
| HAN-03 | Preuve liée au mouvement, signataire et horodatage | 4 | `Signature`, API privée | workflow 11, 16, 18 ; E2E 200/401/404 | `VERIFIED` | Stockage objet de production absent |
| HAN-04 | Une seule remise active par document | 4 | transaction + index PostgreSQL partiel | workflow 10 | `VERIFIED` | Aucun écart MVP identifié |
| TRK-01 | Détenteur, dates, statut et retard | 5 | service/dashboard mouvements, `/mouvements` | workflow 13, search/dashboard 5–6, E2E | `VERIFIED` | Aucun rappel automatique |
| TRK-02 | Filtres actifs/retards/retournés/référence/détenteur/dates | 5 | service mouvements, `/mouvements` | inspection + E2E états | `VERIFIED` | Aucun export de rapport |
| RET-01 | Retour avec référence, état, observations et boîte | 6 | service retour, `/mouvements/retours` | workflow 14, E2E | `VERIFIED` | Procédure dommages/pertes à confirmer |
| RET-02 | Refus retour sans mouvement ou double retour | 6 | transaction retour | workflow 15 et 23 | `VERIFIED` | Aucun écart MVP identifié |
| RET-03 | Disponibilité seulement après retour conforme | 6 | transaction document/demande/mouvement | workflow 14, E2E état final | `VERIFIED` | Aucun écart MVP identifié |
| HIS-01 | Historique décision/mouvement/preuve après retour | 5–6 | relations `RESTRICT`, vues détail/mouvements/validations | workflow 16–17, E2E historique | `VERIFIED` | Politique de conservation absente |
| AUD-01 | Audit des opérations métier et administratives | Tous | `modules/audit`, `/administration/audit` | security immutabilité, workflow 17, E2E | `VERIFIED` | Export et corrélation globale absents |

## Sécurité, administration et expérience

| Réf. | Besoin reconstruit | Module / route | Preuve | Statut | Écart ou manque |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Connexion/déconnexion, session sécurisée, aucune inscription publique | Auth.js, `/login` | security unit/integration, E2E anonyme | `VERIFIED` | MFA/SSO/récupération autonome absents |
| SEC-02 | RBAC serveur pages/actions/fichiers | DAL, services, API signature | security + E2E multi-rôles | `VERIFIED` | Test de pénétration externe absent |
| SEC-03 | Révocation immédiate d'un compte inactif | session version + `actif` | security + workflow 24 | `VERIFIED` | Aucun écart MVP identifié |
| SEC-04 | Signatures non publiques et intègres | stockage privé, API, checksum | E2E 200/401/404 + workflow | `VERIFIED` | Chiffrement/sauvegarde/stockage objet absents |
| ADM-01 | Utilisateurs, rôles, activation, mot de passe et dernier admin | modules users/roles, administration | security + E2E pages | `VERIFIED` | Gouvernance d'identité de production à définir |
| UI-01 | Interface française, responsive et accessible | layout/composants/pages | E2E mobile + axe, UI unit | `PARTIAL` | Lecteur d'écran, clavier complet et zoom 400 % manuels |
| UI-02 | Chargements, erreurs, confirmations et états vides | boundaries + composants | UI unit + E2E | `VERIFIED` | Quelques erreurs secondaires remontent à la boundary |
| DEMO-01 | Jeu synthétique sûr, idempotent, sans secret versionné | `prisma/demo-seed.ts` | seed unit + vérificateur | `VERIFIED` | Le snapshot évolue après usage interactif |

## Production et évolutions

| Réf. | Besoin / évolution | Statut | Manque actuel |
| --- | --- | --- | --- |
| OPT-01 | Notifications et escalades | `NOT_IMPLEMENTED` | Règles, canaux, délais et destinataires à définir |
| OPT-02 | Signature avancée ou qualifiée | `PARTIAL` | Accusé interne présent ; portée juridique non validée |
| OPT-03 | Habilitations par service/fonds/dossier/personne | `PARTIAL` | Modèle actuel confidentiel/non confidentiel |
| OPT-04 | Récolement, capacité, transfert et destruction | `NOT_IMPLEMENTED` | Gouvernance et durées de conservation absentes |
| OPS-01 | Déploiement, sauvegarde, supervision, PRA | `BLOCKED` | Step 6 reporté et décisions d'infrastructure absentes |
| OPS-02 | Stockage objet privé, chiffré et versionné | `BLOCKED` | Stockage fichier local mono-instance uniquement |
| OPS-03 | Charge, SLA et multi-navigateurs | `BLOCKED` | Volumes, matériel et objectifs client non fournis |

## Synthèse

Les six étapes du cycle de sortie physique sont couvertes et automatisées localement. Les validations matérielles, la consultation sur site complète, l'accessibilité manuelle, la gouvernance documentaire et tout le dispositif de production restent explicitement ouverts. Aucun statut de cette matrice ne doit être interprété comme une acceptation contractuelle sans rapprochement avec le cahier des charges original.
