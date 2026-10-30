import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { authenticateCredentials } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";
import { isActiveSession } from "@/lib/auth/session-policy";
import { AuthorizationError, ConflictError } from "@/lib/errors";
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLES,
  type RoleCode,
} from "@/lib/permissions/definitions";
import { hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { listAuditLogs } from "@/modules/audit/service";
import { setUserActive, setUserRole } from "@/modules/users/service";
import {
  decideAccessRequest,
  getRequestForActor,
} from "@/modules/validations/service";

const testUrl = process.env.TEST_DATABASE_URL;
const databaseName = testUrl ? new URL(testUrl).pathname.slice(1) : "";
const integrationEnabled = Boolean(testUrl && databaseName.includes("_test"));

describe.skipIf(!integrationEnabled)("database security integration", () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword("Correct-Horse-42!");
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        signatures, audit_logs, validations, mouvements, demandes_acces, documents, boites,
        emplacements, login_attempts, user_roles, role_permissions, permissions,
        roles, utilisateurs
      RESTART IDENTITY CASCADE
    `);
    await seedRbac();
  });

  it("rejects invalid credentials", async () => {
    await createTestUser(ROLES.DEMANDEUR);
    const result = await authenticateCredentials(
      { email: "user@example.test", password: "incorrect" },
      new Headers({ "x-real-ip": "127.0.0.10" }),
    );
    expect(result).toBeNull();
  });

  it("prevents inactive users from authenticating", async () => {
    await createTestUser(ROLES.DEMANDEUR, false);
    const result = await authenticateCredentials(
      { email: "user@example.test", password: "Correct-Horse-42!" },
      new Headers({ "x-real-ip": "127.0.0.11" }),
    );
    expect(result).toBeNull();
  });

  it("prevents a DEMANDEUR from approving a request", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const request = await createRequest(requester.id);
    await expect(
      decideAccessRequest(requester.id, {
        demandeId: request.id,
        decision: "APPROUVEE",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("lets a VALIDATEUR approve a pending available request", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const validator = await createTestUser(ROLES.VALIDATEUR, true, "validator@example.test");
    const request = await createRequest(requester.id);
    const validation = await decideAccessRequest(validator.id, {
      demandeId: request.id,
      decision: "APPROUVEE",
      commentaire: "Accès justifié.",
    });
    expect(validation.decision).toBe("APPROUVEE");
    await expect(prisma.demandeAcces.findUniqueOrThrow({ where: { id: request.id } })).resolves.toMatchObject({ statut: "APPROUVEE" });
    expect(await prisma.mouvement.count({ where: { demandeId: request.id } })).toBe(0);
  });

  it("rejects duplicate and reversed decisions", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const validator = await createTestUser(ROLES.VALIDATEUR, true, "validator@example.test");
    const request = await createRequest(requester.id);
    await decideAccessRequest(validator.id, { demandeId: request.id, decision: "APPROUVEE" });
    await expect(decideAccessRequest(validator.id, { demandeId: request.id, decision: "APPROUVEE" })).rejects.toBeInstanceOf(ConflictError);
    await expect(decideAccessRequest(validator.id, { demandeId: request.id, decision: "REFUSEE", commentaire: "Trop tard" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("enforces request ownership without read-all permission", async () => {
    const first = await createTestUser(ROLES.DEMANDEUR);
    const second = await createTestUser(ROLES.DEMANDEUR, true, "second@example.test");
    const request = await createRequest(first.id);
    await expect(getRequestForActor(first.id, request.id)).resolves.not.toBeNull();
    await expect(getRequestForActor(second.id, request.id)).resolves.toBeNull();
  });

  it("applies role changes to subsequent permission checks", async () => {
    const admin = await createTestUser(ROLES.ADMIN, true, "admin@example.test");
    const user = await createTestUser(ROLES.DEMANDEUR);
    const validatorRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLES.VALIDATEUR } });
    await expect(hasPermission(user.id, PERMISSIONS.DEMANDES_APPROVE)).resolves.toBe(false);
    await setUserRole(admin.id, { userId: user.id, roleId: validatorRole.id, assigned: true });
    await expect(hasPermission(user.id, PERMISSIONS.DEMANDES_APPROVE)).resolves.toBe(true);
  });

  it("invalidates access after account deactivation", async () => {
    const admin = await createTestUser(ROLES.ADMIN, true, "admin@example.test");
    const user = await createTestUser(ROLES.DEMANDEUR);
    const version = user.sessionVersion;
    await setUserActive(admin.id, { userId: user.id, active: false });
    const current = await prisma.utilisateur.findUniqueOrThrow({ where: { id: user.id } });
    expect(isActiveSession({ user: { id: user.id, sessionVersion: version } }, current)).toBe(false);
    expect(current.sessionVersion).toBe(version + 1);
  });

  it("commits approval, validation, and audit together", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const validator = await createTestUser(ROLES.VALIDATEUR, true, "validator@example.test");
    const request = await createRequest(requester.id);
    await decideAccessRequest(validator.id, { demandeId: request.id, decision: "REFUSEE", commentaire: "Dossier incomplet" });
    const [updated, validation, audit] = await Promise.all([
      prisma.demandeAcces.findUniqueOrThrow({ where: { id: request.id } }),
      prisma.validation.findUnique({ where: { demandeId: request.id } }),
      prisma.auditLog.findFirst({ where: { entityId: request.id, action: "access_request.rejected" } }),
    ]);
    expect(updated.statut).toBe("REFUSEE");
    expect(validation?.decision).toBe("REFUSEE");
    expect(audit).not.toBeNull();
  });

  it("serializes concurrent approval decisions", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const validator = await createTestUser(ROLES.VALIDATEUR, true, "validator@example.test");
    const request = await createRequest(requester.id);
    const results = await Promise.allSettled([
      decideAccessRequest(validator.id, { demandeId: request.id, decision: "APPROUVEE" }),
      decideAccessRequest(validator.id, { demandeId: request.id, decision: "REFUSEE", commentaire: "Refus concurrent" }),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(await prisma.validation.count({ where: { demandeId: request.id } })).toBe(1);
  });

  it("prevents audit updates and deletion at the database boundary", async () => {
    const log = await prisma.auditLog.create({ data: { action: "test.created", entityType: "Test" } });
    await expect(prisma.auditLog.update({ where: { id: log.id }, data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/append-only/);
  });

  it("denies audit-log access without the audit permission", async () => {
    const requester = await createTestUser(ROLES.DEMANDEUR);
    await expect(listAuditLogs(requester.id)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("resolves business references, translated filters and pagination without mutating history", async () => {
    const admin = await createTestUser(ROLES.ADMIN, true, "admin@example.test");
    const requester = await createTestUser(ROLES.DEMANDEUR);
    const validator = await createTestUser(ROLES.VALIDATEUR, true, "validator@example.test");
    const request = await createRequest(requester.id);
    await decideAccessRequest(validator.id, {
      demandeId: request.id,
      decision: "APPROUVEE",
      commentaire: "Accès métier confirmé.",
    });
    const document = await prisma.document.findUniqueOrThrow({ where: { id: request.documentId } });
    const countBeforeRead = await prisma.auditLog.count();

    const result = await listAuditLogs(admin.id, {
      search: document.reference,
      action: "access_request.approved",
      page: "1",
      pageSize: "1",
    });

    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 1 });
    expect(result.items[0]).toMatchObject({
      actor: { name: "User VALIDATEUR", email: "validator@example.test" },
      action: { label: "Demande d'accès approuvée" },
      subject: { businessReference: document.reference },
    });
    expect(result.items[0]?.metadataDetails).toContainEqual({ label: "Commentaire", value: "Accès métier confirmé." });
    expect(result.items[0]?.description).toContain(document.reference);
    expect(await prisma.auditLog.count()).toBe(countBeforeRead);
  });

  it("handles missing metadata and withholds technical payloads from non-administrators", async () => {
    const archivist = await createTestUser(ROLES.ARCHIVISTE, true, "archivist@example.test");
    const archivistRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLES.ARCHIVISTE } });
    const auditPermission = await prisma.permission.findUniqueOrThrow({ where: { code: PERMISSIONS.AUDIT_READ } });
    await prisma.rolePermission.create({
      data: { roleId: archivistRole.id, permissionId: auditPermission.id },
    });
    await prisma.auditLog.create({
      data: { action: "document.updated", entityType: "Document" },
    });

    const result = await listAuditLogs(archivist.id, { action: "document.updated" });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      actor: { name: "Le système" },
      action: { label: "Document modifié" },
      subject: { label: "Document" },
      summaryDetails: [],
      metadataDetails: [],
      previousValues: [],
      newValues: [],
      canViewTechnicalDetails: false,
      technicalDetails: [],
      technicalPayload: { metadata: null, oldValues: null, newValues: null },
    });
  });

  async function seedRbac() {
    for (const permission of PERMISSION_DEFINITIONS) await prisma.permission.create({ data: permission });
    for (const definition of ROLE_DEFINITIONS) {
      const role = await prisma.role.create({ data: { code: definition.code, nom: definition.nom, description: definition.description, systeme: true } });
      const permissions = await prisma.permission.findMany({ where: { code: { in: [...definition.permissions] } } });
      await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
    }
  }

  async function createTestUser(roleCode: RoleCode, active = true, email = "user@example.test") {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    return prisma.utilisateur.create({ data: { nom: `User ${roleCode}`, email, actif: active, passwordHash, passwordChangedAt: new Date(), roles: { create: { roleId: role.id } } } });
  }

  async function createRequest(demandeurId: string) {
    const suffix = randomUUID();
    const location = await prisma.emplacement.create({ data: { zone: `Z-${suffix}`, rack: "R1", niveau: "N1" } });
    const box = await prisma.boite.create({ data: { code: `BOX-${suffix}`, emplacementId: location.id } });
    const document = await prisma.document.create({ data: { reference: `DOC-${suffix}`, titre: "Dossier test", boiteId: box.id } });
    return prisma.demandeAcces.create({ data: { type: "SORTIE", motif: "Consultation de test", documentId: document.id, demandeurId } });
  }
});
