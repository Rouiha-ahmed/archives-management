import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { pagination } from "@/lib/pagination";
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLES,
} from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import {
  auditActionsMatchingSearch,
  auditEntityLabel,
  buildAuditDescription,
  formatAuditPrimitive,
  getAuditActionDefinition,
  type AuditDetail,
  type AuditLogView,
} from "@/modules/audit/presentation";

const SENSITIVE_KEY = /password|hash|token|secret|session|credential/i;

function sanitize(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { value: "null" };
  if (value instanceof Date) return value.toISOString();
  if (["string", "number", "boolean"].includes(typeof value)) {
    return value as string | number | boolean;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitize(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, item]) => [key, sanitize(item)])
        .filter((entry): entry is [string, Prisma.InputJsonValue] =>
          entry[1] !== undefined,
        ),
    );
  }
  return String(value);
}

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
};

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  entry: AuditEntry,
) {
  return tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues: sanitize(entry.oldValues),
      newValues: sanitize(entry.newValues),
      metadata: sanitize(entry.metadata),
    },
  });
}

export async function listAuditLogs(
  actorId: string,
  filters: {
    search?: string;
    action?: string;
    entityType?: string;
    page?: string;
    pageSize?: string;
  } = {},
) {
  await assertPermission(actorId, PERMISSIONS.AUDIT_READ);
  const canViewTechnicalDetails = await isAdministrator(actorId);
  const search = filters.search?.trim() ?? "";
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const relatedEntityIds = search ? await findRelatedEntityIds(search) : [];
  const translatedActions = search ? auditActionsMatchingSearch(search) : [];
  const searchConditions: Prisma.AuditLogWhereInput[] = search
    ? [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { actor: { nom: { contains: search, mode: "insensitive" } } },
        { actor: { email: { contains: search, mode: "insensitive" } } },
        ...(translatedActions.length ? [{ action: { in: translatedActions } }] : []),
        ...(relatedEntityIds.length ? [{ entityId: { in: relatedEntityIds } }] : []),
      ]
    : [];
  const where: Prisma.AuditLogWhereInput = {
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    OR: searchConditions.length ? searchConditions : undefined,
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: auditLogSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const resolutions = await resolveAuditReferences(logs);
  return {
    items: logs.map((log) => presentAuditLog(log, resolutions, canViewTechnicalDetails)),
    total,
    page,
    pageSize,
  };
}

async function isAdministrator(actorId: string) {
  return Boolean(await prisma.userRole.findFirst({
    where: { utilisateurId: actorId, role: { code: ROLES.ADMIN } },
    select: { id: true },
  }));
}

const auditLogSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  oldValues: true,
  newValues: true,
  metadata: true,
  createdAt: true,
  actor: { select: { id: true, nom: true, email: true } },
} as const;

type RawAuditLog = Prisma.AuditLogGetPayload<{ select: typeof auditLogSelect }>;

type AuditResolutions = {
  documents: Map<string, string>;
  requests: Map<string, { documentReference: string; requesterName: string }>;
  movements: Map<string, { documentReference: string; beneficiaryName: string }>;
  users: Map<string, { name: string; email: string }>;
  roles: Map<string, { code: string; name: string }>;
  boxes: Map<string, { code: string; location: string }>;
  locations: Map<string, string>;
};

