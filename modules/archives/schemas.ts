import { z } from "zod";

const documentFields = {
  reference: z.string().trim().min(2, "La référence est obligatoire.").max(120),
  titre: z.string().trim().min(2, "Le titre est obligatoire.").max(240),
  description: z.string().trim().max(2000).optional(),
  classification: z.string().trim().max(120).optional(),
  dateDocument: z.union([z.literal(""), z.iso.date()]).optional(),
  confidentiel: z.boolean().default(false),
  boiteId: z.uuid("Sélectionnez une boîte valide."),
};

export const documentSchema = z.object(documentFields);
export const updateDocumentSchema = z.object(documentFields).extend({ id: z.uuid() });

export type DocumentInput = z.infer<typeof documentSchema>;
