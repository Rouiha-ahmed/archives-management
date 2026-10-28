"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import { createBoite, resolveBoiteCode, updateBoite } from "@/modules/boites/service";

export async function createBoiteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await createBoite(actor.id, {
      code: String(formData.get("code") ?? ""),
      description: String(formData.get("description") ?? ""),
      emplacementId: String(formData.get("emplacementId") ?? ""),
    });
    revalidatePath("/boites");
    return { ok: true, message: "Boîte créée." };
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function updateBoiteAction(formData: FormData) {
  const actor = await requireActiveUser();
  await updateBoite(actor.id, {
    id: String(formData.get("id") ?? ""),
    code: String(formData.get("code") ?? ""),
    description: String(formData.get("description") ?? ""),
    emplacementId: String(formData.get("emplacementId") ?? ""),
  });
  revalidatePath("/boites");
  revalidatePath(`/boites/${String(formData.get("id") ?? "")}`);
}

export async function resolveBoiteCodeAction(code: string) {
  const actor = await requireActiveUser();
  try {
    return { ok: true as const, id: await resolveBoiteCode(actor.id, code) };
  } catch (error) {
    return { ok: false as const, message: actionErrorState(error).message };
  }
}
