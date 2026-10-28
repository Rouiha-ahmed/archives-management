"use server";

import { revalidatePath } from "next/cache";

import { actionErrorState, type ActionState } from "@/lib/action-state";
import { requireActiveUser } from "@/lib/auth/dal";
import {
  createUser,
  resetUserPassword,
  setUserActive,
  setUserRole,
} from "@/modules/users/service";

export async function createUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await createUser(actor.id, {
      nom: String(formData.get("nom") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      roleIds: formData.getAll("roleIds").map(String),
    });
    revalidatePath("/administration/utilisateurs");
    return { ok: true, message: "Utilisateur créé." };
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function setUserActiveAction(formData: FormData) {
  const actor = await requireActiveUser();
  await setUserActive(actor.id, {
    userId: String(formData.get("userId")),
    active: formData.get("active") === "true",
  });
  revalidatePath("/administration/utilisateurs");
}

export async function setUserRoleAction(formData: FormData) {
  const actor = await requireActiveUser();
  await setUserRole(actor.id, {
    userId: String(formData.get("userId")),
    roleId: String(formData.get("roleId")),
    assigned: formData.get("assigned") === "true",
  });
  revalidatePath("/administration/utilisateurs");
}

export async function resetUserPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActiveUser();
  try {
    await resetUserPassword(actor.id, {
      userId: String(formData.get("userId")),
      password: String(formData.get("password") ?? ""),
    });
    return { ok: true, message: "Mot de passe remplacé et sessions invalidées." };
  } catch (error) {
    return actionErrorState(error);
  }
}
