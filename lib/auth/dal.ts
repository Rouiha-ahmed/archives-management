import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";
import { isActiveSession } from "@/lib/auth/session-policy";
import type { PermissionCode } from "@/lib/permissions/definitions";
import { prisma } from "@/lib/prisma";

export type ActiveUser = {
  id: string;
  nom: string;
  email: string;
  roles: string[];
  permissions: PermissionCode[];
};

export const getOptionalActiveUser = cache(async (): Promise<ActiveUser | null> => {
  // Auth.js uses request-specific cryptographic state. Keep it outside the
  // Cache Components prerender pass and deduplicate it only within a request.
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.utilisateur.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      email: true,
      actif: true,
      sessionVersion: true,
      roles: {
        select: {
          role: {
            select: {
              code: true,
              permissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !isActiveSession(session, user)) return null;

  return {
    id: user.id,
    nom: user.nom,
    email: user.email,
    roles: user.roles.map(({ role }) => role.code),
    permissions: [
      ...new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.code),
        ),
      ),
    ] as PermissionCode[],
  };
});

export async function requireActiveUser() {
  const user = await getOptionalActiveUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: PermissionCode) {
  const user = await requireActiveUser();
  if (!user.permissions.includes(permission)) redirect("/interdit");
  return user;
}
