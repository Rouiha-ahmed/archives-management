import "server-only";

import { withSerializableRetry } from "@/lib/db/transaction";
import { ConflictError, ValidationError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission, hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/modules/audit/service";
import { assertRequestTransition } from "@/modules/demandes/transitions";
import {
  validationDecisionSchema,
  type ValidationDecisionInput,
} from "@/modules/validations/schemas";

export async function decideAccessRequest(
  actorId: string,
  input: ValidationDecisionInput,
) {
  const data = validationDecisionSchema.parse(input);
  const requiredPermission =
    data.decision === "APPROUVEE"
      ? PERMISSIONS.DEMANDES_APPROVE
      : PERMISSIONS.DEMANDES_REJECT;

  return withSerializableRetry(async (tx) => {
    await assertPermission(actorId, requiredPermission, tx);
    const request = await tx.demandeAcces.findUnique({
      where: { id: data.demandeId },
      include: {
        document: { select: { id: true, reference: true, statut: true } },
        validation: { select: { id: true, decision: true } },
      },
    });
    if (!request) throw new ValidationError("Demande ou document introuvable.");
    if (request.validation || request.statut !== "EN_ATTENTE") {
      throw new ConflictError("Cette demande a déjà fait l'objet d'une décision.");
    }
    assertRequestTransition(request.statut, data.decision);
    if (data.decision === "APPROUVEE" && request.document.statut !== "DISPONIBLE") {
      throw new ConflictError("Le document n'est pas disponible pour approbation.");
    }

    const updated = await tx.demandeAcces.updateMany({
      where: { id: request.id, statut: "EN_ATTENTE" },
      data: { statut: data.decision },
    });
    if (updated.count !== 1) {
      throw new ConflictError("Une décision concurrente a déjà été enregistrée.");
    }

    const validation = await tx.validation.create({
      data: {
        demandeId: request.id,
        validateurId: actorId,
        decision: data.decision,
        commentaire: data.commentaire || null,
      },
    });
    await writeAuditLog(tx, {
      actorId,
      action:
        data.decision === "APPROUVEE"
          ? "access_request.approved"
          : "access_request.rejected",
      entityType: "DemandeAcces",
      entityId: request.id,
      oldValues: { statut: request.statut },
      newValues: { statut: data.decision },
      metadata: {
        validationId: validation.id,
        documentId: request.document.id,
        documentReference: request.document.reference,
        commentaire: data.commentaire || undefined,
      },
    });
    return validation;
  });
}

export async function listValidationQueue(actorId: string) {
  await assertPermission(actorId, PERMISSIONS.DEMANDES_READ_ALL);
  const [pending, history] = await Promise.all([
    prisma.demandeAcces.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        document: { select: { reference: true, titre: true, statut: true } },
        demandeur: { select: { nom: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.validation.findMany({
      include: {
        demande: {
          include: {
            document: { select: { reference: true } },
            demandeur: { select: { nom: true } },
          },
        },
        validateur: { select: { nom: true } },
      },
      orderBy: { decidedAt: "desc" },
      take: 100,
    }),
  ]);
  return { pending, history };
}

export async function getRequestForActor(actorId: string, requestId: string) {
  const canReadAll = await hasPermission(actorId, PERMISSIONS.DEMANDES_READ_ALL);
  if (!canReadAll) await assertPermission(actorId, PERMISSIONS.DEMANDES_READ_OWN);
  return prisma.demandeAcces.findFirst({
    where: { id: requestId, demandeurId: canReadAll ? undefined : actorId },
    include: { validation: true },
  });
}
