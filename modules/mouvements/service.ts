import "server-only";

import type { EtatRetourDocument } from "@/generated/prisma/client";
import { overdueDays } from "@/lib/date";
import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { pagination } from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { writeAuditLog } from "@/modules/audit/service";
import { assertRequestTransition } from "@/modules/demandes/transitions";
import { handoverSchema, returnSchema, type ReturnInput } from "@/modules/mouvements/schemas";
import type { StagedSignature } from "@/modules/signatures/storage";

export async function listHandoverCandidates(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_HANDOVER);
  return prisma.demandeAcces.findMany({
    where: { type: "SORTIE", statut: "APPROUVEE", mouvement: null },
    include: {
      document: { include: { boite: { include: { emplacement: true } } } },
      demandeur: { select: { id: true, nom: true, email: true } },
      validation: { include: { validateur: { select: { nom: true } } } },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
}

export async function confirmHandover(
  actorId: string,
  input: { demandeId: string },
  evidence: StagedSignature,
) {
  const data = handoverSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_HANDOVER, tx);
      const request = await tx.demandeAcces.findUnique({
        where: { id: data.demandeId },
        include: {
          document: { select: { id: true, reference: true, statut: true } },
          demandeur: { select: { id: true, nom: true } },
          mouvement: { select: { id: true } },
        },
      });
      if (!request || request.type !== "SORTIE") {
        throw new ValidationError("Demande de sortie introuvable.");
      }
      if (request.statut !== "APPROUVEE" || request.mouvement) {
        throw new ConflictError("La demande n'est pas disponible pour une remise.");
      }
      if (!request.retourPrevu || request.retourPrevu <= new Date()) {
        throw new ConflictError("La date de retour prévue doit être révisée avant la remise.");
      }
      if (request.document.statut !== "DISPONIBLE") {
        throw new ConflictError("Le document n'est pas physiquement disponible.");
      }
      assertRequestTransition(request.statut, "EN_COURS");
      const activeMovement = await tx.mouvement.findFirst({
        where: { documentId: request.document.id, dateRetour: null },
        select: { id: true },
      });
      if (activeMovement) throw new ConflictError("Ce document possède déjà une sortie active.");

      const documentChanged = await tx.document.updateMany({
        where: { id: request.document.id, statut: "DISPONIBLE" },
        data: { statut: "SORTI" },
      });
      const requestChanged = await tx.demandeAcces.updateMany({
        where: { id: request.id, statut: "APPROUVEE" },
        data: { statut: "EN_COURS" },
      });
      if (documentChanged.count !== 1 || requestChanged.count !== 1) {
        throw new ConflictError("Une remise concurrente a déjà modifié le dossier.");
      }

      const movement = await tx.mouvement.create({
        data: {
          documentId: request.document.id,
          demandeId: request.id,
          utilisateurId: request.demandeur.id,
          operateurSortieId: actorId,
          retourPrevu: request.retourPrevu,
        },
      });
      const signature = await tx.signature.create({
        data: {
          mouvementId: movement.id,
          signataireId: request.demandeur.id,
          storageKey: evidence.storageKey,
          mimeType: evidence.mimeType,
          checksum: evidence.checksum,
          byteSize: evidence.byteSize,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "movement.handover_confirmed",
        entityType: "Mouvement",
        entityId: movement.id,
        newValues: {
          documentId: request.document.id,
          demandeId: request.id,
          beneficiaireId: request.demandeur.id,
          retourPrevu: request.retourPrevu,
        },
        metadata: {
          documentReference: request.document.reference,
          signatureId: signature.id,
          signatureChecksum: signature.checksum,
        },
      });
      return { movement, signature };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Une sortie existe déjà pour cette demande ou ce document.");
    }
    throw error;
  }
}

export async function listActiveMovements(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_RETURN);
  return prisma.mouvement.findMany({
    where: { dateRetour: null },
    include: {
      document: { include: { boite: true } },
      demande: true,
      utilisateur: { select: { nom: true, email: true } },
      operateurSortie: { select: { nom: true } },
      signature: { select: { id: true, signedAt: true } },
    },
    orderBy: { retourPrevu: "asc" },
  });
}

