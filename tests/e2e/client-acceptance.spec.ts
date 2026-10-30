import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import argon2 from "argon2";
import { Pool } from "pg";

import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, ROLES } from "../../lib/permissions/definitions";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.includes("_test")) throw new Error("A dedicated TEST_DATABASE_URL is required for Playwright.");
const pool = new Pool({ connectionString: databaseUrl });
const password = "Synthetic-UAT-42!";
const users = {
  admin: "uat.admin@example.test",
  archivist: "uat.archiviste@example.test",
  requester: "uat.demandeur@example.test",
  validator: "uat.validateur@example.test",
};

test.beforeEach(async () => {
  await pool.query(`TRUNCATE TABLE signatures, audit_logs, validations, mouvements, demandes_acces, documents, boites, emplacements, login_attempts, user_roles, role_permissions, permissions, roles, utilisateurs RESTART IDENTITY CASCADE`);
  const permissionIds = new Map<string, string>();
  for (const permission of PERMISSION_DEFINITIONS) {
    const id = randomUUID();
    permissionIds.set(permission.code, id);
    await pool.query(`INSERT INTO permissions (id, code, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`, [id, permission.code, permission.description]);
  }
  const roleIds = new Map<string, string>();
  for (const definition of ROLE_DEFINITIONS) {
    const id = randomUUID();
    roleIds.set(definition.code, id);
    await pool.query(`INSERT INTO roles (id, code, nom, description, systeme, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW())`, [id, definition.code, definition.nom, definition.description]);
    for (const code of definition.permissions) {
      await pool.query(`INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES ($1, $2, $3, NOW())`, [randomUUID(), id, permissionIds.get(code)]);
    }
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  for (const [key, email] of Object.entries(users)) {
    const roleCode = key === "admin" ? ROLES.ADMIN : key === "archivist" ? ROLES.ARCHIVISTE : key === "validator" ? ROLES.VALIDATEUR : ROLES.DEMANDEUR;
    const userId = randomUUID();
    await pool.query(`INSERT INTO utilisateurs (id, nom, email, actif, password_hash, password_changed_at, created_at, updated_at) VALUES ($1, $2, $3, true, $4, NOW(), NOW(), NOW())`, [userId, `Recette ${key}`, email, passwordHash]);
    await pool.query(`INSERT INTO user_roles (id, utilisateur_id, role_id, assigned_at) VALUES ($1, $2, $3, NOW())`, [randomUUID(), userId, roleIds.get(roleCode)]);
  }
});

test.afterAll(async () => { await pool.end(); });

test("client acceptance: registration, request, decision, signed handover, tracking and return", async ({ page }) => {
  test.setTimeout(240_000);
  const browserErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await login(page, users.archivist);
  await page.goto("/emplacements");
  await page.getByText("Créer un emplacement").click();
  await page.getByLabel("Zone", { exact: true }).fill("Zone A");
  await page.getByLabel("Rack", { exact: true }).fill("03");
  await page.getByLabel("Niveau", { exact: true }).fill("02");
  await page.getByRole("button", { name: "Créer l'emplacement" }).click();
  await expect(page.getByRole("status")).toContainText("Emplacement créé");

  await page.goto("/boites");
  await page.getByText("Créer une boîte").click();
  await page.getByLabel("Code unique").fill("B-024");
  await page.locator("#box-location").selectOption({ label: "Zone A / 03 / 02" });
  await page.locator("#box-description").fill("Boîte synthétique de recette client");
  await page.getByRole("button", { name: "Créer la boîte" }).click();
  await expect(page.getByRole("status")).toContainText("Boîte créée");

  await createDocument(page, "DOC-001", "Contrat administratif");
  await createDocument(page, "DOC-002", "Attestation administrative");
  await createDocument(page, "DOC-003", "Dossier de recrutement");
  const boxId = String((await pool.query(`SELECT id FROM boites WHERE code='B-024'`)).rows[0]?.id);

  await page.goto(`/boites/${boxId}`);
  await expect(page.getByRole("img", { name: "Code QR de la boîte B-024" })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^Zone A \/ 03 \/ 02$/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimer l'étiquette" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Imprimer l'étiquette" })).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  await switchUser(page, users.requester);
  await requestDocument(page, "DOC-002", "Accès requis pour vérification administrative complète");
  await requestDocument(page, "DOC-003", "Demande séparée destinée au test de refus métier");
  await page.goto("/demandes");
  await expect(page.getByText("En attente d'une décision.")).toHaveCount(2);

  await page.goto("/validations");
  await expect(page).toHaveURL(/\/interdit$/);

  await switchUser(page, users.validator);
  await page.goto("/validations");
  const rejectedCard = page.getByRole("article").filter({ hasText: "DOC-003" });
  await rejectedCard.getByRole("button", { name: "Refuser" }).click();
  await page.getByRole("dialog").getByLabel("Motif du refus (obligatoire)").fill("Justification insuffisante pour cette demande synthétique.");
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
  await expect(rejectedCard).toHaveCount(0);

  const approvedCard = page.getByRole("article").filter({ hasText: "DOC-002" });
  await approvedCard.getByRole("button", { name: "Approuver" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Aucune demande en attente")).toBeVisible();

  const beforeHandover = await pool.query(`SELECT d.statut, da.statut AS request_status, COUNT(m.id)::int AS movements FROM documents d JOIN demandes_acces da ON da.document_id=d.id LEFT JOIN mouvements m ON m.demande_id=da.id WHERE d.reference='DOC-002' GROUP BY d.statut, da.statut`);
  expect(beforeHandover.rows[0]).toMatchObject({ statut: "DISPONIBLE", request_status: "APPROUVEE", movements: 0 });

  await switchUser(page, users.archivist);
  await page.goto(`/boites/${boxId}`);
  await page.getByRole("link", { name: /DOC-002/ }).click();
  await expect(page.getByText("Zone A / 03 / 02", { exact: true }).first()).toBeVisible();

  await page.goto("/mouvements/sorties");
  await expect(page.getByText("DOC-003")).toHaveCount(0);
  const handoverCard = page.getByRole("article").filter({ hasText: "DOC-002" });
  await signAndConfirm(page, handoverCard);
  await expect.poll(async () => Number((await pool.query(`SELECT COUNT(*) AS count FROM mouvements m JOIN documents d ON d.id=m.document_id WHERE d.reference='DOC-002' AND m.date_retour IS NULL`)).rows[0]?.count)).toBe(1);

  const active = await pool.query(`SELECT d.statut AS document_status, da.statut AS request_status, s.id AS signature_id FROM documents d JOIN demandes_acces da ON da.document_id=d.id JOIN mouvements m ON m.demande_id=da.id JOIN signatures s ON s.mouvement_id=m.id WHERE d.reference='DOC-002'`);
  expect(active.rows[0]).toMatchObject({ document_status: "SORTI", request_status: "EN_COURS" });
  expect(active.rows[0]?.signature_id).toBeTruthy();

  await page.goto("/mouvements?q=DOC-002&state=active");
  const trackingRow = page.getByRole("row").filter({ hasText: "DOC-002" });
  await expect(trackingRow).toContainText("Recette requester");
  await expect(trackingRow).toContainText("En cours");
  await expect(trackingRow).toContainText("Prévu");

  await page.goto("/mouvements/retours");
  const returnCard = page.getByRole("article").filter({ hasText: "DOC-002" });
  await returnCard.getByLabel("Confirmer la référence").fill("DOC-002");
  await returnCard.getByLabel("État physique").selectOption("BON");
  await returnCard.getByLabel("Boîte de rangement").selectOption({ label: "B-024" });
  page.once("dialog", (dialog) => dialog.accept());
  await returnCard.getByRole("button", { name: "Confirmer le retour" }).click();
  await expect.poll(async () => Number((await pool.query(`SELECT COUNT(*) AS count FROM mouvements m JOIN documents d ON d.id=m.document_id WHERE d.reference='DOC-002' AND m.date_retour IS NOT NULL`)).rows[0]?.count)).toBe(1);

  await page.goto("/mouvements?q=DOC-002&state=returned");
  await expect(page.getByRole("row").filter({ hasText: "DOC-002" })).toContainText("Retournée");
  const finalState = await pool.query(`SELECT d.statut AS document_status, da.statut AS request_status, m.date_retour, COUNT(a.id)::int AS audit_count FROM documents d JOIN demandes_acces da ON da.document_id=d.id JOIN mouvements m ON m.demande_id=da.id LEFT JOIN audit_logs a ON a.entity_id=m.id::text WHERE d.reference='DOC-002' GROUP BY d.statut, da.statut, m.date_retour`);
  expect(finalState.rows[0]).toMatchObject({ document_status: "DISPONIBLE", request_status: "RETOURNEE", audit_count: 2 });
  expect(finalState.rows[0]?.date_retour).not.toBeNull();
  expect(browserErrors).toEqual([]);
});

test("audit journal is readable, accessible, filtered and paginated", async ({ page }) => {
  test.setTimeout(300_000);
  const admin = await pool.query<{ id: string }>(
    `SELECT id FROM utilisateurs WHERE email = $1`,
    [users.admin],
  );
  const adminId = admin.rows[0]?.id;
  if (!adminId) throw new Error("Synthetic administrator unavailable");

  for (let index = 0; index < 21; index += 1) {
    await pool.query(
      `INSERT INTO audit_logs
        (id, actor_id, action, entity_type, entity_id, new_values, metadata, created_at)
       VALUES ($1, $2, 'user.created', 'Utilisateur', $3, $4::jsonb, $5::jsonb, $6)`,
      [
        randomUUID(),
        adminId,
        adminId,
        JSON.stringify({ nom: "Recette admin", email: users.admin, actif: true }),
        JSON.stringify({ source: "secure-bootstrap" }),
        new Date(Date.now() - index * 60_000),
      ],
    );
  }

  await login(page, users.admin);
  await page.goto("/administration/audit");
  await expect(page.getByRole("heading", { level: 1, name: "Journal d'audit" })).toBeVisible();
  await expect(page.getByPlaceholder("Rechercher par utilisateur, document ou action")).toBeVisible();
  await expect(page.getByLabel("Action")).toContainText("Utilisateur créé");
  const table = page.getByRole("table", { name: "Journal des opérations sensibles" });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Date et heure",
    "Effectué par",
    "Action",
    "Élément concerné",
    "Détails",
  ]);
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await expect(table).toContainText("Utilisateur créé");
  await expect(table.locator("pre:visible")).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    accessibility.violations,
    accessibility.violations.map((item) => `${item.id}: ${item.help}`).join("\n"),
  ).toEqual([]);

  await table.getByRole("button", { name: "Voir les détails" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Utilisateur créé" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Recette admin");
  await expect(dialog).toContainText("Référence métier");
  await expect(dialog).toContainText("Informations techniques réservées aux administrateurs");
  await dialog.getByRole("button", { name: "Fermer", exact: true }).click();

  await page.getByLabel("Action").selectOption("user.created");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/action=user\.created/);
  await page.getByRole("link", { name: "Suivant" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(table.locator("tbody tr")).toHaveCount(1);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("article").filter({ hasText: "Utilisateur créé" })).toBeVisible();

  await switchUser(page, users.archivist);
  await page.goto("/administration/audit");
  await expect(page).toHaveURL(/\/interdit$/);
});

test("administration and QR utility pages load without browser errors", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await login(page, users.admin);
  for (const [route, heading] of [
    ["/administration/utilisateurs", "Utilisateurs"],
    ["/administration/roles", "Rôles et permissions"],
    ["/administration/audit", "Journal d'audit"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }

  await switchUser(page, users.archivist);
  await page.goto("/qr-scanner");
  await expect(page.getByRole("heading", { level: 1, name: "Scanner une boîte" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activer la caméra" })).toBeVisible();
  await expect(page.getByLabel("Code de boîte ou identifiant")).toBeVisible();
  expect(browserErrors).toEqual([]);
});

async function createDocument(page: Page, reference: string, title: string) {
  await page.goto("/documents");
  await page.getByText("Enregistrer un document").click();
  await page.locator("#document-reference").fill(reference);
  await page.locator("#document-title").fill(title);
  await page.locator("#document-classification").fill("Recette client");
  await page.locator("#document-box").selectOption({ label: "B-024" });
  await page.locator("#document-description").fill("Donnée synthétique de recette client");
  await page.getByRole("button", { name: "Enregistrer le document" }).click();
  await expect(page.getByRole("status")).toContainText("Document enregistré");
}

async function requestDocument(page: Page, reference: string, reason: string) {
  await page.goto(`/documents?reference=${reference}`);
  await page.getByRole("link", { name: reference }).click();
  await page.getByRole("link", { name: "Demander un accès" }).click();
  await page.getByLabel("Type d'accès").selectOption("SORTIE");
  await page.getByLabel("Retour prévu").fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16));
  await page.getByLabel("Motif").fill(reason);
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByRole("status")).toContainText("Demande envoyée");
}

async function signAndConfirm(page: Page, card: Locator) {
  const canvas = card.getByLabel("Zone de signature");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Signature canvas unavailable");
  await page.mouse.move(box.x + 20, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 100, { steps: 12 });
  await page.mouse.up();
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Confirmer la remise" }).click();
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function switchUser(page: Page, email: string) {
  await page.context().clearCookies();
  await login(page, email);
}
