import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import argon2 from "argon2";
import { Pool } from "pg";

import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, ROLES } from "../../lib/permissions/definitions";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.includes("_test")) throw new Error("A dedicated TEST_DATABASE_URL is required for Playwright.");
const pool = new Pool({ connectionString: databaseUrl });
const password = "Synthetic-E2E-42!";
const users = { archivist: "archivist-e2e@example.test", requester: "requester-e2e@example.test", validator: "validator-e2e@example.test" };

test.beforeEach(async () => {
  await pool.query(`TRUNCATE TABLE signatures, audit_logs, validations, mouvements, demandes_acces, documents, boites, emplacements, login_attempts, user_roles, role_permissions, permissions, roles, utilisateurs RESTART IDENTITY CASCADE`);
  const permissionIds = new Map<string, string>();
  for (const permission of PERMISSION_DEFINITIONS) { const id = randomUUID(); permissionIds.set(permission.code, id); await pool.query(`INSERT INTO permissions (id, code, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`, [id, permission.code, permission.description]); }
  const roleIds = new Map<string, string>();
  for (const definition of ROLE_DEFINITIONS) { const id = randomUUID(); roleIds.set(definition.code, id); await pool.query(`INSERT INTO roles (id, code, nom, description, systeme, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW())`, [id, definition.code, definition.nom, definition.description]); for (const code of definition.permissions) await pool.query(`INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES ($1, $2, $3, NOW())`, [randomUUID(), id, permissionIds.get(code)]); }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  for (const [key, email] of Object.entries(users)) { const roleCode = key === "archivist" ? ROLES.ARCHIVISTE : key === "validator" ? ROLES.VALIDATEUR : ROLES.DEMANDEUR; const userId = randomUUID(); await pool.query(`INSERT INTO utilisateurs (id, nom, email, actif, password_hash, password_changed_at, created_at, updated_at) VALUES ($1, $2, $3, true, $4, NOW(), NOW(), NOW())`, [userId, `Utilisateur ${key}`, email, passwordHash]); await pool.query(`INSERT INTO user_roles (id, utilisateur_id, role_id, assigned_at) VALUES ($1, $2, $3, NOW())`, [randomUUID(), userId, roleIds.get(roleCode)]); }
  const locationId = randomUUID();
  await pool.query(`INSERT INTO emplacements (id, zone, rack, niveau, created_at, updated_at) VALUES ($1, 'E2E-ZONE', 'E2E-RACK', 'E2E-NIVEAU', NOW(), NOW())`, [locationId]);
  await pool.query(`INSERT INTO boites (id, code, description, emplacement_id, created_at, updated_at) VALUES ($1, 'E2E-BOX', 'Boîte synthétique', $2, NOW(), NOW())`, [randomUUID(), locationId]);
});

test.afterAll(async () => { await pool.end(); });

