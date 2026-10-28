import { z } from "zod";

export const createDemandeSchema = z
  .object({
    documentId: z.uuid("Sélectionnez un document valide."),
    type: z.enum(["CONSULTATION", "SORTIE"]),
    motif: z.string().trim().min(10, "Le motif doit contenir au moins 10 caractères.").max(1000),
    retourPrevu: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.type === "SORTIE") {
      if (!data.retourPrevu) {
        context.addIssue({
          code: "custom",
          path: ["retourPrevu"],
          message: "La date de retour prévue est obligatoire pour une sortie.",
        });
      } else {
        const date = new Date(data.retourPrevu);
        if (Number.isNaN(date.getTime()) || date <= new Date()) {
          context.addIssue({
            code: "custom",
            path: ["retourPrevu"],
            message: "La date de retour prévue doit être future.",
          });
        }
      }
    }
  });

export type CreateDemandeInput = z.infer<typeof createDemandeSchema>;
