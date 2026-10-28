"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import { decideAccessRequest } from "@/modules/validations/service";

export async function decideRequestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await decideAccessRequest(actor.id, {
      demandeId: String(formData.get("demandeId")),
      decision: String(formData.get("decision")) as "APPROUVEE" | "REFUSEE",
      commentaire: String(formData.get("commentaire") ?? "").trim() || undefined,
    });
    revalidatePath("/validations");
    return { ok: true, message: "Décision enregistrée." };
  } catch (error) {
    return actionErrorState(error);
  }
}