test("document registration through approved handover and confirmed return, with unauthorized denial", async ({ page }) => {
  test.setTimeout(240_000);
  const reference = `E2E-${randomUUID().slice(0, 8)}`;

  await page.goto("/documents");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, users.archivist);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations, accessibility.violations.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  const seededBoxId = String((await pool.query(`SELECT id FROM boites WHERE code = 'E2E-BOX'`)).rows[0]?.id);
  await page.goto(`/boites/${seededBoxId}`);
  await expect(page.getByRole("img", { name: "Code QR de la boîte E2E-BOX" })).toBeVisible();
  await expect(page.getByText("Identification uniquement")).toBeVisible();
  await page.goto("/documents");
  await page.getByText("Enregistrer un document").click();
  await page.locator("#document-reference").fill(reference);
  await page.locator("#document-title").fill("Dossier cycle complet");
  await page.locator("#document-box").selectOption({ label: "E2E-BOX" });
  await page.getByRole("button", { name: "Enregistrer le document" }).click();
  await expect(page.getByRole("status")).toContainText("Document enregistré");

  await switchUser(page, users.requester);
  await expect(page.getByRole("link", { name: "Emplacements" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Remises" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Utilisateurs" })).toHaveCount(0);
  await page.goto("/mouvements/sorties");
  await expect(page).toHaveURL(/\/interdit$/);
  await page.goto(`/documents?q=${reference}`);
  await page.getByRole("link", { name: reference }).click();
  await page.getByRole("link", { name: "Demander un accès" }).click();
  await page.getByLabel("Type d'accès").selectOption("SORTIE");
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("Retour prévu").fill(future);
  await page.getByLabel("Motif").fill("Besoin synthétique pour le test du cycle complet");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByRole("status")).toContainText("Demande envoyée");

  await switchUser(page, users.validator);
  await page.goto("/validations");
  await page.getByRole("button", { name: "Approuver" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Aucune demande en attente")).toBeVisible();

  await switchUser(page, users.archivist);
  await page.goto("/mouvements/sorties");
  const canvas = page.getByLabel("Zone de signature");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Signature canvas unavailable");
  await page.mouse.move(box.x + 20, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 100, { steps: 12 });
  await page.mouse.up();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirmer la remise" }).click();
  await expect.poll(async () => Number((await pool.query(`SELECT COUNT(*) AS count FROM mouvements m JOIN documents d ON d.id = m.document_id WHERE d.reference = $1`, [reference])).rows[0]?.count)).toBe(1);

  await page.goto("/mouvements/retours");
  await page.getByLabel("Confirmer la référence").fill(reference);
  await page.getByLabel("État physique").selectOption("BON");
  await page.getByLabel("Boîte de rangement").selectOption({ label: "E2E-BOX" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirmer le retour" }).click();
  await expect.poll(async () => Number((await pool.query(`SELECT COUNT(*) AS count FROM mouvements m JOIN documents d ON d.id = m.document_id WHERE d.reference = $1 AND m.date_retour IS NOT NULL`, [reference])).rows[0]?.count)).toBe(1);

  const result = await pool.query<{ document_status: string; request_status: string; date_retour: Date | null; signature_id: string | null; storage_key: string | null }>(`SELECT d.statut AS document_status, da.statut AS request_status, m.date_retour, s.id AS signature_id, s.storage_key FROM documents d JOIN demandes_acces da ON da.document_id = d.id JOIN mouvements m ON m.demande_id = da.id LEFT JOIN signatures s ON s.mouvement_id = m.id WHERE d.reference = $1`, [reference]);
  expect(result.rows[0]?.document_status).toBe("DISPONIBLE");
  expect(result.rows[0]?.request_status).toBe("RETOURNEE");
  expect(result.rows[0]?.date_retour).not.toBeNull();
  expect(result.rows[0]?.signature_id).not.toBeNull();

  const signatureId = result.rows[0]?.signature_id;
  const storageKey = result.rows[0]?.storage_key;
  if (!signatureId || !storageKey) throw new Error("Signature evidence was not recorded");
  expect((await page.request.get(`/api/signatures/${signatureId}`)).status()).toBe(200);
  expect((await page.request.get(`/storage/${storageKey}`)).status()).toBe(404);

  await page.context().clearCookies();
  expect((await page.request.get(`/api/signatures/${signatureId}`)).status()).toBe(401);
  await login(page, users.requester);
  expect((await page.request.get(`/api/signatures/${signatureId}`)).status()).toBe(404);

  const boxId = String((await pool.query(`SELECT id FROM boites WHERE code = 'E2E-BOX'`)).rows[0]?.id);
  await switchUser(page, users.validator);
  await page.goto(`/boites/${boxId}`);
  await expect(page).toHaveURL(/\/interdit$/);
});

async function login(page: Page, email: string) { await page.goto("/login"); await page.getByLabel("Adresse e-mail").fill(email); await page.getByLabel("Mot de passe").fill(password); await page.getByRole("button", { name: "Se connecter" }).click(); await expect(page).toHaveURL(/\/dashboard/); }
async function switchUser(page: Page, email: string) { await page.context().clearCookies(); await login(page, email); }
