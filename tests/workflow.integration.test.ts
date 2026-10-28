import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { overdueDays } from "@/lib/date";
import { AuthorizationError, ConflictError, ValidationError } from "@/lib/errors";
import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, ROLES, type RoleCode } from "@/lib/permissions/definitions";
import { prisma } from "@/lib/prisma";
import { createDocument, getDocument } from "@/modules/archives/service";
import { createBoite, getBoite } from "@/modules/boites/service";
import { createAccessRequest } from "@/modules/demandes/service";
import { createEmplacement } from "@/modules/emplacements/service";
import { confirmHandover, confirmReturn } from "@/modules/mouvements/service";
import { decideAccessRequest } from "@/modules/validations/service";

const testUrl = process.env.TEST_DATABASE_URL;
const databaseName = testUrl ? new URL(testUrl).pathname.slice(1) : "";
const integrationEnabled = Boolean(testUrl && databaseName.includes("_test"));

describe.skipIf(!integrationEnabled)("Step 4 archives workflow integration", () => {
  let passwordHash: string;

  beforeAll(async () => { passwordHash = await hashPassword("Correct-Horse-42!"); });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE signatures, audit_logs, validations, mouvements,
        demandes_acces, documents, boites, emplacements, login_attempts,
        user_roles, role_permissions, permissions, roles, utilisateurs
      RESTART IDENTITY CASCADE
    `);
    await seedRbac();
  });

  it("1. enforces unique document references", async () => {
    const { archivist, box } = await fixture();
    await createDocument(archivist.id, documentInput(box.id, "DOC-UNIQUE"));
    await expect(createDocument(archivist.id, documentInput(box.id, "DOC-UNIQUE"))).rejects.toBeInstanceOf(ConflictError);
  });

  it("2. enforces unique archive box codes", async () => {
    const archivist = await createUser(ROLES.ARCHIVISTE);
    const location = await prisma.emplacement.create({ data: { zone: "A", rack: "R1", niveau: "N1" } });
    await createBoite(archivist.id, { code: "BOX-001", emplacementId: location.id, description: "" });
    await expect(createBoite(archivist.id, { code: "BOX-001", emplacementId: location.id, description: "" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("3. enforces storage location combination integrity", async () => {
    const archivist = await createUser(ROLES.ARCHIVISTE);
    await createEmplacement(archivist.id, { zone: "A", rack: "R1", niveau: "N1" });
    await expect(createEmplacement(archivist.id, { zone: "A", rack: "R1", niveau: "N1" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("4. rejects QR-resolved box access without archive privileges", async () => {
    const { box } = await fixture();
    const validator = await createUser(ROLES.VALIDATEUR, "validator@example.test");
    await expect(getBoite(validator.id, box.id)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("5. rejects object-level access to confidential documents", async () => {
    const { requester, document } = await fixture({ confidential: true });
    await expect(getDocument(requester.id, document.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("6. creates a valid document access request", async () => {
    const { requester, document } = await fixture();
    const request = await createAccessRequest(requester.id, { documentId: document.id, type: "SORTIE", motif: "Besoin métier justifié", retourPrevu: futureIso() });
    expect(request).toMatchObject({ statut: "EN_ATTENTE", documentId: document.id });
  });

  it("7. rejects invalid physical-withdrawal requests", async () => {
    const { requester, document } = await fixture();
    await expect(createAccessRequest(requester.id, { documentId: document.id, type: "SORTIE", motif: "Besoin métier justifié" })).rejects.toThrow();
  });

  it("8. blocks physical handover without approval", async () => {
    const data = await fixtureWithRequest();
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence())).rejects.toBeInstanceOf(ConflictError);
  });

  it("9. blocks handover for an unavailable document", async () => {
    const data = await approvedFixture();
    await prisma.document.update({ where: { id: data.document.id }, data: { statut: "INDISPONIBLE" } });
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence())).rejects.toBeInstanceOf(ConflictError);
  });

  it("10. prevents concurrent double handovers", async () => {
    const data = await approvedFixture();
    const results = await Promise.allSettled([
      confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence()),
      confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.mouvement.count({ where: { documentId: data.document.id, dateRetour: null } })).toBe(1);
  });

  it("11. requires signature evidence and rolls state back when absent", async () => {
    const data = await approvedFixture();
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, undefined as never)).rejects.toThrow();
    await expect(prisma.document.findUniqueOrThrow({ where: { id: data.document.id } })).resolves.toMatchObject({ statut: "DISPONIBLE" });
    await expect(prisma.demandeAcces.findUniqueOrThrow({ where: { id: data.request.id } })).resolves.toMatchObject({ statut: "APPROUVEE" });
  });

  it("12. changes document and request states after confirmed handover", async () => {
    const data = await approvedFixture();
    await confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence());
    await expect(prisma.document.findUniqueOrThrow({ where: { id: data.document.id } })).resolves.toMatchObject({ statut: "SORTI" });
    await expect(prisma.demandeAcces.findUniqueOrThrow({ where: { id: data.request.id } })).resolves.toMatchObject({ statut: "EN_COURS" });
  });

  it("13. calculates overdue days from expected UTC return time", () => {
    const expected = new Date("2026-10-20T12:00:00Z");
    expect(overdueDays(expected, new Date("2026-10-22T11:00:00Z"))).toBe(2);
    expect(overdueDays(expected, new Date("2026-10-20T11:00:00Z"))).toBe(0);
  });

  it("14. confirms a return atomically", async () => {
    const data = await handedOverFixture();
    await confirmReturn(data.archivist.id, { mouvementId: data.movement.id, documentReference: data.document.reference, etatRetour: "BON", observations: "", boiteId: data.box.id });
    await expect(prisma.document.findUniqueOrThrow({ where: { id: data.document.id } })).resolves.toMatchObject({ statut: "DISPONIBLE" });
    await expect(prisma.demandeAcces.findUniqueOrThrow({ where: { id: data.request.id } })).resolves.toMatchObject({ statut: "RETOURNEE" });
  });

  it("15. prevents duplicate return confirmation", async () => {
    const data = await handedOverFixture();
    const input = { mouvementId: data.movement.id, documentReference: data.document.reference, etatRetour: "BON" as const, observations: "", boiteId: data.box.id };
    await confirmReturn(data.archivist.id, input);
    await expect(confirmReturn(data.archivist.id, input)).rejects.toBeInstanceOf(ConflictError);
  });

  it("16. preserves handover movement and immutable signature history after return", async () => {
    const data = await handedOverFixture();
    await confirmReturn(data.archivist.id, { mouvementId: data.movement.id, documentReference: data.document.reference, etatRetour: "BON", observations: "", boiteId: data.box.id });
    const movement = await prisma.mouvement.findUniqueOrThrow({ where: { id: data.movement.id }, include: { signature: true } });
    expect(movement.dateRetour).not.toBeNull();
    expect(movement.signature?.checksum).toBe(evidence().checksum);
  });

  it("17. writes audit entries for handover and return", async () => {
    const data = await handedOverFixture();
    await confirmReturn(data.archivist.id, { mouvementId: data.movement.id, documentReference: data.document.reference, etatRetour: "BON", observations: "", boiteId: data.box.id });
    const actions = (await prisma.auditLog.findMany({ where: { entityId: data.movement.id }, select: { action: true } })).map((item) => item.action);
    expect(actions).toEqual(expect.arrayContaining(["movement.handover_confirmed", "movement.return_confirmed"]));
  });

  it("18. rolls back all handover changes when evidence violates a DB invariant", async () => {
    const data = await approvedFixture();
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, { ...evidence(), checksum: "invalid" })).rejects.toThrow();
    expect(await prisma.mouvement.count({ where: { demandeId: data.request.id } })).toBe(0);
    await expect(prisma.document.findUniqueOrThrow({ where: { id: data.document.id } })).resolves.toMatchObject({ statut: "DISPONIBLE" });
  });

  it("19. rejects a movement whose request identifies another document", async () => {
    const data = await approvedFixture();
    const second = await prisma.document.create({ data: { reference: "DOC-OTHER", titre: "Autre", boiteId: data.box.id } });
    await expect(prisma.mouvement.create({ data: { documentId: second.id, demandeId: data.request.id, utilisateurId: data.requester.id, operateurSortieId: data.archivist.id } })).rejects.toThrow();
  });

  it("20. authorizes archive managers and rejects requesters for handovers", async () => {
    const data = await approvedFixture();
    await expect(confirmHandover(data.requester.id, { demandeId: data.request.id }, evidence())).rejects.toBeInstanceOf(AuthorizationError);
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence())).resolves.toBeDefined();
  });

  it("21. prevents concurrent duplicate access requests", async () => {
    const data = await fixture();
    const input = { documentId: data.document.id, type: "SORTIE" as const, motif: "Besoin métier concurrent justifié", retourPrevu: futureIso() };
    const results = await Promise.allSettled([
      createAccessRequest(data.requester.id, input),
      createAccessRequest(data.requester.id, input),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.demandeAcces.count({ where: { documentId: data.document.id, demandeurId: data.requester.id } })).toBe(1);
  });

  it("22. blocks handover after a rejected decision", async () => {
    const data = await fixtureWithRequest();
    const validator = await createUser(ROLES.VALIDATEUR);
    await decideAccessRequest(validator.id, { demandeId: data.request.id, decision: "REFUSEE", commentaire: "Motif de refus synthétique." });
    await expect(confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence())).rejects.toBeInstanceOf(ConflictError);
    expect(await prisma.mouvement.count({ where: { demandeId: data.request.id } })).toBe(0);
  });

  it("23. rejects a return without an active movement", async () => {
    const { archivist, box, document } = await fixture();
    await expect(confirmReturn(archivist.id, {
      mouvementId: randomUUID(),
      documentReference: document.reference,
      etatRetour: "BON",
      observations: "",
      boiteId: box.id,
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it("24. blocks protected operations immediately after account deactivation", async () => {
    const data = await fixture();
    await prisma.utilisateur.update({ where: { id: data.requester.id }, data: { actif: false, sessionVersion: { increment: 1 } } });
    await expect(createAccessRequest(data.requester.id, {
      documentId: data.document.id,
      type: "SORTIE",
      motif: "Cette opération doit être refusée",
      retourPrevu: futureIso(),
    })).rejects.toBeInstanceOf(AuthorizationError);
  });

  async function seedRbac() {
    for (const permission of PERMISSION_DEFINITIONS) await prisma.permission.create({ data: permission });
    for (const definition of ROLE_DEFINITIONS) {
      const role = await prisma.role.create({ data: { code: definition.code, nom: definition.nom, description: definition.description, systeme: true } });
      const permissions = await prisma.permission.findMany({ where: { code: { in: [...definition.permissions] } } });
      await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
    }
  }

  async function createUser(roleCode: RoleCode, email = `${roleCode.toLowerCase()}-${randomUUID()}@example.test`) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    return prisma.utilisateur.create({ data: { nom: `User ${roleCode}`, email, actif: true, passwordHash, passwordChangedAt: new Date(), roles: { create: { roleId: role.id } } } });
  }

  async function fixture(options: { confidential?: boolean } = {}) {
    const [archivist, requester] = await Promise.all([createUser(ROLES.ARCHIVISTE), createUser(ROLES.DEMANDEUR)]);
    const location = await prisma.emplacement.create({ data: { zone: `Z-${randomUUID()}`, rack: "R1", niveau: "N1" } });
    const box = await prisma.boite.create({ data: { code: `BOX-${randomUUID()}`, emplacementId: location.id } });
    const document = await prisma.document.create({ data: { reference: `DOC-${randomUUID()}`, titre: "Dossier test", confidentiel: options.confidential ?? false, boiteId: box.id } });
    return { archivist, requester, location, box, document };
  }

  async function fixtureWithRequest() {
    const data = await fixture();
    const request = await createAccessRequest(data.requester.id, { documentId: data.document.id, type: "SORTIE", motif: "Besoin métier justifié", retourPrevu: futureIso() });
    return { ...data, request };
  }

  async function approvedFixture() {
    const data = await fixtureWithRequest();
    const validator = await createUser(ROLES.VALIDATEUR);
    await decideAccessRequest(validator.id, { demandeId: data.request.id, decision: "APPROUVEE" });
    return { ...data, validator };
  }

  async function handedOverFixture() {
    const data = await approvedFixture();
    const result = await confirmHandover(data.archivist.id, { demandeId: data.request.id }, evidence());
    return { ...data, movement: result.movement };
  }
});

function documentInput(boiteId: string, reference: string) {
  return { reference, titre: "Dossier test", description: "", classification: "Interne", dateDocument: "", confidentiel: false, boiteId };
}

function futureIso() { return new Date(Date.now() + 7 * 86_400_000).toISOString(); }

function evidence() {
  return { storageKey: `signatures/${randomUUID()}.png`, mimeType: "image/png" as const, checksum: "a".repeat(64), byteSize: 256 };
}
