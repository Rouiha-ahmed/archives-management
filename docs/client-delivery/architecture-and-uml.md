# Architecture et diagrammes

Les diagrammes Mermaid ci-dessous décrivent l'implémentation auditée. Les diagrammes dits « UML » sont des vues de communication ; aucun fichier XMI ni contrôle de conformité UML formelle n'est revendiqué.

## 1. Cas d'usage

```mermaid
flowchart LR
  D[Demandeur] --> U1((Rechercher un document))
  D --> U2((Créer et suivre une demande))
  V[Validateur] --> U3((Approuver ou refuser))
  A[Archiviste] --> U4((Gérer emplacements et boîtes))
  A --> U5((Enregistrer les documents))
  A --> U6((Imprimer / scanner le QR))
  A --> U7((Confirmer une remise signée))
  A --> U8((Suivre prêts et retards))
  A --> U9((Confirmer le retour))
  X[Administrateur] --> U10((Gérer utilisateurs et rôles))
  X --> U11((Consulter l'audit))
  U2 --> U3
  U3 --> U7
  U7 --> U8 --> U9
```

## 2. États du document

```mermaid
stateDiagram-v2
  [*] --> DISPONIBLE: enregistrement
  DISPONIBLE --> SORTI: remise signée confirmée
  SORTI --> DISPONIBLE: retour BON et réintégré
  SORTI --> INDISPONIBLE: ENDOMMAGE / PERDU / NON_REINTEGRE
  INDISPONIBLE --> [*]: aucun rétablissement exposé dans le MVP
```

## 3. États de la demande

```mermaid
stateDiagram-v2
  [*] --> EN_ATTENTE: création
  EN_ATTENTE --> APPROUVEE: approbation
  EN_ATTENTE --> REFUSEE: refus motivé
  APPROUVEE --> EN_COURS: remise signée ou début consultation
  EN_COURS --> RETOURNEE: retour confirmé ou fin consultation
  REFUSEE --> [*]
  RETOURNEE --> [*]
```

## 4. Séquence d'une sortie approuvée

```mermaid
sequenceDiagram
  actor Demandeur
  actor Validateur
  actor Archiviste
  participant Next as Next.js / Server Actions
  participant Service as Services métier
  participant DB as PostgreSQL via Prisma
  participant FS as Stockage privé

  Demandeur->>Next: créer demande SORTIE
  Next->>Service: createAccessRequest(actor, données)
  Service->>DB: demande EN_ATTENTE + audit (transaction)
  Validateur->>Next: approuver
  Next->>Service: decideAccessRequest(actor, APPROUVEE)
  Service->>DB: validation + demande APPROUVEE + audit
  Note over DB: aucun mouvement créé à l'approbation
  Archiviste->>Next: confirmer remise + PNG
  Next->>FS: préparer preuve privée
  Next->>Service: confirmHandover(actor, demande, preuve)
  Service->>DB: vérifier RBAC, états, échéance et concurrence
  Service->>DB: document SORTI + demande EN_COURS + mouvement + signature + audit
  alt échec transactionnel
    Service-->>Next: conflit / validation
    Next->>FS: supprimer la preuve préparée
  else succès
    Service-->>Next: mouvement confirmé
  end
```

## 5. Modèle entité-relation réel

```mermaid
erDiagram
  EMPLACEMENT ||--o{ BOITE : contient
  BOITE ||--o{ DOCUMENT : contient
  DOCUMENT ||--o{ DEMANDE_ACCES : concerne
  UTILISATEUR ||--o{ DEMANDE_ACCES : demande
  DEMANDE_ACCES ||--o| VALIDATION : recoit
  UTILISATEUR ||--o{ VALIDATION : decide
  DEMANDE_ACCES ||--o| MOUVEMENT : autorise
  DOCUMENT ||--o{ MOUVEMENT : circule
  UTILISATEUR ||--o{ MOUVEMENT : detient
  MOUVEMENT ||--o| SIGNATURE : prouve
  UTILISATEUR ||--o{ SIGNATURE : signe
  UTILISATEUR ||--o{ USER_ROLE : possede
  ROLE ||--o{ USER_ROLE : attribue
  ROLE ||--o{ ROLE_PERMISSION : compose
  PERMISSION ||--o{ ROLE_PERMISSION : accorde
  UTILISATEUR ||--o{ AUDIT_LOG : agit

  EMPLACEMENT {
    uuid id PK
    string zone
    string rack
    string niveau
  }
  BOITE {
    uuid id PK
    string code UK
    uuid emplacement_id FK
  }
  DOCUMENT {
    uuid id PK
    string reference UK
    string titre
    boolean confidentiel
    enum statut
    uuid boite_id FK
  }
  DEMANDE_ACCES {
    uuid id PK
    enum type
    enum statut
    uuid document_id FK
    uuid demandeur_id FK
    timestamptz retour_prevu
  }
  VALIDATION {
    uuid id PK
    uuid demande_id FK,UK
    uuid validateur_id FK
    enum decision
  }
  MOUVEMENT {
    uuid id PK
    uuid demande_id FK,UK
    uuid document_id FK
    uuid utilisateur_id FK
    timestamptz date_sortie
    timestamptz date_retour
  }
  SIGNATURE {
    uuid id PK
    uuid mouvement_id FK,UK
    uuid signataire_id FK
    string storage_key UK
    string checksum
  }
  UTILISATEUR {
    uuid id PK
    string email UK
    boolean actif
    int session_version
  }
  ROLE {
    uuid id PK
    string code UK
  }
  PERMISSION {
    uuid id PK
    string code UK
  }
  USER_ROLE {
    uuid utilisateur_id FK
    uuid role_id FK
  }
  ROLE_PERMISSION {
    uuid role_id FK
    uuid permission_id FK
  }
  AUDIT_LOG {
    uuid id PK
    uuid actor_id FK
    string action
    string entity_type
    json old_values
    json new_values
  }
```

`LoginAttempt` complète ce modèle pour le contrôle persistant des échecs de connexion. Les relations de consultation sur site relient également une demande à son opérateur archiviste.

## 6. Architecture technique

```mermaid
flowchart TB
  Browser[Navigateur desktop/mobile] --> App[Next.js 16 App Router]
  App --> Auth[Auth.js 5 Credentials et session JWE]
  App --> SC[Server Components]
  App --> SA[Server Actions]
  App --> API[Route privée /api/signatures/id]
  SC --> DAL[DAL utilisateur actif / permissions]
  SA --> DAL
  API --> DAL
  DAL --> Services[Services métier server-only]
  Services --> Prisma[Prisma Client 7.10.1 + adapter-pg]
  Prisma --> PG[(PostgreSQL 17/18)]
  Services --> Files[Stockage fichier privé des signatures]
  App --> QR[QR génération + scanner ZXing]
  Tests[Vitest + Playwright + axe] --> App
  Tests --> TestDB[(PostgreSQL archives_test)]
```

## 7. Propriétés d'architecture vérifiées

- Les lectures sont principalement des Server Components ; les interactions nécessaires utilisent des composants clients.
- Les Server Actions restent minces et délèguent aux services métier.
- L'autorisation est répétée au plus près des données ; la visibilité d'un bouton n'accorde aucun droit.
- Les décisions, remises et retours utilisent des transactions sérialisables avec nouvelle tentative.
- PostgreSQL garantit unicité, cohérence demande/document, mouvement actif unique et immutabilité audit/signature.
- Les signatures sont hors de `public`, avec clé opaque et contrôle d'intégrité.
- Le stockage fichier et PostgreSQL locaux conviennent à la démonstration mono-instance, pas à une architecture de production distribuée.
