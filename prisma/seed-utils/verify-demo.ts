import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient } from "../../generated/prisma/client";
import { absoluteSignatureStoragePath } from "../../modules/signatures/storage-path";
import { buildDemoDataset, DEMO_ANCHOR, DEMO_BATCH } from "../seed-data/demo";
import type { SafeDatabaseIdentity } from "./context";

type Check = {
  id: string;
  ok: boolean;
  expected: unknown;
  actual: unknown;
  detail?: string;
};

export async function verifyDemoDataset(
  prisma: PrismaClient,
  database: SafeDatabaseIdentity,
) {
  const expected = buildDemoDataset();
  const ids = {
    locations: expected.locations.map((row) => row.id!),
    boxes: expected.boxes.map((row) => row.id!),
    documents: expected.documents.map((row) => row.id!),
    users: expected.users.map((row) => row.id!),
    requests: expected.requests.map((row) => row.id!),
    movements: expected.movements.map((row) => row.id!),
    validations: expected.validations.map((row) => row.id!),
    signatures: expected.signatures.map((row) => row.id!),
    audits: expected.audits.map((row) => row.id!),
  };

  const [locations, boxes, documents, users, requests, movements, validations, signatures, audits, duplicateActive, invalidRequestMovements] = await Promise.all([
    prisma.emplacement.findMany({ where: { id: { in: ids.locations } } }),
    prisma.boite.findMany({ where: { id: { in: ids.boxes } } }),
    prisma.document.findMany({ where: { id: { in: ids.documents } } }),
    prisma.utilisateur.findMany({ where: { id: { in: ids.users } }, include: { roles: { include: { role: true } } } }),
    prisma.demandeAcces.findMany({ where: { id: { in: ids.requests } } }),
    prisma.mouvement.findMany({ where: { id: { in: ids.movements } } }),
    prisma.validation.findMany({ where: { id: { in: ids.validations } } }),
    prisma.signature.findMany({ where: { id: { in: ids.signatures } } }),
    prisma.auditLog.findMany({ where: { id: { in: ids.audits } } }),
    prisma.$queryRaw<Array<{ document_id: string; count: bigint }>>`
      SELECT document_id, COUNT(*)::bigint AS count
      FROM mouvements
      WHERE date_retour IS NULL
      GROUP BY document_id
      HAVING COUNT(*) > 1
    `,
    prisma.$queryRaw<Array<{ statut: string; count: bigint }>>`
      SELECT d.statut::text AS statut, COUNT(*)::bigint AS count
      FROM demandes_acces d
      JOIN mouvements m ON m.demande_id = d.id
      WHERE d.statut IN ('EN_ATTENTE', 'REFUSEE')
      GROUP BY d.statut
    `,
  ]);

  const boxIds = new Set(boxes.map((row) => row.id));
  const locationIds = new Set(locations.map((row) => row.id));
  const documentById = new Map(documents.map((row) => [row.id, row]));
  const requestById = new Map(requests.map((row) => [row.id, row]));
  const validationByRequest = new Map(validations.map((row) => [row.demandeId, row]));
  const userIds = new Set(users.map((row) => row.id));
  const activeMovements = movements.filter((row) => !row.dateRetour);
  const returnedMovements = movements.filter((row) => row.dateRetour);
  const anchorOverdue = activeMovements.filter((row) => row.retourPrevu && row.retourPrevu < DEMO_ANCHOR);
  const anchorActive = activeMovements.filter((row) => row.retourPrevu && row.retourPrevu >= DEMO_ANCHOR);
  const checks: Check[] = [];
  const count = (id: string, expectedCount: number, actualCount: number) => checks.push({
    id,
    ok: actualCount === expectedCount,
    expected: expectedCount,
    actual: actualCount,
  });

  count("counts.locations", expected.locations.length, locations.length);
  count("counts.boxes", expected.boxes.length, boxes.length);
  count("counts.documents", expected.documents.length, documents.length);
  count("counts.users", expected.users.length, users.length);
  count("counts.requests", expected.requests.length, requests.length);
  count("counts.movements", expected.movements.length, movements.length);
  count("counts.validations", expected.validations.length, validations.length);
  count("counts.signatures", expected.signatures.length, signatures.length);
  count("counts.audits", expected.audits.length, audits.length);

  checkEvery(checks, "relations.documents_have_demo_box", documents, (row) => boxIds.has(row.boiteId));
  checkEvery(checks, "relations.boxes_have_demo_location", boxes, (row) => locationIds.has(row.emplacementId));
  checkEvery(checks, "relations.requests_valid", requests, (row) => documentById.has(row.documentId) && userIds.has(row.demandeurId));
  checkEvery(checks, "relations.movements_match_requests", movements, (row) => {
    const request = requestById.get(row.demandeId);
    return Boolean(request && request.documentId === row.documentId && request.type === "SORTIE" && request.demandeurId === row.utilisateurId);
  });
  checks.push({ id: "movements.no_duplicate_active", ok: duplicateActive.length === 0, expected: 0, actual: duplicateActive.length });
  checks.push({
    id: "movements.no_pending_or_rejected",
    ok: invalidRequestMovements.length === 0,
    expected: 0,
    actual: invalidRequestMovements.reduce((total, row) => total + Number(row.count), 0),
  });
  checkEvery(checks, "movements.active_documents_are_out", activeMovements, (row) => documentById.get(row.documentId)?.statut === "SORTI");
  checkEvery(checks, "movements.returned_document_status", returnedMovements, (row) => {
    const status = documentById.get(row.documentId)?.statut;
    return row.etatRetour === "BON" ? status === "DISPONIBLE" : status === "INDISPONIBLE";
  });
  checkEvery(checks, "validations.match_request_state", requests.filter((row) => row.statut !== "EN_ATTENTE"), (row) => {
    const validation = validationByRequest.get(row.id);
    const expectedDecision = row.statut === "REFUSEE" ? "REFUSEE" : "APPROUVEE";
    return validation?.decision === expectedDecision && userIds.has(validation.validateurId);
  });
  checks.push({ id: "movements.distribution.active", ok: anchorActive.length === 30, expected: 30, actual: anchorActive.length });
  checks.push({ id: "movements.distribution.returned", ok: returnedMovements.length === 35, expected: 35, actual: returnedMovements.length });
  checks.push({ id: "movements.distribution.overdue", ok: anchorOverdue.length === 15, expected: 15, actual: anchorOverdue.length });
  checkEvery(checks, "rbac.expected_role_assigned", users, (user) => {
    const expectedUser = expected.users.find((row) => row.id === user.id);
    return Boolean(expectedUser && user.roles.some(({ role }) => role.code === expectedUser.roleCode));
  });
  checkEvery(checks, "audit.synthetic_metadata", audits, (row) => {
    const metadata = row.metadata as Record<string, unknown> | null;
    return metadata?.demoBatch === DEMO_BATCH && metadata.synthetic === true;
  });

  const signatureFileFailures: string[] = [];
  for (const signature of signatures) {
    try {
      const bytes = await readFile(absoluteSignatureStoragePath(signature.storageKey));
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (checksum !== signature.checksum || checksum !== expected.signatureChecksum) {
        signatureFileFailures.push(signature.storageKey);
      }
    } catch {
      signatureFileFailures.push(signature.storageKey);
    }
  }
  checks.push({
    id: "signatures.valid_stored_files",
    ok: signatures.length === expected.signatures.length && signatureFileFailures.length === 0,
    expected: { files: expected.signatures.length, failures: 0 },
    actual: { files: signatures.length, failures: signatureFileFailures.length },
  });

  const qrRoute = path.join(process.cwd(), "app", "(protected)", "boites", "[id]", "page.tsx");
  let qrRouteExists = true;
  try { await access(qrRoute); } catch { qrRouteExists = false; }
  checks.push({
    id: "qr.box_targets_resolve",
    ok: qrRouteExists && boxes.length === expected.boxes.length,
    expected: { route: "/boites/{boxId}", boxes: expected.boxes.length },
    actual: { routeExists: qrRouteExists, boxes: boxes.length },
  });

  const loginEnabledUsers = users.filter((user) => user.passwordHash).length;
  checks.push({
    id: "users.login_configuration",
    ok: loginEnabledUsers === 0 || loginEnabledUsers === expected.users.length,
    expected: "0 (not opted in) or 20 (opted in)",
    actual: loginEnabledUsers,
  });

  const failed = checks.filter((check) => !check.ok);
  return {
    ok: failed.length === 0,
    batch: DEMO_BATCH,
    verifiedAt: new Date().toISOString(),
    database,
    counts: {
      locations: locations.length,
      boxes: boxes.length,
      documents: documents.length,
      users: users.length,
      requests: requests.length,
      validations: validations.length,
      movements: movements.length,
      signatures: signatures.length,
      audits: audits.length,
      loginEnabledUsers,
    },
    requestStatusDistribution: distribution(requests.map((row) => row.statut)),
    documentStatusDistribution: distribution(documents.map((row) => row.statut)),
    movementDistribution: { active: anchorActive.length, returned: returnedMovements.length, overdue: anchorOverdue.length },
    checks,
    failures: failed.map((check) => check.id),
    samples: {
      document: "DEMO-DOC-0001",
      box: "DEMO-B-001",
      pendingRequestId: expected.requests[80].id,
      rejectedRequestId: expected.requests[120].id,
      approvedForHandoverRequestId: expected.requests[105].id,
      activeMovementId: expected.movements[0].id,
      overdueMovementId: expected.movements[65].id,
      qrPath: `/boites/${expected.boxes[0].id}`,
    },
  };
}

function checkEvery<T>(checks: Check[], id: string, values: T[], predicate: (value: T) => boolean) {
  const failures = values.filter((value) => !predicate(value)).length;
  checks.push({ id, ok: failures === 0, expected: 0, actual: failures });
}

function distribution(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
}
