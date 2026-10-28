export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  USERS_ACTIVATE: "users.activate",
  ROLES_READ: "roles.read",
  ROLES_UPDATE: "roles.update",
  ARCHIVES_READ: "archives.read",
  ARCHIVES_CREATE: "archives.create",
  ARCHIVES_UPDATE: "archives.update",
  BOITES_MANAGE: "boites.manage",
  EMPLACEMENTS_MANAGE: "emplacements.manage",
  DEMANDES_CREATE: "demandes.create",
  DEMANDES_READ_OWN: "demandes.read_own",
  DEMANDES_READ_ALL: "demandes.read_all",
  DEMANDES_APPROVE: "demandes.approve",
  DEMANDES_REJECT: "demandes.reject",
  VALIDATIONS_READ: "validations.read",
  MOUVEMENTS_PREPARE: "mouvements.prepare",
  MOUVEMENTS_CONFIRM_RETURN: "mouvements.confirm_return",
  MOUVEMENTS_HANDOVER: "mouvements.handover",
  MOUVEMENTS_RETURN: "mouvements.return",
  MOUVEMENTS_READ: "mouvements.read",
  SIGNATURES_READ: "signatures.read",
  AUDIT_READ: "audit.read",
  CONFIGURATION_MANAGE: "configuration.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  ADMIN: "ADMIN",
  ARCHIVISTE: "ARCHIVISTE",
  VALIDATEUR: "VALIDATEUR",
  DEMANDEUR: "DEMANDEUR",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSION_DEFINITIONS: ReadonlyArray<{
  code: PermissionCode;
  description: string;
}> = [
  { code: PERMISSIONS.USERS_READ, description: "Consulter les utilisateurs" },
  { code: PERMISSIONS.USERS_CREATE, description: "Créer des utilisateurs" },
  { code: PERMISSIONS.USERS_UPDATE, description: "Modifier les utilisateurs" },
  { code: PERMISSIONS.USERS_ASSIGN_ROLES, description: "Attribuer et retirer des rôles" },
  { code: PERMISSIONS.USERS_ACTIVATE, description: "Activer et désactiver des comptes" },
  { code: PERMISSIONS.ROLES_READ, description: "Consulter les rôles et permissions" },
  { code: PERMISSIONS.ROLES_UPDATE, description: "Modifier les permissions des rôles" },
  { code: PERMISSIONS.ARCHIVES_READ, description: "Consulter les archives autorisées" },
  { code: PERMISSIONS.ARCHIVES_CREATE, description: "Créer des emplacements, boîtes et documents" },
  { code: PERMISSIONS.ARCHIVES_UPDATE, description: "Modifier les archives" },
  { code: PERMISSIONS.BOITES_MANAGE, description: "Gérer les boîtes d'archives" },
  { code: PERMISSIONS.EMPLACEMENTS_MANAGE, description: "Gérer les emplacements" },
  { code: PERMISSIONS.DEMANDES_CREATE, description: "Créer une demande d'accès" },
  { code: PERMISSIONS.DEMANDES_READ_OWN, description: "Consulter ses propres demandes" },
  { code: PERMISSIONS.DEMANDES_READ_ALL, description: "Consulter toutes les demandes" },
  { code: PERMISSIONS.DEMANDES_APPROVE, description: "Approuver une demande" },
  { code: PERMISSIONS.DEMANDES_REJECT, description: "Refuser une demande" },
  { code: PERMISSIONS.VALIDATIONS_READ, description: "Consulter l'historique des validations" },
  { code: PERMISSIONS.MOUVEMENTS_PREPARE, description: "Préparer une remise physique" },
  { code: PERMISSIONS.MOUVEMENTS_CONFIRM_RETURN, description: "Confirmer un retour" },
  { code: PERMISSIONS.MOUVEMENTS_HANDOVER, description: "Confirmer une remise physique" },
  { code: PERMISSIONS.MOUVEMENTS_RETURN, description: "Enregistrer un retour physique" },
  { code: PERMISSIONS.MOUVEMENTS_READ, description: "Consulter l'historique des mouvements" },
  { code: PERMISSIONS.SIGNATURES_READ, description: "Consulter les accusés de remise signés" },
  { code: PERMISSIONS.AUDIT_READ, description: "Consulter le journal d'audit" },
  { code: PERMISSIONS.CONFIGURATION_MANAGE, description: "Gérer la configuration applicative" },
];

export const ROLE_DEFINITIONS: ReadonlyArray<{
  code: RoleCode;
  nom: string;
  description: string;
  permissions: readonly PermissionCode[];
}> = [
  {
    code: ROLES.ADMIN,
    nom: "Administrateur",
    description: "Administration des identités, des accès et de la sécurité.",
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_ASSIGN_ROLES,
      PERMISSIONS.USERS_ACTIVATE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.CONFIGURATION_MANAGE,
    ],
  },
  {
    code: ROLES.ARCHIVISTE,
    nom: "Archiviste",
    description: "Gestion des archives physiques et de leur circulation.",
    permissions: [
      PERMISSIONS.ARCHIVES_READ,
      PERMISSIONS.ARCHIVES_CREATE,
      PERMISSIONS.ARCHIVES_UPDATE,
      PERMISSIONS.BOITES_MANAGE,
      PERMISSIONS.EMPLACEMENTS_MANAGE,
      PERMISSIONS.DEMANDES_READ_ALL,
      PERMISSIONS.MOUVEMENTS_PREPARE,
      PERMISSIONS.MOUVEMENTS_CONFIRM_RETURN,
      PERMISSIONS.MOUVEMENTS_HANDOVER,
      PERMISSIONS.MOUVEMENTS_RETURN,
      PERMISSIONS.MOUVEMENTS_READ,
      PERMISSIONS.SIGNATURES_READ,
    ],
  },
  {
    code: ROLES.VALIDATEUR,
    nom: "Validateur",
    description: "Décision sur les demandes d'accès aux documents.",
    permissions: [
      PERMISSIONS.DEMANDES_READ_ALL,
      PERMISSIONS.DEMANDES_APPROVE,
      PERMISSIONS.DEMANDES_REJECT,
      PERMISSIONS.VALIDATIONS_READ,
    ],
  },
  {
    code: ROLES.DEMANDEUR,
    nom: "Demandeur",
    description: "Recherche et demandes d'accès à ses documents autorisés.",
    permissions: [
      PERMISSIONS.ARCHIVES_READ,
      PERMISSIONS.DEMANDES_CREATE,
      PERMISSIONS.DEMANDES_READ_OWN,
    ],
  },
];

export const CRITICAL_ADMIN_PERMISSIONS = new Set<PermissionCode>([
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_ASSIGN_ROLES,
  PERMISSIONS.USERS_ACTIVATE,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.ROLES_UPDATE,
]);
