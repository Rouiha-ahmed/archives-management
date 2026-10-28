import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schemas";

export const createUserSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase().max(254),
  password: passwordSchema,
  roleIds: z.array(z.uuid()).max(10).default([]),
});

export const userActivationSchema = z.object({
  userId: z.uuid(),
  active: z.boolean(),
});

export const userRoleSchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
  assigned: z.boolean(),
});

export const resetPasswordSchema = z.object({
  userId: z.uuid(),
  password: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
