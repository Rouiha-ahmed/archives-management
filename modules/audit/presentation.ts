export type AuditActionTone = "info" | "success" | "warning" | "danger" | "neutral";

export type AuditActionDefinition = {
  label: string;
  category: "Archives" | "Demandes" | "Mouvements" | "Utilisateurs" | "Rôles" | "Système";
  tone: AuditActionTone;
  verb: string;
};

export const AUDIT_ACTION_DEFINITIONS: Readonly<Record<string, AuditActionDefinition>> = {
  "access_request.created": {
    label: "Demande d'accès créée",
    category: "Demandes",
    tone: "info",
    verb: "a créé une demande d'accès",
  },
  "access_request.approved": {
    label: "Demande d'accès approuvée",
    category: "Demandes",
    tone: "success",
    verb: "a approuvé une demande d'accès",
  },
  "access_request.rejected": {
    label: "Demande d'accès refusée",
    category: "Demandes",
    tone: "danger",
    verb: "a refusé une demande d'accès",
  },
  "consultation.started": {
    label: "Consultation sur site démarrée",
    category: "Demandes",
    tone: "info",
    verb: "a démarré une consultation sur site",
  },
  "consultation.completed": {
    label: "Consultation sur site clôturée",
    category: "Demandes",
    tone: "success",
    verb: "a clôturé une consultation sur site",
  },
  "movement.handover_confirmed": {
    label: "Remise du document confirmée",
    category: "Mouvements",
    tone: "warning",
    verb: "a confirmé la remise",
  },
  "movement.return_confirmed": {
    label: "Retour du document confirmé",
    category: "Mouvements",
    tone: "success",
    verb: "a confirmé le retour",
  },
  "document.created": {
    label: "Document enregistré",
    category: "Archives",
    tone: "success",
    verb: "a enregistré",
  },
  "document.updated": {
    label: "Document modifié",
    category: "Archives",
    tone: "info",
    verb: "a modifié",
  },
  "box.created": {
    label: "Boîte d'archives créée",
    category: "Archives",
    tone: "success",
    verb: "a créé",
  },
  "box.updated": {
    label: "Boîte d'archives modifiée",
    category: "Archives",
    tone: "info",
    verb: "a modifié",
  },
  "location.created": {
    label: "Emplacement créé",
    category: "Archives",
    tone: "success",
    verb: "a créé",
  },
  "location.updated": {
    label: "Emplacement modifié",
    category: "Archives",
    tone: "info",
    verb: "a modifié",
  },
  "user.bootstrap_admin": {
    label: "Administrateur initial créé",
    category: "Utilisateurs",
    tone: "warning",
    verb: "a initialisé",
  },
  "user.created": {
    label: "Utilisateur créé",
    category: "Utilisateurs",
    tone: "success",
    verb: "a créé",
  },
  "user.activated": {
    label: "Utilisateur activé",
    category: "Utilisateurs",
    tone: "success",
    verb: "a activé",
  },
  "user.deactivated": {
    label: "Utilisateur désactivé",
    category: "Utilisateurs",
    tone: "danger",
    verb: "a désactivé",
  },
  "user.role_assigned": {
    label: "Rôle attribué à un utilisateur",
    category: "Utilisateurs",
    tone: "info",
    verb: "a attribué un rôle à",
  },
  "user.role_removed": {
    label: "Rôle retiré à un utilisateur",
    category: "Utilisateurs",
    tone: "warning",
    verb: "a retiré un rôle à",
  },
  "user.password_reset": {
    label: "Mot de passe remplacé",
    category: "Utilisateurs",
    tone: "warning",
    verb: "a remplacé le mot de passe de",
  },
  "role.permission_assigned": {
    label: "Permission ajoutée à un rôle",
    category: "Rôles",
    tone: "info",
    verb: "a ajouté une permission à",
  },
  "role.permission_removed": {
    label: "Permission retirée d'un rôle",
    category: "Rôles",
    tone: "warning",
    verb: "a retiré une permission de",
  },
  "demo.dataset_seeded": {
    label: "Jeu de démonstration préparé",
    category: "Système",
    tone: "neutral",
    verb: "a préparé",
  },
};

