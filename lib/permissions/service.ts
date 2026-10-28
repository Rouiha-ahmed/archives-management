import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { AuthorizationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { PermissionCode } from "@/lib/permissions/definitions";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function hasPermission(
  userId: string,
  permission: PermissionCode,
  database: DatabaseClient = prisma,
) {
  const user = await database.utilisateur.findFirst({
    where: {
      id: userId,
      actif: true,
      roles: {
        some: {
          role: {
            permissions: {
              some: { permission: { code: permission } },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  return user !== null;
}

export async function assertPermission(
  userId: string,
  permission: PermissionCode,
  database: DatabaseClient = prisma,
) {
  if (!(await hasPermission(userId, permission, database))) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}

export async function getPermissionCodes(
  userId: string,
  database: DatabaseClient = prisma,
) {
  const assignments = await database.userRole.findMany({
    where: { utilisateurId: userId, utilisateur: { actif: true } },
    select: {
      role: {
        select: {
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  });

  return [
    ...new Set(
      assignments.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.code),
      ),
    ),
  ];
}
