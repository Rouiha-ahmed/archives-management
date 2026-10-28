"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import {
  createEmplacement,
  updateEmplacement,
} from "@/modules/emplacements/service";

export async function createEmplacementAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await createEmplacement(actor.id, {
      zone: String(formData.get("zone") ?? ""),
      rack: String(formData.get("rack") ?? ""),
      niveau: String(formData.get("niveau") ?? ""),
    });
    revalidatePath("/emplacements");
    return { ok: true, message: "Emplacement créé." };
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function updateEmplacementAction(formData: FormData) {
  const actor = await requireActiveUser();
  await updateEmplacement(actor.id, {
    id: String(formData.get("id") ?? ""),
    zone: String(formData.get("zone") ?? ""),
    rack: String(formData.get("rack") ?? ""),
    niveau: String(formData.get("niveau") ?? ""),
  });
  revalidatePath("/emplacements");
}
