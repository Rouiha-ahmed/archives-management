import { z } from "zod";

export const handoverSchema = z.object({
  demandeId: z.uuid("Demande invalide."),
});

export const returnSchema = z
  .object({
    mouvementId: z.uuid("Mouvement invalide."),
    documentReference: z.string().trim().min(1, "Confirmez la référence du document."),
    etatRetour: z.enum(["BON", "ENDOMMAGE", "PERDU", "NON_REINTEGRE"]),
    observations: z.string().trim().max(2000).optional(),
    boiteId: z.union([z.literal(""), z.uuid()]).optional(),
  })
  .superRefine((data, context) => {
    if (data.etatRetour === "BON" && !data.boiteId) {
      context.addIssue({
        code: "custom",
        path: ["boiteId"],
        message: "La boîte de réintégration est obligatoire.",
      });
    }
    if (data.etatRetour !== "BON" && !data.observations) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "Décrivez obligatoirement l'exception constatée.",
      });
    }
  });

export type ReturnInput = z.infer<typeof returnSchema>;
