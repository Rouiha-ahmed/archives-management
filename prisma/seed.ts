import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

import { PrismaClient } from "../generated/prisma/client";
import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  ROLES,
} from "../lib/permissions/definitions";
import { passwordSchema } from "../lib/auth/schemas";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function seedAuthorization() {
  await prisma.$transaction(async (tx) => {
    for (const permission of PERMISSION_DEFINITIONS) {
      await tx.permission.upsert({
        where: { code: permission.code },
        create: permission,
        update: { description: permission.description },
      });
    }

    for (const definition of ROLE_DEFINITIONS) {
      const role = await tx.role.upsert({
        where: { code: definition.code },
        create: {
          code: definition.code,
          nom: definition.nom,
          description: definition.description,
          systeme: true,
        },
        update: {
          nom: definition.nom,
          description: definition.description,
          systeme: true,
        },
      });

      const permissions = await tx.permission.findMany({
        where: { code: { in: [...definition.permissions] } },
        select: { id: true },
      });
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          create: { roleId: role.id, permissionId: permission.id },
          update: {},
        });
      }
    }
  });
}

async function ensureAdministrator() {
  const activeAdmin = await prisma.utilisateur.findFirst({
    where: {
      actif: true,
      passwordHash: { not: null },
      roles: { some: { role: { code: ROLES.ADMIN } } },
    },
    select: { id: true },
  });
  if (activeAdmin) return;

  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!name || !email || !password) {
    throw new Error(
      "No active administrator exists. Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD, then run the seed again.",
    );
  }

  const parsedPassword = passwordSchema.parse(password);
  const passwordHash = await argon2.hash(parsedPassword, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.$transaction(async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { code: ROLES.ADMIN } });
    const user = await tx.utilisateur.upsert({
      where: { email },
      create: {
        nom: name,
        email,
        actif: true,
        passwordHash,
        passwordChangedAt: new Date(),
      },
      update: {
        nom: name,
        actif: true,
        passwordHash,
        passwordChangedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    await tx.userRole.upsert({
      where: {
        utilisateurId_roleId: { utilisateurId: user.id, roleId: role.id },
      },
      create: { utilisateurId: user.id, roleId: role.id },
      update: {},
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.bootstrap_admin",
        entityType: "Utilisateur",
        entityId: user.id,
        newValues: { nom: user.nom, email: user.email, actif: true },
        metadata: { source: "secure-bootstrap" },
      },
    });
  });
}

async function main() {
  await seedAuthorization();
  await ensureAdministrator();
  console.log("RBAC seed completed. An active administrator is available.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
