import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION_OPTIONS,
  auditActionsMatchingSearch,
  buildAuditDescription,
  getAuditActionDefinition,
  humanizeUnknownAction,
} from "@/modules/audit/presentation";

describe("audit presentation", () => {
  it("provides a French label for every known action", () => {
    expect(AUDIT_ACTION_OPTIONS.map(({ value }) => value).sort()).toEqual([
      "access_request.approved",
      "access_request.created",
      "access_request.rejected",
      "box.created",
      "box.updated",
      "consultation.completed",
      "consultation.started",
      "demo.dataset_seeded",
      "document.created",
      "document.updated",
      "location.created",
      "location.updated",
      "movement.handover_confirmed",
      "movement.return_confirmed",
      "role.permission_assigned",
      "role.permission_removed",
      "user.activated",
      "user.bootstrap_admin",
      "user.created",
      "user.deactivated",
      "user.password_reset",
      "user.role_assigned",
      "user.role_removed",
    ]);
    for (const action of AUDIT_ACTION_OPTIONS) {
      expect(action.label).not.toContain(action.value);
      expect(action.label).not.toMatch(/[._]/);
    }
    expect(getAuditActionDefinition("access_request.approved").label).toBe("Demande d'accès approuvée");
    expect(getAuditActionDefinition("movement.return_confirmed").label).toBe("Retour du document confirmé");
    expect(getAuditActionDefinition("user.role_assigned").label).toBe("Rôle attribué à un utilisateur");
  });

  it("creates a readable fallback for an unknown action", () => {
    const label = humanizeUnknownAction("archive.review_completed");
    expect(label).toBe("Archive — revue terminée");
    expect(label).not.toMatch(/[._]/);
    expect(getAuditActionDefinition("archive.review_completed").tone).toBe("neutral");
  });

  it("matches searches against translated action labels", () => {
    expect(auditActionsMatchingSearch("retour du document")).toContain("movement.return_confirmed");
    expect(auditActionsMatchingSearch("utilisateur désactivé")).toContain("user.deactivated");
  });

  it("builds descriptions only from supplied business information", () => {
    expect(buildAuditDescription({
      action: "access_request.approved",
      actorName: "Adam Rouiha",
      subjectLabel: "Demande d'accès — document DEMO-DOC-002",
      documentReference: "DEMO-DOC-002",
    })).toBe("Adam Rouiha a approuvé une demande d'accès concernant le document DEMO-DOC-002.");

    expect(buildAuditDescription({
      action: "movement.return_confirmed",
      actorName: "Le système",
      subjectLabel: "Mouvement de document — Référence indisponible",
    })).toBe("Le système a confirmé le retour d'un document.");

    expect(buildAuditDescription({
      action: "user.created",
      actorName: "Adam Rouiha",
      subjectLabel: "Utilisateur Anass Afifi",
    })).toBe("Adam Rouiha a créé l’utilisateur anass afifi.");

    expect(buildAuditDescription({
      action: "role.permission_assigned",
      actorName: "Adam Rouiha",
      subjectLabel: "Rôle Archiviste",
      permissionName: "Consulter les archives autorisées",
    })).toBe("Adam Rouiha a ajouté la permission « Consulter les archives autorisées » au rôle archiviste.");
  });
});
