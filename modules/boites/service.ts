import "server-only";

import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { pagination } from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission, hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { writeAuditLog } from "@/modules/audit/service";
import {
  boiteSchema,
  updateBoiteSchema,
  type BoiteInput,
} from "@/modules/boites/schemas";

export async function listBoites(
  actorId: string,
  filters: { q?: string; emplacementId?: string; page?: string; pageSize?: string } = {},
) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const q = filters.q?.trim();
  const where = {
    emplacementId: filters.emplacementId || undefined,
    OR: q
      ? [
          { code: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.boite.findMany({
      where,
      include: {
        emplacement: true,
        _count: { select: { documents: true } },
      },
      orderBy: { code: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.boite.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getBoite(actorId: string, id: string) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const canSeeConfidential = await hasPermission(
    actorId,
    PERMISSIONS.ARCHIVES_UPDATE,
  );
  const item = await prisma.boite.findUnique({
    where: { id },
    include: {
      emplacement: true,
      documents: {
        where: canSeeConfidential ? undefined : { confidentiel: false },
        select: {
          id: true,
          reference: true,
          titre: true,
          statut: true,
          classification: true,
          confidentiel: true,
        },
        orderBy: { reference: "asc" },
      },
      _count: { select: { documents: true } },
    },
  });
  if (!item) throw new ValidationError("Boîte introuvable.");
  return item;
}

export async function resolveBoiteCode(actorId: string, code: string) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const normalized = code.trim();
  const item = await prisma.boite.findFirst({
    where: {
      OR: [
        { id: normalized.match(/^[0-9a-f-]{36}$/i) ? normalized : undefined },
        { code: { equals: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (!item) throw new ValidationError("Aucune boîte ne correspond à ce code.");
  return item.id;
}

export async function createBoite(actorId: string, input: BoiteInput) {
  const data = boiteSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.BOITES_MANAGE, tx);
      const location = await tx.emplacement.findUnique({
        where: { id: data.emplacementId },
        select: { id: true },
      });
      if (!location) throw new ValidationError("Emplacement introuvable.");
      const item = await tx.boite.create({
        data: {
          code: data.code,
          description: data.description || null,
          emplacementId: data.emplacementId,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "box.created",
        entityType: "Boite",
        entityId: item.id,
        newValues: { code: item.code, emplacementId: item.emplacementId },
      });
      return item;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Ce code de boîte existe déjà.");
    }
    throw error;
  }
}

export async function updateBoite(actorId: string, input: BoiteInput & { id: string }) {
  const data = updateBoiteSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.BOITES_MANAGE, tx);
      const current = await tx.boite.findUnique({ where: { id: data.id } });
      const location = await tx.emplacement.findUnique({
        where: { id: data.emplacementId },
        select: { id: true },
      });
      if (!current || !location) throw new ValidationError("Boîte ou emplacement introuvable.");
      const updated = await tx.boite.update({
        where: { id: data.id },
        data: {
          code: data.code,
          description: data.description || null,
          emplacementId: data.emplacementId,
        },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "box.updated",
        entityType: "Boite",
        entityId: updated.id,
        oldValues: { code: current.code, emplacementId: current.emplacementId },
        newValues: { code: updated.code, emplacementId: updated.emplacementId },
      });
      return updated;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Ce code de boîte existe déjà.");
    }
    throw error;
  }
}
