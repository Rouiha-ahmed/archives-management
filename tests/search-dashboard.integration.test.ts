import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { ValidationError } from "@/lib/errors";
import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, ROLES, type RoleCode } from "@/lib/permissions/definitions";
import { prisma } from "@/lib/prisma";
import { getDocument, listDocuments } from "@/modules/archives/service";
import { getDashboardMetrics } from "@/modules/dashboard/service";

const testUrl = process.env.TEST_DATABASE_URL;
const databaseName = testUrl ? new URL(testUrl).pathname.slice(1) : "";
const integrationEnabled = Boolean(testUrl && databaseName.includes("_test"));

describe.skipIf(!integrationEnabled)("Step 5 search and analytics", () => {
  let passwordHash: string;
  beforeAll(async () => { passwordHash = await hashPassword("Synthetic-Test-42!"); });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE signatures, audit_logs, validations, mouvements, demandes_acces, documents, boites, emplacements, login_attempts, user_roles, role_permissions, permissions, roles, utilisateurs RESTART IDENTITY CASCADE`);
    for (const permission of PERMISSION_DEFINITIONS) await prisma.permission.create({ data: permission });
    for (const definition of ROLE_DEFINITIONS) { const role = await prisma.role.create({ data: { code: definition.code, nom: definition.nom, description: definition.description, systeme: true } }); const permissions = await prisma.permission.findMany({ where: { code: { in: [...definition.permissions] } } }); await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) }); }
  });

  it("searches reference, title and description on the server", async () => {
    const data = await fixture();
    await createDocument(data.box.id, { reference: "FIN-2026-042", titre: "Contrat Atlas", description: "Mission stratégique nord" });
    expect((await listDocuments(data.archivist.id, { reference: "2026-042" })).items).toHaveLength(1);
    expect((await listDocuments(data.archivist.id, { titre: "atlas" })).items).toHaveLength(1);
    expect((await listDocuments(data.archivist.id, { description: "stratégique" })).items).toHaveLength(1);
  });

  it("combines status, box, zone, rack, level and creation-date filters", async () => {
    const data = await fixture();
    await createDocument(data.box.id, { reference: "COMBINED-1", titre: "Cible", description: "Critères combinés" });
    const today = new Date().toISOString().slice(0, 10);
    const result = await listDocuments(data.archivist.id, { statut: "DISPONIBLE", boiteId: data.box.id, zone: "ZONE-A", rack: "R-01", niveau: "N-02", createdFrom: today, createdTo: today });
    expect(result.items.map((item) => item.reference)).toContain("COMBINED-1");
  });

  it("paginates and sorts deterministic server-side results", async () => {
    const data = await fixture();
    await prisma.document.createMany({ data: Array.from({ length: 27 }, (_, index) => ({ reference: `PAGE-${String(index).padStart(2, "0")}`, titre: `Document ${index}`, boiteId: data.box.id })) });
    const first = await listDocuments(data.archivist.id, { q: "PAGE-", page: "1", pageSize: "10", sort: "reference", order: "asc" });
    const third = await listDocuments(data.archivist.id, { q: "PAGE-", page: "3", pageSize: "10", sort: "reference", order: "asc" });
    expect(first).toMatchObject({ total: 27, page: 1, pageSize: 10 });
    expect(first.items[0]?.reference).toBe("PAGE-00");
    expect(third.items).toHaveLength(7);
  });

  it("does not disclose confidential search results or detail metadata", async () => {
    const data = await fixture();
    const secret = await createDocument(data.box.id, { reference: "SECRET-001", titre: "Conseil confidentiel", description: "Non divulgué", confidentiel: true });
    expect((await listDocuments(data.requester.id, { q: "SECRET" })).total).toBe(0);
    await expect(getDocument(data.requester.id, secret.id)).rejects.toBeInstanceOf(ValidationError);
    expect((await listDocuments(data.archivist.id, { q: "SECRET" })).total).toBe(1);
  });

  it("derives dashboard counts from distinct current entities", async () => {
    const data = await fixture();
    const doc = await createDocument(data.box.id, { reference: "DASH-1", titre: "Dashboard", description: "" });
    const request = await prisma.demandeAcces.create({ data: { documentId: doc.id, demandeurId: data.requester.id, type: "SORTIE", motif: "Motif synthétique valide", statut: "EN_COURS", retourPrevu: new Date(Date.now() - 3 * 86_400_000) } });
    await prisma.document.update({ where: { id: doc.id }, data: { statut: "SORTI" } });
    await prisma.mouvement.create({ data: { documentId: doc.id, demandeId: request.id, utilisateurId: data.requester.id, operateurSortieId: data.archivist.id, retourPrevu: request.retourPrevu } });
    const dashboard = await getDashboardMetrics(data.archivist.id);
    expect(dashboard.documents).toBe(1);
    expect(dashboard.checkedOut).toBe(1);
    expect(dashboard.overdue).toBe(1);
    expect(dashboard.movementsOverTime.reduce((sum, item) => sum + item.value, 0)).toBe(1);
  });

  it("aggregates request statuses separately from physical movements", async () => {
    const data = await fixture();
    const doc = await createDocument(data.box.id, { reference: "REQ-1", titre: "Demande", description: "" });
    await prisma.demandeAcces.create({ data: { documentId: doc.id, demandeurId: data.requester.id, type: "CONSULTATION", motif: "Consultation synthétique" } });
    const dashboard = await getDashboardMetrics(data.archivist.id);
    expect(dashboard.requestsByStatus).toContainEqual({ label: "EN_ATTENTE", value: 1 });
    expect(dashboard.movementsOverTime).toHaveLength(0);
  });

  it("excludes confidential inventory from requester dashboard totals", async () => {
    const data = await fixture();
    await createDocument(data.box.id, { reference: "PUBLIC-1", titre: "Public", description: "" });
    await createDocument(data.box.id, { reference: "PRIVATE-1", titre: "Privé", description: "", confidentiel: true });
    expect((await getDashboardMetrics(data.requester.id)).documents).toBe(1);
    expect((await getDashboardMetrics(data.archivist.id)).documents).toBe(2);
  });

  async function fixture() {
    const [archivist, requester] = await Promise.all([createUser(ROLES.ARCHIVISTE), createUser(ROLES.DEMANDEUR)]);
    const location = await prisma.emplacement.create({ data: { zone: "ZONE-A", rack: "R-01", niveau: "N-02" } });
    const box = await prisma.boite.create({ data: { code: `BOX-${randomUUID()}`, emplacementId: location.id } });
    return { archivist, requester, location, box };
  }
  async function createUser(roleCode: RoleCode) { const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } }); return prisma.utilisateur.create({ data: { nom: `Synthetic ${roleCode}`, email: `${roleCode}-${randomUUID()}@example.test`, actif: true, passwordHash, roles: { create: { roleId: role.id } } } }); }
});

async function createDocument(boiteId: string, values: { reference: string; titre: string; description: string; confidentiel?: boolean }) { return prisma.document.create({ data: { ...values, confidentiel: values.confidentiel ?? false, boiteId } }); }
