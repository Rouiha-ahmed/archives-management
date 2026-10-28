import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isActiveSession } from "@/lib/auth/session-policy";
import { PERMISSIONS, ROLE_DEFINITIONS, ROLES } from "@/lib/permissions/definitions";
import { validationDecisionSchema } from "@/modules/validations/schemas";

describe("authentication security rules", () => {
  it("hashes passwords with Argon2id and verifies them", async () => {
    const hash = await hashPassword("Correct-Horse-42!");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, "Correct-Horse-42!")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("rejects unauthenticated and stale sessions", () => {
    const user = { id: "user-1", actif: true, sessionVersion: 3 };
    expect(isActiveSession(null, user)).toBe(false);
    expect(
      isActiveSession({ user: { id: "user-1", sessionVersion: 2 } }, user),
    ).toBe(false);
    expect(
      isActiveSession({ user: { id: "user-1", sessionVersion: 3 } }, user),
    ).toBe(true);
    expect(
      isActiveSession(
        { user: { id: "user-1", sessionVersion: 3 } },
        { ...user, actif: false },
      ),
    ).toBe(false);
  });

  it("requires a rejection reason", () => {
    const result = validationDecisionSchema.safeParse({
      demandeId: "00000000-0000-0000-0000-000000000001",
      decision: "REFUSEE",
    });
    expect(result.success).toBe(false);
  });

  it("keeps request approval out of the DEMANDEUR role", () => {
    const requester = ROLE_DEFINITIONS.find(({ code }) => code === ROLES.DEMANDEUR);
    expect(requester?.permissions).not.toContain(PERMISSIONS.DEMANDES_APPROVE);
    expect(requester?.permissions).toContain(PERMISSIONS.DEMANDES_READ_OWN);
  });
});
