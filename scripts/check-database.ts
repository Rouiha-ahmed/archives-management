import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const expectedTables = [
  "boites",
  "demandes_acces",
  "documents",
  "emplacements",
  "mouvements",
  "utilisateurs",
  "roles",
  "permissions",
  "user_roles",
  "role_permissions",
  "validations",
  "audit_logs",
  "login_attempts",
  "signatures",
] as const;

async function main() {
  await prisma.$queryRaw`SELECT 1`;

  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'boites',
        'demandes_acces',
        'documents',
        'emplacements',
        'mouvements',
        'utilisateurs',
        'roles',
        'permissions',
        'user_roles',
        'role_permissions',
        'validations',
        'audit_logs',
        'login_attempts',
        'signatures'
      )
    ORDER BY table_name
  `;

  const actualTables = new Set(rows.map(({ table_name }) => table_name));
  const missingTables = expectedTables.filter(
    (tableName) => !actualTables.has(tableName),
  );

  if (missingTables.length > 0) {
    throw new Error(`Missing database tables: ${missingTables.join(", ")}`);
  }

  console.log(
    `Database connection successful. Verified ${rows.length} application tables.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
