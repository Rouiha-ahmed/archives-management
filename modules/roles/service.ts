import "server-only";

import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import {
  CRITICAL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  type PermissionCode,
} from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/modules/audit/service";

export async function listRoles(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.ROLES_READ);
  return prisma.role.findMany({
    select: {
      id: true,
      code: true,
      nom: true,
      description: true,
      systeme: true,
      permissions: {
        select: { permission: { select: { id: true, code: true, description: true } } },
        orderBy: { permission: { code: "asc" } },
      },
      _count: { select: { utilisateurs: true } },
    },
    orderBy: { code: "asc" },
  });
}

export async function listPermissions(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.ROLES_READ);
  return prisma.permission.findMany({ orderBy: { code: "asc" } });
}

export async function setRolePermission(
  actorId: string,
  input: { roleId: string; permissionId: string; enabled: boolean },
) {
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.ROLES_UPDATE, tx);
    const role = await tx.role.findUnique({ where: { id: input.roleId } });
    const permission = await tx.permission.findUnique({
      where: { id: input.permissionId },
    });
    const existing = await tx.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: input.roleId,
          permissionId: input.permissionId,
        },
      },
    });
    if (!role || !permission) throw new ValidationError("Rôle ou permission introuvable.");
    if (Boolean(existing) === input.enabled) return { enabled: input.enabled };

    if (
      !input.enabled &&
      role.code === ROLES.ADMIN &&
      CRITICAL_ADMIN_PERMISSIONS.has(permission.code as PermissionCode)
    ) {
      throw new ConflictError(
        "Cette permission critique ne peut pas être retirée du rôle ADMIN.",
      );
    }

    if (input.enabled) {
      await tx.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    } else {
      await tx.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
      });
    }

    await tx.utilisateur.updateMany({
      where: { roles: { some: { roleId: role.id } } },
      data: { sessionVersion: { increment: 1 } },
    });
    await writeAuditLog(tx, {
      actorId,
      action: input.enabled ? "role.permission_assigned" : "role.permission_removed",
      entityType: "Role",
      entityId: role.id,
      metadata: { roleCode: role.code, permissionCode: permission.code },
    });
    return { enabled: input.enabled };
  });
}