export async function confirmReturn(actorId: string, input: ReturnInput) {
  const data = returnSchema.parse(input);
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_RETURN, tx);
    const movement = await tx.mouvement.findUnique({
      where: { id: data.mouvementId },
      include: {
        document: { select: { id: true, reference: true, statut: true, boiteId: true } },
        demande: { select: { id: true, statut: true, documentId: true } },
      },
    });
    if (!movement) throw new ValidationError("Mouvement introuvable.");
    if (movement.dateRetour) throw new ConflictError("Ce retour a déjà été confirmé.");
    if (movement.documentId !== movement.demande.documentId) {
      throw new ConflictError("Le mouvement ne correspond pas au document demandé.");
    }
    if (movement.demande.statut !== "EN_COURS" || movement.document.statut !== "SORTI") {
      throw new ConflictError("Le document ne possède pas une sortie active cohérente.");
    }
    assertRequestTransition(movement.demande.statut, "RETOURNEE");
    if (
      movement.document.reference.trim().toLocaleLowerCase("fr") !==
      data.documentReference.trim().toLocaleLowerCase("fr")
    ) {
      throw new ValidationError("La référence confirmée ne correspond pas au document sorti.");
    }
    if (data.boiteId) {
      const box = await tx.boite.findUnique({ where: { id: data.boiteId } });
      if (!box) throw new ValidationError("Boîte de retour introuvable.");
    }

    const returnedAt = new Date();
    const changed = await tx.mouvement.updateMany({
      where: { id: movement.id, dateRetour: null },
      data: {
        dateRetour: returnedAt,
        retourConfirmeParId: actorId,
        etatRetour: data.etatRetour as EtatRetourDocument,
        observationsRetour: data.observations || null,
        boiteRetourId: data.boiteId || null,
      },
    });
    if (changed.count !== 1) throw new ConflictError("Le retour a déjà été traité.");

    const available = data.etatRetour === "BON";
    await tx.document.update({
      where: { id: movement.document.id },
      data: {
        statut: available ? "DISPONIBLE" : "INDISPONIBLE",
        boiteId: data.boiteId || movement.document.boiteId,
      },
    });
    await tx.demandeAcces.update({
      where: { id: movement.demande.id },
      data: { statut: "RETOURNEE" },
    });
    await writeAuditLog(tx, {
      actorId,
      action: "movement.return_confirmed",
      entityType: "Mouvement",
      entityId: movement.id,
      oldValues: { dateRetour: null, documentStatut: movement.document.statut },
      newValues: {
        dateRetour: returnedAt,
        etatRetour: data.etatRetour,
        documentStatut: available ? "DISPONIBLE" : "INDISPONIBLE",
        boiteRetourId: data.boiteId || null,
      },
      metadata: { documentReference: movement.document.reference },
    });
  });
}

export async function listMovements(
  actorId: string,
  filters: {
    state?: string;
    q?: string;
    beneficiary?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  } = {},
) {
  await assertPermission(actorId, PERMISSIONS.MOUVEMENTS_READ);
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const now = new Date();
  const q = filters.q?.trim();
  const stateWhere =
    filters.state === "active"
      ? { dateRetour: null }
      : filters.state === "overdue"
        ? { dateRetour: null, retourPrevu: { lt: now } }
        : filters.state === "returned"
          ? { dateRetour: { not: null } }
          : {};
  const from = parseDateFilter(filters.from, false);
  const to = parseDateFilter(filters.to, true);
  const dateRange =
    from || to
      ? {
          gte: from,
          lte: to,
        }
      : undefined;
  const where = {
    ...stateWhere,
    dateSortie: dateRange,
    utilisateurId: filters.beneficiary || undefined,
    OR: q
      ? [
          { document: { reference: { contains: q, mode: "insensitive" as const } } },
          { utilisateur: { nom: { contains: q, mode: "insensitive" as const } } },
        ]
      : undefined,
  };
  const [records, total] = await Promise.all([
    prisma.mouvement.findMany({
      where,
      include: {
        document: { select: { id: true, reference: true, titre: true, statut: true } },
        demande: { select: { id: true, statut: true, retourPrevu: true } },
        utilisateur: { select: { id: true, nom: true, email: true } },
        operateurSortie: { select: { nom: true } },
        retourConfirmePar: { select: { nom: true } },
        signature: { select: { id: true, signedAt: true } },
      },
      orderBy: { dateSortie: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.mouvement.count({ where }),
  ]);
  return {
    items: records.map((movement) => ({
      ...movement,
      overdueDays:
        !movement.dateRetour && movement.retourPrevu
          ? overdueDays(movement.retourPrevu, now)
          : 0,
    })),
    total,
    page,
    pageSize,
  };
}

function parseDateFilter(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
