import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(512),
});

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .regex(/[a-z]/, "Ajoutez une lettre minuscule.")
  .regex(/[A-Z]/, "Ajoutez une lettre majuscule.")
  .regex(/[0-9]/, "Ajoutez un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Ajoutez un caractère spécial.");