export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_DEFINITIONS)
  .map(([value, definition]) => ({ value, ...definition }))
  .sort((first, second) =>
    first.category.localeCompare(second.category, "fr") ||
    first.label.localeCompare(second.label, "fr"),
  );

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  AuditLog: "Entrée d'audit",
  Boite: "Boîte d'archives",
  DemoDataset: "Jeu de démonstration",
  DemandeAcces: "Demande d'accès",
  Document: "Document",
  Emplacement: "Emplacement",
  Mouvement: "Mouvement de document",
  Permission: "Permission",
  Role: "Rôle",
  Signature: "Preuve de remise",
  Utilisateur: "Utilisateur",
  Validation: "Validation",
};

export const AUDIT_ENTITY_OPTIONS = Object.entries(ENTITY_LABELS)
  .filter(([value]) => ["Boite", "DemoDataset", "DemandeAcces", "Document", "Emplacement", "Mouvement", "Role", "Utilisateur"].includes(value))
  .map(([value, label]) => ({ value, label }))
  .sort((first, second) => first.label.localeCompare(second.label, "fr"));

const FALLBACK_WORDS: Readonly<Record<string, string>> = {
  access: "accès",
  account: "compte",
  activated: "activé",
  action: "action",
  admin: "administrateur",
  approved: "approuvée",
  archive: "archive",
  assigned: "attribuée",
  box: "boîte",
  completed: "terminée",
  confirmed: "confirmé",
  consultation: "consultation",
  created: "créée",
  custom: "personnalisée",
  dataset: "jeu de données",
  deactivated: "désactivé",
  deleted: "supprimée",
  demo: "démonstration",
  document: "document",
  handover: "remise",
  location: "emplacement",
  movement: "mouvement",
  password: "mot de passe",
  permission: "permission",
  rejected: "refusée",
  removed: "retirée",
  request: "demande",
  reset: "remplacé",
  review: "revue",
  return: "retour",
  role: "rôle",
  seeded: "préparé",
  started: "démarrée",
  updated: "modifiée",
  user: "utilisateur",
};

export type AuditDetail = { label: string; value: string };

export type AuditLogView = {
  id: string;
  createdAt: string;
  actor: { name: string; email?: string };
  action: { technicalName: string; label: string; category: string; tone: AuditActionTone };
  subject: { label: string; businessReference?: string };
  description: string;
  summaryDetails: AuditDetail[];
  metadataDetails: AuditDetail[];
  previousValues: AuditDetail[];
  newValues: AuditDetail[];
  canViewTechnicalDetails: boolean;
  technicalDetails: AuditDetail[];
  technicalPayload: {
    metadata: unknown | null;
    oldValues: unknown | null;
    newValues: unknown | null;
  };
};

export function auditEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? humanizeIdentifier(entityType);
}

export function getAuditActionDefinition(action: string): AuditActionDefinition {
  return AUDIT_ACTION_DEFINITIONS[action] ?? {
    label: humanizeUnknownAction(action),
    category: "Système",
    tone: "neutral",
    verb: "a effectué l'action",
  };
}

export function auditActionsMatchingSearch(search: string) {
  const normalizedSearch = normalizeForSearch(search);
  if (!normalizedSearch) return [];
  return AUDIT_ACTION_OPTIONS
    .filter(({ label, category }) =>
      normalizeForSearch(`${label} ${category}`).includes(normalizedSearch),
    )
    .map(({ value }) => value);
}

export function humanizeUnknownAction(action: string) {
  const parts = action
    .split(".")
    .map((part) =>
      part
        .split(/[_-]+/)
        .filter(Boolean)
        .map((word) => FALLBACK_WORDS[word.toLocaleLowerCase("fr")] ?? word.toLocaleLowerCase("fr"))
        .join(" "),
    )
    .filter(Boolean);
  const readable = parts.join(" — ") || "Action non répertoriée";
  return readable.charAt(0).toLocaleUpperCase("fr") + readable.slice(1);
}

