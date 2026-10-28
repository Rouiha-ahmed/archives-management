"use server";

import { revalidatePath } from "next/cache";

import { requireActiveUser } from "@/lib/auth/dal";
import { setRolePermission } from "@/modules/roles/service";

export async function setRolePermissionAction(formData: FormData) {
  const actor = await requireActiveUser();
  await setRolePermission(actor.id, {
    roleId: String(formData.get("roleId")),
    permissionId: String(formData.get("permissionId")),
    enabled: formData.get("enabled") === "true",
  });
  revalidatePath("/administration/roles");
}
