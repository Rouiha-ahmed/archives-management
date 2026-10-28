"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import { createDocument, updateDocument } from "@/modules/archives/service";

function documentInput(formData: FormData) {
  return {
    reference: String(formData.get("reference") ?? ""),
    titre: String(formData.get("titre") ?? ""),
    description: String(formData.get("description") ?? ""),
    classification: String(formData.get("classification") ?? ""),
    dateDocument: String(formData.get("dateDocument") ?? ""),
    confidentiel: formData.get("confidentiel") === "true",
    boiteId: String(formData.get("boiteId") ?? ""),
  };
}

export async function createDocumentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await createDocument(actor.id, documentInput(formData));
    revalidatePath("/documents");
    return { ok: true, message: "Document enregistré." };
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function updateDocumentAction(formData: FormData) {
  const actor = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  await updateDocument(actor.id, { id, ...documentInput(formData) });
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
}
