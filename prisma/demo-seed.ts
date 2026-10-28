import argon2 from "argon2";

import type { Prisma } from "../generated/prisma/client";
import { passwordSchema } from "../lib/auth/schemas";
import { ROLES } from "../lib/permissions/definitions";
import { writeImmutableSignatureEvidence } from "../modules/signatures/storage-path";
import { buildDemoDataset, DEMO_BATCH, DEMO_MARKER } from "./seed-data/demo";
import {
  createDemoPrisma,
  inspectSafeLocalDatabase,
  loadDemoEnvironment,
  verifyConnectedDatabaseIdentity,
} from "./seed-utils/context";
import { deterministicUuid } from "./seed-utils/deterministic";

loadDemoEnvironment();

const { databaseUrl, identity } = inspectSafeLocalDatabase({ requireWriteOptIn: true });
const prisma = createDemoPrisma(databaseUrl);

type InsertCounts = Record<
  "locations" | "boxes" | "documents" | "users" | "userRoles" | "requests" |
  "validations" | "movements" | "signatures" | "audits",
  number
>;

async function main() {
  await verifyConnectedDatabaseIdentity(prisma, identity);
  const dataset = buildDemoDataset();
  const loginEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
  const passwordHash = await demoPasswordHash(loginEnabled);

  const roles = await prisma.role.findMany({
    where: { code: { in: Object.values(ROLES) } },
    select: { id: true, code: true },
  });
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]));
  const missingRoles = Object.values(ROLES).filter((code) => !roleByCode.has(code));
  if (missingRoles.length) {
    throw new Error(`Missing system roles (${missingRoles.join(", ")}). Run npm run db:seed first.`);
  }

  await assertNoOwnershipConflicts(dataset);
  for (const signature of dataset.signatures) {
    await writeImmutableSignatureEvidence(
      signature.storageKey,
      dataset.signatureBytes,
      dataset.signatureChecksum,
    );
  }

  const userRows: Prisma.UtilisateurCreateManyInput[] = dataset.users.map((user) => ({
    id: user.id,
    nom: user.nom,
    email: user.email,
    actif: user.actif,
    passwordHash,
    passwordChangedAt: passwordHash ? new Date() : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
  const userRoles: Prisma.UserRoleCreateManyInput[] = dataset.users.map((user) => ({
    id: deterministicUuid(DEMO_BATCH, `user-role-${user.email}-${user.roleCode}`),
    utilisateurId: user.id!,
    roleId: roleByCode.get(user.roleCode)!,
    assignedAt: user.createdAt,
  }));

  const inserted = await prisma.$transaction(async (tx) => {
    const counts = {} as InsertCounts;
    counts.locations = (await tx.emplacement.createMany({ data: dataset.locations, skipDuplicates: true })).count;
    counts.boxes = (await tx.boite.createMany({ data: dataset.boxes, skipDuplicates: true })).count;
    counts.documents = await createDocumentsInBatches(tx, dataset.documents);
    counts.users = (await tx.utilisateur.createMany({ data: userRows, skipDuplicates: true })).count;

    let loginUsersUpdated = 0;
    if (passwordHash) {
      loginUsersUpdated = (await tx.utilisateur.updateMany({
        where: { id: { in: dataset.users.map((user) => user.id!) }, passwordHash: null },
        data: { passwordHash, passwordChangedAt: new Date() },
      })).count;
    }

    counts.userRoles = (await tx.userRole.createMany({ data: userRoles, skipDuplicates: true })).count;
    counts.requests = (await tx.demandeAcces.createMany({ data: dataset.requests, skipDuplicates: true })).count;
    counts.validations = (await tx.validation.createMany({ data: dataset.validations, skipDuplicates: true })).count;
    counts.movements = (await tx.mouvement.createMany({ data: dataset.movements, skipDuplicates: true })).count;
    counts.signatures = (await tx.signature.createMany({ data: dataset.signatures, skipDuplicates: true })).count;
    counts.audits = await createAuditsInBatches(tx, dataset.audits);
    return { counts, loginUsersUpdated };
  }, { isolationLevel: "Serializable", timeout: 60_000 });

  const targets: InsertCounts = {
    locations: dataset.locations.length,
    boxes: dataset.boxes.length,
    documents: dataset.documents.length,
    users: dataset.users.length,
    userRoles: userRoles.length,
    requests: dataset.requests.length,
    validations: dataset.validations.length,
    movements: dataset.movements.length,
    signatures: dataset.signatures.length,
    audits: dataset.audits.length,
  };
  const skipped = Object.fromEntries(
    Object.entries(targets).map(([key, target]) => [key, target - inserted.counts[key as keyof InsertCounts]]),
  );

  console.log(JSON.stringify({
    ok: true,
    batch: DEMO_BATCH,
    database: identity,
    loginEnabled,
    inserted: inserted.counts,
    skipped,
    loginUsersUpdated: inserted.loginUsersUpdated,
  }, null, 2));
}

async function demoPasswordHash(enabled: boolean) {
  if (!enabled) return null;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password) {
    throw new Error("DEMO_LOGIN_ENABLED=true requires DEMO_USER_PASSWORD; it is never logged or stored in source control.");
  }
  const parsed = passwordSchema.parse(password);
  return argon2.hash(parsed, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function createDocumentsInBatches(
  tx: Prisma.TransactionClient,
  rows: Prisma.DocumentCreateManyInput[],
) {
  let count = 0;
  for (let offset = 0; offset < rows.length; offset += 200) {
    count += (await tx.document.createMany({ data: rows.slice(offset, offset + 200), skipDuplicates: true })).count;
  }
  return count;
}

async function createAuditsInBatches(
  tx: Prisma.TransactionClient,
  rows: Prisma.AuditLogCreateManyInput[],
) {
  let count = 0;
  for (let offset = 0; offset < rows.length; offset += 200) {
    count += (await tx.auditLog.createMany({ data: rows.slice(offset, offset + 200), skipDuplicates: true })).count;
  }
  return count;
}

async function assertNoOwnershipConflicts(dataset: ReturnType<typeof buildDemoDataset>) {
  const [locations, boxes, documents, users, requests, validations, movements, signatures, audits] = await Promise.all([
    prisma.emplacement.findMany({ where: { OR: [
      { id: { in: dataset.locations.map((row) => row.id!) } },
      ...dataset.locations.map((row) => ({ zone: row.zone, rack: row.rack, niveau: row.niveau })),
    ] } }),
    prisma.boite.findMany({ where: { OR: [
      { id: { in: dataset.boxes.map((row) => row.id!) } },
      { code: { in: dataset.boxes.map((row) => row.code) } },
    ] } }),
    prisma.document.findMany({ where: { OR: [
      { id: { in: dataset.documents.map((row) => row.id!) } },
      { reference: { in: dataset.documents.map((row) => row.reference) } },
    ] } }),
    prisma.utilisateur.findMany({ where: { OR: [
      { id: { in: dataset.users.map((row) => row.id!) } },
      { email: { in: dataset.users.map((row) => row.email) } },
    ] } }),
    prisma.demandeAcces.findMany({ where: { id: { in: dataset.requests.map((row) => row.id!) } } }),
    prisma.validation.findMany({ where: { OR: [
      { id: { in: dataset.validations.map((row) => row.id!) } },
      { demandeId: { in: dataset.validations.map((row) => row.demandeId) } },
    ] } }),
    prisma.mouvement.findMany({ where: { OR: [
      { id: { in: dataset.movements.map((row) => row.id!) } },
      { demandeId: { in: dataset.movements.map((row) => row.demandeId) } },
    ] } }),
    prisma.signature.findMany({ where: { OR: [
      { id: { in: dataset.signatures.map((row) => row.id!) } },
      { mouvementId: { in: dataset.signatures.map((row) => row.mouvementId) } },
      { storageKey: { in: dataset.signatures.map((row) => row.storageKey) } },
    ] } }),
    prisma.auditLog.findMany({ where: { id: { in: dataset.audits.map((row) => row.id!) } } }),
  ]);

  const expectedLocationIds = new Map(dataset.locations.map((row) => [`${row.zone}|${row.rack}|${row.niveau}`, row.id]));
  for (const row of locations) {
    if (row.id !== expectedLocationIds.get(`${row.zone}|${row.rack}|${row.niveau}`)) {
      throw new Error(`Refusing to reuse non-demo location ${row.zone}/${row.rack}/${row.niveau}.`);
    }
  }
  const expectedBoxIds = new Map(dataset.boxes.map((row) => [row.code, row.id]));
  for (const row of boxes) if (row.id !== expectedBoxIds.get(row.code) || !row.description?.startsWith(DEMO_MARKER)) {
    throw new Error(`Refusing to reuse non-demo box ${row.code}.`);
  }
  const expectedDocumentIds = new Map(dataset.documents.map((row) => [row.reference, row.id]));
  for (const row of documents) if (row.id !== expectedDocumentIds.get(row.reference) || !row.description?.startsWith(DEMO_MARKER)) {
    throw new Error(`Refusing to reuse non-demo document ${row.reference}.`);
  }
  const expectedUserIds = new Map(dataset.users.map((row) => [row.email, row.id]));
  for (const row of users) if (row.id !== expectedUserIds.get(row.email) || !row.nom.startsWith(DEMO_MARKER)) {
    throw new Error(`Refusing to reuse non-demo user ${row.email}.`);
  }
  for (const row of requests) if (!row.motif.startsWith(DEMO_MARKER)) throw new Error(`Request UUID collision: ${row.id}.`);
  const expectedValidationIds = new Set(dataset.validations.map((row) => row.id));
  for (const row of validations) if (!expectedValidationIds.has(row.id) || !row.commentaire?.startsWith(DEMO_MARKER)) {
    throw new Error(`Validation ownership conflict: ${row.id}.`);
  }
  const expectedMovements = new Map(dataset.movements.map((row) => [row.id, row]));
  for (const row of movements) {
    const expected = expectedMovements.get(row.id);
    if (!expected || expected.demandeId !== row.demandeId || expected.documentId !== row.documentId) {
      throw new Error(`Movement ownership conflict: ${row.id}.`);
    }
  }
  const expectedSignatures = new Map(dataset.signatures.map((row) => [row.id, row]));
  for (const row of signatures) {
    const expected = expectedSignatures.get(row.id);
    if (!expected || expected.mouvementId !== row.mouvementId || expected.storageKey !== row.storageKey || expected.checksum !== row.checksum) {
      throw new Error(`Signature ownership conflict: ${row.id}.`);
    }
  }
  const expectedAudits = new Map(dataset.audits.map((row) => [row.id, row]));
  for (const row of audits) {
    const expected = expectedAudits.get(row.id);
    if (!expected || expected.action !== row.action || expected.entityType !== row.entityType || expected.entityId !== row.entityId) {
      throw new Error(`Audit ownership conflict: ${row.id}.`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(JSON.stringify({
      ok: false,
      batch: DEMO_BATCH,
      error: error instanceof Error ? error.message : "Demo seed failed.",
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
