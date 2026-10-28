import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { pagination } from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission, hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { writeAuditLog } from "@/modules/audit/service";
import {
  documentSchema,
  updateDocumentSchema,
  type DocumentInput,
} from "@/modules/archives/schemas";

async function canManageDocuments(actorId: string) {
  return hasPermission(actorId, PERMISSIONS.ARCHIVES_UPDATE);
}

export async function listDocuments(
  actorId: string,
  filters: {
    q?: string;
    reference?: string;
    titre?: string;
    description?: string;
    statut?: string;
    emplacementId?: string;
    boiteId?: string;
    classification?: string;
    zone?: string;
    rack?: string;
    niveau?: string;
    createdFrom?: string;
    createdTo?: string;
    sort?: string;
    order?: string;
    page?: string;
    pageSize?: string;
  } = {},
) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const canSeeConfidential = await canManageDocuments(actorId);
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const q = filters.q?.trim();
  const reference = filters.reference?.trim();
  const titre = filters.titre?.trim();
  const description = filters.description?.trim();
  const statut = ["DISPONIBLE", "SORTI", "INDISPONIBLE"].includes(filters.statut ?? "")
    ? (filters.statut as "DISPONIBLE" | "SORTI" | "INDISPONIBLE")
    : undefined;
  const createdFrom = parseSearchDate(filters.createdFrom);
  const createdTo = parseSearchDate(filters.createdTo, true);
  const createdAt = createdFrom || createdTo ? { gte: createdFrom, lte: createdTo } : undefined;
  const where: Prisma.DocumentWhereInput = {
    confidentiel: canSeeConfidential ? undefined : false,
    statut,
    createdAt,
    boiteId: filters.boiteId || undefined,
    boite: filters.emplacementId || filters.zone || filters.rack || filters.niveau ? {
      emplacementId: filters.emplacementId || undefined,
      emplacement: {
        zone: filters.zone ? { equals: filters.zone.trim(), mode: "insensitive" } : undefined,
        rack: filters.rack ? { equals: filters.rack.trim(), mode: "insensitive" } : undefined,
        niveau: filters.niveau ? { equals: filters.niveau.trim(), mode: "insensitive" } : undefined,
      },
    } : undefined,
    classification: filters.classification
      ? { equals: filters.classification, mode: "insensitive" as const }
      : undefined,
    AND: [
      reference ? { reference: { contains: reference, mode: "insensitive" } } : {},
      titre ? { titre: { contains: titre, mode: "insensitive" } } : {},
      description ? { description: { contains: description, mode: "insensitive" } } : {},
    ],
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { titre: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { boite: { code: { contains: q, mode: "insensitive" as const } } },
        ]
      : undefined,
  };
  const direction: Prisma.SortOrder = filters.order === "desc" ? "desc" : "asc";
  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    filters.sort === "titre" ? { titre: direction }
      : filters.sort === "statut" ? { statut: direction }
        : filters.sort === "createdAt" ? { createdAt: direction }
          : filters.sort === "updatedAt" ? { updatedAt: direction }
            : filters.sort === "boite" ? { boite: { code: direction } }
              : { reference: direction };
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: {
        id: true, reference: true, titre: true, classification: true,
        confidentiel: true, statut: true, createdAt: true, updatedAt: true,
        boite: { select: { id: true, code: true, emplacement: { select: { zone: true, rack: true, niveau: true } } } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

function parseSearchDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getDocument(actorId: string, id: string) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const canSeeConfidential = await canManageDocuments(actorId);
  const item = await prisma.document.findFirst({
    where: { id, confidentiel: canSeeConfidential ? undefined : false },
    include: {
      boite: { include: { emplacement: true } },
      demandes: {
        where: canSeeConfidential ? undefined : { demandeurId: actorId },
        include: { validation: true },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
      mouvements: {
        include: {
          utilisateur: { select: { nom: true } },
          operateurSortie: { select: { nom: true } },
          retourConfirmePar: { select: { nom: true } },
          signature: { select: { id: true, signedAt: true } },
        },
        orderBy: { dateSortie: "desc" },
        take: 50,
      },
    },
  });
  if (!item) throw new ValidationError("Document introuvable ou non autorisé.");
  return item;
}

export async function listDocumentOptions(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const canSeeConfidential = await canManageDocuments(actorId);
  return prisma.document.findMany({
    where: {
      statut: "DISPONIBLE",
      confidentiel: canSeeConfidential ? undefined : false,
    },
    select: { id: true, reference: true, titre: true },
    orderBy: { reference: "asc" },
    take: 500,
  });
}

export async function createDocument(actorId: string, input: DocumentInput) {
  const data = documentSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.ARCHIVES_CREATE, tx);
      const box = await tx.boite.findUnique({
        where: { id: data.boiteId },
        select: { id: true },
      });
      if (!box) throw new ValidationError("Boîte introuvable.");
      const item = await tx.document.create({
        data: {
          reference: data.reference,
          titre: data.titre,
          description: data.description || null,
          classification: data.classification || null,
          dateDocument: data.dateDocument ? new Date(`${data.dateDocument}T00:00:00Z`) : null,
          confidentiel: data.confidentiel,
          boiteId: data.boiteId,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "document.created",
        entityType: "Document",
        entityId: item.id,
        newValues: {
          reference: item.reference,
          titre: item.titre,
          boiteId: item.boiteId,
          classification: item.classification,
          confidentiel: item.confidentiel,
        },
      });
      return item;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Cette référence de document existe déjà.");
    }
    throw error;
  }
}

export async function updateDocument(
  actorId: string,
  input: DocumentInput & { id: string },
) {
  const data = updateDocumentSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.ARCHIVES_UPDATE, tx);
      const current = await tx.document.findUnique({ where: { id: data.id } });
      const box = await tx.boite.findUnique({ where: { id: data.boiteId } });
      if (!current || !box) throw new ValidationError("Document ou boîte introuvable.");
      if (current.statut === "SORTI" && current.boiteId !== data.boiteId) {
        throw new ConflictError("Un document sorti ne peut pas être déplacé vers une autre boîte.");
      }
      const updated = await tx.document.update({
        where: { id: data.id },
        data: {
          reference: data.reference,
          titre: data.titre,
          description: data.description || null,
          classification: data.classification || null,
          dateDocument: data.dateDocument ? new Date(`${data.dateDocument}T00:00:00Z`) : null,
          confidentiel: data.confidentiel,
          boiteId: data.boiteId,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "document.updated",
        entityType: "Document",
        entityId: updated.id,
        oldValues: {
          reference: current.reference,
          titre: current.titre,
          boiteId: current.boiteId,
          classification: current.classification,
          confidentiel: current.confidentiel,
        },
        newValues: {
          reference: updated.reference,
          titre: updated.titre,
          boiteId: updated.boiteId,
          classification: updated.classification,
          confidentiel: updated.confidentiel,
        },
      });
      return updated;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Cette référence de document existe déjà.");
    }
    throw error;
  }
}
