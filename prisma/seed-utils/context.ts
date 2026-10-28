import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

export type SafeDatabaseIdentity = {
  host: string;
  port: number;
  database: string;
  schema: string;
  nodeEnv: string;
};

export function loadDemoEnvironment() {
  loadEnvConfig(process.cwd());
}

export function inspectSafeLocalDatabase(options: { requireWriteOptIn: boolean }) {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL is not configured.");

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL; the target cannot be safely identified.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Demo tooling only supports PostgreSQL URLs.");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local database host: ${parsed.hostname || "<empty>"}.`);
  }
  const port = Number(parsed.port || "5432");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("The PostgreSQL port cannot be safely identified.");
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database || ["postgres", "template0", "template1"].includes(database.toLowerCase())) {
    throw new Error("Refusing to use an unidentified or administrative PostgreSQL database.");
  }
  if (/(^|[_-])(prod|production|stage|staging)([_-]|$)/i.test(database)) {
    throw new Error(`Refusing database name that appears non-development: ${database}.`);
  }

  const nodeEnv = process.env.NODE_ENV ?? "";
  const deploymentEnvironment = [
    process.env.APP_ENV,
    process.env.VERCEL_ENV,
    process.env.DEPLOYMENT_ENV,
  ].filter(Boolean).join(" ");
  if (nodeEnv === "production" || /prod|production|stage|staging/i.test(deploymentEnvironment)) {
    throw new Error("Refusing to operate in a production or staging environment.");
  }
  if (options.requireWriteOptIn && nodeEnv !== "development") {
    throw new Error("Demo seeding requires NODE_ENV=development.");
  }
  if (options.requireWriteOptIn && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seeding is locked. Set ALLOW_DEMO_SEED=true for this command only.");
  }

  return {
    databaseUrl: rawUrl,
    identity: {
      host: parsed.hostname,
      port,
      database,
      schema: parsed.searchParams.get("schema") || "public",
      nodeEnv: nodeEnv || "unset",
    } satisfies SafeDatabaseIdentity,
  };
}

export function createDemoPrisma(databaseUrl: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function verifyConnectedDatabaseIdentity(
  prisma: PrismaClient,
  expected: SafeDatabaseIdentity,
) {
  const [row] = await prisma.$queryRaw<Array<{
    database_name: string;
    server_address: string | null;
    server_port: number;
  }>>`
    SELECT current_database() AS database_name,
           host(inet_server_addr()) AS server_address,
           inet_server_port() AS server_port
  `;
  if (!row || row.database_name !== expected.database || row.server_port !== expected.port) {
    throw new Error("Connected PostgreSQL identity does not match DATABASE_URL.");
  }
  if (row.server_address && !["127.0.0.1", "::1"].includes(row.server_address)) {
    throw new Error(`Connected PostgreSQL server is not loopback-local: ${row.server_address}.`);
  }
  return row;
}
