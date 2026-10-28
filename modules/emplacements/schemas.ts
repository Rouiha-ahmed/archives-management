import { z } from "zod";

export const emplacementSchema = z.object({
  zone: z.string().trim().min(1, "La zone est obligatoire.").max(80),
  rack: z.string().trim().min(1, "Le rack est obligatoire.").max(80),
  niveau: z.string().trim().min(1, "Le niveau est obligatoire.").max(80),
});

export const updateEmplacementSchema = emplacementSchema.extend({
  id: z.uuid(),
});

export type EmplacementInput = z.infer<typeof emplacementSchema>;
