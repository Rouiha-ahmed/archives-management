"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import { confirmHandover, confirmReturn } from "@/modules/mouvements/service";
import {
  removeStagedSignature,
  stageSignature,
} from "@/modules/signatures/storage";

export async function confirmHandoverAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  let staged;
  try {
    staged = await stageSignature(String(formData.get("signature") ?? ""));
    await confirmHandover(
      actor.id,
      { demandeId: String(formData.get("demandeId") ?? "") },
      staged,
    );
    revalidatePath("/mouvements/sorties");
    revalidatePath("/mouvements");
    revalidatePath("/demandes");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { ok: true, message: "Remise confirmée et accusé signé enregistré." };
  } catch (error) {
    if (staged) await removeStagedSignature(staged);
    return actionErrorState(error);
  }
}

export async function confirmReturnAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await confirmReturn(actor.id, {
      mouvementId: String(formData.get("mouvementId") ?? ""),
      documentReference: String(formData.get("documentReference") ?? ""),
      etatRetour: String(formData.get("etatRetour") ?? "") as
        | "BON"
        | "ENDOMMAGE"
        | "PERDU"
        | "NON_REINTEGRE",
      observations: String(formData.get("observations") ?? ""),
      boiteId: String(formData.get("boiteId") ?? ""),
    });
    revalidatePath("/mouvements/retours");
    revalidatePath("/mouvements");
    revalidatePath("/demandes");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { ok: true, message: "Retour confirmé et historique conservé." };
  } catch (error) {
    return actionErrorState(error);
  }
}
