"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import {
  completeConsultation,
  createAccessRequest,
  startConsultation,
} from "@/modules/demandes/service";

export async function createAccessRequestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await createAccessRequest(actor.id, {
      documentId: String(formData.get("documentId") ?? ""),
      type: String(formData.get("type") ?? "") as "CONSULTATION" | "SORTIE",
      motif: String(formData.get("motif") ?? ""),
      retourPrevu: String(formData.get("retourPrevu") ?? "") || undefined,
    });
    revalidatePath("/demandes");
    revalidatePath("/validations");
    return { ok: true, message: "Demande envoyée pour autorisation." };
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function startConsultationAction(formData: FormData) {
  const actor = await requireActiveUser();
  await startConsultation(actor.id, String(formData.get("demandeId") ?? ""));
  revalidatePath("/demandes");
  revalidatePath("/dashboard");
}

export async function completeConsultationAction(formData: FormData) {
  const actor = await requireActiveUser();
  await completeConsultation(actor.id, String(formData.get("demandeId") ?? ""));
  revalidatePath("/demandes");
  revalidatePath("/dashboard");
}