async function findRelatedEntityIds(search: string) {
  const [documents, users, boxes, locations, roles] = await Promise.all([
    prisma.document.findMany({
      where: {
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { titre: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 500,
    }),
    prisma.utilisateur.findMany({
      where: {
        OR: [
          { nom: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
    prisma.boite.findMany({
      where: { code: { contains: search, mode: "insensitive" } },
      select: { id: true },
      take: 100,
    }),
    prisma.emplacement.findMany({
      where: {
        OR: [
          { zone: { contains: search, mode: "insensitive" } },
          { rack: { contains: search, mode: "insensitive" } },
          { niveau: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
    prisma.role.findMany({
      where: {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { nom: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
  ]);
  const documentIds = documents.map(({ id }) => id);
  const [requests, movements] = documentIds.length
    ? await Promise.all([
        prisma.demandeAcces.findMany({
          where: { documentId: { in: documentIds } },
          select: { id: true },
          take: 500,
        }),
        prisma.mouvement.findMany({
          where: { documentId: { in: documentIds } },
          select: { id: true },
          take: 500,
        }),
      ])
    : [[], []];
  return [...new Set([
    ...documentIds,
    ...users.map(({ id }) => id),
    ...boxes.map(({ id }) => id),
    ...locations.map(({ id }) => id),
    ...roles.map(({ id }) => id),
    ...requests.map(({ id }) => id),
    ...movements.map(({ id }) => id),
  ])];
}

async function resolveAuditReferences(logs: RawAuditLog[]): Promise<AuditResolutions> {
  const documentIds = new Set<string>();
  const requestIds = new Set<string>();
  const movementIds = new Set<string>();
  const userIds = new Set<string>();
  const roleIds = new Set<string>();
  const boxIds = new Set<string>();
  const locationIds = new Set<string>();

  for (const log of logs) {
    addEntityId(log.entityType, log.entityId, {
      documentIds,
      requestIds,
      movementIds,
      userIds,
      roleIds,
      boxIds,
      locationIds,
    });
    for (const value of [log.metadata, log.oldValues, log.newValues]) {
      collectKnownIds(value, { documentIds, requestIds, userIds, roleIds, boxIds, locationIds });
    }
  }

  const [documents, requests, movements, users, roles, boxes, locations] = await Promise.all([
    prisma.document.findMany({ where: { id: { in: [...documentIds] } }, select: { id: true, reference: true } }),
    prisma.demandeAcces.findMany({
      where: { id: { in: [...requestIds] } },
      select: { id: true, document: { select: { reference: true } }, demandeur: { select: { nom: true } } },
    }),
    prisma.mouvement.findMany({
      where: { id: { in: [...movementIds] } },
      select: { id: true, document: { select: { reference: true } }, utilisateur: { select: { nom: true } } },
    }),
    prisma.utilisateur.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, nom: true, email: true } }),
    prisma.role.findMany({ where: { id: { in: [...roleIds] } }, select: { id: true, code: true, nom: true } }),
    prisma.boite.findMany({
      where: { id: { in: [...boxIds] } },
      select: { id: true, code: true, emplacement: { select: { zone: true, rack: true, niveau: true } } },
    }),
    prisma.emplacement.findMany({
      where: { id: { in: [...locationIds] } },
      select: { id: true, zone: true, rack: true, niveau: true },
    }),
  ]);

  return {
    documents: new Map(documents.map((item) => [item.id, item.reference])),
    requests: new Map(requests.map((item) => [item.id, { documentReference: item.document.reference, requesterName: item.demandeur.nom }])),
    movements: new Map(movements.map((item) => [item.id, { documentReference: item.document.reference, beneficiaryName: item.utilisateur.nom }])),
    users: new Map(users.map((item) => [item.id, { name: item.nom, email: item.email }])),
    roles: new Map(roles.map((item) => [item.id, { code: item.code, name: item.nom }])),
    boxes: new Map(boxes.map((item) => [item.id, { code: item.code, location: locationLabel(item.emplacement) }])),
    locations: new Map(locations.map((item) => [item.id, locationLabel(item)])),
  };
}

function presentAuditLog(
  log: RawAuditLog,
  resolutions: AuditResolutions,
  canViewTechnicalDetails: boolean,
): AuditLogView {
  const actionDefinition = getAuditActionDefinition(log.action);
  const actorName = log.actor?.nom ?? "Le système";
  const subject = resolveSubject(log, resolutions);
  const metadataDetails = uniqueDetails([
    ...businessDetails(log.metadata, resolutions),
    ...relatedEntityDetails(log, resolutions),
  ]);
  const previousValues = businessDetails(log.oldValues, resolutions);
  const newValues = businessDetails(log.newValues, resolutions);
  const summaryDetails = uniqueDetails([...metadataDetails, ...newValues])
    .filter(({ label }) => !["Document", "Référence", "Donnée de démonstration"].includes(label))
    .slice(0, 3);
  const roleName = findDetailValue([...metadataDetails, ...newValues], "Rôle");
  const permissionName = findDetailValue([...metadataDetails, ...newValues], "Permission");
  const documentReference = resolveDocumentReference(log, resolutions);

  return {
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actor: { name: actorName, email: log.actor?.email },
    action: {
      technicalName: log.action,
      label: actionDefinition.label,
      category: actionDefinition.category,
      tone: actionDefinition.tone,
    },
    subject,
    description: buildAuditDescription({
      action: log.action,
      actorName,
      subjectLabel: subject.label,
      documentReference,
      roleName,
      permissionName,
    }),
    summaryDetails,
    metadataDetails,
    previousValues,
    newValues,
    canViewTechnicalDetails,
    technicalDetails: canViewTechnicalDetails ? technicalDetails(log) : [],
    technicalPayload: {
      metadata: canViewTechnicalDetails ? log.metadata : null,
      oldValues: canViewTechnicalDetails ? log.oldValues : null,
      newValues: canViewTechnicalDetails ? log.newValues : null,
    },
  };
}

function relatedEntityDetails(log: RawAuditLog, resolutions: AuditResolutions): AuditDetail[] {
  if (!log.entityId) return [];
  if (log.entityType === "DemandeAcces") {
    const request = resolutions.requests.get(log.entityId);
    return request ? [{ label: "Demandeur", value: request.requesterName }] : [];
  }
  if (log.entityType === "Mouvement") {
    const movement = resolutions.movements.get(log.entityId);
    return movement ? [{ label: "Bénéficiaire", value: movement.beneficiaryName }] : [];
  }
  if (log.entityType === "Boite") {
    const box = resolutions.boxes.get(log.entityId);
    return box ? [{ label: "Emplacement", value: box.location }] : [];
  }
  return [];
}

function resolveSubject(log: RawAuditLog, resolutions: AuditResolutions) {
  const unavailable = `${auditEntityLabel(log.entityType)} — Référence indisponible`;
  if (!log.entityId) return { label: auditEntityLabel(log.entityType) };
  if (log.entityType === "Document") {
    const reference = resolutions.documents.get(log.entityId) ?? stringFromJson(log.newValues, "reference");
    return reference ? { label: `Document ${reference}`, businessReference: reference } : { label: unavailable };
  }
  if (log.entityType === "DemandeAcces") {
    const request = resolutions.requests.get(log.entityId);
    const reference = request?.documentReference ?? resolveDocumentReference(log, resolutions);
    return reference ? { label: `Demande d'accès — document ${reference}`, businessReference: reference } : { label: unavailable };
  }
  if (log.entityType === "Mouvement") {
    const movement = resolutions.movements.get(log.entityId);
    const reference = movement?.documentReference ?? resolveDocumentReference(log, resolutions);
    return reference ? { label: `Mouvement — document ${reference}`, businessReference: reference } : { label: unavailable };
  }
  if (log.entityType === "Utilisateur") {
    const user = resolutions.users.get(log.entityId);
    const name = user?.name ?? stringFromJson(log.newValues, "nom");
    const email = user?.email ?? stringFromJson(log.newValues, "email");
    const reference = name || email;
    return reference ? { label: `Utilisateur ${reference}`, businessReference: email || name } : { label: unavailable };
  }
  if (log.entityType === "Role") {
    const role = resolutions.roles.get(log.entityId);
    const code = role?.code ?? stringFromJson(log.metadata, "roleCode");
    return role || code
      ? { label: `Rôle ${role?.name ?? roleLabel(code ?? "")}`, businessReference: code }
      : { label: unavailable };
  }
  if (log.entityType === "Boite") {
    const box = resolutions.boxes.get(log.entityId);
    const code = box?.code ?? stringFromJson(log.newValues, "code");
    return code ? { label: `Boîte ${code}`, businessReference: code } : { label: unavailable };
  }
  if (log.entityType === "Emplacement") {
    const location = resolutions.locations.get(log.entityId) ?? locationFromJson(log.newValues);
    return location ? { label: `Emplacement ${location}`, businessReference: location } : { label: unavailable };
  }
  if (log.entityType === "DemoDataset") {
    const batch = stringFromJson(log.newValues, "batch");
    return batch ? { label: `Jeu de démonstration ${batch}`, businessReference: batch } : { label: "Jeu de démonstration" };
  }
  return { label: unavailable };
}

function resolveDocumentReference(log: RawAuditLog, resolutions: AuditResolutions) {
  const direct = stringFromJson(log.metadata, "documentReference") ??
    stringFromJson(log.metadata, "reference") ??
    stringFromJson(log.newValues, "documentReference") ??
    stringFromJson(log.newValues, "reference");
  if (direct) return direct;
  const documentId = stringFromJson(log.metadata, "documentId") ?? stringFromJson(log.newValues, "documentId");
  if (documentId && resolutions.documents.has(documentId)) return resolutions.documents.get(documentId);
  if (log.entityId && log.entityType === "DemandeAcces") return resolutions.requests.get(log.entityId)?.documentReference;
  if (log.entityId && log.entityType === "Mouvement") return resolutions.movements.get(log.entityId)?.documentReference;
  if (log.entityId && log.entityType === "Document") return resolutions.documents.get(log.entityId);
  return undefined;
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  actif: "État du compte",
  batch: "Lot de démonstration",
  boiteId: "Boîte",
  boiteRetourId: "Boîte de retour",
  classification: "Classification",
  commentaire: "Commentaire",
  confidentiel: "Document confidentiel",
  dateRetour: "Date de retour",
  documentId: "Document",
  documentReference: "Document",
  documentStatut: "État du document",
  email: "Adresse e-mail",
  emplacementId: "Emplacement",
  etatRetour: "État au retour",
  niveau: "Niveau",
  nom: "Nom",
  permissionCode: "Permission",
  rack: "Rack",
  reference: "Référence",
  retourPrevu: "Retour prévu",
  roleCode: "Rôle",
  roleId: "Rôle",
  roleIds: "Rôles attribués",
  source: "Origine",
  statut: "Statut",
  synthetic: "Donnée de démonstration",
  titre: "Titre",
  type: "Type de demande",
  zone: "Zone",
};

function businessDetails(value: Prisma.JsonValue | null, resolutions: AuditResolutions): AuditDetail[] {
  const record = jsonRecord(value);
  if (!record) return [];
  const details: AuditDetail[] = [];
  for (const [key, item] of Object.entries(record)) {
    const label = FIELD_LABELS[key];
    if (!label) continue;
    const resolved = resolveFieldValue(key, item, resolutions);
    if (resolved) details.push({ label, value: resolved });
  }
  return uniqueDetails(details);
}

function resolveFieldValue(key: string, value: Prisma.JsonValue, resolutions: AuditResolutions) {
  if (key === "documentId" && typeof value === "string") return resolutions.documents.get(value) ?? "Référence indisponible";
  if ((key === "boiteId" || key === "boiteRetourId") && typeof value === "string") return resolutions.boxes.get(value)?.code ?? "Référence indisponible";
  if (key === "emplacementId" && typeof value === "string") return resolutions.locations.get(value) ?? "Référence indisponible";
  if (key === "roleId" && typeof value === "string") return resolutions.roles.get(value)?.name ?? "Référence indisponible";
  if (key === "roleIds" && Array.isArray(value)) {
    const roles = value
      .filter((item): item is string => typeof item === "string")
      .map((id) => resolutions.roles.get(id)?.name ?? "Référence indisponible");
    return roles.length ? roles.join(", ") : "Aucun rôle";
  }
  if (key === "roleCode" && typeof value === "string") return roleLabel(value);
  if (key === "permissionCode" && typeof value === "string") return permissionLabel(value);
  if (key === "source" && value === "secure-bootstrap") return "Initialisation sécurisée";
  if (["string", "number", "boolean"].includes(typeof value) || value === null) {
    return formatAuditPrimitive(key, value as string | number | boolean | null);
  }
  return undefined;
}

function technicalDetails(log: RawAuditLog): AuditDetail[] {
  const details: AuditDetail[] = [
    { label: "Identifiant de l'entrée", value: log.id },
    { label: "Action technique", value: log.action },
    { label: "Type technique", value: log.entityType },
  ];
  if (log.entityId) details.push({ label: "Identifiant technique de l'élément", value: log.entityId });
  for (const value of [log.metadata, log.oldValues, log.newValues]) {
    const record = jsonRecord(value);
    if (!record) continue;
    for (const [key, item] of Object.entries(record)) {
      if ((/Id$|Ids$|checksum/i.test(key)) && (typeof item === "string" || Array.isArray(item))) {
        details.push({ label: key, value: Array.isArray(item) ? item.join(", ") : item });
      }
    }
  }
  return uniqueDetails(details);
}

function addEntityId(
  entityType: string,
  entityId: string | null,
  sets: {
    documentIds: Set<string>;
    requestIds: Set<string>;
    movementIds: Set<string>;
    userIds: Set<string>;
    roleIds: Set<string>;
    boxIds: Set<string>;
    locationIds: Set<string>;
  },
) {
  if (!entityId) return;
  const target = {
    Document: sets.documentIds,
    DemandeAcces: sets.requestIds,
    Mouvement: sets.movementIds,
    Utilisateur: sets.userIds,
    Role: sets.roleIds,
    Boite: sets.boxIds,
    Emplacement: sets.locationIds,
  }[entityType];
  target?.add(entityId);
}

function collectKnownIds(
  value: Prisma.JsonValue | null,
  sets: {
    documentIds: Set<string>;
    requestIds: Set<string>;
    userIds: Set<string>;
    roleIds: Set<string>;
    boxIds: Set<string>;
    locationIds: Set<string>;
  },
) {
  const record = jsonRecord(value);
  if (!record) return;
  addStringId(record.documentId, sets.documentIds);
  addStringId(record.demandeId, sets.requestIds);
  addStringId(record.beneficiaireId, sets.userIds);
  addStringId(record.roleId, sets.roleIds);
  addStringId(record.boiteId, sets.boxIds);
  addStringId(record.boiteRetourId, sets.boxIds);
  addStringId(record.emplacementId, sets.locationIds);
  if (Array.isArray(record.roleIds)) {
    for (const roleId of record.roleIds) addStringId(roleId, sets.roleIds);
  }
}

function addStringId(value: Prisma.JsonValue | undefined, target: Set<string>) {
  if (typeof value === "string") target.add(value);
}

function jsonRecord(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Prisma.JsonValue>
    : null;
}

function stringFromJson(value: Prisma.JsonValue | null, key: string) {
  const item = jsonRecord(value)?.[key];
  return typeof item === "string" ? item : undefined;
}

function locationFromJson(value: Prisma.JsonValue | null) {
  const record = jsonRecord(value);
  if (!record) return undefined;
  const zone = typeof record.zone === "string" ? record.zone : undefined;
  const rack = typeof record.rack === "string" ? record.rack : undefined;
  const niveau = typeof record.niveau === "string" ? record.niveau : undefined;
  return zone && rack && niveau ? `${zone} / ${rack} / ${niveau}` : undefined;
}

function locationLabel(location: { zone: string; rack: string; niveau: string }) {
  return `${location.zone} / ${location.rack} / ${location.niveau}`;
}

function roleLabel(code: string) {
  return ROLE_DEFINITIONS.find((role) => role.code === code)?.nom ?? code;
}

function permissionLabel(code: string) {
  return PERMISSION_DEFINITIONS.find((permission) => permission.code === code)?.description ?? code;
}

function findDetailValue(details: AuditDetail[], label: string) {
  return details.find((detail) => detail.label === label)?.value;
}

function uniqueDetails(details: AuditDetail[]) {
  return details.filter((detail, index, all) =>
    all.findIndex((candidate) => candidate.label === detail.label && candidate.value === detail.value) === index,
  );
}
