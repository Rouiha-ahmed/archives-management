import { z } from "zod";

export const boiteSchema = z.object({
  code: z.string().trim().min(2, "Le code est obligatoire.").max(80),
  description: z.string().trim().max(500).optional(),
  emplacementId: z.uuid("Sélectionnez un emplacement valide."),
});

export const updateBoiteSchema = boiteSchema.extend({ id: z.uuid() });

export type BoiteInput = z.infer<typeof boiteSchema>;
