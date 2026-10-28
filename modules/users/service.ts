import "server-only";

import { hashPassword } from "@/lib/auth/password";
import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { PERMISSIONS, ROLES } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { writeAuditLog } from "@/modules/audit/service";
import {
  createUserSchema,
  resetPasswordSchema,
  userActivationSchema,
  userRoleSchema,
  type CreateUserInput,
} from "@/modules/users/schemas";

export async function createUser(actorId: string, input: CreateUserInput) {
  const data = createUserSchema.parse(input);
  const passwordHash = await hashPassword(data.password);

  try {
    return await withSerializableRetry(async (tx) => {
      await assertPermission(actorId, PERMISSIONS.USERS_CREATE, tx);
      if (data.roleIds.length > 0) {
        await assertPermission(actorId, PERMISSIONS.USERS_ASSIGN_ROLES, tx);
        const roleCount = await tx.role.count({
          where: { id: { in: data.roleIds } },
        });
        if (roleCount !== new Set(data.roleIds).size) {
          throw new ValidationError("Un ou plusieurs rôles sont invalides.");
        }
      }

      const user = await tx.utilisateur.create({
        data: {
          nom: data.nom,
          email: data.email,
          passwordHash,
          passwordChangedAt: new Date(),
          roles: {
            create: [...new Set(data.roleIds)].map((roleId) => ({ roleId })),
          },
        },
        select: { id: true, nom: true, email: true, actif: true },
      });

      await writeAuditLog(tx, {
        actorId,
        action: "user.created",
        entityType: "Utilisateur",
        entityId: user.id,
        newValues: { nom: user.nom, email: user.email, actif: user.actif },
        metadata: { roleIds: [...new Set(data.roleIds)] },
      });

      return user;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ConflictError("Un utilisateur avec cette adresse existe déjà.");
    }
    throw error;
  }
}

async function ensureAdminRemains(
  tx: Parameters<Parameters<typeof withSerializableRetry>[0]>[0],
  targetUserId: string,
) {
  const targetIsAdmin = await tx.userRole.findFirst({
    where: { utilisateurId: targetUserId, role: { code: ROLES.ADMIN } },
    select: { id: true },
  });
  if (!targetIsAdmin) return;

  const activeAdmins = await tx.utilisateur.count({
    where: {
      actif: true,
      roles: { some: { role: { code: ROLES.ADMIN } } },
    },
  });
  if (activeAdmins <= 1) {
    throw new ConflictError("Le dernier administrateur actif doit être conservé.");
  }
}

export async function setUserActive(
  actorId: string,
  input: { userId: string; active: boolean },
) {
  const data = userActivationSchema.parse(input);
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.USERS_ACTIVATE, tx);
    const target = await tx.utilisateur.findUnique({
      where: { id: data.userId },
      select: { id: true, actif: true },
    });
    if (!target) throw new ValidationError("Utilisateur introuvable.");
    if (target.actif === data.active) return target;
    if (!data.active) await ensureAdminRemains(tx, data.userId);

    const updated = await tx.utilisateur.update({
      where: { id: data.userId },
      data: { actif: data.active, sessionVersion: { increment: 1 } },
      select: { id: true, actif: true },
    });
    await writeAuditLog(tx, {
      actorId,
      action: data.active ? "user.activated" : "user.deactivated",
      entityType: "Utilisateur",
      entityId: data.userId,
      oldValues: { actif: target.actif },
      newValues: { actif: updated.actif },
    });
    return updated;
  });
}

export async function setUserRole(
  actorId: string,
  input: { userId: string; roleId: string; assigned: boolean },
) {
  const data = userRoleSchema.parse(input);
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.USERS_ASSIGN_ROLES, tx);
    const target = await tx.utilisateur.findUnique({
      where: { id: data.userId },
      select: { id: true, actif: true },
    });
    const role = await tx.role.findUnique({
      where: { id: data.roleId },
      select: { id: true, code: true },
    });
    const existing = await tx.userRole.findUnique({
      where: {
        utilisateurId_roleId: {
          utilisateurId: data.userId,
          roleId: data.roleId,
        },
      },
    });
    if (!target || !role) throw new ValidationError("Utilisateur ou rôle introuvable.");
    if (Boolean(existing) === data.assigned) return existing;

    if (!data.assigned && role.code === ROLES.ADMIN && target.actif) {
      await ensureAdminRemains(tx, data.userId);
    }

    if (data.assigned) {
      await tx.userRole.create({
        data: { utilisateurId: data.userId, roleId: data.roleId },
      });
    } else {
      await tx.userRole.delete({
        where: {
          utilisateurId_roleId: {
            utilisateurId: data.userId,
            roleId: data.roleId,
          },
        },
      });
    }

    await tx.utilisateur.update({
      where: { id: data.userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await writeAuditLog(tx, {
      actorId,
      action: data.assigned ? "user.role_assigned" : "user.role_removed",
      entityType: "Utilisateur",
      entityId: data.userId,
      metadata: { roleId: role.id, roleCode: role.code },
    });
    return { assigned: data.assigned };
  });
}

export async function resetUserPassword(
  actorId: string,
  input: { userId: string; password: string },
) {
  const data = resetPasswordSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, PERMISSIONS.USERS_UPDATE, tx);
    const target = await tx.utilisateur.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    if (!target) throw new ValidationError("Utilisateur introuvable.");

    const changedAt = new Date();
    await tx.utilisateur.update({
      where: { id: data.userId },
      data: {
        passwordHash,
        passwordChangedAt: changedAt,
        sessionVersion: { increment: 1 },
      },
    });
    await writeAuditLog(tx, {
      actorId,
      action: "user.password_reset",
      entityType: "Utilisateur",
      entityId: data.userId,
      metadata: { changedAt },
    });
  });
}

export async function listUsers(actorId: string, search = "") {
  await assertPermission(actorId, PERMISSIONS.USERS_READ);
  return prisma.utilisateur.findMany({
    where: search
      ? {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      nom: true,
      email: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
      roles: { select: { role: { select: { id: true, code: true, nom: true } } } },
    },
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
    take: 200,
  });
}
