import { z } from "zod";

import { AuthorizationError, ConflictError, ValidationError } from "@/lib/errors";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function actionErrorState(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      message: error.issues[0]?.message ?? "Données invalides.",
      fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  if (error instanceof ValidationError || error instanceof ConflictError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, message: "Vous n'êtes pas autorisé à effectuer cette opération." };
  }
  return { ok: false, message: "L'opération n'a pas pu être terminée." };
}
