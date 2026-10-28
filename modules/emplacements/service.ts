import "server-only";

import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { pagination } from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { writeAuditLog } from "@/modules/audit/service";
import {
  emplacementSchema,
  updateEmplacementSchema,
  type EmplacementInput,
} from "@/modules/emplacements/schemas";

export async function listEmplacements(
  actorId: string,
  filters: { q?: string; page?: string; pageSize?: string } = {},
) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const { page, pageSize, skip } = pagination(filters.page, filters.pageSize);
  const q = filters.q?.trim();
  const where = q
    ? {
        OR: [
          { zone: { contains: q, mode: "insensitive" as const } },
          { rack: { contains: q, mode: "insensitive" as const } },
          { niveau: { contains: q, mode: "insensitive" as const } },
          { boites: { some: { code: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.emplacement.findMany({
      where,
      include: {
        boites: {
          select: { id: true, code: true },
          orderBy: { code: "asc" },
          take: 8,
        },
        _count: { select: { boites: true } },
      },
      orderBy: [{ zone: "asc" }, { rack: "asc" }, { niveau: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.emplacement.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createEmplacement(actorId: string, input: EmplacementInput) {
  const data = emplacementSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.EMPLACEMENTS_MANAGE, tx);
      const item = await tx.emplacement.create({ data });
      await writeAuditLog(tx, {
        actorId,
        action: "location.created",
        entityType: "Emplacement",
        entityId: item.id,
        newValues: data,
      });
      return item;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Cette combinaison zone, rack et niveau existe déjà.");
    }
    throw error;
  }
}

export async function updateEmplacement(
  actorId: string,
  input: EmplacementInput & { id: string },
) {
  const data = updateEmplacementSchema.parse(input);
  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.EMPLACEMENTS_MANAGE, tx);
      const current = await tx.emplacement.findUnique({ where: { id: data.id } });
      if (!current) throw new ValidationError("Emplacement introuvable.");
      const updated = await tx.emplacement.update({
        where: { id: data.id },
        data: { zone: data.zone, rack: data.rack, niveau: data.niveau },
      });
      await writeAuditLog(tx, {
        actorId,
        action: "location.updated",
        entityType: "Emplacement",
        entityId: updated.id,
        oldValues: { zone: current.zone, rack: current.rack, niveau: current.niveau },
        newValues: { zone: updated.zone, rack: updated.rack, niveau: updated.niveau },
      });
      return updated;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Cette combinaison zone, rack et niveau existe déjà.");
    }
    throw error;
  }
}
