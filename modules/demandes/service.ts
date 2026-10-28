import "server-only";

import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { pagination } from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission, hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/modules/audit/service";
import { assertRequestTransition } from "@/modules/demandes/transitions";
import {
  createDemandeSchema,
  type CreateDemandeInput,
} from "@/modules/demandes/schemas";

export async function createAccessRequest(
  actorId: string,
  input: CreateDemandeInput,
) {
  const data = createDemandeSchema.parse(input);
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.DEMANDES_CREATE, tx);
    const canManageConfidential = await hasPermission(
      actorId,
      PERMISSIONS.ARCHIVES_UPDATE,
      tx,
    );
    const document = await tx.document.findFirst({
      where: {
        id: data.documentId,
        confidentiel: canManageConfidential ? undefined : false,
      },
      select: { id: true, reference: true, statut: true },
    });
    if (!document) throw new ValidationError("Document introuvable ou non autorisé.");
    if (document.statut !== "DISPONIBLE") {
      throw new ConflictError("Le document n'est actuellement pas disponible.");
    }
    const duplicate = await tx.demandeAcces.findFirst({
      where: {
        demandeurId: actorId,
        documentId: document.id,
        statut: { in: ["EN_ATTENTE", "APPROUVEE", "EN_COURS"] },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictError("Une demande active existe déjà pour ce document.");
    }
    const request = await tx.demandeAcces.create({
      data: {
        documentId: document.id,
        demandeurId: actorId,
        type: data.type,
        motif: data.motif,
        retourPrevu:
          data.type === "SORTIE" && data.retourPrevu
            ? new Date(data.retourPrevu)
            : null,
      },
    });
    await writeAuditLog(tx, {
      actorId,
      action: "access_request.created",
      entityType: "DemandeAcces",
      entityId: request.id,
      newValues: {
        documentId: document.id,
        documentReference: document.reference,
        type: request.type,
        retourPrevu: request.retourPrevu,
      },
    });
    return request;
  });
}

export async function listAccessRequests(
  actorId: string,
  filters: { statut?: string; type?: string; page?: string; pageSize?: string } = {},
) {
  const canReadAll = await hasPermission(actorId, PERMISSIONS.DEMANDES_READ_ALL);
  if (!canReadAll) await assertPermission(actorId, PERMISSIONS.DEMANDES_READ_OWN);
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const statuses = ["EN_ATTENTE", "APPROUVEE", "REFUSEE", "EN_COURS", "RETOURNEE"];
  const types = ["CONSULTATION", "SORTIE"];
  const where = {
    demandeurId: canReadAll ? undefined : actorId,
    statut: statuses.includes(filters.statut ?? "")
      ? (filters.statut as "EN_ATTENTE" | "APPROUVEE" | "REFUSEE" | "EN_COURS" | "RETOURNEE")
      : undefined,
    type: types.includes(filters.type ?? "")
      ? (filters.type as "CONSULTATION" | "SORTIE")
      : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.demandeAcces.findMany({
      where,
      include: {
        document: { select: { id: true, reference: true, titre: true, statut: true } },
        demandeur: { select: { nom: true, email: true } },
        validation: { include: { validateur: { select: { nom: true } } } },
        mouvement: { select: { id: true, dateSortie: true, dateRetour: true } },
        consultationOperateur: { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.demandeAcces.count({ where }),
  ]);
  return { items, total, page, pageSize, canReadAll };
}

export async function startConsultation(actorId: string, demandeId: string) {
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_HANDOVER, tx);
    const request = await tx.demandeAcces.findUnique({
      where: { id: demandeId },
      include: { document: { select: { id: true, reference: true, statut: true } } },
    });
    if (!request || request.type !== "CONSULTATION") {
      throw new ValidationError("Demande de consultation introuvable.");
    }
    if (request.statut !== "APPROUVEE" || request.consultationStartedAt) {
      throw new ConflictError("Cette consultation ne peut pas être démarrée.");
    }
    if (request.document.statut !== "DISPONIBLE") {
      throw new ConflictError("Le document n'est pas disponible pour consultation.");
    }
    assertRequestTransition(request.statut, "EN_COURS");
    const now = new Date();
    const changed = await tx.demandeAcces.updateMany({
      where: { id: request.id, statut: "APPROUVEE", consultationStartedAt: null },
      data: {
        statut: "EN_COURS",
        consultationStartedAt: now,
        consultationOperateurId: actorId,
      },
    });
    if (changed.count !== 1) throw new ConflictError("La consultation a déjà été traitée.");
    await writeAuditLog(tx, {
      actorId,
      action: "consultation.started",
      entityType: "DemandeAcces",
      entityId: request.id,
      oldValues: { statut: request.statut },
      newValues: { statut: "EN_COURS", consultationStartedAt: now },
      metadata: { documentId: request.document.id, reference: request.document.reference },
    });
  });
}

export async function completeConsultation(actorId: string, demandeId: string) {
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_RETURN, tx);
    const request = await tx.demandeAcces.findUnique({
      where: { id: demandeId },
      include: { document: { select: { id: true, reference: true } } },
    });
    if (!request || request.type !== "CONSULTATION") {
      throw new ValidationError("Demande de consultation introuvable.");
    }
    if (request.statut !== "EN_COURS" || !request.consultationStartedAt || request.consultationCompletedAt) {
      throw new ConflictError("Cette consultation n'est pas active.");
    }
    assertRequestTransition(request.statut, "RETOURNEE");
    const now = new Date();
    const changed = await tx.demandeAcces.updateMany({
      where: { id: request.id, statut: "EN_COURS", consultationCompletedAt: null },
      data: { statut: "RETOURNEE", consultationCompletedAt: now },
    });
    if (changed.count !== 1) throw new ConflictError("La consultation a déjà été clôturée.");
    await writeAuditLog(tx, {
      actorId,
      action: "consultation.completed",
      entityType: "DemandeAcces",
      entityId: request.id,
      oldValues: { statut: request.statut },
      newValues: { statut: "RETOURNEE", consultationCompletedAt: now },
      metadata: { documentId: request.document.id, reference: request.document.reference },
    });
  });
}
