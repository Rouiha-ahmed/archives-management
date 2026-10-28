import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";

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
  filters: { search?: string; action?: string; entityType?: string },
) {
  await assertPermission(actorId, PERMISSIONS.AUDIT_READ);

  return prisma.auditLog.findMany({
    where: {
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      OR: filters.search
        ? [
            { action: { contains: filters.search, mode: "insensitive" } },
            { entityType: { contains: filters.search, mode: "insensitive" } },
            { entityId: { contains: filters.search, mode: "insensitive" } },
            { actor: { nom: { contains: filters.search, mode: "insensitive" } } },
            { actor: { email: { contains: filters.search, mode: "insensitive" } } },
          ]
        : undefined,
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, nom: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
