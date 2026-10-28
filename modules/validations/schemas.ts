import { z } from "zod";

export const validationDecisionSchema = z
  .object({
    demandeId: z.uuid(),
    decision: z.enum(["APPROUVEE", "REFUSEE"]),
    commentaire: z.string().trim().max(1_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "REFUSEE" && !value.commentaire) {
      context.addIssue({
        code: "custom",
        path: ["commentaire"],
        message: "Le motif du refus est obligatoire.",
      });
    }
  });

export type ValidationDecisionInput = z.infer<typeof validationDecisionSchema>;