export function buildAuditDescription({
  action,
  actorName,
  subjectLabel,
  documentReference,
  roleName,
  permissionName,
}: {
  action: string;
  actorName: string;
  subjectLabel: string;
  documentReference?: string;
  roleName?: string;
  permissionName?: string;
}) {
  const documentSuffix = documentReference ? ` concernant le document ${documentReference}` : "";
  if (action === "user.role_assigned" && roleName) {
    return `${actorName} a attribué le rôle ${roleName} à ${withDefiniteArticle(subjectLabel)}.`;
  }
  if (action === "user.role_removed" && roleName) {
    return `${actorName} a retiré le rôle ${roleName} ${withDeArticle(subjectLabel)}.`;
  }
  if (action === "role.permission_assigned" && permissionName) {
    return `${actorName} a ajouté la permission « ${permissionName} » ${withIndirectArticle(subjectLabel)}.`;
  }
  if (action === "role.permission_removed" && permissionName) {
    return `${actorName} a retiré la permission « ${permissionName} » ${withDeArticle(subjectLabel)}.`;
  }
  if (action.startsWith("access_request.") || action.startsWith("consultation.")) {
    return `${actorName} ${getAuditActionDefinition(action).verb}${documentSuffix}.`;
  }
  if (action.startsWith("movement.")) {
    return `${actorName} ${getAuditActionDefinition(action).verb}${documentReference ? ` du document ${documentReference}` : " d'un document"}.`;
  }
  const definition = getAuditActionDefinition(action);
  if (!AUDIT_ACTION_DEFINITIONS[action]) {
    return `${actorName} a effectué l'action « ${definition.label} » sur ${withDefiniteArticle(subjectLabel)}.`;
  }
  return `${actorName} ${definition.verb} ${withDefiniteArticle(subjectLabel)}.`;
}

export function formatAuditPrimitive(key: string, value: string | number | boolean | null) {
  if (value === null) return "Non renseigné";
  if (typeof value === "boolean") {
    if (key === "actif") return value ? "Actif" : "Inactif";
    if (key === "confidentiel") return value ? "Oui" : "Non";
    return value ? "Oui" : "Non";
  }
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  const enumLabels: Readonly<Record<string, string>> = {
    APPROUVEE: "Approuvée",
    BON: "Bon état",
    CONSULTATION: "Consultation sur site",
    DISPONIBLE: "Disponible",
    ENDOMMAGE: "Endommagé",
    EN_ATTENTE: "En attente",
    EN_COURS: "En cours",
    INDISPONIBLE: "Indisponible",
    NON_REINTEGRE: "Non réintégré",
    PERDU: "Perdu",
    REFUSEE: "Refusée",
    RETOURNEE: "Retournée",
    SORTI: "Sorti",
    SORTIE: "Sortie physique",
  };
  if (enumLabels[value]) return enumLabels[value];
  if (/At$|date|retourPrevu|changedAt/i.test(key) && !Number.isNaN(Date.parse(value))) {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Casablanca",
    }).format(new Date(value));
  }
  return value;
}

export function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function humanizeIdentifier(value: string) {
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toLocaleUpperCase("fr") + spaced.slice(1) : "Élément";
}

function withDefiniteArticle(label: string) {
  const normalized = label.toLocaleLowerCase("fr");
  if (/^[aeiouyéèêëàâäîïôöùûüh]/.test(normalized)) return `l’${normalized}`;
  if (/^(boîte|demande|permission|signature|validation)\b/.test(normalized)) return `la ${normalized}`;
  return `le ${normalized}`;
}

function withIndirectArticle(label: string) {
  const normalized = label.toLocaleLowerCase("fr");
  if (/^[aeiouyéèêëàâäîïôöùûüh]/.test(normalized)) return `à l’${normalized}`;
  if (/^(boîte|demande|permission|signature|validation)\b/.test(normalized)) return `à la ${normalized}`;
  return `au ${normalized}`;
}

function withDeArticle(label: string) {
  const normalized = label.toLocaleLowerCase("fr");
  if (/^[aeiouyéèêëàâäîïôöùûüh]/.test(normalized)) return `de l’${normalized}`;
  if (/^(boîte|demande|permission|signature|validation)\b/.test(normalized)) return `de la ${normalized}`;
  return `du ${normalized}`;
}
